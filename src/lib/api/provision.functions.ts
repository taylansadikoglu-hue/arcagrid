import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Multi-cloud GPU provisioning aggregator.
 *
 * Queries Vast.ai and Clore.ai for the cheapest CUDA-capable node that still
 * satisfies our minimum gross margin against the customer-paid price, then
 * deploys the production container with the required env variables.
 *
 * Secrets are read from process.env inside the handler (Cloudflare Workers
 * bind env at request time, not module load time).
 */

const MIN_MARGIN = 0.4; // ≥ 40% gross margin. Server-side only.
const IMAGE = "taylans/btx-oneclick-miner:latest";
/**
 * Pinned btxd binary release tag. Every provisioned container runs exactly
 * this version of the daemon — no "latest" pulls at runtime. Override via
 * the BTX_BINARY_TAG env var when promoting a new signed release.
 *
 * Signature verification and the actual hot-swap loop live inside the
 * Docker image itself (taylans/btx-oneclick-miner), not in this orchestrator.
 */
const DEFAULT_BTX_BINARY_TAG = "v0.27.1";

function pinnedBinaryTag(): string {
  return process.env.BTX_BINARY_TAG?.trim() || DEFAULT_BTX_BINARY_TAG;
}

const ProvisionInput = z.object({
  tier: z.enum(["standard_24h", "pro_24h", "standard_monthly", "pro_monthly"]),
  paidPriceUsd: z.number().positive().max(10000),
  wallet: z.string().max(128).default(""),
  mode: z.enum(["pool", "solo"]).default("pool"),
  poolAddress: z.string().max(256).optional(),
});

type Candidate = {
  provider: "vast" | "clore";
  offerId: string;
  hourlyUsd: number;
  gpuCount: number;
  // Internal scoring only — never returned to the client.
  marginPct: number;
};

function dailyBudget(paidPriceUsd: number, isMonthly: boolean) {
  return isMonthly ? paidPriceUsd / 30 : paidPriceUsd;
}

async function queryVast(): Promise<Candidate[]> {
  const key = process.env.VAST_AI_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      "https://console.vast.ai/api/v0/bundles/?q=" +
        encodeURIComponent(
          JSON.stringify({
            verified: { eq: true },
            rentable: { eq: true },
            cuda_max_good: { gte: 12.0 },
            num_gpus: { gte: 1 },
            order: [["dph_total", "asc"]],
          }),
        ),
      {
        headers: { Authorization: `Bearer ${key}` },
      },
    );
    if (!res.ok) {
      console.warn(`[provision] vast offers ${res.status}`);
      return [];
    }
    const json = (await res.json()) as { offers?: Array<Record<string, unknown>> };
    return (json.offers ?? []).slice(0, 25).map((o) => ({
      provider: "vast" as const,
      offerId: String(o.id ?? o.machine_id),
      hourlyUsd: Number(o.dph_total ?? 0),
      gpuCount: Number(o.num_gpus ?? 1),
      marginPct: 0,
    }));
  } catch (err) {
    console.error("[provision] vast query failed", err);
    return [];
  }
}

async function queryClore(): Promise<Candidate[]> {
  const key = process.env.CLORE_AI_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.clore.ai/v1/marketplace", {
      headers: { auth: key },
    });
    if (!res.ok) {
      console.warn(`[provision] clore marketplace ${res.status}`);
      return [];
    }
    const json = (await res.json()) as {
      servers?: Array<{ id: number; price?: { on_demand?: number; spot?: number }; specs?: { gpus?: string } }>;
    };
    return (json.servers ?? []).slice(0, 50).map((s) => {
      // GigaSPOT preferred — spot price (when present) is typically cheaper
      // and improves our effective margin.
      const spot = s.price?.spot;
      const onDemand = s.price?.on_demand ?? 0;
      const hourly = typeof spot === "number" && spot > 0 ? spot : onDemand;
      return {
        provider: "clore" as const,
        offerId: String(s.id),
        hourlyUsd: Number(hourly),
        gpuCount: 1,
        marginPct: 0,
      };
    });
  } catch (err) {
    console.error("[provision] clore query failed", err);
    return [];
  }
}

function selectBestCandidate(
  candidates: Candidate[],
  paidPriceUsd: number,
  isMonthly: boolean,
): Candidate | null {
  const budget = dailyBudget(paidPriceUsd, isMonthly);
  if (budget <= 0) return null;
  // Score by margin; ties broken by preferring Clore spot.
  const scored = candidates
    .filter((c) => c.hourlyUsd > 0)
    .map((c) => {
      const dailyCost = c.hourlyUsd * 24;
      const marginPct = (budget - dailyCost) / budget;
      return { ...c, marginPct };
    })
    .filter((c) => c.marginPct >= MIN_MARGIN)
    .sort((a, b) => {
      if (Math.abs(a.marginPct - b.marginPct) < 0.01) {
        return a.provider === "clore" ? -1 : 1;
      }
      return b.marginPct - a.marginPct;
    });
  return scored[0] ?? null;
}

function buildEnv(input: z.infer<typeof ProvisionInput>) {
  const poolAddress =
    input.poolAddress ??
    (input.mode === "pool" ? "pool.btxchain.org:3333" : "solo.btxchain.org:3334");
  return {
    USER_WALLET: input.wallet || "ARCA_INTERNAL_LEDGER",
    BTX_MINING_MODE: input.mode,
    BTX_POOL_ADDRESS: poolAddress,
    BTX_MATMUL_BACKEND: "cuda",
    BTX_MATMUL_SOLVE_BATCH_SIZE: "16",
    BTX_MINE_BATCH_SIZE: "80",
    BTX_MATMUL_PIPELINE_ASYNC: "0",
    // Immutable infra: the image verifies this tag's signature against the
    // baked-in public key before launching btxd. No runtime upgrades.
    BTX_BINARY_TAG: pinnedBinaryTag(),
  };
}

async function launchVastInstance(
  offerId: string,
  env: Record<string, string>,
): Promise<string> {
  const key = process.env.VAST_AI_API_KEY!;
  const body = {
    client_id: "me",
    image: IMAGE,
    env,
    disk: 32,
    runtype: "ssh",
  };
  const res = await fetch(`https://console.vast.ai/api/v0/asks/${offerId}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`vast launch ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { new_contract?: string | number };
  return `vast-${json.new_contract ?? offerId}`;
}

async function launchCloreInstance(
  offerId: string,
  env: Record<string, string>,
): Promise<string> {
  const key = process.env.CLORE_AI_API_KEY!;
  const res = await fetch("https://api.clore.ai/v1/create_order", {
    method: "POST",
    headers: { "Content-Type": "application/json", auth: key },
    body: JSON.stringify({
      currency: "bitcoin",
      image: IMAGE,
      renting_server: Number(offerId),
      type: "on-demand",
      env,
    }),
  });
  if (!res.ok) {
    throw new Error(`clore launch ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { order_id?: string | number };
  return `clore-${json.order_id ?? offerId}`;
}

/**
 * Customer-facing return shape: deliberately omits hourly cost, margin %,
 * upstream provider, and offer ID. Those values stay server-side.
 */
export const provisionCluster = createServerFn({ method: "POST" })
  .inputValidator((input) => ProvisionInput.parse(input))
  .handler(async ({ data }) => {
    const isMonthly =
      data.tier === "standard_monthly" || data.tier === "pro_monthly";

    const [vast, clore] = await Promise.all([queryVast(), queryClore()]);
    const winner = selectBestCandidate(
      [...vast, ...clore],
      data.paidPriceUsd,
      isMonthly,
    );

    if (!winner) {
      return {
        ok: false as const,
        error:
          "No grid nodes currently meet the routing efficiency threshold. Please retry shortly.",
      };
    }

    const env = buildEnv(data);

    try {
      const instanceId =
        winner.provider === "vast"
          ? await launchVastInstance(winner.offerId, env)
          : await launchCloreInstance(winner.offerId, env);

      console.info(
        `[provision] launched ${winner.provider} offer=${winner.offerId} ` +
          `margin=${(winner.marginPct * 100).toFixed(1)}% tier=${data.tier}`,
      );

      return {
        ok: true as const,
        instanceId,
        provisionedAt: Date.now(),
        binaryTag: pinnedBinaryTag(),
      };
    } catch (err) {
      console.error("[provision] launch failed", err);
      return {
        ok: false as const,
        error: "Routing layer failed to bind a cluster. Please retry.",
      };
    }
  });

/**
 * Returns the binary tag currently pinned for new provisions. Safe to expose
 * to authenticated operators — does not leak provider, margin, or pricing.
 */
export const getPinnedBinaryTag = createServerFn({ method: "GET" }).handler(
  async () => ({ binaryTag: pinnedBinaryTag() }),
);

/**
 * Fetches the latest published release tag from the upstream btxchain/btx
 * GitHub registry so operators can decide whether to cut a new signed image.
 * This is read-only — it never triggers an upgrade.
 */
export const getUpstreamReleaseTag = createServerFn({ method: "GET" }).handler(
  async () => {
    const pinned = pinnedBinaryTag();
    try {
      const res = await fetch(
        "https://api.github.com/repos/btxchain/btx/releases/latest",
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "arcagrid-orchestrator",
          },
        },
      );
      if (!res.ok) {
        return {
          pinned,
          upstream: null as string | null,
          publishedAt: null as string | null,
          htmlUrl: null as string | null,
          upToDate: null as boolean | null,
          error: `Upstream registry responded ${res.status}`,
        };
      }
      const json = (await res.json()) as {
        tag_name?: string;
        published_at?: string;
        html_url?: string;
      };
      const upstream = json.tag_name ?? null;
      return {
        pinned,
        upstream,
        publishedAt: json.published_at ?? null,
        htmlUrl: json.html_url ?? null,
        upToDate: upstream ? upstream === pinned : null,
        error: null as string | null,
      };
    } catch (err) {
      console.error("[provision] upstream release lookup failed", err);
      return {
        pinned,
        upstream: null,
        publishedAt: null,
        htmlUrl: null,
        upToDate: null,
        error: "Upstream registry unreachable",
      };
    }
  },
);
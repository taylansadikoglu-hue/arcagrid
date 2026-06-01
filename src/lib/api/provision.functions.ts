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

// Customer-first routing: hardware filters (vram ≥ 16, modern RTX) are
// non-negotiable. Margin is secondary — we aim for TARGET_MARGIN but will
// dynamically compress through these fallback floors before failing the
// deploy. All values strictly server-side.
const TARGET_MARGIN = 0.4;
// Final floor compressed to 2% — hardware binding (RTX 3080/3090/4070/4080/
// 4090/A6000, vram ≥ 16) takes absolute priority over margin preservation.
const MARGIN_FALLBACKS = [0.4, 0.1, 0.05, 0.02];
const REQUIRED_DISK_GB = 80;
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
  tier: z.enum([
    "standard_24h",
    "pro_24h",
    "standard_monthly",
    "pro_monthly",
    "partner_share",
  ]),
  paidPriceUsd: z.number().min(0).max(10000),
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
            gpu_ram: { gte: 16 },
            disk_space: { gte: REQUIRED_DISK_GB },
            host_id: { neq: 155385 },
            machine_id: { neq: 136826 },
            gpu_name: {
              in: [
                "RTX 3080",
                "RTX 3090",
                "RTX 4070",
                "RTX 4080",
                "RTX 4090",
                "A6000",
              ],
            },
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
    const ALLOWED = /(RTX\s*30(80|90)|RTX\s*40(70|80|90)|A6000)/i;
    return (json.offers ?? [])
      .filter((o) => {
        const name = String(o.gpu_name ?? "");
        const vram = Number(o.gpu_ram ?? 0);
        const hostId = Number(o.host_id ?? 0);
        const machineId = Number(o.machine_id ?? 0);
        return (
          ALLOWED.test(name) &&
          vram >= 16 &&
          hostId !== 155385 &&
          machineId !== 136826
        );
      })
      .slice(0, 25)
      .map((o) => ({
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
    .sort((a, b) => {
      if (Math.abs(a.marginPct - b.marginPct) < 0.01) {
        return a.provider === "clore" ? -1 : 1;
      }
      return b.marginPct - a.marginPct;
    });
  // Walk the fallback floors: prefer TARGET_MARGIN, but compress down to 5%
  // rather than failing the user's deploy.
  for (const floor of MARGIN_FALLBACKS) {
    const winner = scored.find((c) => c.marginPct >= floor);
    if (winner) {
      if (floor < TARGET_MARGIN) {
        console.info(
          `[provision] margin compressed to floor=${(floor * 100).toFixed(0)}%`,
        );
      }
      return winner;
    }
  }
  return null;
}

function buildEnv(input: z.infer<typeof ProvisionInput>) {
  const poolAddress =
    input.poolAddress ??
    (input.mode === "pool" ? "pool.btxchain.org:3333" : "solo.btxchain.org:3334");
  const env: Record<string, string> = {
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
  // Profit-share tier: server-side injection of the routing-fee env var
  // consumed by the worker image to skim block rewards before payout.
  if (input.tier === "partner_share") {
    env.BTX_DEV_FEE = "0.20";
  }
  return env;
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
    disk: REQUIRED_DISK_GB,
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
    if (data.tier === "partner_share") {
      throw new Error(
        "API Provisioning blocked: Partner tier does not receive cloud hardware",
      );
    }

    const isMonthly =
      data.tier === "standard_monthly" || data.tier === "pro_monthly";

    const [vast, clore] = await Promise.all([queryVast(), queryClore()]);
    const pool = [...vast, ...clore].filter((c) => c.hourlyUsd > 0);
    const winner = selectBestCandidate(pool, data.paidPriceUsd, isMonthly);

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

/**
 * Live telemetry for a provisioned instance. The browser hits this serverFn
 * (NOT the raw provider IP) — keeps the upstream host, port, and provider
 * identity server-side, and works around mixed-content / CORS that would
 * block direct browser polling of the worker's :PORT/metrics.json endpoint.
 *
 * Returns sanitized telemetry only. Never leak provider name, IP, hourly
 * cost, or margin.
 */
const TelemetryInput = z.object({
  instanceId: z.string().min(1).max(64).regex(/^(vast|clore)-[a-zA-Z0-9_-]+$/),
});

type Telemetry = {
  status: "provisioning" | "active" | "degraded" | "stopped" | "unknown";
  hashrate_mhs: number | null;
  current_peer_count: number | null;
  block_height: number | null;
  uptime_seconds: number | null;
  fetchedAt: number;
  error: string | null;
};

const PROVISIONING: Telemetry = {
  status: "provisioning",
  hashrate_mhs: null,
  current_peer_count: null,
  block_height: null,
  uptime_seconds: null,
  fetchedAt: 0,
  error: null,
};

async function resolveVastEndpoint(
  contractId: string,
): Promise<{ host: string; port: number } | null> {
  const key = process.env.VAST_AI_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://console.vast.ai/api/v0/instances/${contractId}/`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    instances?: {
      actual_status?: string;
      public_ipaddr?: string;
      ports?: Record<string, Array<{ HostIp?: string; HostPort?: string }>>;
      direct_port_start?: number;
    };
  };
  const inst = json.instances;
  if (!inst?.public_ipaddr) return null;
  // Production image exposes the metrics endpoint on container port 9090.
  const mapped = inst.ports?.["9090/tcp"]?.[0];
  const port = mapped?.HostPort
    ? Number(mapped.HostPort)
    : inst.direct_port_start
      ? Number(inst.direct_port_start)
      : 9090;
  return { host: inst.public_ipaddr, port };
}

async function resolveCloreEndpoint(
  orderId: string,
): Promise<{ host: string; port: number } | null> {
  const key = process.env.CLORE_AI_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.clore.ai/v1/my_orders", {
    headers: { auth: key },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    orders?: Array<{
      id?: number;
      ip?: string;
      tcp_ports?: Record<string, number> | Array<{ public: number; private: number }>;
    }>;
  };
  const order = json.orders?.find((o) => String(o.id) === orderId);
  if (!order?.ip) return null;
  let port = 9090;
  const tcp = order.tcp_ports;
  if (Array.isArray(tcp)) {
    const found = tcp.find((p) => p.private === 9090);
    if (found) port = found.public;
  } else if (tcp && typeof tcp === "object") {
    const val = tcp["9090"];
    if (typeof val === "number") port = val;
  }
  return { host: order.ip, port };
}

export const getInstanceTelemetry = createServerFn({ method: "POST" })
  .inputValidator((input) => TelemetryInput.parse(input))
  .handler(async ({ data }): Promise<Telemetry> => {
    const [providerTag, ...rest] = data.instanceId.split("-");
    const id = rest.join("-");
    const provider = providerTag as "vast" | "clore";

    let endpoint: { host: string; port: number } | null = null;
    try {
      endpoint =
        provider === "vast"
          ? await resolveVastEndpoint(id)
          : await resolveCloreEndpoint(id);
    } catch (err) {
      console.error("[telemetry] endpoint resolve failed", err);
      return { ...PROVISIONING, error: "Routing layer not ready" };
    }

    if (!endpoint) {
      // Instance is still being scheduled / no public IP yet.
      return { ...PROVISIONING, fetchedAt: Date.now() };
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const metricsRes = await fetch(
        `http://${endpoint.host}:${endpoint.port}/metrics.json`,
        { signal: ctrl.signal },
      );
      clearTimeout(timer);
      if (!metricsRes.ok) {
        return {
          ...PROVISIONING,
          status: "degraded",
          fetchedAt: Date.now(),
          error: `Worker metrics endpoint ${metricsRes.status}`,
        };
      }
      const raw = (await metricsRes.json()) as Record<string, unknown>;
      const num = (v: unknown): number | null =>
        typeof v === "number" && Number.isFinite(v) ? v : null;
      const statusRaw = String(raw.status ?? "").toLowerCase();
      const status: Telemetry["status"] =
        statusRaw === "active" ||
        statusRaw === "provisioning" ||
        statusRaw === "degraded" ||
        statusRaw === "stopped"
          ? (statusRaw as Telemetry["status"])
          : "active";
      return {
        status,
        hashrate_mhs: num(raw.hashrate_mhs),
        current_peer_count: num(raw.current_peer_count),
        block_height: num(raw.block_height),
        uptime_seconds: num(raw.uptime_seconds),
        fetchedAt: Date.now(),
        error: null,
      };
    } catch (err) {
      console.warn("[telemetry] worker unreachable", err);
      return {
        ...PROVISIONING,
        status: "degraded",
        fetchedAt: Date.now(),
        error: "Worker telemetry unreachable",
      };
    }
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * GridCreditManager — server-side bridge to the upstream marketplace
 * allocators. The third-party provider names (Vast.ai, Clore.ai) and the
 * raw API surfaces are NEVER exposed to the client; we white-label the
 * results as "Primary Mesh Allocator" and "Secondary Mesh Allocator"
 * before returning, in line with the ARCA GRID brand rules.
 *
 * Secrets are read inside the handler so Workers can bind env at request
 * time (not module load).
 */

export interface MeshAllocatorBalance {
  label: string;
  unit: string;
  balance: number;
  ok: boolean;
  error?: string;
}

export interface GridBalancesResult {
  primary: MeshAllocatorBalance;
  secondary: MeshAllocatorBalance;
  totalUsd: number;
  fetchedAt: string;
}

async function fetchVastBalance(key: string): Promise<MeshAllocatorBalance> {
  try {
    const res = await fetch("https://console.vast.ai/api/v0/users/current/", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as { credit?: number };
    return {
      label: "Primary Mesh Allocator",
      unit: "USD",
      balance: Number(data.credit ?? 0),
      ok: true,
    };
  } catch (err) {
    return {
      label: "Primary Mesh Allocator",
      unit: "USD",
      balance: 0,
      ok: false,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

async function fetchCloreBalance(key: string): Promise<MeshAllocatorBalance> {
  try {
    const res = await fetch("https://api.clore.ai/v1/wallets", {
      headers: { auth: key },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = (await res.json()) as {
      wallets?: Array<{ name?: string; deposit?: number }>;
      balance?: number;
    };
    let total = 0;
    if (Array.isArray(data.wallets)) {
      for (const w of data.wallets) total += Number(w.deposit ?? 0);
    } else if (typeof data.balance === "number") {
      total = data.balance;
    }
    return {
      label: "Secondary Mesh Allocator",
      unit: "CLORE",
      balance: total,
      ok: true,
    };
  } catch (err) {
    return {
      label: "Secondary Mesh Allocator",
      unit: "CLORE",
      balance: 0,
      ok: false,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export const getGridBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<GridBalancesResult> => {
    const vastKey = process.env.VAST_AI_API_KEY?.trim() ?? "";
    const cloreKey = process.env.CLORE_AI_API_KEY?.trim() ?? "";

    const [primary, secondary] = await Promise.all([
      vastKey
        ? fetchVastBalance(vastKey)
        : Promise.resolve<MeshAllocatorBalance>({
            label: "Primary Mesh Allocator",
            unit: "USD",
            balance: 0,
            ok: false,
            error: "allocator unbound",
          }),
      cloreKey
        ? fetchCloreBalance(cloreKey)
        : Promise.resolve<MeshAllocatorBalance>({
            label: "Secondary Mesh Allocator",
            unit: "CLORE",
            balance: 0,
            ok: false,
            error: "allocator unbound",
          }),
    ]);

    // Approximate CLORE → USD parity for the headline aggregate. The
    // operational margin engine uses its own server-side rate table; this
    // is purely for the dashboard summary.
    const CLORE_USD_PARITY = 0.05;
    const totalUsd =
      (primary.ok ? primary.balance : 0) +
      (secondary.ok ? secondary.balance * CLORE_USD_PARITY : 0);

    return {
      primary,
      secondary,
      totalUsd,
      fetchedAt: new Date().toISOString(),
    };
  });

const DeployInput = z.object({
  wallet: z.string().min(20).max(200),
  label: z.string().min(1).max(64).optional(),
});

export interface DeployCheapestResult {
  ok: boolean;
  nodeId?: string;
  message: string;
  hourlyCostHidden?: boolean;
}

/**
 * deployCheapestWorker — finds the lowest-cost qualified spot instance on
 * the primary mesh allocator and ships the ARCA GRID one-click miner
 * container against it. Public response is white-labelled: no hourly
 * rate, no provider name, no hardware model leaks.
 */
export const deployCheapestNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DeployInput.parse(data))
  .handler(async ({ data, context }): Promise<DeployCheapestResult> => {
    const vastKey = process.env.VAST_AI_API_KEY?.trim() ?? "";
    if (!vastKey) {
      return { ok: false, message: "Primary allocator not configured." };
    }
    const { supabase, userId } = context;

    try {
      const queryStr = encodeURIComponent(
        "compute_cap > 6.0 rentable = True",
      );
      const searchRes = await fetch(
        `https://console.vast.ai/api/v0/bundles?q=${queryStr}&order=dph_total`,
        { headers: { Authorization: `Bearer ${vastKey}` } },
      );
      if (!searchRes.ok) throw new Error(`search ${searchRes.status}`);
      const offers = (await searchRes.json()) as {
        offers?: Array<{ id: number; dph_total?: number }>;
      };
      const best = offers.offers?.[0];
      if (!best) {
        return {
          ok: false,
          message: "No qualified mesh inventory at the moment. Try again shortly.",
        };
      }

      const deployRes = await fetch(
        `https://console.vast.ai/api/v0/asks/${best.id}/`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${vastKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: "arcgrid-automated-fleet",
            image: "taylans/btx-oneclick-miner:latest",
            disk: 80,
            env: {
              BTX_MATMUL_BACKEND: "cuda",
              BTX_MATMUL_SOLVE_BATCH_SIZE: "4",
              BTX_MINE_BATCH_SIZE: "20",
              BTX_MATMUL_PIPELINE_ASYNC: "0",
              BTX_DEV_FEE: "0.05",
              USER_WALLET: data.wallet,
              NODE_PORT: "19334",
            },
          }),
        },
      );
      const deployData = (await deployRes.json().catch(() => ({}))) as {
        success?: boolean;
        new_contract?: number;
      };

      if (!deployRes.ok || deployData.success === false) {
        return {
          ok: false,
          message: "Allocator declined the deployment. Balance may be low.",
        };
      }

      // Mirror the new worker into our fleet ledger so it appears in the
      // console immediately. Hardware/provider strings are sanitised.
      const label = data.label ?? `Mesh Worker · ${Date.now().toString(36).slice(-5).toUpperCase()}`;
      const { data: inserted } = await supabase
        .from("nodes")
        .insert({
          user_id: userId,
          name: label,
          location: "Mesh · auto",
          hardware: "Standard Hashrate",
          status: "syncing",
          wallet: data.wallet,
        })
        .select("id")
        .single();

      return {
        ok: true,
        nodeId: inserted?.id,
        message: `Worker provisioned. Contract #${deployData.new_contract ?? "—"} is syncing.`,
        hourlyCostHidden: true,
      };
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error ? err.message : "Deployment failed unexpectedly.",
      };
    }
  });
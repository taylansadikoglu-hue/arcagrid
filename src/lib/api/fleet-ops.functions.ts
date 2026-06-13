import { createServerFn } from "@tanstack/react-start";

/**
 * Privileged fleet operations (deploy / preview / sync / summary).
 *
 * The ARCGRID_OPS_TOKEN never leaves the server — these are server
 * functions, not browser fetches, so the X-API-Token header lives in
 * the worker runtime only. If the token is missing the call short-
 * circuits with a clear error instead of hitting upstream unauthed.
 */

const BASE = "https://api.arcgrid.dev";

function authHeaders(): Record<string, string> {
  const token = process.env.ARCGRID_OPS_TOKEN;
  if (!token) throw new Error("ARCGRID_OPS_TOKEN is not configured");
  return {
    "X-API-Token": token,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [k: string]: Json };

async function postOps(path: string, body: unknown): Promise<Json> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} → ${res.status} ${text}`.trim());
  }
  return (await res.json()) as Json;
}

export const deployFleet = createServerFn({ method: "POST" })
  .inputValidator((input: { count?: number }) => ({
    count: Math.max(1, Math.min(50, Number(input?.count ?? 1) || 1)),
  }))
  .handler(async ({ data }) => postOps("/api/fleet/deploy", { count: data.count }));

export const previewFleetDeploy = createServerFn({ method: "POST" }).handler(
  async () => postOps("/api/fleet/deploy", { dry_run: true }),
);

export const syncClore = createServerFn({ method: "POST" }).handler(
  async () => postOps("/api/fleet/sync", {}),
);

export const fetchFleetSummaryAuthed = createServerFn({ method: "GET" }).handler(
  async (): Promise<Json> => {
    const res = await fetch(`${BASE}/api/fleet/summary`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`/api/fleet/summary → ${res.status}`);
    return (await res.json()) as Json;
  },
);

export const fetchMyFleetNodes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Json> => {
    const res = await fetch(`${BASE}/api/fleet/nodes`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`/api/fleet/nodes → ${res.status}`);
    return (await res.json()) as Json;
  },
);

// ──────────────────────────────────────────────────────────────
// Operator-only endpoints (X-API-Token via ARCGRID_OPS_TOKEN)
// ──────────────────────────────────────────────────────────────

export const fetchOperatorWallet = createServerFn({ method: "GET" }).handler(
  async (): Promise<Json> => {
    const res = await fetch(`${BASE}/api/operator/wallet`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`/api/operator/wallet → ${res.status}`);
    return (await res.json()) as Json;
  },
);

export const setAutoheal = createServerFn({ method: "POST" })
  .inputValidator((input: { enabled: boolean }) => ({
    enabled: Boolean(input?.enabled),
  }))
  .handler(async ({ data }) => postOps("/api/operator/autoheal", data));

export const setTuning = createServerFn({ method: "POST" })
  .inputValidator((input: { max_watts?: number; turbo?: boolean }) => ({
    max_watts:
      typeof input?.max_watts === "number"
        ? Math.max(50, Math.min(300, Math.round(input.max_watts)))
        : undefined,
    turbo: typeof input?.turbo === "boolean" ? input.turbo : undefined,
  }))
  .handler(async ({ data }) => postOps("/api/operator/tuning", data));

export const CLEAN_FLEET_GPU_ALLOWLIST = [
  "RTX 5060 Ti",
  "RTX 4070",
  "RTX 3080",
  "RTX 4080",
] as const;

export const CLEAN_FLEET_FILTERS = {
  gpu_allowlist: CLEAN_FLEET_GPU_ALLOWLIST,
  min_vram_gb: 8,
  min_compute_capability: 8.0,
  max_price_usd_per_day: 2.5,
} as const;

export const rentRigs = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { count: number; clean_fleet_only?: boolean }) => {
      const count = Math.max(1, Math.min(10, Number(input?.count ?? 1) || 1));
      const cleanOnly = Boolean(input?.clean_fleet_only ?? true);
      return cleanOnly
        ? { count, clean_fleet_only: true, filters: CLEAN_FLEET_FILTERS }
        : { count, clean_fleet_only: false };
    },
  )
  .handler(async ({ data }) => postOps("/api/operator/rent", data));
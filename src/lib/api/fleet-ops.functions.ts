import { createServerFn } from "@tanstack/react-start";

/**
 * Privileged fleet operations (deploy / preview / sync / summary).
 *
 * These are server functions, not browser fetches, so the X-API-Token
 * header lives in the worker runtime only and never ships to the browser.
 */

const BASE = "https://api.arcgrid.dev";
const RIG_OPS_BASE = "http://37.27.0.36:8080";

function authHeaders(): Record<string, string> {
  return {
    "X-API-Token": "arcgrid-op-2026-1234",
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
// Operator-only endpoints (X-API-Token via server-side header)
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
    (input: { count: number; clean_fleet_only?: boolean; tier?: number }) => {
      const count = Math.max(1, Math.min(10, Number(input?.count ?? 1) || 1));
      const cleanOnly = Boolean(input?.clean_fleet_only ?? true);
      const tier =
        typeof input?.tier === "number" ? Math.max(1, Math.min(3, Math.round(input.tier))) : undefined;
      const base: Record<string, unknown> = { count };
      if (tier != null) base.tier = tier;
      if (cleanOnly) {
        base.clean_fleet_only = true;
        base.filters = CLEAN_FLEET_FILTERS;
      } else {
        base.clean_fleet_only = false;
      }
      return base as { count: number; tier?: number; clean_fleet_only: boolean };
    },
  )
  .handler(async ({ data }) => postOps("/api/operator/rent", data));

// Worker rows from the upstream pool (pool.arcgrid.dev/api/workers).
export interface MineBtxWorker {
  worker?: string;
  name?: string;
  hashrate_ns?: number;
  hashrate?: number;
  gpu_pct?: number;
  gpu?: number;
  watts?: number;
  power?: number;
  last_share_age_s?: number;
  last_share?: number;
  last_seen?: number;
  temp?: number;
  gpu_temp?: number;
  temperature?: number;
}

export const fetchMineBtxWorkers = createServerFn({ method: "GET" }).handler(
  async (): Promise<MineBtxWorker[]> => {
    const res = await fetch("https://pool.arcgrid.dev/api/workers", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`pool.arcgrid.dev/api/workers → ${res.status}`);
    const raw = (await res.json()) as
      | MineBtxWorker[]
      | { workers?: MineBtxWorker[] };
    return Array.isArray(raw) ? raw : (raw?.workers ?? []);
  },
);

export const restartRig = createServerFn({ method: "POST" })
  .inputValidator((input: { worker: string }) => ({
    worker: String(input?.worker ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    if (!data.worker) throw new Error("worker required");
    const res = await fetch(
      `${RIG_OPS_BASE}/api/operator/rig/${encodeURIComponent(data.worker)}/restart`,
      { method: "POST", headers: authHeaders() },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`restart ${data.worker} → ${res.status} ${text}`.trim());
    }
    return (await res.json().catch(() => ({ ok: true }))) as Json;
  });

async function postRig(worker: string, path: string, body: unknown): Promise<Json> {
  const w = worker.trim();
  if (!w) throw new Error("worker required");
  const res = await fetch(
    `${RIG_OPS_BASE}/api/operator/rig/${encodeURIComponent(w)}/${path}`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} ${w} → ${res.status} ${text}`.trim());
  }
  return (await res.json().catch(() => ({ ok: true }))) as Json;
}

export const setRigWatts = createServerFn({ method: "POST" })
  .inputValidator((input: { worker: string; watts: number }) => ({
    worker: String(input?.worker ?? "").trim(),
    watts: Math.max(50, Math.min(300, Math.round(Number(input?.watts ?? 150)))),
  }))
  .handler(async ({ data }) => postRig(data.worker, "watts", { watts: data.watts }));

export const setRigTurbo = createServerFn({ method: "POST" })
  .inputValidator((input: { worker: string; threads: number }) => ({
    worker: String(input?.worker ?? "").trim(),
    threads: Math.max(25, Math.min(100, Math.round(Number(input?.threads ?? 100)))),
  }))
  .handler(async ({ data }) => postRig(data.worker, "turbo", { threads: data.threads }));

export const setRigThermal = createServerFn({ method: "POST" })
  .inputValidator((input: { worker: string; max_temp: number }) => ({
    worker: String(input?.worker ?? "").trim(),
    max_temp: Math.max(60, Math.min(85, Math.round(Number(input?.max_temp ?? 80)))),
  }))
  .handler(async ({ data }) => postRig(data.worker, "thermal", { max_temp: data.max_temp }));
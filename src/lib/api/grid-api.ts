/**
 * Live grid REST client.
 *
 * Two upstreams:
 *   - https://api.arcgrid.dev       — fleet/price/quick-stats
 *   - https://pool.arcgrid.dev      — pool, miners, blocks, wallet
 *
 * Public endpoints are unauthenticated. Privileged fleet operations
 * (deploy/sync) go through server functions in
 * `src/lib/api/fleet-ops.functions.ts` so the ops token is never
 * shipped to the browser bundle.
 *
 * Callers pair these with TanStack Query `placeholderData: keepPreviousData`
 * so the UI keeps the last known value on transient errors.
 */

export const GRID_API_BASE = "https://api.arcgrid.dev";
export const POOL_API_BASE = "https://pool.arcgrid.dev";

// UI display constants — these are the public-facing values shown to users.
export const POOL_FEE_PERCENT = 2;
export const STRATUM_URL = "stratum+tcp://pool.arcgrid.dev:3333";
export const DASHBOARD_URL = "https://pool.arcgrid.dev";

async function getJson<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export interface FleetSummary {
  total_nodes: number;
  healthy_nodes: number;
  syncing_nodes: number;
  offline_nodes: number;
  active_gpus: number;
  uptime_pct: number;
}

export interface FleetNode {
  id: string;
  provider: string;
  region: string;
  workload: string;
  status: "active" | "syncing" | "idle" | "offline" | string;
  blocks: number;
  peers: number;
  gpu_pct: number;
  temp: number;
  chain_guard: string;
}

export interface BtxPrice {
  price: number;
}

export interface RoiResult {
  daily_btx: number;
  daily_usd: number;
  net_daily_usd: number;
  net_30d_usd: number;
}

export const fetchFleetSummary = (signal?: AbortSignal) =>
  getJson<FleetSummary>(`${GRID_API_BASE}/api/fleet/summary`, signal);

export const fetchFleetNodes = (signal?: AbortSignal) =>
  getJson<FleetNode[]>(`${GRID_API_BASE}/api/fleet/nodes`, signal);

export const fetchBtxPrice = (signal?: AbortSignal) =>
  getJson<BtxPrice>(`${GRID_API_BASE}/api/price`, signal);

export const fetchRoi = (
  cost: number,
  hashrate: number,
  signal?: AbortSignal,
) =>
  getJson<RoiResult>(
    `${GRID_API_BASE}/api/roi?cost=${encodeURIComponent(cost)}&hashrate=${encodeURIComponent(hashrate)}`,
    signal,
  );

// ──────────────────────────────────────────────────────────────
// Pool public endpoints (pool.arcgrid.dev)
// ──────────────────────────────────────────────────────────────

export interface PoolOverview {
  pool_hashrate: number;
  connected_miners: number;
  blocks_found: number;
  fee: number;
  estimated_next_block?: string | number;
  round_luck?: number;
}

export interface PoolMiner {
  worker_name: string;
  hashrate:
    | number
    | {
        value: number;
        unit: string;
        display: string;
        raw?: number;
      };
  shares_valid: number;
  last_seen: number;
}

export interface PoolBlock {
  height: number;
  hash: string;
  reward: number;
  finder?: string;
  found_at: number;
}

export interface WalletBalance {
  address: string;
  balance: number;
  pending?: number;
  paid?: number;
}

export interface QuickStats {
  hashrate: number;
  miners: number;
  height: number;
  [k: string]: unknown;
}

export const fetchPoolOverview = (signal?: AbortSignal) =>
  getJson<PoolOverview>(`${POOL_API_BASE}/api/pool`, signal);

export const fetchPoolMiners = async (
  signal?: AbortSignal,
): Promise<PoolMiner[]> => {
  // Endpoint returns { miners: [...] } — unwrap defensively in case the
  // shape ever flips back to a bare array.
  const raw = await getJson<{ miners: PoolMiner[] } | PoolMiner[]>(
    `${POOL_API_BASE}/api/miners`,
    signal,
  );
  return Array.isArray(raw) ? raw : (raw?.miners ?? []);
};

export const fetchRecentBlocks = (signal?: AbortSignal) =>
  getJson<PoolBlock[]>(`${POOL_API_BASE}/api/blocks`, signal);

export const fetchWalletBalance = (address: string, signal?: AbortSignal) =>
  getJson<WalletBalance>(
    `${POOL_API_BASE}/api/wallet/${encodeURIComponent(address)}`,
    signal,
  );

export const fetchQuickStats = (signal?: AbortSignal) =>
  getJson<QuickStats>(`${GRID_API_BASE}/api/pool/stats`, signal);

// ──────────────────────────────────────────────────────────────
// MineBTX public workers feed (white-label rig table for landing)
// ──────────────────────────────────────────────────────────────

export interface MineBtxWorkerPublic {
  worker?: string;
  name?: string;
  hashrate_ns?: number;
  hashrate?: number;
  gpu_pct?: number;
  gpu?: number;
  watts?: number;
  power?: number;
  last_share_age_s?: number;
}

export const fetchPublicWorkers = async (
  signal?: AbortSignal,
): Promise<MineBtxWorkerPublic[]> => {
  const raw = await getJson<
    MineBtxWorkerPublic[] | { workers?: MineBtxWorkerPublic[] }
  >("https://pool.arcgrid.dev/api/workers", signal);
  return Array.isArray(raw) ? raw : (raw?.workers ?? []);
};
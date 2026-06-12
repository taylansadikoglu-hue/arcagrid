/**
 * Live grid REST client for https://api.arcgrid.dev.
 *
 * All endpoints are public (no auth headers) and return JSON. Callers
 * pair these with TanStack Query `placeholderData: keepPreviousData`
 * so the UI keeps the last known value on transient errors.
 */

const BASE = "https://api.arcgrid.dev";

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
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
  getJson<FleetSummary>("/api/fleet/summary", signal);

export const fetchFleetNodes = (signal?: AbortSignal) =>
  getJson<FleetNode[]>("/api/fleet/nodes", signal);

export const fetchBtxPrice = (signal?: AbortSignal) =>
  getJson<BtxPrice>("/api/price", signal);

export const fetchRoi = (
  cost: number,
  hashrate: number,
  signal?: AbortSignal,
) =>
  getJson<RoiResult>(
    `/api/roi?cost=${encodeURIComponent(cost)}&hashrate=${encodeURIComponent(hashrate)}`,
    signal,
  );
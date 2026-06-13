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
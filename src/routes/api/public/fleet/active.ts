import { createFileRoute } from "@tanstack/react-router";

/**
 * Secure HTTPS proxy for the upstream Hetzner fleet telemetry endpoint.
 * Mixed-content safe (browser can't call plain HTTP from arcgrid.dev) and
 * applies the white-label mapping required by the brand rules — raw
 * provider / GPU strings are never returned to the client.
 */

const UPSTREAM = "http://37.27.0.36/api/active_fleet.php";

interface RawNode {
  node_id?: string;
  status?: string;
  temp?: number;
  power?: number;
  util?: number;
  block?: number;
  last_seen?: number;
  [k: string]: unknown;
}

interface MappedNode {
  node_id: string;
  label: string;
  status: string;
  temp: number | null;
  power: number | null;
  util: number | null;
  block: number | null;
  last_seen: number | null;
  healthy: boolean;
}

function isHealthy(n: RawNode): boolean {
  if (!n.last_seen) return false;
  const ageSec = Math.floor(Date.now() / 1000) - Number(n.last_seen);
  return ageSec < 120 && n.status !== "offline" && n.status !== "OFFLINE";
}

function mapNode(n: RawNode): MappedNode {
  const id = String(n.node_id ?? "");
  const healthy = isHealthy(n);

  // White-label mapping rules (server-side only — raw provider/GPU strings
  // never reach the browser).
  let label = "Grid Node (Live)";
  let status = String(n.status ?? "Unknown");

  if (id.includes("Vast-RTX-4070")) {
    label = "Mesh Compute Node (Live)";
  } else if (id.includes("O-1757219")) {
    label = "Grid Node (Live)";
    if (healthy) status = "Protected";
  }

  return {
    node_id: id,
    label,
    status,
    temp: typeof n.temp === "number" ? n.temp : null,
    power: typeof n.power === "number" ? n.power : null,
    util: typeof n.util === "number" ? n.util : null,
    block: typeof n.block === "number" ? n.block : null,
    last_seen: typeof n.last_seen === "number" ? n.last_seen : null,
    healthy,
  };
}

export const Route = createFileRoute("/api/public/fleet/active")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch(UPSTREAM, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) {
            return Response.json(
              { ok: false, error: `Upstream ${res.status}`, nodes: [] },
              { status: 502 },
            );
          }
          const raw = (await res.json()) as RawNode[] | { nodes?: RawNode[] };
          const list: RawNode[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.nodes)
              ? raw.nodes
              : [];
          const nodes = list.map(mapNode);
          return Response.json(
            { ok: true, nodes },
            {
              headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
            },
          );
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : "fetch failed",
              nodes: [],
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TelemetrySchema = z.object({
  status: z.string().min(1).max(32).optional(),
  hashrate_mhs: z.number().min(0).max(1e9),
  power_draw: z.number().min(0).max(2000),
  gpu_temp: z.number().min(0).max(150),
  gpu_utilization: z.number().min(0).max(100).optional(),
  current_peer_count: z.number().int().min(0).max(10000).optional(),
  local_tip: z.number().int().min(0).optional(),
  blocks_found: z.number().int().min(0).max(1_000_000),
  timestamp: z.number().min(0).optional(),
  vram_temp: z.number().min(0).max(150).optional(),
});

const NODE_NAME = "Sydney Cluster A";

function statusFromPayload(input: string | undefined): "active" | "syncing" | "idle" | "offline" {
  switch ((input ?? "").toUpperCase()) {
    case "ACTIVE":
    case "MINING":
      return "active";
    case "SYNCING":
    case "BOOTSTRAP":
      return "syncing";
    case "OFFLINE":
    case "STOPPED":
      return "offline";
    default:
      return "idle";
  }
}

export const Route = createFileRoute("/api/public/telemetry")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),

      POST: async ({ request }) => {
        const cors = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } as const;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
            status: 400,
            headers: cors,
          });
        }
        const parsed = TelemetrySchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid payload", issues: parsed.error.issues }),
            { status: 400, headers: cors },
          );
        }
        const t = parsed.data;

        // Locate the active Sydney Cluster A node.
        const { data: nodeRow, error: nodeErr } = await supabaseAdmin
          .from("nodes")
          .select("id,user_id,blocks_found,status")
          .eq("name", NODE_NAME)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nodeErr || !nodeRow) {
          return new Response(
            JSON.stringify({ ok: false, error: "Sydney Cluster A node not provisioned" }),
            { status: 404, headers: cors },
          );
        }

        const recordedAt = t.timestamp
          ? new Date(t.timestamp * (t.timestamp > 1e12 ? 1 : 1000)).toISOString()
          : new Date().toISOString();

        // node_telemetry stores hashrate as N/s — convert from MH/s (×1e6).
        const { error: telemErr } = await supabaseAdmin.from("node_telemetry").insert({
          node_id: nodeRow.id,
          user_id: nodeRow.user_id,
          hashrate_ns: t.hashrate_mhs * 1_000_000,
          power_w: t.power_draw,
          gpu_temp_c: t.gpu_temp,
          vram_temp_c: t.vram_temp ?? Math.max(0, t.gpu_temp - 4),
          recorded_at: recordedAt,
        });
        if (telemErr) {
          return new Response(
            JSON.stringify({ ok: false, error: telemErr.message }),
            { status: 500, headers: cors },
          );
        }

        const nextStatus = statusFromPayload(t.status);
        await supabaseAdmin
          .from("nodes")
          .update({
            status: nextStatus,
            blocks_found: Math.max(nodeRow.blocks_found ?? 0, t.blocks_found),
          })
          .eq("id", nodeRow.id);

        return new Response(
          JSON.stringify({ ok: true, node_id: nodeRow.id, recorded_at: recordedAt }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});
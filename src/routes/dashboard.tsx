import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SiteNav } from "@/components/SiteNav";
import { tierById, useMinerSession } from "@/lib/miner-store";
import {
  getInstanceTelemetry,
  getPinnedBinaryTag,
} from "@/lib/api/provision.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Grid Instance Telemetry — Arca Grid" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, setSession, hydrated } = useMinerSession();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  const fetchPinned = useServerFn(getPinnedBinaryTag);
  const { data: pinned } = useQuery({
    queryKey: ["pinned-binary-tag"],
    queryFn: () => fetchPinned(),
    staleTime: 60_000,
  });

  const fetchTelemetry = useServerFn(getInstanceTelemetry);
  const { data: telemetry } = useQuery({
    queryKey: ["instance-telemetry", session?.instanceId],
    queryFn: () =>
      fetchTelemetry({ data: { instanceId: session!.instanceId } }),
    enabled: Boolean(session?.instanceId && session?.status === "mining"),
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Live hashrate from the worker's /metrics.json (MH/s -> GH/s).
  const hashrate = useMemo(() => {
    if (!session || session.status !== "mining") return 0;
    const mhs = telemetry?.hashrate_mhs;
    if (typeof mhs !== "number") return 0;
    return mhs / 1000;
  }, [session, telemetry]);

  // Rolling history for the sparkline — driven by live samples only.
  const [history, setHistory] = useState<number[]>([]);
  useEffect(() => {
    if (!telemetry || telemetry.status === "provisioning") return;
    setHistory((h) => {
      const next = [...h, hashrate];
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });
  }, [telemetry, hashrate]);

  // Sync state derived from live block height reported by the worker.
  const sync = useMemo(() => {
    const local = telemetry?.block_height ?? 0;
    // Use the highest height we've seen as our tip estimate.
    const headers = Math.max(local, 114000);
    const pct = headers > 0 ? Math.min(1, local / headers) : 0;
    return { local, headers, pct };
  }, [telemetry]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="grid place-items-center py-32 text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <div className="mx-auto grid max-w-md gap-4 px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold">No active session</h1>
          <p className="text-sm text-muted-foreground">
            You haven't launched a miner yet. Pick a tier to get started.
          </p>
          <Link
            to="/"
            className="mx-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            Launch a miner
          </Link>
        </div>
      </div>
    );
  }

  const tier = tierById(session.tier);
  const elapsed = Math.max(0, now - session.startedAt);
  const remaining = Math.max(0, session.expiresAt - now);
  const uptimeMs = telemetry?.uptime_seconds
    ? telemetry.uptime_seconds * 1000
    : elapsed;
  const earned = ((hashrate * uptimeMs) / 1000 / 3600) * 0.00012;
  const peers = telemetry?.current_peer_count;
  const liveStatus = telemetry?.status ?? "provisioning";
  const isActive =
    session.status === "mining" &&
    (liveStatus === "active" || liveStatus === "degraded");

  const stop = () => {
    setSession({ ...session, status: "idle" });
    setConfirming(false);
  };

  const terminate = () => {
    setSession(null);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* HEADER */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Instance{" "}
              <span className="font-mono-num text-foreground">{session.instanceId}</span>
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {tier.name} Rig · {tier.tagline}
            </h1>
          </div>
          <StatusBadge
            mining={session.status === "mining"}
            live={liveStatus}
          />
        </div>

        {/* MAIN GRID */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {/* STATUS CARD */}
          <div
            className="rounded-2xl border border-border bg-card p-6 lg:col-span-2"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Live hashrate</span>
              <span className="text-xs text-muted-foreground">
                {session.mode === "pool" ? "Pool mining" : "Solo mining"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono-num text-6xl font-semibold tracking-tight">
                {hashrate.toFixed(2)}
              </span>
              <span className="text-lg text-muted-foreground">GH/s</span>
            </div>
            <Sparkline
              history={history}
              max={tier.id.startsWith("pro") ? 3 : 1.8}
            />

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Earned" value={`${earned.toFixed(6)} BTX`} />
              <Metric label="Uptime" value={fmtDuration(uptimeMs)} />
              <Metric label="Time left" value={fmtDuration(remaining)} />
              <Metric
                label="Peers"
                value={peers != null ? String(peers) : "—"}
              />
            </div>
          </div>

          {/* WALLET CARD */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Payout wallet
            </h3>
            <p className="font-mono-num mt-3 break-all text-sm text-foreground">
              {session.wallet}
            </p>
            <div className="mt-6 border-t border-border pt-4">
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground">
                Routing profile
              </h4>
              <ul className="font-mono-num mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Runtime: CUDA (production-tuned)</li>
                <li>Network: ipv4-only, hardened peer set</li>
                <li>Telemetry: live</li>
                <li>Routing: ARCA GRID mesh allocator</li>
                <li>
                  Pinned btxd:{" "}
                  <span className="text-foreground">
                    {pinned?.binaryTag ?? "…"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* GRID BLOCKCHAIN SYNC */}
        <div
          className="mt-4 rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Grid Blockchain Sync Status
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {sync.pct < 1
                  ? "Bootstrapping pre-packaged chain archive from grid storage…"
                  : "Fully synced to chain tip · RPC :19334"}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono-num text-2xl font-semibold">
                {(sync.pct * 100).toFixed(1)}%
              </span>
              <div className="font-mono-num text-[11px] text-muted-foreground">
                {sync.local.toLocaleString()} / {sync.headers.toLocaleString()} blocks
              </div>
            </div>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full border border-border bg-background/60">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${sync.pct * 100}%`,
                boxShadow: sync.pct < 1 ? "var(--shadow-glow)" : undefined,
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Bootstrap: <span className="text-foreground">grid-archive.zst</span>
            </span>
            <span>
              Data dir: <span className="font-mono-num">~/.btx</span>
            </span>
            <span>
              Tip headers: <span className="font-mono-num">{sync.headers.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* STOP */}
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">
                {session.status === "mining" ? "Stop this miner" : "Miner is idle"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {session.status === "mining"
                  ? "Releases the grid node immediately. You'll keep what you mined."
                  : "Terminate to remove this session entirely."}
              </p>
            </div>
            {session.status === "mining" ? (
              confirming ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm hover:bg-secondary/70"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={stop}
                    className="rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground hover:brightness-110"
                  >
                    Confirm Stop
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="rounded-lg bg-destructive px-6 py-3 text-base font-semibold text-destructive-foreground transition-all hover:brightness-110"
                >
                  ⏹ Stop Miner
                </button>
              )
            ) : (
              <button
                onClick={terminate}
                className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-semibold hover:bg-secondary/70"
              >
                Terminate session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  mining,
  live,
}: {
  mining: boolean;
  live: "provisioning" | "active" | "degraded" | "stopped" | "unknown";
}) {
  if (!mining) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
        IDLE
      </span>
    );
  }
  const map = {
    provisioning: {
      label: "PROVISIONING",
      cls: "border-amber-400/40 bg-amber-400/10 text-amber-300",
      dot: "bg-amber-400",
    },
    active: {
      label: "ACTIVE",
      cls: "border-primary/40 bg-primary/10 text-primary",
      dot: "pulse-dot bg-primary",
    },
    degraded: {
      label: "DEGRADED",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-400",
      dot: "pulse-dot bg-amber-400",
    },
    stopped: {
      label: "STOPPED",
      cls: "border-border bg-secondary text-muted-foreground",
      dot: "bg-muted-foreground",
    },
    unknown: {
      label: "INITIALIZING",
      cls: "border-border bg-secondary text-muted-foreground",
      dot: "pulse-dot bg-muted-foreground",
    },
  } as const;
  const v = map[live];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${v.cls}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${v.dot}`} />
      {v.label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono-num mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Sparkline({ history, max }: { history: number[]; max: number }) {
  const bars = 40;
  const padded =
    history.length >= bars
      ? history.slice(history.length - bars)
      : [...Array(bars - history.length).fill(0), ...history];
  return (
    <div className="mt-5 flex h-16 items-end gap-[3px]">
      {padded.map((v, i) => {
        const h = Math.max(0.04, Math.min(1, v / max));
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/70 transition-all duration-500"
            style={{ height: `${h * 100}%`, opacity: 0.5 + (i / bars) * 0.5 }}
          />
        );
      })}
    </div>
  );
}

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SiteNav } from "@/components/SiteNav";
import { tierById, useMinerSession } from "@/lib/miner-store";
import {
  getInstanceTelemetry,
  getPinnedBinaryTag,
  destroyInstance,
  failoverInstance,
} from "@/lib/api/provision.functions";
import {
  fetchOperatorWallet,
  setAutoheal,
  setTuning,
  rentRigs,
  CLEAN_FLEET_GPU_ALLOWLIST,
  CLEAN_FLEET_FILTERS,
} from "@/lib/api/fleet-ops.functions";
import { fetchPoolMiners, fetchPoolOverview, type PoolMiner } from "@/lib/api/grid-api";
import { useAuth } from "@/lib/use-auth";
import { captureError } from "@/lib/observability";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Grid Instance Telemetry — Arca Grid" },
      {
        name: "description",
        content:
          "Live telemetry for your provisioned ARCA GRID instance: hashrate, sync status, earnings, peers, and node health.",
      },
      { property: "og:title", content: "Grid Instance Telemetry — Arca Grid" },
      {
        property: "og:description",
        content:
          "Monitor your ARCA GRID compute instance in real time — hashrate, sync, earnings, and node health.",
      },
      { property: "og:url", content: "https://arcgrid.dev/dashboard" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/dashboard" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, setSession, hydrated } = useMinerSession();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);
  const [failoverState, setFailoverState] = useState<{
    active: boolean;
    error: string | null;
    reason: string | null;
  }>({ active: false, error: null, reason: null });
  const destroy = useServerFn(destroyInstance);
  const failover = useServerFn(failoverInstance);
  // Track instanceIds we've already attempted a failover for, so a dead
  // node + a failing aggregator can't trigger a re-render loop (each
  // attempt sets state, which would otherwise re-fire the effect).
  const failoverAttempted = useRef<Set<string>>(new Set());
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
      fetchTelemetry({ data: { instanceId: session!.instanceId } }).catch(
        (err) => {
          captureError(err, {
            scope: "telemetry-poll",
            instanceId: session?.instanceId,
          });
          throw err;
        },
      ),
    enabled: Boolean(
      session?.instanceId &&
        session?.status === "mining" &&
        session?.tier !== "partner_share",
    ),
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

  const liveStatus = telemetry?.status ?? "provisioning";

  // Dead-node auto-recovery: hoisted above early returns so hook order
  // stays stable across renders (e.g. hydration flip).
  useEffect(() => {
    if (!session || session.status !== "mining") return;
    if (session.tier === "partner_share") return;
    if (liveStatus !== "dead") return;
    if (failoverState.active) return;
    if (failoverAttempted.current.has(session.instanceId)) return;
    failoverAttempted.current.add(session.instanceId);
    const deadReason = telemetry?.error ?? "Node went offline";
    setFailoverState({ active: true, error: null, reason: deadReason });
    (async () => {
      try {
        const res = await failover({
          data: {
            deadInstanceId: session.instanceId,
            tier: session.tier,
            paidPriceUsd: session.paidPrice,
            wallet: session.wallet,
            mode: session.mode,
          },
        });
        if (!res.ok) {
          setFailoverState({
            active: false,
            error: res.error,
            reason: deadReason,
          });
          return;
        }
        setSession({ ...session, instanceId: res.instanceId });
        setFailoverState({ active: false, error: null, reason: null });
      } catch (err) {
        captureError(err, {
          scope: "failoverInstance",
          instanceId: session.instanceId,
        });
        setFailoverState({
          active: false,
          error: "Re-allocation failed. Retrying on next health check…",
          reason: deadReason,
        });
      }
    })();
  }, [
    liveStatus,
    session,
    failoverState.active,
    telemetry?.error,
    failover,
    setSession,
  ]);

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
        <div className="border-b border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-amber-200">
              🚀 Ready to link your own hardware? Go to the Deploy Node panel to
              copy your unique access token and 1-command installation string.
            </p>
            <Link
              to="/deploy"
              className="shrink-0 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              Deploy Node →
            </Link>
          </div>
        </div>
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
  // Defensive: an unknown tier id (stale localStorage from an older build)
  // would otherwise crash on access. Purge and bounce home.
  if (!tier) {
    try {
      localStorage.removeItem("btx-miner-session");
    } catch {
      /* ignore */
    }
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <div className="mx-auto grid max-w-md gap-4 px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold">Session unavailable</h1>
          <p className="text-sm text-muted-foreground">
            Your previous session references a tier that's no longer offered.
            Please launch a fresh miner from the home page.
          </p>
          <Link
            to="/"
            className="mx-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }
  const elapsed = Math.max(0, now - session.startedAt);
  const remaining = Math.max(0, session.expiresAt - now);
  const uptimeMs = telemetry?.uptime_seconds
    ? telemetry.uptime_seconds * 1000
    : elapsed;
  const earned = ((hashrate * uptimeMs) / 1000 / 3600) * 0.00012;
  const peers = telemetry?.current_peer_count;
  const isActive =
    session.status === "mining" &&
    (liveStatus === "active" || liveStatus === "degraded");

  const stop = async () => {
    if (!session) return;
    setTerminating(true);
    setTermError(null);
    try {
      const res = await destroy({ data: { instanceId: session.instanceId } });
      if (!res.ok) {
        setTermError(res.error);
        setTerminating(false);
        return;
      }
      setSession({ ...session, status: "idle" });
      setConfirming(false);
    } catch (err) {
      captureError(err, { scope: "destroyInstance", instanceId: session.instanceId });
      setTermError("Termination request failed. Please retry.");
    } finally {
      setTerminating(false);
    }
  };

  const terminate = async () => {
    if (!session) return;
    setTerminating(true);
    setTermError(null);
    try {
      // Defense-in-depth: even if status is already idle, ensure the cloud
      // instance is released so we never keep billing a stale rental.
      const res = await destroy({ data: { instanceId: session.instanceId } });
      if (!res.ok) {
        setTermError(res.error);
        setTerminating(false);
        return;
      }
      setSession(null);
      navigate({ to: "/" });
    } catch (err) {
      captureError(err, { scope: "destroyInstance", instanceId: session.instanceId });
      setTermError("Termination request failed. Please retry.");
      setTerminating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      {session.status !== "mining" && (
        <div className="border-b border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-amber-200">
              🚀 Ready to link your own hardware? Go to the Deploy Node panel to
              copy your unique access token and 1-command installation string.
            </p>
            <Link
              to="/deploy"
              className="shrink-0 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              Deploy Node →
            </Link>
          </div>
        </div>
      )}
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
            live={liveStatus === "dead" ? "degraded" : liveStatus}
          />
        </div>

        {(liveStatus === "dead" || failoverState.active || failoverState.error) && (
          <div
            className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="pulse-dot mt-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-300">
                  Node Failure Detected
                </h2>
                <p className="mt-1 text-sm text-foreground">
                  {failoverState.error
                    ? failoverState.error
                    : "Re-allocating to healthy hardware…"}
                </p>
                {failoverState.reason && (
                  <p className="font-mono-num mt-1 text-[11px] text-muted-foreground">
                    Cause: {failoverState.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAIN GRID */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {session.tier === "partner_share" && (
            <div
              className="lg:col-span-3 rounded-2xl border border-primary/40 bg-card p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary">
                    Bring Your Own Compute
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Attach your rig to ARCA GRID
                  </h2>
                </div>
                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Zero-Upfront
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Run the command below on any CUDA-capable host. The partner-node
                image joins your rig to the grid mesh and routes block rewards to
                your wallet (5% flat revenue share applied at payout).
              </p>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background/70 p-4 text-xs leading-relaxed">
                <code className="font-mono-num text-foreground">
{`curl -s https://api.arcgrid.dev/downloads/bootstrap.sh | WALLET=${session.wallet || "YOUR_BTX_ADDRESS"} bash`}
                </code>
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `curl -s https://api.arcgrid.dev/downloads/bootstrap.sh | WALLET=${session.wallet || "YOUR_BTX_ADDRESS"} bash`,
                  );
                }}
                className="mt-3 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-border/80"
              >
                Copy command
              </button>
            </div>
          )}
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
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Payout wallet
            </h2>
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
                <li>Pinned btxd: v0.32.3</li>
              </ul>
            </div>
          </div>
        </div>

        {session.tier !== "partner_share" && (
          <div
            className="mt-4 rounded-2xl border border-border bg-card p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Grid Blockchain Sync Status
                </h2>
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
        )}

        {/* STOP */}
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">
                {session.status === "mining" ? "Stop this miner" : "Miner is idle"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {session.status === "mining"
                  ? "Actively releases the grid node and halts billing. You'll keep what you mined."
                  : "Terminate to remove this session entirely."}
              </p>
              {termError && (
                <p className="mt-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {termError}
                </p>
              )}
            </div>
            {session.status === "mining" ? (
              confirming ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={terminating}
                    className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm hover:bg-secondary/70"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={stop}
                    disabled={terminating}
                    className="rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground hover:brightness-110"
                  >
                    {terminating ? "Releasing node…" : "Confirm Stop"}
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
                disabled={terminating}
                className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-semibold hover:bg-secondary/70"
              >
                {terminating ? "Terminating…" : "Terminate session"}
              </button>
            )}
          </div>
        </div>

        {/* OPERATOR-ONLY CONTROL PANEL */}
        <OperatorPanel />
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

/* -------------------------------------------------------------------------- */
/*  OPERATOR-ONLY CONTROL PANEL                                               */
/*  Visible only to taylan.sadikoglu@gmail.com.                               */
/*  Sections: Wallet · My Rigs (pool) · Fleet Controls · Pool Stats           */
/* -------------------------------------------------------------------------- */

const OPERATOR_EMAIL = "taylan.sadikoglu@gmail.com";

interface OperatorWallet {
  balance?: number;
  address?: string;
  blocks_found?: number;
  total_earned?: number;
}

interface PoolOverviewLike {
  connected_miners?: number;
  totals?: { miner_hashrate_sum?: number };
  blocks_found?: number;
  estimated_next_block?: string | number;
  round_luck?: number;
  fee_percent?: number;
}

function OperatorPanel() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.email?.toLowerCase() !== OPERATOR_EMAIL) return null;
  return (
    <div className="mt-6 grid gap-4">
      <WalletPanel />
      <PoolMinersTable />
      <FleetControls />
      <PoolStatsPanel />
    </div>
  );
}

function WalletPanel() {
  const fetchWallet = useServerFn(fetchOperatorWallet);
  const { data, isLoading, error } = useQuery({
    queryKey: ["operator-wallet"],
    queryFn: () => fetchWallet() as Promise<OperatorWallet>,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
  const w = (data ?? {}) as OperatorWallet;
  const addr = w.address
    ? `${w.address.slice(0, 8)}…${w.address.slice(-6)}`
    : "—";
  return (
    <div
      className="rounded-2xl border border-primary/30 bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">
          Operator Wallet
        </h2>
        <span className="font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
          {isLoading && !data
            ? "loading…"
            : error && !data
              ? "Connect wallet"
              : "live"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="BTX Balance"
          value={typeof w.balance === "number" ? w.balance.toFixed(4) : "—"}
        />
        <Metric label="Address" value={addr} />
        <Metric
          label="Blocks Found"
          value={typeof w.blocks_found === "number" ? w.blocks_found.toLocaleString() : "—"}
        />
        <Metric
          label="Total Earned"
          value={
            typeof w.total_earned === "number" ? `${w.total_earned.toFixed(4)} BTX` : "—"
          }
        />
      </div>
    </div>
  );
}

function hashrateToKhs(h: PoolMiner["hashrate"]): number {
  if (typeof h === "number") return h / 1000;
  if (h && typeof h === "object") {
    const raw = typeof h.raw === "number" ? h.raw : h.value;
    if (typeof raw === "number") {
      const unit = (h.unit ?? "").toLowerCase();
      if (unit.includes("kh")) return raw;
      if (unit.includes("mh")) return raw * 1000;
      if (unit.includes("gh")) return raw * 1_000_000;
      return raw / 1000;
    }
  }
  return 0;
}

function PoolMinersTable() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const { data, isLoading, error } = useQuery({
    queryKey: ["operator-pool-miners"],
    queryFn: ({ signal }) => fetchPoolMiners(signal),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const minersRaw = data ?? [];
  // Drop dead gtx1060 rows: hashrate 0 and last seen > 10 minutes ago.
  const miners = minersRaw.filter((m) => {
    const name = (m.worker_name ?? "").toLowerCase();
    if (!name.includes("gtx1060")) return true;
    const hr = hashrateToKhs(m.hashrate);
    const last = Number(m.last_seen) || 0;
    const lastMs = last < 1e12 ? last * 1000 : last;
    const ageSec = Math.max(0, Math.floor((now - lastMs) / 1000));
    return !(hr === 0 && ageSec > 600);
  });
  const action = async (worker: string, kind: "restart" | "kill") => {
    // Optimistic UX — endpoint is not yet wired; surface intent only.
    console.info(`[operator] ${kind} requested for ${worker}`);
  };
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            My Rigs (Pool)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live workers from the ARCA GRID pool · polled every 15s
          </p>
        </div>
        <span className="font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
          {miners.length} workers
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        {isLoading && miners.length === 0 ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : error && miners.length === 0 ? (
          <p className="text-xs text-destructive">Unable to load miners.</p>
        ) : miners.length === 0 ? (
          <p className="text-xs text-muted-foreground">No workers connected.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 font-medium">Worker</th>
                <th className="px-3 py-2 font-medium">Hashrate (kH/s)</th>
                <th className="px-3 py-2 font-medium">Valid Shares</th>
                <th className="px-3 py-2 font-medium">Last Seen</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="font-mono-num">
              {miners.map((m) => {
                const last = Number(m.last_seen) || 0;
                const lastMs = last < 1e12 ? last * 1000 : last;
                const ageSec = Math.max(0, Math.floor((now - lastMs) / 1000));
                const healthy = ageSec < 60;
                return (
                  <tr
                    key={m.worker_name}
                    className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                  >
                    <td className="px-3 py-2 font-semibold text-foreground">
                      {m.worker_name}
                    </td>
                    <td className="px-3 py-2 text-primary">
                      {hashrateToKhs(m.hashrate).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {Number(m.shares_valid ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {ageSec < 60
                        ? `${ageSec}s ago`
                        : `${Math.floor(ageSec / 60)}m ago`}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          healthy ? "bg-primary pulse-dot" : "bg-destructive"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => action(m.worker_name, "restart")}
                          className="rounded border border-border bg-secondary/50 px-2 py-1 text-[10px] uppercase tracking-wider text-foreground hover:bg-secondary"
                        >
                          Restart
                        </button>
                        <button
                          onClick={() => action(m.worker_name, "kill")}
                          className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] uppercase tracking-wider text-destructive hover:bg-destructive/20"
                        >
                          Kill
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FleetControls() {
  const autohealFn = useServerFn(setAutoheal);
  const tuningFn = useServerFn(setTuning);
  const rentFn = useServerFn(rentRigs);
  const [autoheal, setAutohealLocal] = useState(true);
  const [maxWatts, setMaxWatts] = useState(200);
  const [turbo, setTurbo] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rentOpen, setRentOpen] = useState(false);
  const [rentCount, setRentCount] = useState(1);
  const [renting, setRenting] = useState(false);
  const [rentMsg, setRentMsg] = useState<string | null>(null);
  const [cleanFleetOnly, setCleanFleetOnly] = useState(true);

  const wrap = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Fleet Controls
        </h2>
        <button
          onClick={() => setRentOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
        >
          + Rent New Rig
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {/* AUTO-HEAL TOGGLE */}
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Auto-heal
            </span>
            <button
              onClick={() => {
                const next = !autoheal;
                setAutohealLocal(next);
                void wrap("autoheal", () => autohealFn({ data: { enabled: next } }));
              }}
              disabled={busy === "autoheal"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoheal ? "bg-primary" : "bg-secondary"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  autoheal ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Reallocate dead nodes automatically.
          </p>
        </div>

        {/* MAX WATTS SLIDER */}
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Max Watts / Rig
            </span>
            <span className="font-mono-num text-sm font-semibold text-primary">
              {maxWatts}W
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={300}
            step={10}
            value={maxWatts}
            onChange={(e) => setMaxWatts(Number(e.target.value))}
            onMouseUp={() =>
              void wrap("watts", () => tuningFn({ data: { max_watts: maxWatts } }))
            }
            onTouchEnd={() =>
              void wrap("watts", () => tuningFn({ data: { max_watts: maxWatts } }))
            }
            className="mt-3 w-full accent-primary"
          />
        </div>

        {/* TURBO TOGGLE */}
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Turbo Mode
            </span>
            <button
              onClick={() => {
                const next = !turbo;
                setTurbo(next);
                void wrap("turbo", () => tuningFn({ data: { turbo: next } }));
              }}
              disabled={busy === "turbo"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                turbo ? "bg-amber-400" : "bg-secondary"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  turbo ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Burst throughput; raises thermals.
          </p>
        </div>
      </div>

      {err && (
        <p className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {err}
        </p>
      )}

      {rentOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm"
          onClick={() => !renting && setRentOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <h3 className="text-base font-semibold">Rent New Rigs</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Allocate additional capacity to the grid mesh.
            </p>
            <div className="mt-5">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Count
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={rentCount}
                  onChange={(e) => setRentCount(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="font-mono-num w-10 text-right text-lg font-semibold text-primary">
                  {rentCount}
                </span>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
                    Clean Fleet Only
                  </span>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Enforce GPU allowlist + minimum specs.
                  </p>
                </div>
                <button
                  onClick={() => setCleanFleetOnly((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    cleanFleetOnly ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      cleanFleetOnly ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {cleanFleetOnly && (
                <ul className="font-mono-num mt-3 space-y-1 text-[11px] text-muted-foreground">
                  <li>
                    GPUs:{" "}
                    <span className="text-foreground">
                      {CLEAN_FLEET_GPU_ALLOWLIST.join(" · ")}
                    </span>
                  </li>
                  <li>
                    Min VRAM:{" "}
                    <span className="text-foreground">
                      {CLEAN_FLEET_FILTERS.min_vram_gb} GB
                    </span>{" "}
                    · CC ≥{" "}
                    <span className="text-foreground">
                      {CLEAN_FLEET_FILTERS.min_compute_capability.toFixed(1)}
                    </span>
                  </li>
                  <li>
                    Max price:{" "}
                    <span className="text-foreground">
                      ${CLEAN_FLEET_FILTERS.max_price_usd_per_day.toFixed(2)}/day
                    </span>
                  </li>
                </ul>
              )}
            </div>
            {rentMsg && (
              <p className="mt-3 rounded border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                {rentMsg}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRentOpen(false)}
                disabled={renting}
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-xs hover:bg-secondary/70"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRenting(true);
                  setRentMsg(null);
                  try {
                    await rentFn({
                      data: { count: rentCount, clean_fleet_only: cleanFleetOnly },
                    });
                    setRentMsg(`Allocation request submitted for ${rentCount} rig(s).`);
                  } catch (e) {
                    setRentMsg(`Failed: ${(e as Error).message}`);
                  } finally {
                    setRenting(false);
                  }
                }}
                disabled={renting}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
              >
                {renting ? "Allocating…" : `Rent ${rentCount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PoolStatsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["operator-pool-overview"],
    queryFn: ({ signal }) => fetchPoolOverview(signal),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
  // Source of truth for connected miners is the workers table — the
  // pool /api/pool counter has lagged behind reality, so we use the
  // same query the My Rigs (Pool) table renders from.
  const { data: minersData } = useQuery({
    queryKey: ["operator-pool-miners"],
    queryFn: ({ signal }) => fetchPoolMiners(signal),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
  const connectedMiners = (minersData ?? []).length;
  const p = (data ?? {}) as PoolOverviewLike;
  const hashrate = p.totals?.miner_hashrate_sum;
  const fmtHash = (v?: number) => {
    if (typeof v !== "number" || !isFinite(v)) return "—";
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} GH/s`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} MH/s`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)} kH/s`;
    return `${v.toFixed(0)} H/s`;
  };
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Pool Stats
        </h2>
        <span className="font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
          {isLoading && !data ? "loading…" : error && !data ? "stale" : "live"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label="Pool Hashrate" value={fmtHash(hashrate)} />
        <Metric
          label="Connected Miners"
          value={connectedMiners.toLocaleString()}
        />
        <Metric
          label="Blocks Found"
          value={
            typeof p.blocks_found === "number" ? p.blocks_found.toLocaleString() : "—"
          }
        />
        <Metric
          label="Est. Next Block"
          value={
            p.estimated_next_block != null ? String(p.estimated_next_block) : "—"
          }
        />
        <Metric
          label="Round Luck"
          value={
            typeof p.round_luck === "number" ? `${(p.round_luck * 100).toFixed(1)}%` : "—"
          }
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MY RIGS — operator fleet table (authed: X-API-Token via server fn)        */
/* -------------------------------------------------------------------------- */

interface MyRigRow {
  id: string;
  region?: string;
  workload?: string;
  status?: string;
  blocks?: number;
  peers?: number;
  gpu_pct?: number;
  temp?: number;
  chain_guard?: string;
  healthy?: boolean;
}

function MyRigsTable() {
  const fetchNodes = useServerFn(fetchMyFleetNodes);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-fleet-nodes"],
    queryFn: () => fetchNodes() as Promise<unknown>,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const rows: MyRigRow[] = (() => {
    if (!data) return [];
    const d = data as { nodes?: MyRigRow[] } | MyRigRow[];
    return Array.isArray(d) ? d : (d.nodes ?? []);
  })();

  return (
    <div
      className="mt-6 rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            My Rigs
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live operator view · polled every 30s
          </p>
        </div>
        <span className="font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
          {rows.length} active
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        {isLoading && rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : error && rows.length === 0 ? (
          <p className="text-xs text-destructive">
            Unable to load fleet right now.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rigs allocated yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 font-medium">Rig</th>
                <th className="px-3 py-2 font-medium">Region</th>
                <th className="px-3 py-2 font-medium">Workload</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Blocks</th>
                <th className="px-3 py-2 font-medium">Peers</th>
                <th className="px-3 py-2 font-medium">GPU%</th>
                <th className="px-3 py-2 font-medium">Temp</th>
              </tr>
            </thead>
            <tbody className="font-mono-num">
              {rows.map((n) => (
                <tr
                  key={n.id}
                  className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                >
                  <td className="px-3 py-2 font-semibold text-foreground">{n.id}</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.region ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.workload ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.status ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {n.blocks?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{n.peers ?? "—"}</td>
                  <td className="px-3 py-2 text-primary">
                    {typeof n.gpu_pct === "number" ? `${n.gpu_pct}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {typeof n.temp === "number" ? `${n.temp}°C` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
  rentRigs,
  fetchMineBtxWorkers,
  restartRig,
  type MineBtxWorker,
} from "@/lib/api/fleet-ops.functions";
import { fetchPoolOverview } from "@/lib/api/grid-api";
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
  btx_balance?: number;
  clore_balance?: number;
  active_rigs?: number;
  address?: string;
}

interface PoolOverviewLike {
  pool_hashrate?: number;
  connected_miners?: number;
  blocks_found?: number;
  fee?: number;
  estimated_next_block?: string | number;
  round_luck?: number;
}

function OperatorPanel() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.email?.toLowerCase() !== OPERATOR_EMAIL) return null;
  return (
    <div className="mt-6 grid gap-4">
      <WalletPanel />
      <MyRigsTable />
      <FleetControls />
      <PoolStatsPanel />
      <OrchestraOsPanel />
    </div>
  );
}

function WalletPanel() {
  const fetchWallet = useServerFn(fetchOperatorWallet);
  const { data, isLoading, error } = useQuery({
    queryKey: ["operator-wallet"],
    queryFn: () => fetchWallet() as Promise<OperatorWallet>,
    refetchInterval: 60_000,
    staleTime: 55_000,
    placeholderData: keepPreviousData,
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
          value={typeof w.btx_balance === "number" ? w.btx_balance.toFixed(4) : "—"}
        />
        <Metric
          label="CLORE Balance"
          value={typeof w.clore_balance === "number" ? w.clore_balance.toFixed(4) : "—"}
        />
        <Metric
          label="Active Rigs"
          value={typeof w.active_rigs === "number" ? w.active_rigs.toLocaleString() : "—"}
        />
        <Metric label="Address" value={addr} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MY RIGS — workers from pool.arcgrid.dev filtered to operator's fleet      */
/* -------------------------------------------------------------------------- */

function isMyRig(name: string): boolean {
  const n = (name ?? "").trim();
  if (!n) return false;
  return n.toLowerCase().includes("arcagrid") || n.startsWith("O-178");
}

function MyRigsTable() {
  const fetchWorkers = useServerFn(fetchMineBtxWorkers);
  const restart = useServerFn(restartRig);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["operator-arcgrid-workers"],
    queryFn: () => fetchWorkers() as Promise<MineBtxWorker[]>,
    refetchInterval: 15_000,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
  const rows = (data ?? [])
    .map((w) => ({ ...w, _name: w.worker ?? w.name ?? "" }))
    .filter((w) => isMyRig(w._name));

  const fmtAge = (s?: number) => {
    if (typeof s !== "number" || !isFinite(s) || s < 0) return "—";
    if (s < 60) return `${Math.floor(s)}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  const doRestart = async (worker: string) => {
    setBusy(worker);
    setMsg(null);
    try {
      await restart({ data: { worker } });
      setMsg(`Restart requested for ${worker}.`);
    } catch (e) {
      setMsg(`Restart failed: ${(e as Error).message}`);
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
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            My Rigs
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live workers · polled every 15s
          </p>
        </div>
        <span className="font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
          {rows.length} rigs
        </span>
      </div>
      {msg && (
        <p className="mt-3 rounded border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {msg}
        </p>
      )}
      <div className="mt-4 overflow-x-auto">
        {isLoading && rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : error && rows.length === 0 ? (
          <p className="text-xs text-destructive">Unable to load workers.</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rigs reporting.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 font-medium">Worker</th>
                <th className="px-3 py-2 font-medium">N/s</th>
                <th className="px-3 py-2 font-medium">GPU%</th>
                <th className="px-3 py-2 font-medium">Watts</th>
                <th className="px-3 py-2 font-medium">Last Share</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="font-mono-num">
              {rows.map((w) => {
                const age = typeof w.last_share_age_s === "number" ? w.last_share_age_s : undefined;
                const healthy = typeof age === "number" && age < 3600;
                const ns = w.hashrate_ns ?? w.hashrate;
                const gpu = w.gpu_pct ?? w.gpu;
                const watts = w.watts ?? w.power;
                return (
                  <tr
                    key={w._name}
                    className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                  >
                    <td className="px-3 py-2 font-semibold text-foreground">{w._name}</td>
                    <td className="px-3 py-2 text-primary">
                      {typeof ns === "number" ? ns.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {typeof gpu === "number" ? `${gpu}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {typeof watts === "number" ? `${watts}W` : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtAge(age)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          healthy ? "bg-primary pulse-dot" : "bg-destructive"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => doRestart(w._name)}
                        disabled={busy === w._name}
                        className="rounded border border-border bg-secondary/50 px-2 py-1 text-[10px] uppercase tracking-wider text-foreground hover:bg-secondary disabled:opacity-50"
                      >
                        {busy === w._name ? "…" : "Restart"}
                      </button>
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

/* -------------------------------------------------------------------------- */
/*  FLEET CONTROLS — Rent Tier 1 / Rent Tier 2 / Auto-heal toggle              */
/* -------------------------------------------------------------------------- */

function FleetControls() {
  const autohealFn = useServerFn(setAutoheal);
  const rentFn = useServerFn(rentRigs);
  const [autoheal, setAutohealLocal] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const wrap = async (key: string, label: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg(`${label} OK`);
    } catch (e) {
      setMsg(`${label} failed: ${(e as Error).message}`);
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
        {msg && (
          <span className="font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
            {msg}
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={() =>
            wrap("t1", "Rent Tier 1", () =>
              rentFn({ data: { tier: 1, count: 1, clean_fleet_only: false } }),
            )
          }
          disabled={busy === "t1"}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          {busy === "t1" ? "Renting…" : "Rent Tier 1"}
        </button>
        <button
          onClick={() =>
            wrap("t2", "Rent Tier 2", () =>
              rentFn({ data: { tier: 2, count: 1, clean_fleet_only: false } }),
            )
          }
          disabled={busy === "t2"}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
        >
          {busy === "t2" ? "Renting…" : "Rent Tier 2"}
        </button>
        <button
          onClick={() => {
            const next = !autoheal;
            setAutohealLocal(next);
            void wrap("ah", `Auto-heal ${next ? "ON" : "OFF"}`, () =>
              autohealFn({ data: { enabled: next } }),
            );
          }}
          disabled={busy === "ah"}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            autoheal
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-secondary text-muted-foreground border border-border"
          }`}
        >
          Auto-heal {autoheal ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  POOL STATS — pool.arcgrid.dev/api/pool                                    */
/* -------------------------------------------------------------------------- */

function PoolStatsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["operator-pool-overview"],
    queryFn: ({ signal }) => fetchPoolOverview(signal),
    refetchInterval: 30_000,
    staleTime: 25_000,
    placeholderData: keepPreviousData,
  });
  const p = (data ?? {}) as {
    pool_hashrate?: number;
    connected_miners?: number;
    blocks_found?: number;
    fee?: number;
  };
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
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Pool Hashrate" value={fmtHash(p.pool_hashrate)} />
        <Metric
          label="Connected Miners"
          value={
            typeof p.connected_miners === "number"
              ? p.connected_miners.toLocaleString()
              : "—"
          }
        />
        <Metric
          label="Blocks Found"
          value={
            typeof p.blocks_found === "number" ? p.blocks_found.toLocaleString() : "—"
          }
        />
        <Metric
          label="Fee"
          value={typeof p.fee === "number" ? `${p.fee.toFixed(1)}%` : "—"}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ORCHESTRA OS — DC Deployment one-liner                                    */
/* -------------------------------------------------------------------------- */

function OrchestraOsPanel() {
  const cmd = "curl -s https://api.arcgrid.dev/install | bash";
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className="rounded-2xl border border-primary/30 bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">
        Orchestra OS — DC Deployment
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <pre className="flex-1 overflow-x-auto rounded-lg border border-border bg-background/70 px-4 py-3 text-xs">
          <code className="font-mono-num text-foreground">{cmd}</code>
        </pre>
        <button
          onClick={copy}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Deploy to any CUDA server. GPU detected automatically. Mining in under 5 minutes.
      </p>
    </div>
  );
}

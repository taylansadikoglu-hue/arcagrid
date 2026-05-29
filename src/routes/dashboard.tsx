import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { tierById, useMinerSession } from "@/lib/miner-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Miner Dashboard — BTX One-Click Miner" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, setSession, hydrated } = useMinerSession();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // simulate hashrate flutter
  const hashrate = useMemo(() => {
    if (!session || session.status !== "mining") return 0;
    const tier = tierById(session.tier);
    const base = tier.id.startsWith("pro") ? 2.6 : 1.4;
    const jitter = (Math.sin(now / 1500) + Math.sin(now / 700) * 0.4) * 0.08;
    return Math.max(0.1, base + jitter);
  }, [session, now]);

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
  const earned = ((hashrate * elapsed) / 1000 / 3600) * 0.00012; // mock BTX

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
              {tier.name} Rig · {tier.hardware}
            </h1>
          </div>
          <StatusBadge mining={session.status === "mining"} />
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
            <Sparkline value={hashrate} max={tier.id.startsWith("pro") ? 3 : 1.8} />

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Earned" value={`${earned.toFixed(6)} BTX`} />
              <Metric label="Uptime" value={fmtDuration(elapsed)} />
              <Metric label="Time left" value={fmtDuration(remaining)} />
              <Metric
                label="Host cost"
                value={`$${session.hostCost.toFixed(2)}/24h`}
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
                Container env
              </h4>
              <ul className="font-mono-num mt-2 space-y-1 text-xs text-muted-foreground">
                <li>BTX_MINE_BATCH_SIZE=20</li>
                <li>BTX_MATMUL_SOLVE_BATCH_SIZE=4</li>
                <li>PIPELINE_ASYNC=0</li>
              </ul>
            </div>
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
                  ? "Stops the Vast.ai instance immediately. You'll keep what you mined."
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

function StatusBadge({ mining }: { mining: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        mining
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-secondary text-muted-foreground"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          mining ? "pulse-dot bg-primary" : "bg-muted-foreground"
        }`}
      />
      {mining ? "MINING" : "IDLE"}
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

function Sparkline({ value, max }: { value: number; max: number }) {
  // Static decorative bars + animated cursor based on value
  const bars = 40;
  const pct = Math.min(1, value / max);
  return (
    <div className="mt-5 flex h-16 items-end gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => {
        const noise =
          0.45 + Math.sin(i * 0.6) * 0.18 + Math.cos(i * 0.27) * 0.12;
        const h = Math.max(0.1, Math.min(1, noise * pct * 1.25));
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/70 transition-all"
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
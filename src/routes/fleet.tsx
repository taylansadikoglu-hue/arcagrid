import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import {
  signInWithPassword,
  signUpWithPassword,
  useAuth,
} from "@/lib/use-auth";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet Console — ArcaGrid Enterprise Orchestration Layer" },
      {
        name: "description",
        content:
          "Institutional GPU fleet orchestration, live telemetry, and ROI tracking for high-density compute clusters on ArcaGrid.",
      },
      { property: "og:title", content: "ArcaGrid Fleet Console" },
      {
        property: "og:description",
        content: "Bloomberg-grade telemetry for enterprise GPU mining fleets.",
      },
    ],
  }),
  component: FleetPage,
});

function FleetPage() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="grid h-screen place-items-center text-xs uppercase tracking-widest text-muted-foreground">
          Authenticating session…
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <LoginPortal />;
  }

  return <FleetConsole userId={auth.user.id} email={auth.user.email ?? ""} />;
}

/* -------------------------------------------------------------------------- */
/*  LOGIN PORTAL                                                              */
/* -------------------------------------------------------------------------- */

function LoginPortal() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const fn = mode === "signin" ? signInWithPassword : signUpWithPassword;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (mode === "signup") {
      setMsg("Account created. Check your inbox to verify, then sign in.");
      setMode("signin");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl place-items-center px-6">
        <div className="grid w-full gap-10 md:grid-cols-2 md:items-center">
          {/* Brand panel */}
          <div className="hidden md:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Sydney Crew Access Portal
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight">
              Enterprise GPU
              <br />
              <span className="text-primary">orchestration console.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Restricted to authorised data-centre operators. All sessions are
              signed, encrypted in transit, and pinned to your Golden Config —
              CUDA 12.0 runtime, 160W cap, batch 80/16.
            </p>
            <ul className="font-mono-num mt-8 space-y-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <li>· Runtime: CUDA (pinned)</li>
              <li>· Routing: ARCA GRID mesh allocator</li>
              <li>· Telemetry: live · TLS 1.3</li>
              <li>· Peer set: hardened</li>
              <li>· Idle-redirect: per-node</li>
            </ul>
          </div>

          {/* Auth card */}
          <div
            className="rounded-2xl border border-border bg-card p-8"
            style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {mode === "signin" ? "Operator sign in" : "Provision access"}
              </h2>
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setErr(null);
                  setMsg(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {mode === "signin" ? "Need an account?" : "Have an account?"}
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Operator email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops@sydney-crew.io"
                  className="font-mono-num mt-1.5 w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Passphrase
                </span>
                <input
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="font-mono-num mt-1.5 w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {err && (
                <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {err}
                </p>
              )}
              {msg && (
                <p className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                  {msg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy
                  ? "…"
                  : mode === "signin"
                    ? "Enter console"
                    : "Request access"}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              Protected by Lovable Cloud · TLS 1.3 · SOC2-ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FLEET CONSOLE                                                             */
/* -------------------------------------------------------------------------- */

interface NodeRow {
  id: string;
  name: string;
  location: string;
  hardware: string;
  status: "active" | "syncing" | "idle" | "offline";
  idle_redirect: boolean;
  power_cap_w: number;
  matmul_backend: string;
  solve_batch_size: number;
  mine_batch_size: number;
  min_peers: number;
  ld_library_path: string;
  cuda_runtime_pin: string;
  daily_cost_usd: number;
  blocks_found: number;
  wallet: string | null;
}

function FleetConsole({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["nodes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nodes")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as NodeRow[];
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? nodes[0],
    [nodes, selectedId],
  );

  // Provision a starter node automatically if user has none.
  useEffect(() => {
    if (isLoading) return;
    if (nodes.length > 0) return;
    (async () => {
      const seeds = [
        { name: "Sydney Cluster A", location: "AU · Sydney", hardware: "Standard Hashrate", status: "active" as const },
        { name: "Retail Node 01", location: "US · Dallas", hardware: "Standard Hashrate", status: "syncing" as const },
        { name: "Retail Node 02", location: "EU · Frankfurt", hardware: "Pro Hashrate", status: "idle" as const },
      ];
      await supabase.from("nodes").insert(
        seeds.map((s) => ({
          ...s,
          user_id: userId,
          wallet: "btx1qsydneycrewdemo000000000000000000",
        })),
      );
      qc.invalidateQueries({ queryKey: ["nodes", userId] });
    })();
  }, [isLoading, nodes.length, userId, qc]);

  const totals = useMemo(() => {
    const active = nodes.filter((n) => n.status === "active").length;
    const blocks = nodes.reduce((s, n) => s + n.blocks_found, 0);
    const costDay = nodes.reduce((s, n) => s + Number(n.daily_cost_usd), 0);
    // Yield ~ 883 N/s per active unit, mock USD/day
    const yieldDay = active * 8.4;
    return { active, blocks, costDay, yieldDay, net: yieldDay - costDay };
  }, [nodes]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* TICKER BAR */}
      <TickerBar
        items={[
          { k: "Operator", v: email || "—" },
          { k: "Active", v: `${totals.active}/${nodes.length}` },
          { k: "Daily yield", v: `$${totals.yieldDay.toFixed(2)}` },
          { k: "Daily cost", v: `$${totals.costDay.toFixed(2)}` },
          {
            k: "Net",
            v: `${totals.net >= 0 ? "+" : ""}$${totals.net.toFixed(2)}`,
            accent: totals.net >= 0 ? "primary" : "destructive",
          },
          { k: "Blocks", v: String(totals.blocks) },
          { k: "Pool peers", v: "≥ 1" },
          { k: "CUDA", v: "12.0 pinned" },
        ]}
      />

      <div className="mx-auto grid max-w-[1500px] gap-4 px-6 py-6 xl:grid-cols-[320px_1fr]">
        {/* FLEET LIST */}
        <aside className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Global Fleet
            </h3>
            <span className="font-mono-num text-[10px] text-muted-foreground">
              {nodes.length} NODES
            </span>
          </div>
          <ul className="divide-y divide-border">
            {isLoading && (
              <li className="px-4 py-6 text-xs text-muted-foreground">
                Loading fleet…
              </li>
            )}
            {nodes.map((n) => {
              const isSel = (selected?.id ?? "") === n.id;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => setSelectedId(n.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      isSel ? "bg-secondary/60" : "hover:bg-secondary/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={n.status} />
                        <span className="truncate text-sm font-medium">
                          {n.name}
                        </span>
                      </div>
                      <p className="font-mono-num mt-0.5 text-[11px] text-muted-foreground">
                        {n.location} · {n.hardware}
                      </p>
                    </div>
                    <span
                      className={`font-mono-num rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${statusChip(n.status)}`}
                    >
                      {n.status}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* MAIN PANEL */}
        <main className="space-y-4">
          {selected ? (
            <NodeDetail node={selected} userId={userId} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Provisioning your first node…
            </div>
          )}

          {/* ROI MODULE */}
          <RoiPanel
            yieldDay={totals.yieldDay}
            costDay={totals.costDay}
            blocks={totals.blocks}
          />
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  NODE DETAIL (live telemetry)                                              */
/* -------------------------------------------------------------------------- */

function NodeDetail({ node, userId }: { node: NodeRow; userId: string }) {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = useMemo(() => simulate(node, now), [node, now]);

  const toggleIdleRedirect = async () => {
    await supabase
      .from("nodes")
      .update({
        idle_redirect: !node.idle_redirect,
        status: !node.idle_redirect ? "active" : "idle",
      })
      .eq("id", node.id);
    qc.invalidateQueries({ queryKey: ["nodes", userId] });
  };

  return (
    <section className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Node
          </p>
          <h2 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            {node.name}
            <span
              className={`font-mono-num rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-widest ${statusChip(node.status)}`}
            >
              {node.status}
            </span>
          </h2>
          <p className="font-mono-num mt-1 text-xs text-muted-foreground">
            {node.location} · {node.hardware} · cap {node.power_cap_w}W
          </p>
        </div>

        {/* IDLE-REDIRECT TOGGLE */}
        <button
          onClick={toggleIdleRedirect}
          className={`group relative flex items-center gap-3 rounded-xl border px-5 py-3 text-left transition-all ${
            node.idle_redirect
              ? "border-primary/50 bg-primary/10"
              : "border-border bg-secondary/40 hover:border-border/80"
          }`}
          style={
            node.idle_redirect
              ? { boxShadow: "var(--shadow-glow)" }
              : undefined
          }
        >
          <span
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              node.idle_redirect ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
                node.idle_redirect ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </span>
          <div>
            <div className="text-sm font-semibold">
              Idle-Redirect{" "}
              <span
                className={
                  node.idle_redirect ? "text-primary" : "text-muted-foreground"
                }
              >
                {node.idle_redirect ? "ENGAGED" : "DISARMED"}
              </span>
            </div>
            <div className="font-mono-num text-[11px] text-muted-foreground">
              ./start-live-mining.sh --batch=80 --solve=16
            </div>
          </div>
        </button>
      </div>

      {/* TELEMETRY GRID */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TelemetryCard
          label="Hashrate"
          value={live.hashrate.toFixed(0)}
          unit="N/s"
          accent="primary"
          history={live.hashHistory}
          target={883}
          subtitle="Target ~883 N/s · RPC :19334"
        />
        <TelemetryCard
          label="Power Draw"
          value={live.power.toFixed(1)}
          unit="W"
          accent={live.power > node.power_cap_w * 0.95 ? "destructive" : "primary"}
          history={live.powerHistory}
          target={node.power_cap_w}
          subtitle={`Hard cap ${node.power_cap_w}W`}
        />
        <TelemetryCard
          label="GPU Core / VRAM"
          value={`${live.gpuTemp.toFixed(0)}° / ${live.vramTemp.toFixed(0)}°`}
          unit="C"
          accent={live.gpuTemp > 80 ? "accent" : "primary"}
          history={live.tempHistory}
          target={85}
          subtitle="Throttle threshold 85°C"
        />
      </div>

      {/* GOLDEN CONFIG */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Golden Config · production-verified
          </h3>
          <span className="font-mono-num text-[10px] text-primary">
            CUDA 12.4 detected · cuda-cudart-12-0 runtime injected
          </span>
        </div>
        <pre className="font-mono-num overflow-x-auto px-5 py-4 text-[11px] leading-relaxed text-foreground/90">
{`docker run --gpus all \\
  -e BTX_MATMUL_BACKEND=${node.matmul_backend} \\
  -e BTX_MATMUL_SOLVE_BATCH_SIZE=${node.solve_batch_size} \\
  -e BTX_MINE_BATCH_SIZE=${node.mine_batch_size} \\
  -e USER_WALLET=${node.wallet ?? "<your-wallet>"} \\
  -e LD_LIBRARY_PATH=${node.ld_library_path} \\
  arcagrid/btx-oneclick-miner:latest \\
  --miningchainguardminpeers=${node.min_peers}`}
        </pre>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  PRIMITIVES                                                                */
/* -------------------------------------------------------------------------- */

function TickerBar({
  items,
}: {
  items: { k: string; v: string; accent?: "primary" | "destructive" | "accent" }[];
}) {
  return (
    <div className="border-y border-border bg-card/60">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-2.5 text-[11px]">
        {items.map((it) => (
          <div key={it.k} className="font-mono-num flex items-center gap-2">
            <span className="uppercase tracking-widest text-muted-foreground">
              {it.k}
            </span>
            <span
              className={
                it.accent === "destructive"
                  ? "text-destructive"
                  : it.accent === "accent"
                    ? "text-accent"
                    : "text-primary"
              }
            >
              {it.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: NodeRow["status"] }) {
  const cls =
    status === "active"
      ? "bg-primary pulse-dot"
      : status === "syncing"
        ? "bg-accent"
        : status === "offline"
          ? "bg-destructive"
          : "bg-muted-foreground";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function statusChip(status: NodeRow["status"]) {
  switch (status) {
    case "active":
      return "border-primary/40 bg-primary/10 text-primary";
    case "syncing":
      return "border-accent/40 bg-accent/10 text-accent";
    case "offline":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-secondary text-muted-foreground";
  }
}

function TelemetryCard({
  label,
  value,
  unit,
  accent,
  history,
  target,
  subtitle,
}: {
  label: string;
  value: string;
  unit: string;
  accent: "primary" | "destructive" | "accent";
  history: number[];
  target: number;
  subtitle: string;
}) {
  const color =
    accent === "destructive"
      ? "text-destructive"
      : accent === "accent"
        ? "text-accent"
        : "text-primary";
  const max = Math.max(target, ...history) * 1.1;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </h4>
        <span className="font-mono-num text-[10px] text-muted-foreground">
          {subtitle}
        </span>
      </div>
      <div className={`font-mono-num mt-2 flex items-baseline gap-2 ${color}`}>
        <span className="text-4xl font-semibold tracking-tight">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <Sparkline history={history} max={max} color={color} target={target} />
    </div>
  );
}

function Sparkline({
  history,
  max,
  color,
  target,
}: {
  history: number[];
  max: number;
  color: string;
  target: number;
}) {
  const bars = history.slice(-48);
  const targetPct = Math.min(1, target / max);
  return (
    <div className="relative mt-4 h-16">
      <div
        className="absolute inset-x-0 border-t border-dashed border-border/80"
        style={{ bottom: `${targetPct * 100}%` }}
      >
        <span className="absolute right-0 -top-3 text-[9px] uppercase tracking-widest text-muted-foreground">
          target
        </span>
      </div>
      <div className="flex h-full items-end gap-[2px]">
        {bars.map((v, i) => {
          const h = Math.max(0.04, Math.min(1, v / max));
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm bg-current ${color}`}
              style={{ height: `${h * 100}%`, opacity: 0.35 + (i / bars.length) * 0.65 }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RoiPanel({
  yieldDay,
  costDay,
  blocks,
}: {
  yieldDay: number;
  costDay: number;
  blocks: number;
}) {
  const net = yieldDay - costDay;
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Billing & ROI · 24h rolling
        </h3>
        <span className="font-mono-num text-[10px] text-muted-foreground">
          Cost basis ~$3.00/node/day
        </span>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-4">
        <RoiCell label="Daily Yield" value={`$${yieldDay.toFixed(2)}`} tone="primary" />
        <RoiCell label="Daily Cost" value={`$${costDay.toFixed(2)}`} />
        <RoiCell
          label="Net / Day"
          value={`${net >= 0 ? "+" : ""}$${net.toFixed(2)}`}
          tone={net >= 0 ? "primary" : "destructive"}
        />
        <RoiCell
          label="Mesh Efficiency"
          value={yieldDay >= costDay ? "Optimal" : "Syncing"}
          tone={yieldDay >= costDay ? "primary" : "destructive"}
        />
        <RoiCell label="Total Blocks Found" value={String(blocks)} tone="accent" />
        <RoiCell label="Projected 30d" value={`$${(net * 30).toFixed(0)}`} />
        <RoiCell label="Break-even" value={costDay > 0 ? `${(costDay / Math.max(0.01, yieldDay) * 24).toFixed(1)}h` : "—"} />
        <RoiCell label="Settlement" value="On-chain · auto" />
      </div>
    </section>
  );
}

function RoiCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "destructive" | "accent";
}) {
  const color =
    tone === "destructive"
      ? "text-destructive"
      : tone === "accent"
        ? "text-accent"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`font-mono-num mt-1 text-xl font-semibold ${color}`}>
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TELEMETRY SIMULATION                                                      */
/* -------------------------------------------------------------------------- */

function simulate(node: NodeRow, now: number) {
  const seed = node.id.charCodeAt(0) + node.id.charCodeAt(1);
  const t = now / 1000;
  const active = node.status === "active";
  const baseHash = active ? 883 : node.status === "syncing" ? 410 : 0;
  const basePower = active ? node.power_cap_w * 0.92 : 18;
  const baseGpu = active ? 72 : 38;
  const baseVram = active ? 68 : 36;

  const hist = (base: number, amp: number, freq: number) =>
    Array.from({ length: 48 }, (_, i) => {
      const x = t - (47 - i) * 0.6 + seed;
      return Math.max(0, base + Math.sin(x * freq) * amp + Math.cos(x * freq * 0.4) * amp * 0.6);
    });

  const hashHistory = hist(baseHash, baseHash * 0.05, 0.7);
  const powerHistory = hist(basePower, active ? 5 : 1, 0.5);
  const tempHistory = hist(baseGpu, 2.4, 0.3);

  return {
    hashrate: hashHistory[hashHistory.length - 1],
    power: powerHistory[powerHistory.length - 1],
    gpuTemp: tempHistory[tempHistory.length - 1],
    vramTemp: tempHistory[tempHistory.length - 1] - (baseGpu - baseVram),
    hashHistory,
    powerHistory,
    tempHistory,
  };
}
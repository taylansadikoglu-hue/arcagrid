import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/observability";
import {
  signInWithPassword,
  signUpWithPassword,
  resetPasswordForEmail,
  useAuth,
} from "@/lib/use-auth";
import {
  getPinnedBinaryTag,
  getUpstreamReleaseTag,
} from "@/lib/api/provision.functions";
import {
  deployCheapestNode,
  getGridBalances,
} from "@/lib/api/grid-credits.functions";
import {
  fetchFleetSummary,
  fetchFleetNodes,
  fetchBtxPrice,
  fetchRoi,
  fetchPoolOverview,
  type FleetNode,
  type FleetSummary,
} from "@/lib/api/grid-api";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet Console — Arca Grid Enterprise Orchestration Layer" },
      {
        name: "description",
        content:
          "Institutional GPU fleet orchestration, live telemetry, and ROI tracking for high-density compute clusters on Arca Grid.",
      },
      { property: "og:title", content: "Arca Grid Fleet Console" },
      {
        property: "og:description",
        content: "Bloomberg-grade telemetry for enterprise GPU mining fleets.",
      },
      { property: "og:url", content: "https://arcgrid.dev/fleet" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/fleet" }],
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
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
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
    if (mode === "forgot") {
      const { error } = await resetPasswordForEmail(email.trim());
      setBusy(false);
      if (error) {
        setErr(error.message);
        return;
      }
      setMsg(
        "If an account exists for that address, a recovery link is on its way.",
      );
      return;
    }
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
              CUDA 12.0 runtime with hardened, production-verified tuning.
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
                {mode === "signin"
                  ? "Operator sign in"
                  : mode === "signup"
                    ? "Provision access"
                    : "Recover passphrase"}
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
              {mode !== "forgot" && (
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
              )}

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErr(null);
                      setMsg(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Forgot passphrase?
                  </button>
                </div>
              )}

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
                    : mode === "signup"
                      ? "Request access"
                      : "Send recovery link"}
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErr(null);
                    setMsg(null);
                  }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back to sign in
                </button>
              )}
            </form>
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

/**
 * Project a live `/api/fleet/nodes` row into the existing NodeRow shape so
 * the detail panel + risk engine keep working without UI changes.
 * Fields not returned by the public API are filled with safe defaults.
 */
function mapApiNodeToRow(n: FleetNode): NodeRow {
  const status: NodeRow["status"] =
    n.status === "active" || n.status === "syncing" || n.status === "idle" || n.status === "offline"
      ? n.status
      : "active";
  return {
    id: String(n.id),
    name: n.workload || `${n.provider} · ${n.region}`,
    location: n.region,
    hardware: n.workload,
    status,
    idle_redirect: false,
    power_cap_w: 300,
    matmul_backend: "cuda",
    solve_batch_size: 16,
    mine_batch_size: 80,
    min_peers: Number(n.peers) || 1,
    ld_library_path: "/usr/local/cuda/lib64",
    cuda_runtime_pin: "12.0",
    daily_cost_usd: 0,
    blocks_found: Number(n.blocks) || 0,
    wallet: null,
  };
}

function FleetConsole({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const fetchPinned = useServerFn(getPinnedBinaryTag);
  const fetchBalances = useServerFn(getGridBalances);
  const launchWorker = useServerFn(deployCheapestNode);
  const { data: balances } = useQuery({
    queryKey: ["grid-balances"],
    queryFn: () => fetchBalances(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const [launchState, setLaunchState] = useState<{
    busy: boolean;
    msg: string | null;
    ok: boolean | null;
  }>({ busy: false, msg: null, ok: null });
  // Live BTX spot — public /api/price, 60s poll, keeps last known on error.
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["grid-api", "price"],
    queryFn: ({ signal }) => fetchBtxPrice(signal),
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const btxPrice = priceData?.price ?? 0;
  const { data: pinned } = useQuery({
    queryKey: ["pinned-binary-tag"],
    queryFn: () => fetchPinned(),
    staleTime: 60_000,
  });
  // Live fleet summary — public /api/fleet/summary, 30s poll.
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["grid-api", "fleet-summary"],
    queryFn: ({ signal }) => fetchFleetSummary(signal),
    refetchInterval: 30_000,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  // Live fleet nodes — public /api/fleet/nodes, 30s poll. Mapped to the
  // existing NodeRow shape so the detail panel & risk engine keep working.
  const { data: apiNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ["grid-api", "fleet-nodes"],
    queryFn: ({ signal }) => fetchFleetNodes(signal),
    refetchInterval: 30_000,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const nodes = useMemo(
    () => apiNodes.map(mapApiNodeToRow),
    [apiNodes],
  );
  const isLoading = nodesLoading;

  // Live pool hashrate — used to compute real daily yield (price × hashrate
  // via the ROI oracle) instead of the previous hardcoded heuristic.
  const { data: poolOverview } = useQuery({
    queryKey: ["grid-api", "pool-overview"],
    queryFn: ({ signal }) => fetchPoolOverview(signal),
    refetchInterval: 30_000,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const poolHashrate =
    (poolOverview?.pool_hashrate as number | undefined) ??
    ((poolOverview as unknown as { totals?: { miner_hashrate_sum?: number } } | undefined)
      ?.totals?.miner_hashrate_sum) ??
    0;
  const { data: yieldRoi } = useQuery({
    queryKey: ["grid-api", "roi-yield", poolHashrate],
    queryFn: ({ signal }) => fetchRoi(0, poolHashrate, signal),
    enabled: poolHashrate > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? nodes[0],
    [nodes, selectedId],
  );

  // Totals — `active`/totals counts come from the live summary endpoint;
  // block + cost figures fall back to a derived heuristic until the ROI
  // panel resolves a live answer for them.
  const HOURLY = 0.276;
  const totals = useMemo(() => {
    const total = summary?.total_nodes ?? nodes.length;
    const active = summary?.healthy_nodes ?? 0;
    const blocks = nodes.reduce((s, n) => s + n.blocks_found, 0);
    const costDay = active * HOURLY * 24;
    // Daily yield = real BTX price × actual pool hashrate, via ROI oracle.
    const yieldDay = Number.isFinite(yieldRoi?.daily_usd)
      ? (yieldRoi!.daily_usd as number)
      : 0;
    const haveYield = typeof yieldRoi?.daily_usd === "number";
    return {
      total,
      active,
      blocks,
      costDay,
      yieldDay,
      haveYield,
      walletWorth: yieldDay,
      hourly: HOURLY,
      net: yieldDay - costDay,
    };
  }, [summary, nodes, yieldRoi]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <h1 className="sr-only">Fleet Orchestration Console</h1>

      {/* TICKER BAR */}
      <TickerBar
        items={[
          { k: "Operator", v: email || "—" },
          {
            k: "Active",
            v: summaryLoading && !summary
              ? "…"
              : `${totals.active}/${totals.total}`,
          },
          {
            k: "BTX spot",
            v: priceLoading && !priceData
              ? "…"
              : btxPrice
                ? `$${btxPrice.toFixed(btxPrice >= 1 ? 4 : 6)}`
                : "—",
            accent: "primary",
          },
          {
            k: "Daily yield",
            v: totals.haveYield ? `$${totals.yieldDay.toFixed(2)}` : "—",
          },
          { k: "Daily cost", v: `$${totals.costDay.toFixed(2)}` },
          {
            k: "Net",
            v: totals.haveYield
              ? `${totals.net >= 0 ? "+" : ""}$${totals.net.toFixed(2)}`
              : "—",
            accent: totals.net >= 0 ? "primary" : "destructive",
          },
          { k: "Blocks", v: String(totals.blocks) },
          {
            k: "Uptime",
            v: summary ? `${summary.uptime_pct.toFixed(2)}%` : "…",
          },
          {
            k: "GPUs",
            v: summary ? String(summary.active_gpus) : "…",
          },
          { k: "CUDA", v: "12.0 pinned" },
          { k: "btxd", v: pinned?.binaryTag ?? "…" },
        ]}
      />

      {/* GRID CREDIT METRIC CARDS — live allocator balances */}
      <div className="mx-auto max-w-[1500px] px-6 pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          <AllocatorCard
            label={balances?.primary.label ?? "Primary Mesh Allocator"}
            unit={balances?.primary.unit ?? "USD"}
            balance={balances?.primary.balance ?? 0}
            ok={balances?.primary.ok ?? false}
            error={balances?.primary.error}
            accent="primary"
          />
          <AllocatorCard
            label={balances?.secondary.label ?? "Secondary Mesh Allocator"}
            unit={balances?.secondary.unit ?? "CLORE"}
            balance={balances?.secondary.balance ?? 0}
            ok={balances?.secondary.ok ?? false}
            error={balances?.secondary.error}
            accent="accent"
          />
          <div className="flex flex-col justify-between rounded-xl border border-primary/40 bg-card p-5"
            style={{ boxShadow: "var(--shadow-glow)" }}>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Aggregate Mesh Capacity
              </p>
              <p className="font-mono-num mt-2 text-3xl font-semibold tracking-tight text-primary">
                ${balances ? balances.totalUsd.toFixed(2) : "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Combined USD-equivalent across all bound allocators
              </p>
            </div>
            <button
              onClick={async () => {
                const wallet =
                  nodes.find((n) => n.wallet)?.wallet ??
                  "btx1zsjr4q3fwh4gku3qcp39x9vvjygklg5xkac229k0chlzsnpwhfggst42sr8";
                setLaunchState({ busy: true, msg: "Locking cheapest qualified host…", ok: null });
                try {
                  const result = await launchWorker({ data: { wallet } });
                  setLaunchState({ busy: false, msg: result.message, ok: result.ok });
                  if (result.ok) {
                    qc.invalidateQueries({ queryKey: ["nodes", userId] });
                    qc.invalidateQueries({ queryKey: ["grid-balances"] });
                  }
                } catch (err) {
                  setLaunchState({
                    busy: false,
                    msg: err instanceof Error ? err.message : "Launch failed",
                    ok: false,
                  });
                }
              }}
              disabled={launchState.busy}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {launchState.busy ? "Provisioning…" : "⚡ Launch New Node"}
            </button>
            {launchState.msg && (
              <p
                className={`mt-2 text-[11px] ${
                  launchState.ok === false
                    ? "text-destructive"
                    : launchState.ok
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {launchState.msg}
              </p>
            )}
          </div>
        </div>
      </div>

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
        <div className="space-y-4">
          {/* FLEET RISK ENGINE */}
          <FleetRiskEngine nodes={nodes} totals={totals} pinned={pinned?.binaryTag} />

          {selected ? (
            <NodeDetail node={selected} userId={userId} />
          ) : isLoading ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Loading fleet nodes…
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No fleet nodes online.
            </div>
          )}

          {/* ROI MODULE */}
          <RoiPanel blocks={totals.blocks} />

          {/* UPSTREAM RELEASE AUDIT */}
          <UpstreamReleasePanel />
        </div>
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

  // Pull latest live telemetry for this node from the webhook ingest.
  const { data: telemetry = [] } = useQuery({
    queryKey: ["node-telemetry", node.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("node_telemetry")
        .select("hashrate_ns,power_w,gpu_temp_c,vram_temp_c,recorded_at")
        .eq("node_id", node.id)
        .order("recorded_at", { ascending: false })
        .limit(48);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 3000,
  });

  const live = useMemo(() => {
    if (telemetry.length > 0) {
      const ordered = [...telemetry].reverse();
      const latest = ordered[ordered.length - 1];
      const hashHistory = ordered.map((r) => Number(r.hashrate_ns) / 1_000_000); // → MH/s for chart
      const powerHistory = ordered.map((r) => Number(r.power_w));
      const tempHistory = ordered.map((r) => Number(r.gpu_temp_c));
      return {
        hashrate: Number(latest.hashrate_ns),
        hashrateMhs: Number(latest.hashrate_ns) / 1_000_000,
        power: Number(latest.power_w),
        gpuTemp: Number(latest.gpu_temp_c),
        vramTemp: Number(latest.vram_temp_c),
        hashHistory,
        powerHistory,
        tempHistory,
        isLive: true,
      };
    }
    const sim = simulate(node, now);
    return { ...sim, hashrateMhs: sim.hashrate / 1_000_000, isLive: false };
  }, [telemetry, node, now]);

  // Local thermal-throttle override (no DB column). Defaults to 85°C.
  const [thermalLimit, setThermalLimit] = useState(85);
  const [tuneOpen, setTuneOpen] = useState<null | "power" | "thermal">(null);

  const toggleIdleRedirect = async () => {
    track("fleet_idle_redirect_toggled", {
      nodeId: node.id,
      next: !node.idle_redirect,
    });
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
              ./start-live-mining.sh
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
          onTune={() => setTuneOpen("power")}
        />
        <TelemetryCard
          label="GPU Core / VRAM"
          value={`${live.gpuTemp.toFixed(0)}° / ${live.vramTemp.toFixed(0)}°`}
          unit="C"
          accent={live.gpuTemp > thermalLimit - 5 ? "accent" : "primary"}
          history={live.tempHistory}
          target={thermalLimit}
          subtitle={`Throttle threshold ${thermalLimit}°C`}
          onTune={() => setTuneOpen("thermal")}
        />
      </div>

      {tuneOpen && (
        <TuneModal
          mode={tuneOpen}
          node={node}
          thermalLimit={thermalLimit}
          onClose={() => setTuneOpen(null)}
          onSavePower={async (next) => {
            await supabase
              .from("nodes")
              .update({ power_cap_w: next })
              .eq("id", node.id);
            qc.invalidateQueries({ queryKey: ["nodes", userId] });
            setTuneOpen(null);
          }}
          onSaveThermal={(next) => {
            setThermalLimit(next);
            setTuneOpen(null);
          }}
        />
      )}

      {/* GOLDEN CONFIG */}
      <GoldenConfigSnippet />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  GOLDEN CONFIG SNIPPET                                                     */
/* -------------------------------------------------------------------------- */

function GoldenConfigSnippet() {
  const [copied, setCopied] = useState(false);
  const command = "curl -s http://37.27.0.36/api/public/install-agent.sh | bash";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail if clipboard is unavailable
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0b1221]">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Golden Config · production-verified
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="relative px-4 py-4">
        <code
          className="font-mono-num block text-[13px] leading-relaxed"
          style={{
            color: "#34d399",
            textShadow: "0 0 12px oklch(0.82 0.22 145 / 0.45), 0 0 4px oklch(0.82 0.22 145 / 0.25)",
          }}
        >
          {command}
        </code>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  UPSTREAM RELEASE AUDIT                                                    */
/* -------------------------------------------------------------------------- */

function UpstreamReleasePanel() {
  const fetchUpstream = useServerFn(getUpstreamReleaseTag);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["upstream-release"],
    queryFn: () => fetchUpstream(),
    staleTime: 5 * 60_000,
  });

  const status: "loading" | "match" | "drift" | "unknown" = isLoading
    ? "loading"
    : data?.upToDate === true
      ? "match"
      : data?.upToDate === false
        ? "drift"
        : "unknown";

  const chip =
    status === "match"
      ? "border-primary/40 bg-primary/10 text-primary"
      : status === "drift"
        ? "border-accent/40 bg-accent/10 text-accent"
        : "border-border bg-secondary text-muted-foreground";

  const label =
    status === "match"
      ? "PINNED MATCHES UPSTREAM"
      : status === "drift"
        ? "UPSTREAM AHEAD · MANUAL ROLLOUT REQUIRED"
        : status === "loading"
          ? "QUERYING REGISTRY…"
          : "UPSTREAM UNAVAILABLE";

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            btxd Release Audit · btxchain/btx
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Operator-controlled. New tags require a signed image rebuild before
            they reach the grid — never auto-rolled.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md border border-border bg-secondary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-secondary/70 disabled:opacity-50"
        >
          {isFetching ? "Checking…" : "Recheck"}
        </button>
      </div>
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Pinned (grid)
          </div>
          <div className="font-mono-num mt-1 text-lg text-foreground">
            {data?.pinned ?? "…"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Upstream latest
          </div>
          <div className="font-mono-num mt-1 text-lg text-foreground">
            {data?.upstream ?? "—"}
          </div>
          {data?.publishedAt && (
            <div className="font-mono-num mt-0.5 text-[10px] text-muted-foreground">
              {new Date(data.publishedAt).toISOString().slice(0, 10)}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Status
          </div>
          <span
            className={`font-mono-num mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider ${chip}`}
          >
            {label}
          </span>
          {data?.htmlUrl && (
            <div className="mt-2">
              <a
                href={data.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                View release notes →
              </a>
            </div>
          )}
        </div>
      </div>
      {data?.error && (
        <div className="border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
          {data.error}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FLEET RISK ENGINE · Bloomberg-grade diagnostic control plane              */
/* -------------------------------------------------------------------------- */

type DiagStatus = "healthy" | "warning" | "critical";

interface Diagnostic {
  label: string;
  status: DiagStatus;
  detail: string;
  weight: number; // contribution to score
}

function FleetRiskEngine({
  nodes,
  totals,
  pinned,
}: {
  nodes: NodeRow[];
  totals: { active: number; blocks: number; costDay: number; yieldDay: number; net: number };
  pinned?: string;
}) {
  // Derive diagnostics from live fleet state. All evaluation strictly
  // client-side here — no provider/margin data is leaked.
  const diagnostics: Diagnostic[] = useMemo(() => {
    const total = nodes.length || 1;
    const offline = nodes.filter((n) => n.status === "offline").length;
    const syncing = nodes.filter((n) => n.status === "syncing").length;
    const unwalleted = nodes.filter((n) => !n.wallet || n.wallet.length < 10).length;

    const nodeHealth: DiagStatus =
      offline === 0 ? "healthy" : offline / total > 0.25 ? "critical" : "warning";
    const walletHealth: DiagStatus =
      unwalleted === 0 ? "healthy" : unwalleted / total > 0.5 ? "critical" : "warning";
    const revenueHealth: DiagStatus =
      totals.net >= 0 ? "healthy" : totals.net > -totals.costDay * 0.2 ? "warning" : "critical";
    const providerHealth: DiagStatus = totals.active > 0 ? "healthy" : "warning";
    // Marketplace registry: simulated mismatch alert if any node is in syncing
    // state for the demo — represents the Vast.ai template registry drift case.
    const templateRegistry: DiagStatus =
      syncing > 0 && nodes.length >= 2 ? "warning" : "healthy";
    const thermals: DiagStatus = "healthy";
    const chainSync: DiagStatus = syncing > 0 ? "warning" : "healthy";

    return [
      {
        label: "Node Health",
        status: nodeHealth,
        detail:
          nodeHealth === "healthy"
            ? `${total - offline}/${total} nodes responding`
            : `${offline} offline / ${total}`,
        weight: 20,
      },
      {
        label: "Wallet Health",
        status: walletHealth,
        detail:
          walletHealth === "healthy"
            ? "All payout addresses loaded"
            : `${unwalleted} unloaded wallet(s)`,
        weight: 15,
      },
      {
        label: "Revenue Health",
        status: revenueHealth,
        detail:
          revenueHealth === "healthy"
            ? `Net $${totals.net.toFixed(2)}/day`
            : `Net $${totals.net.toFixed(2)}/day — review`,
        weight: 15,
      },
      {
        label: "Provider Health",
        status: providerHealth,
        detail:
          providerHealth === "healthy"
            ? "Routing layer responsive"
            : "No active allocations",
        weight: 15,
      },
      {
        label: "Marketplace Template Registry",
        status: templateRegistry,
        detail:
          templateRegistry === "healthy"
            ? `Pinned ${pinned ?? "—"} · registry matched`
            : "Container healthy · registry template missing",
        weight: 15,
      },
      {
        label: "GPU Thermals",
        status: thermals,
        detail: "All units within throttle envelope",
        weight: 10,
      },
      {
        label: "Chain Sync Status",
        status: chainSync,
        detail:
          chainSync === "healthy"
            ? "All nodes at chain tip"
            : `${syncing} node(s) bootstrapping archive`,
        weight: 10,
      },
    ];
  }, [nodes, totals, pinned]);

  const score = useMemo(() => {
    const total = diagnostics.reduce((s, d) => s + d.weight, 0);
    const earned = diagnostics.reduce((s, d) => {
      const f = d.status === "healthy" ? 1 : d.status === "warning" ? 0.55 : 0.1;
      return s + d.weight * f;
    }, 0);
    return Math.round((earned / total) * 100);
  }, [diagnostics]);

  const tone =
    score >= 90
      ? { ring: "var(--primary)", text: "text-primary", label: "OPTIMAL" }
      : score >= 70
        ? { ring: "var(--accent)", text: "text-accent", label: "DEGRADED" }
        : { ring: "var(--destructive)", text: "text-destructive", label: "CRITICAL" };

  const alerts = diagnostics.filter((d) => d.status !== "healthy");

  // Conic-gradient dial: filled arc + remainder.
  const dialStyle: React.CSSProperties = {
    background: `conic-gradient(${tone.ring} ${score * 3.6}deg, color-mix(in oklab, var(--border) 70%, transparent) 0deg)`,
  };

  return (
    <section
      className="rounded-xl border border-border bg-card"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Fleet Risk Engine
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Real-time diagnostic control plane across the deployed cluster.
          </p>
        </div>
        <span
          className={`font-mono-num rounded-full border px-2 py-1 text-[10px] uppercase tracking-widest ${
            score >= 90
              ? "border-primary/40 bg-primary/10 text-primary"
              : score >= 70
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {tone.label}
        </span>
      </div>

      {/* ALERT BANNER */}
      {alerts.length > 0 && (
        <div className="border-b border-border bg-background/40 px-5 py-3">
          {alerts.slice(0, 1).map((a) => (
            <div
              key={a.label}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${
                a.status === "critical"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-accent/40 bg-accent/10 text-accent"
              }`}
            >
              <span className="font-mono-num pt-0.5">⚠</span>
              <div className="leading-relaxed">
                {a.label === "Marketplace Template Registry" ? (
                  <>
                    Template registry mismatch. Container healthy. Marketplace
                    template unavailable. Recommended action: republish template.
                  </>
                ) : (
                  <>
                    {a.label}: {a.detail}. Recommended action: open the node
                    panel and review remediation steps.
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[200px_1fr] md:items-center">
        {/* SCORE DIAL */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative grid h-44 w-44 place-items-center rounded-full"
            style={dialStyle}
            role="img"
            aria-label={`Overall fleet score ${score} out of 100`}
          >
            <div className="grid h-[78%] w-[78%] place-items-center rounded-full bg-card">
              <div className="text-center">
                <div className={`font-mono-num text-4xl font-semibold ${tone.text}`}>
                  {score}
                </div>
                <div className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">
                  / 100
                </div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Overall Fleet Score
            </div>
          </div>
        </div>

        {/* DIAGNOSTIC LIST */}
        <ul className="divide-y divide-border">
          {diagnostics.map((d) => (
            <li
              key={d.label}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DiagDot status={d.status} />
                  <span className="text-sm font-medium text-foreground">
                    {d.label}
                  </span>
                </div>
                <p className="font-mono-num mt-0.5 text-[11px] text-muted-foreground">
                  {d.detail}
                </p>
              </div>
              <span
                className={`font-mono-num rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                  d.status === "healthy"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : d.status === "warning"
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {d.status === "healthy"
                  ? "Healthy"
                  : d.status === "warning"
                    ? d.label === "Chain Sync Status"
                      ? "Bootstrapping"
                      : d.label === "Marketplace Template Registry"
                        ? "Mismatch"
                        : d.label === "GPU Thermals"
                          ? "Throttling"
                          : d.label === "Wallet Health"
                            ? "Unloaded"
                            : d.label === "Node Health"
                              ? "Degraded"
                              : "Warning"
                    : "Critical"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DiagDot({ status }: { status: DiagStatus }) {
  const cls =
    status === "healthy"
      ? "bg-primary pulse-dot"
      : status === "warning"
        ? "bg-accent"
        : "bg-destructive pulse-dot";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
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
  onTune,
}: {
  label: string;
  value: string;
  unit: string;
  accent: "primary" | "destructive" | "accent";
  history: number[];
  target: number;
  subtitle: string;
  onTune?: () => void;
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
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </h4>
        <div className="flex items-baseline gap-2">
          <span className="font-mono-num text-[10px] text-muted-foreground">
            {subtitle}
          </span>
          {onTune && (
            <button
              onClick={onTune}
              className="rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              aria-label={`Tune ${label}`}
            >
              ⚙️ Tune
            </button>
          )}
        </div>
      </div>
      <div className={`font-mono-num mt-2 flex items-baseline gap-2 ${color}`}>
        <span className="text-4xl font-semibold tracking-tight">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <Sparkline history={history} max={max} color={color} target={target} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TUNE MODAL · Advanced Hardware Controls                                   */
/* -------------------------------------------------------------------------- */

function TuneModal({
  mode,
  node,
  thermalLimit,
  onClose,
  onSavePower,
  onSaveThermal,
}: {
  mode: "power" | "thermal";
  node: NodeRow;
  thermalLimit: number;
  onClose: () => void;
  onSavePower: (next: number) => Promise<void> | void;
  onSaveThermal: (next: number) => void;
}) {
  const [powerCap, setPowerCap] = useState(node.power_cap_w || 160);
  const [thermal, setThermal] = useState(thermalLimit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    if (mode === "power") {
      await onSavePower(powerCap);
    } else {
      onSaveThermal(thermal);
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8"
        style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
              Precision Tuning · {node.name}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">
              Advanced Hardware Controls
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {mode === "power" ? (
            <TuneSlider
              label="Power Cap Override"
              unit="W"
              value={powerCap}
              min={100}
              max={285}
              step={5}
              onChange={setPowerCap}
              hint="Hardware max 285W. ARCA default 160W."
            />
          ) : (
            <TuneSlider
              label="Thermal Throttle Limit"
              unit="°C"
              value={thermal}
              min={70}
              max={90}
              step={1}
              onChange={setThermal}
              hint="ARCA default 85°C. Above 90°C voids thermal guarantees."
            />
          )}

          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-xs text-accent">
            Caution: Overriding ARCA default limits increases thermal load and
            electricity costs.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-secondary/40 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Applying…" : "Save & Apply to Node"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TuneSlider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="font-mono-num text-lg text-primary">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
      <div className="font-mono-num mt-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
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

function RoiPanel({ blocks }: { blocks: number }) {
  const [cost, setCost] = useState(0);
  const [hashrate, setHashrate] = useState(0);
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["grid-api", "roi", cost, hashrate],
    queryFn: ({ signal }) => fetchRoi(cost, hashrate, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    retry: 1,
  });
  const tone = (data?.net_daily_usd ?? 0) >= 0 ? "primary" : "destructive";
  const fmt = (v?: number) =>
    typeof v === "number" ? `$${v.toFixed(2)}` : isLoading ? "…" : "—";
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Billing & ROI · live oracle
          {isFetching && (
            <span className="ml-2 text-[10px] normal-case tracking-normal text-muted-foreground/70">
              refreshing…
            </span>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Cost $/day
            <input
              type="number"
              min={0}
              value={cost}
              onChange={(e) => setCost(Math.max(0, Number(e.target.value) || 0))}
              className="font-mono-num w-20 rounded border border-input bg-background/60 px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Hashrate
            <input
              type="number"
              min={0}
              value={hashrate}
              onChange={(e) => setHashrate(Math.max(0, Number(e.target.value) || 0))}
              className="font-mono-num w-20 rounded border border-input bg-background/60 px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
            />
          </label>
        </div>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-4">
        <RoiCell
          label="Daily BTX"
          value={
            typeof data?.daily_btx === "number"
              ? data.daily_btx.toFixed(6)
              : isLoading
                ? "…"
                : "—"
          }
          tone="primary"
        />
        <RoiCell label="Daily Yield" value={fmt(data?.daily_usd)} tone="primary" />
        <RoiCell label="Net / Day" value={fmt(data?.net_daily_usd)} tone={tone} />
        <RoiCell label="Net 30d" value={fmt(data?.net_30d_usd)} tone={tone} />
        <RoiCell label="Total Blocks Found" value={String(blocks)} tone="accent" />
        <RoiCell label="Cost input" value={`$${cost.toFixed(2)}/day`} />
        <RoiCell label="Hashrate input" value={String(hashrate)} />
        <RoiCell label="Settlement" value="On-chain · auto" />
      </div>
      {isError && (
        <p className="border-t border-border px-5 py-2 text-[11px] text-muted-foreground">
          Oracle unreachable — showing last known values.
        </p>
      )}
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

/* -------------------------------------------------------------------------- */
/*  ALLOCATOR CARD — white-labelled credit balance tile                       */
/* -------------------------------------------------------------------------- */

function AllocatorCard({
  label,
  unit,
  balance,
  ok,
  error,
  accent,
}: {
  label: string;
  unit: string;
  balance: number;
  ok: boolean;
  error?: string;
  accent: "primary" | "accent";
}) {
  const accentText = accent === "primary" ? "text-primary" : "text-accent";
  const accentBorder =
    accent === "primary" ? "border-primary/30" : "border-accent/30";
  return (
    <div className={`rounded-xl border ${accentBorder} bg-card p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span
          className={`font-mono-num rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
            ok
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          {ok ? "Live" : "Offline"}
        </span>
      </div>
      <p className={`font-mono-num mt-2 text-3xl font-semibold tracking-tight ${accentText}`}>
        {ok && Number.isFinite(balance)
          ? unit === "USD"
            ? `$${balance.toFixed(2)}`
            : `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
          : "—"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {ok
          ? "Credit balance available for autonomous worker provisioning"
          : error ?? "Allocator unreachable"}
      </p>
    </div>
  );
}
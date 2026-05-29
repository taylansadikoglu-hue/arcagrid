import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/grid")({
  head: () => ({
    meta: [
      { title: "Grid Orchestration Console — ARCA GRID" },
      {
        name: "description",
        content:
          "Enterprise GPU orchestration dashboard for the Sovereign Distributed Grid Mesh.",
      },
    ],
  }),
  component: GridConsole,
});

/* ---------- mocked telemetry ---------- */

type NodeStatus = "Active Mining" | "Provisioning" | "Syncing" | "Degraded";

interface FleetNode {
  id: string;
  name: string;
  status: NodeStatus;
  powerW: number;
  vramUsedGb: number;
  vramTotalGb: number;
  tempC: number;
  syncLocal: number;
  region: string;
}

const NETWORK_HEADERS = 114_318;

const SEED_NODES: FleetNode[] = [
  { id: "n01", name: "arca-node-eu-01", status: "Active Mining", powerW: 312, vramUsedGb: 21.4, vramTotalGb: 24, tempC: 64, syncLocal: 114_318, region: "EU-WEST" },
  { id: "n02", name: "arca-node-eu-02", status: "Active Mining", powerW: 298, vramUsedGb: 19.8, vramTotalGb: 24, tempC: 61, syncLocal: 114_318, region: "EU-WEST" },
  { id: "n03", name: "arca-node-us-04", status: "Active Mining", powerW: 335, vramUsedGb: 22.6, vramTotalGb: 24, tempC: 68, syncLocal: 114_310, region: "US-EAST" },
  { id: "n04", name: "arca-node-us-07", status: "Syncing",       powerW: 180, vramUsedGb: 6.2,  vramTotalGb: 24, tempC: 52, syncLocal: 102_540, region: "US-EAST" },
  { id: "n05", name: "arca-node-ap-02", status: "Active Mining", powerW: 305, vramUsedGb: 20.1, vramTotalGb: 24, tempC: 66, syncLocal: 114_316, region: "AP-SOUTH" },
  { id: "n06", name: "arca-node-ap-05", status: "Provisioning",  powerW: 0,   vramUsedGb: 0,    vramTotalGb: 24, tempC: 38, syncLocal: 0,       region: "AP-SOUTH" },
  { id: "n07", name: "arca-node-eu-09", status: "Degraded",      powerW: 210, vramUsedGb: 14.0, vramTotalGb: 24, tempC: 78, syncLocal: 114_201, region: "EU-WEST" },
  { id: "n08", name: "arca-node-us-12", status: "Active Mining", powerW: 322, vramUsedGb: 22.1, vramTotalGb: 24, tempC: 65, syncLocal: 114_318, region: "US-WEST" },
];

function jitter(seed: number, amp: number, t: number) {
  return (Math.sin(t / 1500 + seed) + Math.cos(t / 900 + seed * 1.7)) * amp * 0.5;
}

function useLiveNodes(): FleetNode[] {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1500);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    return SEED_NODES.map((n, i) => {
      if (n.status === "Provisioning") return n;
      if (n.status === "Syncing") {
        const newSync = Math.min(NETWORK_HEADERS, n.syncLocal + Math.floor(((t / 1000) % 60) * 12));
        return { ...n, syncLocal: newSync };
      }
      return {
        ...n,
        powerW: Math.max(0, Math.round(n.powerW + jitter(i, 14, t))),
        vramUsedGb: Math.max(0, +(n.vramUsedGb + jitter(i + 3, 0.6, t)).toFixed(1)),
        tempC: Math.max(30, Math.round(n.tempC + jitter(i + 7, 2.4, t))),
      };
    });
  }, [t]);
}

/* ---------- page ---------- */

function GridConsole() {
  const nodes = useLiveNodes();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="relative">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <Header nodes={nodes} />
          <FleetTable nodes={nodes} />
          <div className="mt-6 grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3"><DeploymentHub /></div>
            <div className="lg:col-span-2"><PoolRouting /></div>
          </div>
          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            Our proprietary intelligent routing layer dynamically matches your
            session with the highest-efficiency nodes across the global mesh.
          </p>
        </div>
      </main>
    </div>
  );
}

function Header({ nodes }: { nodes: FleetNode[] }) {
  const active = nodes.filter((n) => n.status === "Active Mining").length;
  const totalPower = nodes.reduce((s, n) => s + n.powerW, 0);
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono-num text-[11px] uppercase tracking-widest text-primary">
          Sovereign Distributed Grid Mesh · Console
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Grid Orchestration <span className="text-primary">Telemetry</span>
        </h1>
      </div>
      <div className="flex gap-2">
        <Pill label="Fleet" value={`${nodes.length} nodes`} />
        <Pill label="Active" value={`${active}`} accent="green" />
        <Pill label="Power Draw" value={`${(totalPower / 1000).toFixed(2)} kW`} accent="amber" />
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "amber";
}) {
  const color =
    accent === "green"
      ? "text-[oklch(0.82_0.20_145)]"
      : accent === "amber"
        ? "text-[oklch(0.82_0.17_75)]"
        : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`font-mono-num text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

/* ---------- fleet table ---------- */

function FleetTable({ nodes }: { nodes: FleetNode[] }) {
  return (
    <section
      className="rounded-2xl border border-border bg-card/70 backdrop-blur"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Enterprise Fleet Telemetry
        </h2>
        <span className="font-mono-num text-[11px] text-muted-foreground">
          Live · refresh 1.5s
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Node</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Power</th>
              <th className="px-3 py-2.5 font-medium">VRAM</th>
              <th className="px-3 py-2.5 font-medium">GPU Temp</th>
              <th className="px-5 py-2.5 font-medium">Grid Blockchain Sync</th>
            </tr>
          </thead>
          <tbody className="font-mono-num">
            {nodes.map((n) => (
              <NodeRow key={n.id} n={n} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NodeRow({ n }: { n: FleetNode }) {
  const tempColor =
    n.tempC >= 75
      ? "text-[oklch(0.72_0.20_30)]"
      : n.tempC >= 65
        ? "text-[oklch(0.82_0.17_75)]"
        : "text-[oklch(0.82_0.20_145)]";
  const vramPct = n.vramTotalGb ? n.vramUsedGb / n.vramTotalGb : 0;
  const syncPct = NETWORK_HEADERS ? n.syncLocal / NETWORK_HEADERS : 0;

  return (
    <tr className="border-t border-border/50 transition-colors hover:bg-primary/5">
      <td className="px-5 py-3">
        <div className="text-foreground">{n.name}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {n.region}
        </div>
      </td>
      <td className="px-3 py-3"><StatusCell status={n.status} /></td>
      <td className="px-3 py-3 text-foreground">{n.powerW} W</td>
      <td className="px-3 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-foreground">{n.vramUsedGb.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">/ {n.vramTotalGb} GB</span>
        </div>
        <MiniBar pct={vramPct} tone="cyan" />
      </td>
      <td className={`px-3 py-3 ${tempColor}`}>{n.tempC}°C</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <SyncBar pct={syncPct} />
          <span className="text-[10px] text-muted-foreground">
            {n.syncLocal.toLocaleString()} / {NETWORK_HEADERS.toLocaleString()}
          </span>
        </div>
      </td>
    </tr>
  );
}

function StatusCell({ status }: { status: NodeStatus }) {
  const map: Record<NodeStatus, { dot: string; text: string; ring: string }> = {
    "Active Mining": {
      dot: "bg-[oklch(0.82_0.20_145)] shadow-[0_0_10px_oklch(0.82_0.20_145/0.9)]",
      text: "text-[oklch(0.82_0.20_145)]",
      ring: "border-[oklch(0.82_0.20_145/0.4)] bg-[oklch(0.82_0.20_145/0.08)]",
    },
    Provisioning: {
      dot: "bg-[oklch(0.82_0.17_75)]",
      text: "text-[oklch(0.82_0.17_75)]",
      ring: "border-[oklch(0.82_0.17_75/0.4)] bg-[oklch(0.82_0.17_75/0.08)]",
    },
    Syncing: {
      dot: "bg-primary",
      text: "text-primary",
      ring: "border-primary/40 bg-primary/10",
    },
    Degraded: {
      dot: "bg-destructive",
      text: "text-destructive",
      ring: "border-destructive/40 bg-destructive/10",
    },
  };
  const s = map[status];
  const animate = status === "Active Mining" || status === "Syncing";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.ring} ${s.text}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot} ${animate ? "pulse-dot" : ""}`} />
      {status}
    </span>
  );
}

function MiniBar({ pct, tone }: { pct: number; tone: "cyan" | "green" }) {
  const color = tone === "cyan" ? "bg-primary" : "bg-[oklch(0.82_0.20_145)]";
  return (
    <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-background/60">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
    </div>
  );
}

function SyncBar({ pct }: { pct: number }) {
  const complete = pct >= 0.999;
  return (
    <div className="relative h-1.5 w-40 overflow-hidden rounded-full border border-border bg-background/60">
      <div
        className={`h-full rounded-full ${complete ? "bg-[oklch(0.82_0.20_145)]" : "bg-primary"}`}
        style={{
          width: `${Math.min(100, pct * 100)}%`,
          boxShadow: complete
            ? "0 0 10px oklch(0.82 0.20 145 / 0.7)"
            : "var(--shadow-glow)",
        }}
      />
    </div>
  );
}

/* ---------- deployment hub ---------- */

type HashMode = "standard" | "pro";

function DeploymentHub() {
  const [wallet, setWallet] = useState("");
  const [mode, setMode] = useState<HashMode>("standard");
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState<string | null>(null);
  const valid = wallet.trim().length >= 8 && wallet.trim().length <= 128;

  const launch = () => {
    if (!valid || launching) return;
    setLaunching(true);
    setLaunched(null);
    setTimeout(() => {
      setLaunching(false);
      const id = `arca-${Math.random().toString(36).slice(2, 8)}`;
      setLaunched(id);
    }, 1400);
  };

  return (
    <section
      className="h-full rounded-2xl border border-primary/30 bg-card/70 p-6"
      style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          1-Click Deployment Hub
        </h2>
        <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
          Sovereign Mesh · Ready
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Target BTX Wallet Address
          </span>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="bc1q…"
            minLength={8}
            maxLength={128}
            spellCheck={false}
            className="font-mono-num mt-1.5 w-full rounded-md border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <span className="mt-1.5 block text-[10px] text-muted-foreground">
            <span className="text-primary">▲</span> Non-custodial — addresses
            route mining rewards directly from the pool.
          </span>
        </label>

        <ModeToggle mode={mode} onChange={setMode} />

        <button
          onClick={launch}
          disabled={!valid || launching}
          className="group relative w-full overflow-hidden rounded-md border border-primary/40 bg-primary px-5 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {launching ? "Provisioning Grid Instance…" : "▶ Deploy Sovereign Grid Instance"}
        </button>

        {launched && (
          <div className="rounded-md border border-[oklch(0.82_0.20_145/0.4)] bg-[oklch(0.82_0.20_145/0.08)] p-3 text-xs">
            <div className="font-mono-num text-[oklch(0.82_0.20_145)]">
              ✓ Instance {launched} dispatched · matched on Sovereign Distributed Grid Mesh
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Container <span className="font-mono-num">taylans/btx-oneclick-miner:latest</span> initializing with verified performance profile.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: HashMode;
  onChange: (m: HashMode) => void;
}) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        Hashrate Profile
      </span>
      <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-md border border-border bg-background/40 p-1">
        {([
          { id: "standard", title: "Standard Hashrate", sub: "Optimized Grid Capacity" },
          { id: "pro",      title: "Pro Hashrate",      sub: "Max Density Compute Clusters" },
        ] as const).map((opt) => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`rounded-md px-3 py-2.5 text-left transition-all ${
                active
                  ? "border border-primary/40 bg-primary/10 text-foreground"
                  : "border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="text-xs font-semibold">{opt.title}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{opt.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- pool routing (admin) ---------- */

function PoolRouting() {
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState("");
  const stratum = pool.trim();

  return (
    <section
      className="h-full rounded-2xl border border-border bg-card/70 p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3"
      >
        <div className="text-left">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Stratum &amp; Pool Management
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-primary">
            Admin · Future-Proof Pool Routing
          </p>
        </div>
        <span className="font-mono-num text-xs text-muted-foreground">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Custom Pool URL
            </span>
            <input
              type="text"
              value={pool}
              onChange={(e) => setPool(e.target.value)}
              placeholder="stratum+tcp://pool.example.io:3333"
              maxLength={256}
              spellCheck={false}
              className="font-mono-num mt-1.5 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-xs outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div className="rounded-md border border-border/70 bg-background/50 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Prepared Deployment Variable
            </div>
            <div className="font-mono-num mt-1 break-all text-[11px] text-primary">
              BTX_POOL_STRATUM={stratum || "—"}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Auto-injected into every new Sovereign Grid Instance launched
              after save.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
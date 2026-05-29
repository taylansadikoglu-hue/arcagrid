import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";

import { SiteNav } from "@/components/SiteNav";
import { loadPrefs, savePrefs } from "@/lib/miner-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARCA GRID — Enterprise GPU Grid Orchestration Layer" },
      {
        name: "description",
        content:
          "Dynamic Configuration & Self-Healing Telemetry for large-scale compute fleets. 100% non-custodial.",
      },
      { property: "og:title", content: "ARCA GRID — Enterprise GPU Grid Orchestration Layer" },
      {
        property: "og:description",
        content:
          "Managed Optimized Capacity and High-Density Dedicated Compute, orchestrated across the ARCA GRID mesh.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="relative">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <Hero />
          <TierGrid />
          <RequestAccess />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="mb-12 max-w-3xl">
      <p className="font-mono-num text-[11px] uppercase tracking-widest text-primary">
        Autonomous Remote Cluster Architecture
      </p>
      <h1 className="mt-3 text-4xl font-bold uppercase tracking-tight sm:text-5xl">
        Enterprise GPU Grid <span className="text-primary">Orchestration Layer</span>
      </h1>
      <p className="mt-4 text-sm text-muted-foreground sm:text-base">
        Dynamic Configuration & Self-Healing Telemetry for Large-Scale Compute
        Fleets. 100% Non-Custodial.
      </p>
    </section>
  );
}

const ENTERPRISE_TIERS = [
  {
    name: "ARCA Edge Engine",
    bullets: [
      "Dynamic Profile Injection via API",
      "Automated Watchdog Daemon",
      "GPU Utilization Optimization",
      "Dynamic Cluster Matrix Scaling",
    ],
    seed: 1,
  },
  {
    name: "ARCA Cluster Enterprise",
    bullets: [
      "Dynamic Profile Injection via API",
      "Automated Watchdog Daemon",
      "GPU Utilization Optimization",
      "Self-Healing Telemetry Fabric",
    ],
    seed: 2,
  },
] as const;

function TierGrid() {
  return (
    <section className="grid gap-5 sm:grid-cols-2">
      {ENTERPRISE_TIERS.map((t) => (
        <TierCard key={t.name} name={t.name} bullets={t.bullets} seed={t.seed} />
      ))}
    </section>
  );
}

function TierCard({
  name,
  bullets,
  seed,
}: {
  name: string;
  bullets: readonly string[];
  seed: number;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card/70 p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-xl font-semibold tracking-tight">{name}</h3>
      <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-primary">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <PerfGraph seed={seed} />
    </div>
  );
}

function PerfGraph({ seed }: { seed: number }) {
  // Deterministic abstract performance curve
  const points = useMemo(() => {
    const N = 24;
    const arr: number[] = [];
    for (let i = 0; i < N; i++) {
      const base = 0.25 + (i / N) * 0.55;
      const wobble =
        Math.sin((i + seed * 3) / 2.2) * 0.12 +
        Math.cos((i + seed) / 1.4) * 0.06;
      arr.push(Math.max(0.08, Math.min(0.95, base + wobble)));
    }
    return arr;
  }, [seed]);

  const W = 320;
  const H = 90;
  const step = W / (points.length - 1);
  const toY = (v: number) => H - v * H;
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");
  const area = `${path} L${W},${H} L0,${H} Z`;
  const gradId = `g-${seed}`;

  return (
    <div className="mt-5 rounded-md border border-border/70 bg-background/50 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-24 w-full">
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.84 0.16 200)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="oklch(0.84 0.16 200)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            x2={W}
            y1={H * g}
            y2={H * g}
            stroke="oklch(1 0 0 / 0.05)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={path}
          fill="none"
          stroke="oklch(0.84 0.16 200)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="font-mono-num mt-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Throughput</span>
        <span>Live · Optimized</span>
      </div>
    </div>
  );
}

function RequestAccess() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = wallet.trim();
    if (trimmed.length < 8 || trimmed.length > 128) return;
    setSubmitting(true);
    const prefs = loadPrefs();
    savePrefs({ ...prefs, wallet: trimmed });
    navigate({ to: "/checkout", search: { tier: "pro_24h" } });
  };

  return (
    <section
      className="mt-10 rounded-2xl border border-primary/30 bg-card/70 p-6"
      style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
    >
      <h2 className="text-base font-semibold uppercase tracking-widest text-foreground">
        Request Cluster Deployment / Demo
      </h2>
      <form
        onSubmit={onSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          required
          minLength={8}
          maxLength={128}
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Wallet Address"
          className="font-mono-num flex-1 rounded-md border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        >
          Request Access
        </button>
      </form>
      <p className="mt-3 text-[11px] text-muted-foreground">
        <span className="text-primary">▲</span> Addresses verified solely for
        direct pool mining reward routing. Non-custodial.
      </p>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="mt-10 border-t border-border/60 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 text-xs text-muted-foreground sm:grid-cols-3">
        <a href="/about" className="transition-colors hover:text-foreground">
          About the Grid Architecture
        </a>
        <span>Security Protocol · Encrypted Transit · Signed Sessions</span>
        <span>Contact Infrastructure Team · ops@arcgrid.dev</span>
      </div>
      <div className="font-mono-num mx-auto mt-6 max-w-7xl px-6 text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} ARCA GRID · Autonomous Remote Cluster Architecture
      </div>
    </footer>
  );
}

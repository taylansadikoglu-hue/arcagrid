import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SiteNav } from "@/components/SiteNav";
import {
  fetchPoolOverview,
  fetchPoolMiners,
  fetchBtxPrice,
  type PoolMiner,
} from "@/lib/api/grid-api";
import { fetchPublicWorkers, type MineBtxWorkerPublic } from "@/lib/api/grid-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARCA GRID — Enterprise GPU Orchestration Layer" },
      {
        name: "description",
        content:
          "Deploy, monitor and optimize distributed GPU infrastructure across providers from a single control plane. BTX, AI inference, training and custom workloads.",
      },
      { property: "og:title", content: "ARCA GRID — Enterprise GPU Orchestration Layer" },
      {
        property: "og:description",
        content:
          "Deploy, monitor and repair distributed GPU fleets from a single control plane.",
      },
      { property: "og:url", content: "https://arcgrid.dev/" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/" }],
  }),
  component: Landing,
});

const FEATURES = [
  {
    tag: "Deploy",
    title: "One-click fleet deployment",
    body: "Ship GPU workloads — BTX, AI inference, training, or your own container — across every provider in your fleet from a single command.",
  },
  {
    tag: "Monitor",
    title: "Live node health & telemetry",
    body: "Track node status, wallet balances, peer counts, block sync, temperatures, and GPU utilization in real time across the entire fleet.",
  },
  {
    tag: "Recover",
    title: "Autonomous watchdogs",
    body: "Detect stalled syncs, CUDA faults, dropped peers, and thermal events — then drain, restart, and reattach the workload without operator input.",
  },
  {
    tag: "Optimize",
    title: "Cross-provider performance",
    body: "Compare cost-per-hash, throughput, and reliability across providers, regions, and GPU classes. Re-route capacity to whatever's winning today.",
  },
];



const PAIN_POINTS = [
  "Silent node failures",
  "CUDA / driver mismatches",
  "Wallet & payout misconfiguration",
  "Lost peer connectivity",
  "Stalled chain synchronization",
  "Manual SSH-per-host fleet ops",
];

const WORKLOADS = ["BTX", "AI Inference", "AI Training", "Custom Containers"];

const CAPABILITIES_TODAY = [
  "Node Monitoring",
  "Wallet Monitoring",
  "Chain Synchronization Monitoring",
  "Peer Monitoring",
  "Health Telemetry",
  "Multi-Provider Visibility",
];

const CAPABILITIES_NEXT = [
  "One-click Deployment",
  "Automated Recovery",
  "Fleet Scheduling",
  "Capacity Optimization",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Live fleet · arcgrid.dev
            </span>
            <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
              <span className="text-primary">ARCA</span>: Autonomous Remote
              <br />
              Cluster Architecture
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Turn idle GPUs into revenue. Automatically.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/deploy"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                Deploy Fleet →
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary/40 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-secondary"
              >
                View Dashboard
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {WORKLOADS.map((w) => (
                <span
                  key={w}
                  className="font-mono-num rounded-md border border-border bg-card/60 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* JOIN THE POOL (merged pool overview + CTA + stratum) */}
      <PoolSection />

      {/* ROI CALCULATOR */}
      <RoiCalculator />

      {/* LIVE FLEET PREVIEW */}
      <LiveFleetSection />

      {/* FEATURES */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Deploy. Monitor. Recover. Optimize.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Four operational primitives, one control plane — covering the
              full lifecycle of a distributed GPU node.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {FEATURES.map((c) => (
              <article
                key={c.title}
                className="flex flex-col rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/40"
              >
                <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
                  {c.tag}
                </span>
                <h3 className="mt-2 text-base font-semibold tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TIERS */}
      <PricingSection />

      {/* WHY ARCA GRID */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
                Why Arca Grid
              </span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Built from real operational pain.
              </h2>
              <p className="mt-4 text-muted-foreground">
                We didn't start with a business plan. We started by spending
                weeks fixing broken CUDA environments, stalled chain
                synchronization, wallet misconfigurations, dropped peers and
                unhealthy nodes across multiple providers. ArcGrid was built
                to eliminate that operational burden.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAIN_POINTS.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card/40 px-3 py-2.5 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
              Roadmap
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Current Capabilities
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              What ArcGrid does today, and what's shipping next.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-card/60 p-6">
              <h3 className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
                Today
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                {CAPABILITIES_TODAY.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-foreground">
                    <span className="mt-0.5 text-primary">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card/40 p-6">
              <h3 className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">
                Coming Next
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {CAPABILITIES_NEXT.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FLEET CTA */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div
            className="rounded-2xl border border-primary/30 bg-card p-8 sm:p-12"
            style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
          >
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
                  Fleet Management
                </span>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Operate the fleet from a single console
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Allocate nodes, inspect leases, watch thermal envelopes, and
                  reconcile payouts across every workload in your fleet — all
                  from the authenticated operator console.
                </p>
              </div>
              <Link
                to="/fleet"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Open Fleet Console →
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <span>Looking for single-node retail deployment instead?</span>
            <Link
              to="/deploy"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Deploy Your First BTX Node →
            </Link>
          </div>
        </div>
      </section>

      {/* FOUNDER NOTE */}
      <section className="border-t border-border/60 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
            Built by operators
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            From the workbench, not the whitepaper.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            ArcGrid was created from real-world experience deploying and
            maintaining GPU infrastructure for BTX workloads across multiple
            providers. No buzzwords. No abstractions. Just better
            infrastructure operations.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Arca Grid</span>
          <span className="font-mono-num text-muted-foreground">
            Arca Grid · The Operating System for Distributed GPU Fleets
          </span>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  PRICING TIERS                                                             */
/* -------------------------------------------------------------------------- */

function PricingSection() {
  return <PricingSectionInner />;
}

const MANAGED_TIERS: Array<{
  id: string;
  pkg: string;
  name: string;
  price: number;
  specs: string;
  features: string[];
  highlight?: boolean;
  tier: "standard_monthly" | "pro_monthly";
}> = [
  {
    id: "tier1",
    pkg: "Tier 1",
    name: "Grid Node · Tier 1",
    price: 199,
    specs:
      "Dedicated 1× Standard Performance Core — optimized for entry-level retail hashing loops.",
    features: [
      "Automated smart wallet routing",
      "Priority bootstrap sync",
      "Fault-tolerant protection",
    ],
    tier: "standard_monthly",
  },
  {
    id: "tier2",
    pkg: "Tier 2",
    name: "Mesh Compute · Tier 2",
    price: 349,
    specs:
      "Dedicated Multi-GPU High-Efficiency Array — optimized for aggressive pool block-hunting.",
    features: [
      "Priority allocator weight",
      "Dedicated mesh routing",
      "Hardened daemon peer flags",
    ],
    highlight: true,
    tier: "pro_monthly",
  },
  {
    id: "tier3",
    pkg: "Tier 3",
    name: "Industrial Beast Cluster",
    price: 899,
    specs:
      "Dedicated Flagship Liquid-Cooled Enterprise Framework — optimized for solo sniping and deep algorithmic processing.",
    features: [
      "Golden-configuration priority tuning",
      "Dedicated low-latency lanes",
      "Elite risk-engine access",
    ],
    tier: "pro_monthly",
  },
];

function ManagedTiers() {
  return (
    <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-3">
      {MANAGED_TIERS.map((t) => (
        <article
          key={t.id}
          className={`relative flex flex-col rounded-2xl border p-7 ${
            t.highlight
              ? "border-primary/50 bg-card"
              : "border-border bg-card/80"
          }`}
          style={
            t.highlight
              ? { boxShadow: "var(--shadow-glow), var(--shadow-card)" }
              : undefined
          }
        >
          {t.highlight && (
            <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Most Popular
            </span>
          )}
          <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
            {t.pkg}
          </span>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">
            {t.name}
          </h3>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono-num text-4xl font-semibold tracking-tight">
              ${t.price}
            </span>
            <span className="text-sm text-muted-foreground">/ Month</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t.specs}
          </p>

          <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono-num text-[10px] font-semibold uppercase tracking-widest text-primary">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            ⚡ Pay to Mine in under 30 Mins
          </div>

          <ul className="mt-4 space-y-2 text-sm">
            {t.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-muted-foreground"
              >
                <span className="mt-0.5 text-primary">✓</span>
                <span className="text-foreground/90">{f}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/checkout"
            search={{ tier: t.tier }}
            className={`mt-6 w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all ${
              t.highlight
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : "border border-border bg-secondary/60 text-foreground hover:border-primary/40 hover:bg-secondary"
            }`}
          >
            Deploy Rig Instantly →
          </Link>
        </article>
      ))}
    </div>
  );
}

function PricingSectionInner() {
  const [mode, setMode] = useState<"byo" | "managed">("byo");
  return (
    <section id="pricing" className="border-t border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
            Compute Tiers
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Pick how you deploy
          </h2>
          <p className="mt-3 text-muted-foreground">
            Bring your own rigs and keep 95% of the upside, or rent fully
            managed grid capacity. Every path rides the same hardened mesh.
          </p>
        </div>

        {/* DEPLOYMENT MODE TOGGLE */}
        <div className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Deployment mode"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 p-1"
          >
            <button
              role="tab"
              aria-selected={mode === "byo"}
              onClick={() => setMode("byo")}
              className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
                mode === "byo"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bring Your Own Rigs (BYO)
            </button>
            <button
              role="tab"
              aria-selected={mode === "managed"}
              onClick={() => setMode("managed")}
              className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
                mode === "managed"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rent Arca Managed Nodes
            </button>
          </div>
        </div>

        {mode === "byo" ? (
          <div className="mx-auto mt-10 max-w-xl">
            <article
              className="relative flex flex-col rounded-2xl border border-accent/50 bg-card p-8"
              style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
            >
              <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                Zero Upfront
              </span>
              <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
                Bring Your Own Rigs
              </span>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Infrastructure Core
              </h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-mono-num text-4xl font-semibold tracking-tight text-primary">
                  5%
                </span>
                <span className="text-sm text-muted-foreground">
                  Flat Revenue Share
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Total fleet orchestration, automated kernel self-healing, and
                real-time telemetry updates. Keep 95% of your block rewards
                while we handle 100% of the upkeep and stability.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  "Automated kernel self-healing",
                  "Real-time telemetry & alerting",
                  "Hardened daemon peer flags",
                  "One-line install script registry",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <span className="mt-0.5 text-primary">✓</span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/checkout"
                search={{ tier: "partner_share" }}
                className="mt-7 w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground transition-all hover:brightness-110"
              >
                Activate Infrastructure Core →
              </Link>
            </article>
          </div>
        ) : (
          <ManagedTiers />
        )}

        {/* FAST-START GUARANTEE */}
        <div
          className="mx-auto mt-12 max-w-4xl rounded-2xl border border-primary/40 bg-card/80 p-8 text-center"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
            Fast-Start Guarantee
          </span>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            ⚡ Ready to Mine in Under 5 Minutes
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            No long sync times, no complex configurations. Select your tier,
            complete your secure payment routing, and our automated Cloudflare
            R2 fast-bootstrap engine will have your allocated grid hashing and
            streaming live payouts straight to your wallet in under 5 minutes.
            Guaranteed.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  LIVE ROI & PROFITABILITY ESTIMATOR                                        */
/* -------------------------------------------------------------------------- */

function RoiCalculator() {
  const GPU_NS = {
    "RTX 5060 Ti": 3500,
    "RTX 3070": 1800,
    "RTX 3080": 2800,
    "RTX 4070": 3200,
    "RTX 4090": 9000,
    Other: 1000,
  } as const;
  type GpuModel = keyof typeof GPU_NS;
  const [rigCost, setRigCost] = useState(3.6); // $/day
  const [gpuCount, setGpuCount] = useState(1);
  const [gpuModel, setGpuModel] = useState<GpuModel>("RTX 5060 Ti");
  const hashrate = GPU_NS[gpuModel] * gpuCount;

  const { data: priceData } = useQuery({
    queryKey: ["btx-price"],
    queryFn: ({ signal }) => fetchBtxPrice(signal),
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  const spotUsd = priceData?.price ?? 0;

  const result = useMemo(() => {
    // Yield model: 883 N/s reference ≈ 1.6 BTX/day (mock baseline).
    const dailyBtx = (hashrate / 883) * 1.6;
    const dailyYieldUsd = dailyBtx * spotUsd;
    const dailyCost = rigCost;
    const dailyNet = dailyYieldUsd - dailyCost;
    return {
      dailyBtx,
      dailyYieldUsd,
      dailyCost,
      dailyNet,
      net30: dailyNet * 30,
    };
  }, [rigCost, hashrate, spotUsd]);

  return (
    <section className="border-t border-border/60 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
            Calculator
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Live ROI &amp; Profitability Estimator
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Model your rig against current grid economics. Spot price syncs
            from <span className="font-mono-num">btxprice.com</span>.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-primary/30 bg-card"
          style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between border-b border-border bg-background/60 px-5 py-3">
            <span className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">
              arca · roi-engine
            </span>
            <span className="font-mono-num inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              BTX spot{spotUsd > 0 ? ` $${spotUsd.toFixed(4)}` : " loading…"}
            </span>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2">
            {/* INPUTS */}
            <div className="space-y-6 bg-card p-6">
              <RoiSlider
                label="What do you pay for your rig?"
                unit="$ / day"
                value={rigCost}
                min={1}
                max={40}
                step={0.5}
                format={(v) => `$${v.toFixed(2)}`}
                onChange={setRigCost}
              />
              <label className="block">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">How many GPUs do you have?</span>
                  <span className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">count</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={64}
                  step={1}
                  value={gpuCount}
                  onChange={(e) => setGpuCount(Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
                  className="font-mono-num mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-1.5 text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">What GPU do you have?</span>
                  <span className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">model</span>
                </div>
                <select
                  value={gpuModel}
                  onChange={(e) => setGpuModel(e.target.value as keyof typeof GPU_NS)}
                  className="font-mono-num mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-1.5 text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  {(Object.keys(GPU_NS) as GpuModel[]).map((g) => (
                    <option key={g} value={g}>{g} — {GPU_NS[g]} N/s</option>
                  ))}
                </select>
                <div className="font-mono-num mt-1 text-[11px] text-primary">
                  Total: {hashrate.toLocaleString()} N/s
                </div>
              </label>
              <div className="rounded-lg border border-border bg-background/50 px-4 py-3 text-[11px] text-muted-foreground">
                Defaults match a single tuned CUDA worker on the ARCA mesh
                (~883 N/s @ $3.60/day cost basis).
              </div>
            </div>

            {/* OUTPUTS */}
            <div className="grid grid-cols-2 gap-px bg-border">
              <RoiOutput
                label="Daily compute cost"
                value={`$${result.dailyCost.toFixed(2)}`}
                tone="muted"
              />
              <RoiOutput
                label="Daily earnings (BTX)"
                value={`${result.dailyBtx.toFixed(3)} BTX`}
                tone="primary"
                glow
              />
              <RoiOutput
                label="Daily yield (USD)"
                value={`$${result.dailyYieldUsd.toFixed(2)}`}
                tone="primary"
                glow
              />
              <RoiOutput
                label="Monthly take-home (USD)"
                value={`${result.net30 >= 0 ? "+" : ""}$${result.net30.toFixed(0)}`}
                tone={result.net30 >= 0 ? "primary" : "destructive"}
                glow
              />
            </div>
          </div>

          <div className="border-t border-border bg-background/40 px-5 py-3 text-center text-[11px] text-muted-foreground">
            Estimates based on current{" "}
            <span className="font-mono-num">btxprice.com</span> spot rates.
            Not financial advice.
          </div>
        </div>
      </div>
    </section>
  );
}

function RoiSlider({
  label,
  unit,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">
          {unit}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="font-mono-num w-24 rounded-md border border-input bg-background/60 px-2 py-1.5 text-right text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div className="font-mono-num mt-1 text-[11px] text-primary">
        {format(value)}
      </div>
    </label>
  );
}

function RoiOutput({
  label,
  value,
  tone,
  glow,
}: {
  label: string;
  value: string;
  tone: "primary" | "destructive" | "muted";
  glow?: boolean;
}) {
  const color =
    tone === "destructive"
      ? "text-destructive"
      : tone === "primary"
        ? "text-primary"
        : "text-foreground";
  return (
    <div className="bg-card px-5 py-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`font-mono-num mt-2 text-2xl font-semibold tracking-tight ${color}`}
        style={
          glow
            ? {
                textShadow:
                  "0 0 18px color-mix(in oklab, currentColor 55%, transparent)",
              }
            : undefined
        }
      >
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  LIVE FLEET SECTION — pulls /api/fleet/nodes (provider names masked)       */
/* -------------------------------------------------------------------------- */

function LiveFleetSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-arcgrid-workers"],
    queryFn: ({ signal }) => fetchPublicWorkers(signal),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  // Top 10 workers by hashrate.
  const workers: (MineBtxWorkerPublic & { _name: string; _hr: number })[] = useMemo(() => {
    const rows = (data ?? []).map((w) => ({
      ...w,
      _name: w.worker ?? w.name ?? "",
      _hr: (w.hashrate_ns ?? w.hashrate ?? 0) || 0,
    }));
    return rows.sort((a, b) => b._hr - a._hr).slice(0, 10);
  }, [data]);

  const stats = useMemo(() => {
    const total = (data ?? []).length;
    const live = (data ?? []).filter(
      (w) => typeof w.last_share_age_s === "number" && w.last_share_age_s < 3600,
    ).length;
    const offline = total - live;
    const pct = total > 0 ? (live / total) * 100 : 0;
    return [
      { value: total > 0 ? String(live) : "—", label: "Healthy rigs" },
      { value: total > 0 ? String(offline) : "—", label: "Offline rigs" },
      { value: total > 0 ? String(total) : "—", label: "Active rigs" },
      { value: total > 0 ? `${pct.toFixed(1)}%` : "—", label: "Fleet health" },
    ];
  }, [data]);

  return (
    <section className="border-t border-border/60 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-6 max-w-2xl pt-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Live Fleet Snapshot
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This data updates from active infrastructure monitored by Arca Grid.
          </p>
        </div>
        <div
          className="overflow-hidden rounded-2xl border border-primary/30 bg-card/80 backdrop-blur"
          style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="ml-3 font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
                arcgrid · fleet console
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono-num text-[10px] uppercase tracking-widest text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              live
            </span>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-border/60 bg-border/60 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-card/80 px-4 py-4">
                <div className="font-mono-num text-2xl font-semibold text-primary">
                  {s.value}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Rig</th>
                  <th className="px-4 py-3 font-medium">N/s</th>
                  <th className="px-4 py-3 font-medium">GPU%</th>
                  <th className="px-4 py-3 font-medium">Watts</th>
                  <th className="px-4 py-3 font-medium">Last Share</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono-num">
                {isLoading && workers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      Loading fleet…
                    </td>
                  </tr>
                ) : workers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      No rigs reporting.
                    </td>
                  </tr>
                ) : (
                  workers.map((w) => {
                    const age = w.last_share_age_s;
                    const healthy = typeof age === "number" && age < 3600;
                    const fmtAge = (s?: number) => {
                      if (typeof s !== "number" || !isFinite(s) || s < 0) return "—";
                      if (s < 60) return `${Math.floor(s)}s`;
                      if (s < 3600) return `${Math.floor(s / 60)}m`;
                      return `${Math.floor(s / 3600)}h`;
                    };
                    const gpu = w.gpu_pct ?? w.gpu;
                    const watts = w.watts ?? w.power;
                    return (
                      <tr
                        key={w._name}
                        className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{w._name}</span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono-num text-[9px] font-semibold uppercase tracking-widest text-primary">
                              <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-primary" />
                              Live
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-primary">
                          {w._hr > 0 ? w._hr.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {typeof gpu === "number" ? `${gpu}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {typeof watts === "number" ? `${watts}W` : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtAge(age)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                              healthy
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-secondary/40 text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                healthy ? "bg-primary pulse-dot" : "bg-muted-foreground"
                              }`}
                            />
                            {healthy ? "active" : "idle"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  POOL OVERVIEW + MINERS — pulls /api/pool and /api/miners                  */
/* -------------------------------------------------------------------------- */

interface PoolOverviewLive {
  connected_miners?: number;
  fee_percent?: number;
  totals?: {
    miner_hashrate_sum?: number;
    blocks?: number;
    shares?: number;
  };
  chain?: { height?: number };
}

function formatHashrate(hps: number): string {
  if (!hps || hps <= 0) return "0 H/s";
  const units = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s"];
  let v = hps;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(2)} ${units[i]}`;
}

function formatLastSeen(ts: number): string {
  // last_seen is a Unix seconds float
  const sec = ts > 1e12 ? ts / 1000 : ts;
  const delta = Math.max(0, Date.now() / 1000 - sec);
  if (delta < 60) return `${Math.floor(delta)}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

function PoolSection() {
  const { data: pool } = useQuery({
    queryKey: ["pool-overview"],
    queryFn: ({ signal }) => fetchPoolOverview(signal) as unknown as Promise<PoolOverviewLive>,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
  const { data: miners, isLoading: minersLoading } = useQuery({
    queryKey: ["pool-miners"],
    queryFn: ({ signal }) => fetchPoolMiners(signal),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const minerRows: PoolMiner[] = miners ?? [];
  const hashrateSum = pool?.totals?.miner_hashrate_sum ?? 0;
  const blocks = pool?.totals?.blocks ?? 0;
  const connected = pool?.connected_miners ?? 0;
  const fee = pool?.fee_percent ?? 2;

  return (
    <section className="border-t border-border/60 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-6 max-w-2xl pt-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pool Overview
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Live stats from <span className="font-mono-num">pool.arcgrid.dev</span>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          <PoolStat label="Connected miners" value={connected.toString()} />
          <PoolStat label="Pool hashrate" value={formatHashrate(hashrateSum)} />
          <PoolStat label="Blocks found" value={blocks.toString()} />
          <PoolStat label="Pool fee" value={`${fee.toFixed(1)}%`} />
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/80">
          <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2.5">
            <span className="font-mono-num text-[11px] uppercase tracking-widest text-muted-foreground">
              arcgrid · miners
            </span>
            <span className="font-mono-num text-[10px] uppercase tracking-widest text-muted-foreground">
              {minerRows.length} workers
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Worker</th>
                  <th className="px-4 py-3 font-medium">Hashrate</th>
                  <th className="px-4 py-3 font-medium">Valid shares</th>
                  <th className="px-4 py-3 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="font-mono-num">
                {minersLoading && minerRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Loading miners…
                    </td>
                  </tr>
                ) : minerRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      No workers connected.
                    </td>
                  </tr>
                ) : (
                  minerRows.map((m) => {
                    const hr =
                      typeof m.hashrate === "number"
                        ? formatHashrate(m.hashrate)
                        : (m.hashrate?.display ?? formatHashrate(m.hashrate?.raw ?? 0));
                    return (
                      <tr
                        key={m.worker_name}
                        className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {m.worker_name}
                        </td>
                        <td className="px-4 py-3 text-primary">{hr}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {m.shares_valid?.toLocaleString() ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {m.last_seen ? formatLastSeen(m.last_seen) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function PoolStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card/80 px-4 py-4">
      <div className="font-mono-num text-2xl font-semibold text-primary">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

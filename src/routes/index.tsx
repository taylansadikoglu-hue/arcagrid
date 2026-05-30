import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arca Grid | GPU Fleet Management & Infrastructure Automation" },
      {
        name: "description",
        content:
          "Deploy, monitor and optimize distributed GPU infrastructure across providers from a single control plane. BTX, AI inference, training and custom workloads.",
      },
      { property: "og:title", content: "Arca Grid | GPU Fleet Management" },
      {
        property: "og:description",
        content:
          "Deploy, monitor and repair distributed GPU fleets from a single control plane.",
      },
    ],
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

const STATS = [
  { value: "12", label: "Healthy nodes" },
  { value: "0", label: "Offline nodes" },
  { value: "48", label: "Active GPUs" },
  { value: "99.97%", label: "Fleet uptime (30d)" },
];

const FLEET = [
  {
    provider: "Vast.ai",
    live: true,
    region: "EU-Central",
    gpu: "24GB GPU class",
    workload: "BTX",
    status: "Healthy",
    wallet: "1,800 BTX",
    block: "115,513",
    peers: 14,
    temp: "74°C",
    util: "100%",
  },
  {
    provider: "Clore Cloud",
    region: "US-East",
    gpu: "24GB GPU class",
    workload: "AI Inference",
    status: "Healthy",
    wallet: "—",
    block: "—",
    peers: 22,
    temp: "68°C",
    util: "92%",
  },
  {
    provider: "Hetzner",
    region: "EU-West",
    gpu: "16GB GPU class",
    workload: "BTX",
    status: "Healthy",
    wallet: "942 BTX",
    block: "115,512",
    peers: 11,
    temp: "71°C",
    util: "98%",
  },
  {
    provider: "RunPod",
    region: "APAC",
    gpu: "24GB GPU class",
    workload: "Custom Container",
    status: "Syncing",
    wallet: "—",
    block: "115,508",
    peers: 9,
    temp: "76°C",
    util: "84%",
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
              The Operating System
              <br />
              for <span className="text-primary">Distributed GPU Fleets</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Deploy, monitor and repair GPU infrastructure across providers
              from a single control plane. BTX, AI inference, AI training, and
              custom containers — one fleet, one dashboard.
            </p>
            <div className="mt-6 inline-flex flex-col items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="inline-flex items-center gap-2 font-mono-num text-[10px] font-semibold uppercase tracking-widest text-primary">
                <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-primary" />
                Live Production Infrastructure
              </span>
              <span className="text-xs text-muted-foreground">
                Monitoring active BTX workloads across distributed GPU providers in real time.
              </span>
            </div>
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

      {/* LIVE FLEET PREVIEW */}
      <section className="border-t border-border/60 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-6 max-w-2xl pt-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Live Fleet Snapshot
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This data updates from active infrastructure monitored by ArcGrid.
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
              {STATS.map((s) => (
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
                    <th className="px-4 py-3 font-medium">Node</th>
                    <th className="px-4 py-3 font-medium">Workload</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Wallet</th>
                    <th className="px-4 py-3 font-medium">Block</th>
                    <th className="px-4 py-3 font-medium">Peers</th>
                    <th className="px-4 py-3 font-medium">Temp</th>
                    <th className="px-4 py-3 font-medium">GPU%</th>
                  </tr>
                </thead>
                <tbody className="font-mono-num">
                  {FLEET.map((n) => (
                    <tr
                      key={n.provider}
                      className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {n.provider}
                          </span>
                          {n.live && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono-num text-[9px] font-semibold uppercase tracking-widest text-primary">
                              <span className="pulse-dot inline-block h-1 w-1 rounded-full bg-primary" />
                              Live
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          {n.region} · {n.gpu}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{n.workload}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                            n.status === "Healthy"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-secondary/40 text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              n.status === "Healthy"
                                ? "bg-primary pulse-dot"
                                : "bg-muted-foreground"
                            }`}
                          />
                          {n.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{n.wallet}</td>
                      <td className="px-4 py-3 text-muted-foreground">{n.block}</td>
                      <td className="px-4 py-3 text-muted-foreground">{n.peers}</td>
                      <td className="px-4 py-3 text-muted-foreground">{n.temp}</td>
                      <td className="px-4 py-3 text-primary">{n.util}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

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

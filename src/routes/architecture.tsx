import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Arca Grid" },
      {
        name: "description",
        content:
          "How ARCA — Autonomous Remote Cluster Architecture — is built: pinned CUDA runtimes, immutable signed releases, and bootstrapped fast-sync archives.",
      },
      { property: "og:title", content: "Architecture — Arca Grid" },
      {
        property: "og:description",
        content:
          "Pinned CUDA runtimes, immutable signed releases, autonomous spot-market allocation. The technical spine of ARCA — Autonomous Remote Cluster Architecture.",
      },
      { property: "og:url", content: "https://arcgrid.dev/architecture" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/architecture" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "Autonomous Remote Cluster Architecture, layer by layer",
          description:
            "Six load-bearing layers of ARCA GRID: pinned runtimes, signed releases, fast-sync overrides, autonomous allocation, thermal routing, and a custody-free payout plane.",
          author: { "@type": "Organization", name: "ARCA GRID" },
          publisher: { "@type": "Organization", name: "ARCA GRID" },
          mainEntityOfPage: "https://arcgrid.dev/architecture",
        }),
      },
    ],
  }),
  component: ArchitecturePage,
});

const PILLARS = [
  {
    tag: "Layer 01",
    title: "Containerized Environment",
    summary: "Pinned CUDA 12.0 runtime with production-verified tuning.",
    body: "Every worker is shipped as a sealed OCI image with a pinned CUDA 12.0 runtime, driver-floor enforcement, and a curated kernel-tuning manifest. There is no in-place driver upgrade path — replacement workers ship with a new tagged image or they do not ship at all.",
    badges: ["CUDA 12.0", "OCI-signed", "Driver-floor pinned"],
  },
  {
    tag: "Layer 02",
    title: "Immutable Infrastructure",
    summary: "No runtime hot-swaps. Every release is cryptographically signed and tag-pinned.",
    body: "Workers and orchestrators never patch themselves in place. Each release is built reproducibly, signed with our release key, and pinned by tag in the allocator's manifest. Rollback is a tag flip — never a hand-edit on a running host.",
    badges: ["Cosign verified", "Tag-pinned manifest", "Reproducible builds"],
  },
  {
    tag: "Layer 03",
    title: "Automated Fast-Sync Overrides",
    summary: "Bootstrapped chain archives eliminate server-hop sync delays.",
    body: "Cold-starts pull a verified archive snapshot from the nearest mesh edge instead of replaying the chain peer-by-peer. The snapshot is hash-checked against the signed release manifest before the worker is allowed to attach to a payout address.",
    badges: ["Edge snapshots", "Manifest-checked", "Sub-minute cold start"],
  },
  {
    tag: "Layer 04",
    title: "Autonomous Spot-Market Allocation",
    summary: "The allocator locks the cheapest qualified worker before your container ships.",
    body: "A continuous bidder walks the mesh's spot inventory, filters on driver floor, thermal headroom, and uplink class, then locks the cheapest match against a signed lease. Margin gating happens server-side; the public API never sees the underlying provider quote.",
    badges: ["Signed leases", "Margin-gated", "Provider-blind"],
  },
  {
    tag: "Layer 05",
    title: "Hard-Capped Thermal Routing",
    summary: "Workers are migrated off hosts that breach per-class thermal ceilings.",
    body: "Telemetry samples are graded against a per-class thermal ceiling. A breach drains the worker, signs a migration receipt, and rehydrates on a healthy host without losing the active payout binding. No silent throttling.",
    badges: ["Per-class ceilings", "Drain-and-migrate", "Receipted moves"],
  },
  {
    tag: "Layer 06",
    title: "Custody-Free Payout Plane",
    summary: "Payout addresses are injected as env, never persisted to host disk.",
    body: "Wallet addresses are passed to the container as USER_WALLET at boot, kept in memory for the lease duration, and discarded when the worker drains. Arca Grid never takes custody of the underlying funds.",
    badges: ["No host persistence", "Memory-only", "Custody-free"],
  },
];

function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-12 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Technical Documentation
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Autonomous Remote Cluster Architecture,
            <br />
            <span className="text-muted-foreground">layer by layer.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Arca Grid is built on six load-bearing layers: pinned runtimes,
            signed releases, fast-sync overrides, autonomous allocation,
            thermal routing, and a custody-free payout plane. None of them are
            optional, and none of them are hand-tuned at runtime.
          </p>
        </div>
      </section>

      <section className="border-t border-border/60 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-5 md:grid-cols-2">
            {PILLARS.map((p) => (
              <article
                key={p.title}
                className="flex flex-col rounded-2xl border border-border bg-card/60 p-6 transition-colors hover:border-primary/40"
              >
                <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
                  {p.tag}
                </span>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                  {p.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-foreground/90">
                  {p.summary}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-md border border-border bg-background/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight">
              Compliance posture
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· No host-disk persistence of payout addresses or operator credentials.</li>
              <li>· Every release tag is reproducible from the public source manifest.</li>
              <li>· All worker→orchestrator traffic is mTLS-pinned on the mesh edge.</li>
              <li>· Margin and provider pricing are strictly server-side and never returned over the public API.</li>
            </ul>
          </div>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Need fleet-grade orchestration on top of this stack?
            </p>
            <Link
              to="/fleet"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Open the Fleet Console →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Arca Grid</span>
          <span className="font-mono-num text-muted-foreground">
            Arca Grid · Autonomous Remote Cluster Architecture
          </span>
        </div>
      </footer>
    </div>
  );
}
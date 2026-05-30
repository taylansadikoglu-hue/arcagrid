import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arca Grid — Autonomous Remote Cluster Architecture" },
      {
        name: "description",
        content:
          "Arca Grid runs ARCA — Autonomous Remote Cluster Architecture — for high-density GPU compute and cryptographic workload orchestration. Fleet-grade telemetry, signed releases, zero custody.",
      },
      { property: "og:title", content: "Arca Grid — Autonomous Remote Cluster Architecture" },
      {
        property: "og:description",
        content:
          "ARCA — Autonomous Remote Cluster Architecture. High-density GPU compute and cryptographic workload orchestration for data center operators. Autonomous allocation, immutable releases, fleet-grade telemetry.",
      },
    ],
  }),
  component: EnterpriseGateway,
});

const CAPABILITIES = [
  {
    tag: "Capability 01",
    title: "Autonomous Spot-Market Allocation",
    body: "A continuous bidder walks the mesh's spot inventory, locks the cheapest qualified worker against a signed lease, and ships your container before the quote drifts.",
  },
  {
    tag: "Capability 02",
    title: "Hard-Capped Thermal Routing",
    body: "Telemetry samples are graded against per-class thermal ceilings. Breached hosts are drained, receipted, and rehydrated on healthy capacity with no silent throttling.",
  },
  {
    tag: "Capability 03",
    title: "Immutable Node Provisioning",
    body: "Workers ship as cosign-verified, tag-pinned OCI images. There is no in-place driver upgrade path — rollback is a manifest flip, never a hand-edit on a live host.",
  },
  {
    tag: "Capability 04",
    title: "Mesh-Wide Fleet Telemetry",
    body: "Per-worker hash rate, thermal envelope, uplink class, and lease state stream into a single fleet console. Roll up by tenant, region, or workload class in one query.",
  },
  {
    tag: "Capability 05",
    title: "Custody-Free Payout Plane",
    body: "Payout addresses are injected as USER_WALLET at boot, held in memory for the lease, and discarded on drain. Arca Grid never takes custody of the underlying funds.",
  },
  {
    tag: "Capability 06",
    title: "Cryptographic Workload Orchestration",
    body: "CUDA-class cryptographic, simulation, and proving workloads are scheduled against the same allocator that runs the mining plane — one control surface, one billing rail.",
  },
];

const STATS = [
  { value: "CUDA 12.0", label: "Pinned runtime" },
  { value: "100%", label: "Signed releases" },
  { value: "<60s", label: "Cold-start allocation" },
  { value: "0", label: "Hot-swap surface" },
];

function EnterpriseGateway() {
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
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-20 sm:pt-28 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Enterprise Gateway · arcgrid.dev
            </span>
            <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
              <span className="text-primary">Enterprise GPU</span> Orchestration
              <br />
              <span className="text-muted-foreground">
                on Autonomous Remote Cluster Architecture.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Arca Grid is a fleet-grade control plane for high-density GPU
              compute and cryptographic workload orchestration. Signed releases,
              autonomous allocation, mesh-wide telemetry — provisioned through a
              single authenticated gateway.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/fleet"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                Provision Access →
              </Link>
              <Link
                to="/architecture"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary/40 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-secondary"
              >
                Read the architecture
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card/60 px-4 py-3 text-center"
              >
                <div className="font-mono-num text-lg font-semibold text-primary">
                  {s.value}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Six load-bearing capabilities
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each capability is a distinct layer of the control plane. None
              are optional, and none are hand-tuned at runtime.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
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
                  Operate the mesh from a single console
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Allocate workers, inspect signed leases, watch thermal
                  envelopes, and reconcile payouts across every tenant in your
                  fleet — all from the authenticated operator console.
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
            <span>
              Looking for single-node retail deployment instead?
            </span>
            <Link
              to="/deploy"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Deploy a node →
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
import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support & Registry — Arca Grid" },
      {
        name: "description",
        content:
          "Template install scripts, runbooks, and operator support for ARCA GRID.",
      },
      { property: "og:title", content: "Support & Registry — Arca Grid" },
      {
        property: "og:description",
        content:
          "Template scripts, runbooks, and operator help desk for ARCA GRID.",
      },
      { property: "og:url", content: "https://arcgrid.dev/support" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-14">
        <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
          Operator Resources
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          🛠️ Support &amp; Registry
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Template install scripts, hardened container images, and direct
          operator support — everything you need to bring a node online or
          recover one.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Install Script Registry
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              One-line, idempotent installer used by every BYO operator on the
              mesh.
            </p>
            <pre className="font-mono-num mt-4 overflow-x-auto rounded-lg border border-border bg-background/60 p-3 text-[11px] text-primary">
curl -s http://37.27.0.36/api/public/install-agent.sh | bash
            </pre>
            <Link
              to="/fleet"
              className="mt-4 inline-flex rounded-lg border border-border bg-secondary/60 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              Open Fleet Console →
            </Link>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Help Desk
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Reach a human operator for onboarding, payout, or telemetry
              questions.
            </p>
            <a
              href="mailto:support@arcgrid.dev"
              className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              Contact support@arcgrid.dev
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
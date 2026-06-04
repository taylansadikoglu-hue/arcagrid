import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Payouts — Arca Grid" },
      {
        name: "description",
        content:
          "Manage your ARCA GRID subscription, payout wallet, and payment status from one screen.",
      },
      { property: "og:title", content: "Billing & Payouts — Arca Grid" },
      {
        property: "og:description",
        content:
          "Subscription status, payout wallet configuration, and invoices for your ARCA GRID account.",
      },
      { property: "og:url", content: "https://arcgrid.dev/billing" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/billing" }],
  }),
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-14">
        <span className="font-mono-num text-[10px] uppercase tracking-widest text-primary">
          Account
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          💳 Billing &amp; Payouts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Review your subscription status and configure where your block rewards
          stream. One wallet, one invoice trail — nothing else to manage.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Subscription
            </h2>
            <p className="mt-3 text-sm">
              View current package, renewal date and invoices from the operator
              console.
            </p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              Open Dashboard →
            </Link>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Payout Wallet
            </h2>
            <p className="mt-3 text-sm">
              Configure the BTX address that receives streaming block rewards.
              Updates apply on the next allocator cycle.
            </p>
            <Link
              to="/deploy"
              className="mt-5 inline-flex rounded-lg border border-border bg-secondary/60 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              Manage Wallet →
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
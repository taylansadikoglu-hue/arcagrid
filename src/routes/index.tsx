import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { SiteNav } from "@/components/SiteNav";
import { TIERS, loadPrefs, savePrefs, type TierId } from "@/lib/miner-store";

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
          <PricingGrid />
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
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Enterprise GPU Grid <span className="text-primary">Orchestration Layer</span>
      </h1>
      <p className="mt-4 text-sm text-muted-foreground sm:text-base">
        Dynamic Configuration & Self-Healing Telemetry for large-scale compute
        fleets. 100% non-custodial. ARCA GRID acts as an automated management
        abstraction layer for distributed hardware nodes — Dynamic Cluster
        Matrix Scaling based on Live Network Difficulty Tiers.
      </p>
    </section>
  );
}

function PricingGrid() {
  const tiers = TIERS.filter((t) => t.unit === "24h");
  return (
    <section id="pricing" className="grid gap-5 sm:grid-cols-2">
      {tiers.map((tier) => (
        <PricingCard key={tier.id} tier={tier} />
      ))}
    </section>
  );
}

function PricingCard({ tier }: { tier: (typeof TIERS)[number] }) {
  const navigate = useNavigate();
  return (
    <div
      className={`rounded-2xl border bg-card/70 p-6 ${
        tier.highlight ? "border-primary/50" : "border-border"
      }`}
      style={{
        boxShadow: tier.highlight
          ? "var(--shadow-glow), var(--shadow-card)"
          : "var(--shadow-card)",
      }}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold tracking-tight">{tier.tagline}</h3>
        {tier.highlight && (
          <span className="font-mono-num rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
            Recommended
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{tier.description}</p>
      <div className="font-mono-num mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">${tier.price}</span>
        <span className="text-xs text-muted-foreground">/ {tier.unit}</span>
      </div>
      <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
        {tier.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-primary">·</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          navigate({ to: "/checkout", search: { tier: tier.id as TierId } })
        }
        className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
      >
        Provision {tier.name}
      </button>
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
    <section className="mt-10 rounded-2xl border border-border bg-card/70 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
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
        100% Non-Custodial: Your mining payout address is utilized solely to
        route mining rewards directly from the chain pool architecture.
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

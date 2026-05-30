import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { SiteNav } from "@/components/SiteNav";
import { provisionCluster } from "@/lib/api/provision.functions";
import {
  type TierId,
  loadPrefs,
  saveSession,
  tierById,
} from "@/lib/miner-store";

const searchSchema = z.object({
  tier: z
    .enum(["standard_24h", "pro_24h", "standard_monthly", "pro_monthly"])
    .catch("standard_24h"),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Provisioning Edge Cluster — Arca Grid" }],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { tier: tierId } = Route.useSearch();
  const navigate = useNavigate();
  const tier = tierById(tierId);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMonthly = tier.unit === "mo";

  const pay = async () => {
    setPaying(true);
    setError(null);
    const prefs = loadPrefs();
    try {
      const result = await provisionCluster({
        data: {
          tier: tier.id as TierId,
          paidPriceUsd: tier.price,
          wallet: prefs.wallet || "",
          mode: prefs.mode,
        },
      });
      if (!result.ok) {
        setError(result.error);
        setPaying(false);
        return;
      }
      const now = Date.now();
      const durationMs = isMonthly ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
      saveSession({
        wallet: prefs.wallet || "btx1qexample0000000000",
        mode: prefs.mode,
        tier: tier.id as TierId,
        instanceId: result.instanceId,
        status: "mining",
        startedAt: now,
        expiresAt: now + durationMs,
        hostCost: 0,
        paidPrice: tier.price,
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error(err);
      setError("Provisioning failed. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 lg:grid-cols-5">
        {/* SUMMARY */}
        <section className="lg:col-span-3">
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to tiers
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Provisioning Edge Cluster</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One-click initialization. No GPU setup. Intelligent routing across
            ARCA GRID begins the moment payment clears.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {tier.tagline}
                </p>
                <h2 className="text-xl font-semibold">{tier.name} Tier</h2>
                <p className="text-sm text-muted-foreground">
                  {tier.hardware} · {tier.hashrate}
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono-num text-3xl font-semibold">
                  ${tier.price.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">/ {tier.unit}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              <Row label="Duration" value={isMonthly ? "30 days" : "24 hours"} />
              <Row
                label="Routing layer"
                value={
                  <span className="text-primary">Intelligent mesh allocator</span>
                }
              />
              <Row
                label="Node selection"
                value={
                  <span>Automated infrastructure load balancing</span>
                }
              />
              <Row
                label="Docker image"
                value={
                  <span className="font-mono-num text-xs">
                    arcagrid/btx-oneclick-miner:latest
                  </span>
                }
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
            <p className="text-foreground">Injected production node parameters</p>
            <ul className="font-mono-num mt-2 space-y-1">
              <li>USER_WALLET=&lt;your wallet&gt;</li>
              <li>BTX_MINING_MODE=&lt;pool | solo&gt;</li>
              <li>BTX_POOL_ADDRESS=&lt;assigned at provision&gt;</li>
              <li># Bootstrap chain archive → ~/.btx (fast-sync)</li>
              <li># Hardened daemon flags applied server-side</li>
            </ul>
          </div>
        </section>

        {/* PAY */}
        <section className="lg:col-span-2">
          <div className="sticky top-20 rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Pay with Stripe
            </h3>

            <div className="mt-4 space-y-3">
              <Field label="Card number" placeholder="4242 4242 4242 4242" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry" placeholder="12 / 28" />
                <Field label="CVC" placeholder="123" />
              </div>
              <Field label="Email" placeholder="you@example.com" type="email" />
            </div>

            <div className="my-5 border-t border-border" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total today</span>
              <span className="font-mono-num text-2xl font-semibold">
                ${tier.price.toFixed(2)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {tier.unit}
                </span>
              </span>
            </div>

            {error && (
              <p className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <button
              onClick={pay}
              disabled={paying}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {paying ? "Initializing Grid Instance…" : `Pay $${tier.price.toFixed(2)} & Provision Cluster`}
            </button>
            <button
              type="button"
              onClick={() => {
                setPaying(false);
                navigate({ to: "/" });
              }}
              className="mt-2 w-full rounded-lg border border-border bg-secondary/40 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
            >
              Cancel & return to dashboard
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Demo checkout. Wire real Stripe once enabled — UI is ready.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="font-mono-num mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
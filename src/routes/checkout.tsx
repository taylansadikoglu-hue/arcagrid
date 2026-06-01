import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { SiteNav } from "@/components/SiteNav";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import {
  type TierId,
  loadPrefs,
  saveSession,
  tierById,
} from "@/lib/miner-store";
import { captureError, track } from "@/lib/observability";

const searchSchema = z.object({
  tier: z
    .enum([
      "standard_24h",
      "pro_24h",
      "standard_monthly",
      "pro_monthly",
      "partner_share",
    ])
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
  const tierMaybe = tierById(tierId);
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!tierMaybe) navigate({ to: "/" });
  }, [tierMaybe, navigate]);

  // Checkout abandonment: fire if user leaves before clicking pay.
  useEffect(() => {
    if (!tierMaybe) return;
    const tier = tierMaybe;
    track("checkout_viewed", { tier: tier.id, price: tier.price });
    const onUnload = () => {
      if (!completed) {
        track("checkout_abandoned", { tier: tier.id, price: tier.price });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (!completed) track("checkout_abandoned", { tier: tier.id, price: tier.price });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierMaybe?.id]);

  if (!tierMaybe) return null;
  const tier = tierMaybe;
  const isMonthly = tier.unit === "mo";
  const isPartner = tier.id === "partner_share";

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
  }, []);

  const pay = async () => {
    track("provision_access_clicked", { tier: tier.id, price: tier.price });
    setError(null);
    const prefs = loadPrefs();

    if (isPartner) {
      const wallet = (prefs.wallet || "").trim();
      if (!wallet) {
        setError(
          "A valid BTX address is required for Zero-Upfront deployment. Click the setup link below to generate one.",
        );
        return;
      }
      const now = Date.now();
      saveSession({
        wallet,
        mode: prefs.mode,
        tier: tier.id as TierId,
        instanceId: `byo-${Math.random().toString(36).slice(2, 10)}`,
        status: "mining",
        startedAt: now,
        expiresAt: now + 30 * 24 * 3600 * 1000,
        hostCost: 0,
        paidPrice: 0,
      });
      setCompleted(true);
      track("partner_byo_activated", { tier: tier.id });
      navigate({ to: "/dashboard" });
      return;
    }

    // Cloud-provisioned tiers: open Stripe Embedded Checkout. Provisioning
    // runs only after Stripe confirms payment on /checkout/return.
    setCompleted(true);
    setShowCheckout(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
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
            {!showCheckout ? (
              <>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Secure payment
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  Processed by Stripe. Your cluster provisions automatically the
                  moment payment clears.
                </p>
                <div className="my-5 border-t border-border" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total today
                  </span>
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
                    {isPartner && (
                      <>
                        {" "}
                        <Link
                          to="/deploy"
                          className="font-semibold underline underline-offset-2 hover:text-destructive/80"
                        >
                          Set up wallet →
                        </Link>
                      </>
                    )}
                  </p>
                )}
                <button
                  onClick={pay}
                  className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                >
                  {isPartner
                    ? "Activate Zero-Upfront Deployment"
                    : `Continue to payment — $${tier.price.toFixed(2)}`}
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/" })}
                  className="mt-2 w-full rounded-lg border border-border bg-secondary/40 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
                >
                  Cancel & return to tiers
                </button>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Secure payment processed via Stripe. Cluster provisions on
                  confirmation.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Complete payment
                </h3>
                <div className="mt-4">
                  <StripeEmbeddedCheckout
                    priceId={
                      tier.id as
                        | "standard_24h"
                        | "pro_24h"
                        | "standard_monthly"
                        | "pro_monthly"
                    }
                    returnUrl={returnUrl}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckout(false);
                    setCompleted(false);
                  }}
                  className="mt-3 w-full rounded-lg border border-border bg-secondary/40 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
                >
                  Back
                </button>
              </>
            )}
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

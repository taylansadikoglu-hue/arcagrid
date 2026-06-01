import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { provisionCluster } from "@/lib/api/provision.functions";
import { verifyCheckoutSession } from "@/lib/api/payments.functions";
import { TIERS, type TierId, loadPrefs, saveSession, tierById } from "@/lib/miner-store";
import { getStripeEnvironment } from "@/lib/stripe";
import { captureError, track } from "@/lib/observability";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [{ title: "Provisioning cluster — Arca Grid" }],
  }),
  component: CheckoutReturnPage,
});

type Phase = "verifying" | "provisioning" | "ready" | "error";

function CheckoutReturnPage() {
  const { session_id: sessionId } = Route.useSearch();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!sessionId) {
      setError("Missing checkout session reference.");
      setPhase("error");
      return;
    }

    (async () => {
      try {
        const verify = await verifyCheckoutSession({
          data: { sessionId, environment: getStripeEnvironment() },
        });
        if (!verify.ok) {
          setError(verify.error);
          setPhase("error");
          return;
        }
        const tier = tierById(verify.priceId as TierId) ?? TIERS[0];
        const prefs = loadPrefs();
        setPhase("provisioning");
        track("provision_access_clicked", {
          tier: tier.id,
          price: tier.price,
        });
        const result = await provisionCluster({
          data: {
            tier: tier.id as TierId,
            paidPriceUsd: tier.price,
            wallet: prefs.wallet || "",
            mode: prefs.mode,
          },
        });
        if (!result.ok) {
          captureError(new Error(`Provisioning rejected: ${result.error}`), {
            tier: tier.id,
            sessionId,
          });
          setError(result.error);
          setPhase("error");
          return;
        }
        const now = Date.now();
        const isMonthly = tier.unit === "mo";
        const durationMs = isMonthly ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
        saveSession({
          wallet:
            prefs.wallet ||
            "btx1zsjr4q3fwh4gku3qcp39x9vvjygklg5xkac229k0chlzsnpwhfggst42sr8",
          mode: prefs.mode,
          tier: tier.id as TierId,
          instanceId: result.instanceId,
          status: "mining",
          startedAt: now,
          expiresAt: now + durationMs,
          hostCost: 0,
          paidPrice: tier.price,
        });
        track("provision_succeeded", {
          tier: tier.id,
          instanceId: result.instanceId,
        });
        setPhase("ready");
        navigate({ to: "/dashboard" });
      } catch (err) {
        console.error(err);
        captureError(err, { scope: "checkoutReturn" });
        setError("Provisioning failed. Please try again.");
        setPhase("error");
      }
    })();
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
        {phase !== "error" ? (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              {phase === "verifying"
                ? "Confirming payment…"
                : "Provisioning your edge cluster…"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Intelligent mesh allocator is selecting the best-fit node. This
              usually takes a few seconds.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              Provisioning paused
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error ??
                "We couldn't complete provisioning. Your payment is safe."}
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                to="/"
                className="rounded-md border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-border/80"
              >
                Back to tiers
              </Link>
              <Link
                to="/dashboard"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Open dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
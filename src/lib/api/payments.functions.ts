import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

const TIER_PRICE_IDS = [
  "standard_24h",
  "pro_24h",
  "standard_monthly",
  "pro_monthly",
] as const;

const CheckoutInput = z.object({
  priceId: z.enum(TIER_PRICE_IDS),
  customerEmail: z.string().email().optional(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input) => CheckoutInput.parse(input))
  .handler(
    async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
      try {
        const stripe = createStripeClient(data.environment as StripeEnv);
        const prices = await stripe.prices.list({
          lookup_keys: [data.priceId],
          expand: ["data.product"],
        });
        if (!prices.data.length) {
          return { error: `Price not found: ${data.priceId}` };
        }
        const stripePrice = prices.data[0];
        const isRecurring = stripePrice.type === "recurring";

        let productDescription: string | undefined;
        if (!isRecurring) {
          const productId =
            typeof stripePrice.product === "string"
              ? stripePrice.product
              : stripePrice.product.id;
          const product = await stripe.products.retrieve(productId);
          productDescription = product.name;
        }

        const session = await stripe.checkout.sessions.create({
          line_items: [{ price: stripePrice.id, quantity: 1 }],
          mode: isRecurring ? "subscription" : "payment",
          ui_mode: "embedded_page",
          return_url: data.returnUrl,
          ...(data.customerEmail && { customer_email: data.customerEmail }),
          ...(!isRecurring && {
            payment_intent_data: { description: productDescription },
          }),
          metadata: { priceId: data.priceId },
        });

        return { clientSecret: session.client_secret ?? "" };
      } catch (error) {
        return { error: getStripeErrorMessage(error) };
      }
    },
  );

const VerifyInput = z.object({
  sessionId: z.string().min(1).max(256),
  environment: z.enum(["sandbox", "live"]),
});

/**
 * Confirms a checkout session is paid. Called from the return page before
 * the client triggers provisionCluster — guarantees we never provision
 * hardware for an unpaid (or canceled) session.
 */
export const verifyCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input) => VerifyInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; priceId: string; customerEmail: string | null }
      | { ok: false; error: string }
    > => {
      try {
        const stripe = createStripeClient(data.environment as StripeEnv);
        const session = await stripe.checkout.sessions.retrieve(data.sessionId);
        if (session.payment_status !== "paid" && session.status !== "complete") {
          return { ok: false, error: "Payment not completed." };
        }
        const priceId = (session.metadata?.priceId as string) || "";
        return {
          ok: true,
          priceId,
          customerEmail: session.customer_details?.email ?? null,
        };
      } catch (error) {
        return { ok: false, error: getStripeErrorMessage(error) };
      }
    },
  );
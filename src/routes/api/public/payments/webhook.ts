import { createFileRoute } from "@tanstack/react-router";

import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error(
            "[payments-webhook] invalid env query parameter:",
            rawEnv,
          );
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          // Provisioning happens client-side after the return URL flow.
          // We log subscription / transaction events here for audit only.
          console.info(
            `[payments-webhook] ${env} event=${event.type}`,
          );
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments-webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
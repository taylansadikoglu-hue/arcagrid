import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";

import { createCheckoutSession } from "@/lib/api/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

interface Props {
  priceId: "standard_24h" | "pro_24h" | "standard_monthly" | "pro_monthly";
  customerEmail?: string;
  returnUrl: string;
}

export function StripeEmbeddedCheckout({
  priceId,
  customerEmail,
  returnUrl,
}: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: {
        priceId,
        customerEmail,
        returnUrl,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={getStripe()}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

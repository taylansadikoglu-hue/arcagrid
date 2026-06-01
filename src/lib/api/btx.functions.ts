import { createServerFn } from "@tanstack/react-start";

/**
 * Live BTX spot model price.
 *
 * Source of record: https://btxprice.com/api/current.json
 * Recomputed every 10 minutes from BTC spot (CoinGecko), BTC network hashrate
 * (mempool.space), and the 1-week BTX network MatMul rate.
 *
 * Returned on the wire as plain numbers so the client never has to deal with
 * the upstream high-precision string decimals.
 */
export const getBtxSpot = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const res = await fetch("https://btxprice.com/api/current.json", {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        return {
          ok: false as const,
          error: `btxprice.com responded ${res.status}`,
        };
      }
      const body = (await res.json()) as {
        forward?: Array<{
          months?: number;
          usd?: string;
          sats?: string;
          horizon?: string;
        }>;
      };
      const spot = body.forward?.find((r) => r.months === 0);
      if (!spot?.usd) {
        return { ok: false as const, error: "Spot row missing in response" };
      }
      return {
        ok: true as const,
        usd: Number(spot.usd),
        sats: spot.sats ? Number(spot.sats) : null,
        fetchedAt: Date.now(),
        source: "btxprice.com",
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Fetch failed",
      };
    }
  },
);
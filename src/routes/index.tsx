import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import {
  TIERS,
  type MiningMode,
  type TierId,
  loadPrefs,
  savePrefs,
} from "@/lib/miner-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTX One-Click Miner — Optimized GPU Mining" },
      {
        name: "description",
        content:
          "Launch tuned BTX mining on RTX 4070 Ti SUPER, 4090 & A6000 instances in one click. Guaranteed margin, live dashboard.",
      },
      { property: "og:title", content: "BTX One-Click Miner" },
      {
        property: "og:description",
        content: "One-click GPU mining for BTX with guaranteed profit margin.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState("");
  const [mode, setMode] = useState<MiningMode>("pool");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadPrefs();
    setWallet(p.wallet);
    setMode(p.mode);
  }, []);

  const select = (tier: TierId) => {
    if (!wallet.trim() || wallet.trim().length < 20) {
      setError("Enter a valid BTX wallet address (20+ chars) to continue.");
      document.getElementById("launch-card")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setError(null);
    savePrefs({ wallet: wallet.trim(), mode });
    navigate({ to: "/checkout", search: { tier } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Optimized Compute · Live
            </span>
            <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
              Mine BTX in <span className="text-primary">one click.</span>
              <br />
              Profit on every session.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Spin up a tuned GPU rig on Vast.ai with our pre-built Docker image. We
              auto-select a host at <span className="text-foreground">≥ 40% below your price</span>,
              so margin is guaranteed before mining starts.
            </p>
          </div>

          {/* LAUNCH CARD */}
          <div
            id="launch-card"
            className="mx-auto mt-14 max-w-2xl rounded-2xl border border-border bg-card p-1"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="rounded-[14px] bg-gradient-to-b from-secondary/40 to-transparent p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Configure rig
                </h2>
                <span className="font-mono-num text-xs text-muted-foreground">
                  taylans/btx-oneclick-miner:latest
                </span>
              </div>

              <label className="mt-5 block text-sm font-medium">BTX Wallet Address</label>
              <input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="btx1q…"
                spellCheck={false}
                className="font-mono-num mt-2 w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
              {error && (
                <p className="mt-2 text-xs text-destructive">{error}</p>
              )}

              <div className="mt-5">
                <span className="text-sm font-medium">Mining Mode</span>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-background/60 p-1">
                  {(["pool", "solo"] as MiningMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        mode === m
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "pool" ? "Pool Mining" : "Solo Mining"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {mode === "pool"
                    ? "Steady payouts, lower variance. Recommended."
                    : "Higher variance, full block rewards when you win one."}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <Stat label="Batch size" value="20" />
                <Stat label="Solve batch" value="4" />
                <Stat label="Pipeline" value="async-0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Pick your compute tier
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pay once for 24h or subscribe monthly. Every tier auto-targets a Vast.ai
              host priced ≥ 40% below your fee.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => (
              <article
                key={tier.id}
                className={`group relative flex flex-col rounded-2xl border p-6 transition-all ${
                  tier.highlight
                    ? "border-primary/50 bg-card"
                    : "border-border bg-card/60 hover:border-border/80"
                }`}
                style={
                  tier.highlight
                    ? { boxShadow: "var(--shadow-glow), var(--shadow-card)" }
                    : undefined
                }
              >
                {tier.highlight && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most Popular
                  </span>
                )}
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <span className="text-xs text-muted-foreground">{tier.tagline}</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-mono-num text-4xl font-semibold tracking-tight">
                    ${tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {tier.unit}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tier.hardware} · <span className="text-primary/90">{tier.hashrate}</span>
                </p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground">
                      <Check />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => select(tier.id)}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "border border-border bg-secondary/60 text-foreground hover:border-primary/40 hover:bg-secondary"
                  }`}
                >
                  Launch {tier.name}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            From click to hashes in 60 seconds
          </h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Drop your wallet",
                body: "Paste your BTX address. We inject it into the container as USER_WALLET — no custody, ever.",
              },
              {
                step: "02",
                title: "Pay & match a host",
                body: "Stripe handles the charge. Our matcher locks a Vast.ai GPU priced ≥ 40% below your tier.",
              },
              {
                step: "03",
                title: "Mine, monitor, withdraw",
                body: "Live status, batch metrics, and a one-tap Stop button. Rewards stream to your wallet.",
              },
            ].map((s) => (
              <li
                key={s.step}
                className="rounded-xl border border-border bg-card/60 p-6"
              >
                <span className="font-mono-num text-xs text-primary">{s.step}</span>
                <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} BTX One-Click Miner</span>
          <span className="font-mono-num">
            BTX_MINE_BATCH_SIZE=20 · BTX_MATMUL_SOLVE_BATCH_SIZE=4
          </span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-3 py-2">
      <div className="font-mono-num text-base text-primary">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

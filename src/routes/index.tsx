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
      { title: "ArcaGrid — Enterprise GPU Orchestration Layer" },
      {
        name: "description",
        content:
          "Provision an edge compute cluster on ARCA GRID in one click. Intelligent routing, live telemetry, zero setup.",
      },
      { property: "og:title", content: "ArcaGrid — Enterprise GPU Orchestration Layer" },
      {
        property: "og:description",
        content:
          "Our proprietary intelligent routing layer dynamically matches your session with the highest-efficiency nodes across the global mesh, optimizing cryptographic throughput in real-time.",
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
  const [walletHelpOpen, setWalletHelpOpen] = useState(false);

  useEffect(() => {
    const p = loadPrefs();
    setWallet(p.wallet);
    setMode(p.mode);
  }, []);

  const select = (tier: TierId) => {
    // Sandbox escrow flow: blank wallet is permitted and accumulates into
    // the authenticated email's internal ledger.
    if (wallet.trim() && wallet.trim().length < 20) {
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
              <span className="text-primary">ARCA:</span> Autonomous Remote
              Cluster Architecture
              <br />
              <span className="text-muted-foreground">
                High-Density GPU Grid Orchestration.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Spin up a tuned CUDA node on the{" "}
              <span className="text-foreground">ARCA GRID</span>{" "}
              with our production-verified container. Our proprietary intelligent routing
              layer dynamically matches your session with the highest-efficiency nodes
              across the global mesh, optimizing cryptographic throughput in real-time.
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
                  arcagrid/btx-oneclick-miner:latest
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
              <button
                type="button"
                onClick={() => setWalletHelpOpen(true)}
                className="mt-2 text-xs font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                New to BTX? Setup your secure wallet instantly. →
              </button>
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
                <Stat label="Routing" value="Mesh" />
                <Stat label="Runtime" value="CUDA" />
                <Stat label="Telemetry" value="Live" />
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
              Pay once for 24h or subscribe monthly. Our proprietary intelligent
              routing layer dynamically matches your session with the
              highest-efficiency nodes across ARCA GRID, optimizing cryptographic
              throughput in real-time.
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
                  <span className="text-primary/90">{tier.hardware}</span>
                </p>
                {tier.description && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {tier.description}
                  </p>
                )}
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
              title: "Initialize Grid Instance",
                body: "Our proprietary intelligent routing layer dynamically matches your session with the highest-efficiency nodes across the global mesh, optimizing cryptographic throughput in real-time.",
              },
              {
                step: "03",
              title: "Monitor & withdraw",
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
          <span>© {new Date().getFullYear()} ARCA GRID</span>
          <span className="font-mono-num text-muted-foreground">
            ARCA GRID · Enterprise GPU Orchestration Layer
          </span>
        </div>
      </footer>
      <WalletHelpModal open={walletHelpOpen} onClose={() => setWalletHelpOpen(false)} />
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

function WalletHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const options = [
    {
      tag: "Option 1",
      title: "Desktop Node Client",
      body: "Run the official BTX full node locally. Most secure — you hold the keys end-to-end.",
      cta: "Open releases",
      href: "https://github.com/btxchain/btx/releases",
      external: true,
    },
    {
      tag: "Option 2",
      title: "Ecosystem Web Address",
      body: "Generate a direct funding address on a supported exchange or web wallet. Fastest path to a live address.",
      cta: "Browse supported wallets",
      href: "https://github.com/btxchain/btx#wallets",
      external: true,
    },
    {
      tag: "Option 3",
      title: "1-Click Escrow Sandbox",
      body: "Leave the wallet field blank. Mined blocks accumulate in a secure internal ledger tied to your authenticated email — withdraw externally any time.",
      cta: "Continue without a wallet",
      href: null,
      external: false,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8"
        style={{ boxShadow: "var(--shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">
              Wallet Setup
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">
              Three secure ways to receive BTX
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {options.map((o) => (
            <div
              key={o.title}
              className="rounded-xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {o.tag}
                </span>
              </div>
              <h4 className="mt-1 text-sm font-semibold">{o.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {o.body}
              </p>
              {o.href ? (
                <a
                  href={o.href}
                  target={o.external ? "_blank" : undefined}
                  rel={o.external ? "noreferrer noopener" : undefined}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  {o.cta} →
                </a>
              ) : (
                <button
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  {o.cta} →
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground">
          ARCA GRID never takes custody of your funds. Wallet addresses are
          injected into the provisioned cluster as <span className="font-mono-num">USER_WALLET</span>.
        </p>
      </div>
    </div>
  );
}

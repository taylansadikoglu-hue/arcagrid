import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";

import { SiteNav } from "@/components/SiteNav";
import { GRID_API_BASE, POOL_API_BASE } from "@/lib/api/grid-api";

export const Route = createFileRoute("/deploy")({
  head: () => ({
    meta: [
      { title: "Deploy to Arca Grid — DC Operator Onboarding" },
      {
        name: "description",
        content:
          "Connect your data centre GPUs to the Arca Grid BTX mining network. One Docker command, automatic GPU detection, earnings tracked by wallet.",
      },
      { property: "og:title", content: "Deploy to Arca Grid — DC Operator Onboarding" },
      {
        property: "og:description",
        content:
          "One docker run command. GPU detected automatically. Mining starts within 5 minutes. Earnings tracked by wallet address.",
      },
      { property: "og:url", content: "https://arcgrid.dev/deploy" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/deploy" }],
  }),
  component: DeployPage,
});

const DOCKER_CMD = `docker run -d --gpus all --restart=unless-stopped \\
  -e USER_WALLET=<btx_wallet> \\
  -e DC_NAME="YourDC" \\
  -e NODE_NAME="gpu-01" \\
  taylans/orchestra-os:lite`;

const SUPPORTED_GPUS = [
  "RTX 3070, 3080, 3090 — 8 GB+ VRAM",
  "RTX 4070, 4080, 4090",
  "RTX 5060 Ti, 5070, 5080, 5090",
  "Minimum 8 GB VRAM, SM86 architecture or newer",
];

const UNSUPPORTED_GPUS = [
  "GTX 1060, 1070, 1080 series — incompatible CUDA",
  "Any GPU under 8 GB VRAM",
  "AMD GPUs",
  "Laptop GPUs (not recommended)",
  "Windows containers",
  "Virtualised / shared GPUs",
];

const SOFTWARE_REQS = [
  "Ubuntu 20.04 / 22.04 / 24.04",
  "Docker 24.0+",
  "NVIDIA Container Toolkit (nvidia-docker2)",
  "NVIDIA Driver 525+",
  "CUDA 12.0+ (CUDA 12.8+ recommended)",
];

const HARDWARE_REQS = [
  "16 GB RAM minimum",
  "50 GB free disk space",
  "Stable power — GPU runs at sustained load",
];

const NETWORK_REQS = [
  "Outbound TCP 3333 — pool stratum",
  "Outbound TCP 443 — API reporting",
  "10 Mbps minimum",
];

const AFTER_DEPLOY = [
  {
    step: "01",
    title: "GPU detected automatically",
    body: "Orchestra OS probes nvidia-smi at startup, selects the best available device, and configures the MatMul solver to match your GPU's SM architecture.",
  },
  {
    step: "02",
    title: "Mining starts within 5 minutes",
    body: "The container connects to pool.arcgrid.dev:3333, receives the current job, and begins submitting shares. No manual configuration required.",
  },
  {
    step: "03",
    title: "Earnings tracked by wallet",
    body: "Every valid share is credited to the USER_WALLET you supplied. PPLNS payouts are processed every 24 hours once minimum threshold is reached.",
  },
  {
    step: "04",
    title: "Check earnings at pool.arcgrid.dev",
    body: "View live hashrate, share count, and pending balance by searching your wallet address on the pool dashboard.",
  },
];

interface EarningsResult {
  btx_price: number;
  btx_earned_today: number;
  usd_earned_today: number;
  total_shares: number;
  rigs: Array<{
    rig_id: string;
    gpu: string;
    shares: number;
    share_pct: number;
    btx_earned_est: number;
    usd_value: number;
    hashrate: string;
  }>;
}

interface WalletResult {
  address?: string;
  balance?: number;
  pending?: number;
  paid?: number;
  hashrate?: number | { display?: string };
  shares_valid?: number;
  error?: string;
}

function DeployPage() {
  const [copied, setCopied] = useState(false);
  const [wallet, setWallet] = useState("");
  const [checking, setChecking] = useState(false);
  const [earnings, setEarnings] = useState<EarningsResult | null>(null);
  const [walletData, setWalletData] = useState<WalletResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const copyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(DOCKER_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select the text
    }
  }, []);

  const checkEarnings = useCallback(async () => {
    const addr = wallet.trim();
    if (!addr || addr.length < 20) {
      setCheckError("Enter a valid BTX wallet address (20+ characters).");
      return;
    }
    setCheckError(null);
    setChecking(true);
    setEarnings(null);
    setWalletData(null);

    const [earningsRes, walletRes] = await Promise.allSettled([
      fetch(`${GRID_API_BASE}/api/fleet/earnings`).then((r) => {
        if (!r.ok) throw new Error(`earnings ${r.status}`);
        return r.json() as Promise<EarningsResult>;
      }),
      fetch(`${POOL_API_BASE}/api/wallet/${encodeURIComponent(addr)}`).then(
        (r) => r.json() as Promise<WalletResult>,
      ),
    ]);

    if (earningsRes.status === "fulfilled") setEarnings(earningsRes.value);
    if (walletRes.status === "fulfilled") setWalletData(walletRes.value);

    if (earningsRes.status === "rejected" && walletRes.status === "rejected") {
      setCheckError("Could not reach the Arca Grid API. Please try again shortly.");
    }

    setChecking(false);
  }, [wallet]);

  const hasResults = earnings !== null || walletData !== null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              DC Operator Onboarding
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Connect your GPUs to the Arca Grid network
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              One Docker command deploys Orchestra OS on any qualified NVIDIA GPU.
              Mining starts within 5 minutes. Earnings accumulate directly to your BTX wallet.
            </p>
          </div>

          {/* Deploy command */}
          <div className="mx-auto mt-12 max-w-3xl">
            <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-destructive/60" />
                  <span className="h-3 w-3 rounded-full bg-accent/60" />
                  <span className="h-3 w-3 rounded-full bg-primary/60" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">terminal</span>
                <button
                  onClick={copyCommand}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-3.5 w-3.5 text-primary" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto px-6 py-5 text-sm leading-relaxed text-foreground/90 font-mono">
                <span className="text-muted-foreground select-none">$ </span>
                {DOCKER_CMD}
              </pre>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Replace <span className="font-mono text-primary">&lt;btx_wallet&gt;</span> with your BTX wallet address before running.
            </p>
          </div>
        </div>
      </section>

      {/* ── After deploy ──────────────────────────────────────────────────── */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            What happens after deploy
          </h2>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2">
            {AFTER_DEPLOY.map((s) => (
              <li
                key={s.step}
                className="rounded-xl border border-border bg-card/60 p-6"
              >
                <span className="font-mono text-xs text-primary">{s.step}</span>
                <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Requirements ──────────────────────────────────────────────────── */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            System requirements
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
            Orchestra OS requires specific GPU capabilities. Check your hardware before deploying.
          </p>

          {/* GPU supported / not supported */}
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/30 bg-card/60 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary">
                <CheckIcon className="h-4 w-4" />
                Supported GPUs — NVIDIA only
              </h3>
              <ul className="mt-5 space-y-3">
                {SUPPORTED_GPUS.map((g) => (
                  <li key={g} className="flex items-start gap-2.5 text-sm">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{g}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-destructive/30 bg-card/60 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-destructive">
                <XIcon className="h-4 w-4" />
                Not supported
              </h3>
              <ul className="mt-5 space-y-3">
                {UNSUPPORTED_GPUS.map((g) => (
                  <li key={g} className="flex items-start gap-2.5 text-sm">
                    <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive/80" />
                    <span className="text-muted-foreground">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Software / Hardware / Network */}
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <ReqBlock title="Software" items={SOFTWARE_REQS} />
            <ReqBlock title="Hardware" items={HARDWARE_REQS} />
            <ReqBlock title="Network" items={NETWORK_REQS} />
          </div>
        </div>
      </section>

      {/* ── Earnings checker ──────────────────────────────────────────────── */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Check your earnings
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
            Enter your BTX wallet address to view shares submitted and estimated earnings.
          </p>

          <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
            <label htmlFor="wallet-check" className="block text-sm font-medium">
              BTX Wallet Address
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="wallet-check"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkEarnings()}
                placeholder="btx1q…"
                spellCheck={false}
                className="font-mono min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={checkEarnings}
                disabled={checking}
                className="shrink-0 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
              >
                {checking ? "Checking…" : "Check"}
              </button>
            </div>
            {checkError && (
              <p className="mt-2 text-xs text-destructive">{checkError}</p>
            )}

            {hasResults && (
              <div className="mt-8 space-y-6">
                {/* Fleet earnings */}
                {earnings && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Fleet Earnings — Today
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <EarningsStat
                        label="Total Shares"
                        value={earnings.total_shares.toLocaleString()}
                      />
                      <EarningsStat
                        label="Est. BTX"
                        value={earnings.btx_earned_today.toFixed(6)}
                      />
                      <EarningsStat
                        label="USD Value"
                        value={`$${earnings.usd_earned_today.toFixed(4)}`}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      BTX price: ${earnings.btx_price} · Earnings reset at 00:00 UTC
                    </p>
                  </div>
                )}

                {/* Wallet-specific from pool */}
                {walletData && !walletData.error && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Wallet Balance
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <EarningsStat
                        label="Confirmed"
                        value={
                          walletData.balance !== undefined
                            ? `${Number(walletData.balance).toFixed(6)} BTX`
                            : "—"
                        }
                      />
                      <EarningsStat
                        label="Pending"
                        value={
                          walletData.pending !== undefined
                            ? `${Number(walletData.pending).toFixed(6)} BTX`
                            : "—"
                        }
                      />
                      <EarningsStat
                        label="Total Paid"
                        value={
                          walletData.paid !== undefined
                            ? `${Number(walletData.paid).toFixed(6)} BTX`
                            : "—"
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground">
                    Full pool stats and payout history at{" "}
                    <a
                      href="https://pool.arcgrid.dev"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-primary hover:underline"
                    >
                      pool.arcgrid.dev
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Arca Grid</span>
          <span className="font-mono text-muted-foreground">
            Orchestra OS · taylans/orchestra-os:lite
          </span>
        </div>
      </footer>
    </div>
  );
}

function ReqBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-foreground/90">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EarningsStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-3">
      <div className="font-mono text-base font-semibold text-primary">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

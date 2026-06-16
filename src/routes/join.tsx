import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { fetchPoolOverview, fetchWalletBalance } from "@/lib/api/grid-api";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Mine BTX on Arca Grid Pool — Arca Grid" },
      {
        name: "description",
        content:
          "Join the Arca Grid public mining pool. Low share difficulty, PPLNS payouts, no signup required.",
      },
      {
        property: "og:title",
        content: "Mine BTX on Arca Grid Pool — Arca Grid",
      },
      {
        property: "og:description",
        content:
          "Join the Arca Grid public mining pool. Low share difficulty, PPLNS payouts, no signup required.",
      },
      { property: "og:url", content: "https://arcgrid.dev/join" },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/join" }],
  }),
  component: JoinPage,
});

const MINER_COMMAND =
  "btx-miner --pool stratum+tcp://pool.arcgrid.dev:3333 --user YOUR_WALLET.rig01 --pass x";

function JoinPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletData, setWalletData] = useState<{
    totalShares?: number;
    estimatedEarnings?: number;
    lastSeen?: string;
    error?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: poolStats } = useQuery({
    queryKey: ["pool-overview-public"],
    queryFn: () => fetchPoolOverview(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MINER_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCheck = async () => {
    if (!walletAddress.trim()) return;
    setChecking(true);
    setWalletData(null);
    try {
      const res = await fetchWalletBalance(walletAddress.trim());
      setWalletData({
        totalShares: res.balance,
        estimatedEarnings: res.pending,
        lastSeen: res.paid ? `${res.paid} BTX paid` : undefined,
      });
    } catch (err) {
      setWalletData({ error: "Wallet not found or API error" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mine BTX on Arca Grid Pool
        </h1>
        <p className="mt-2 text-muted-foreground">
          Public Stratum pool for BTX mining. Point your rig and start earning.
        </p>

        {/* Stat cards */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Pool Fee" value={`${poolStats?.fee ?? 2}%`} />
          <StatCard
            label="Miners Online"
            value={
              poolStats?.connected_miners != null
                ? String(poolStats.connected_miners)
                : "—"
            }
          />
          <StatCard
            label="Pool Hashrate"
            value={
              poolStats?.pool_hashrate != null
                ? `${poolStats.pool_hashrate} H/s`
                : "—"
            }
          />
        </section>

        {/* Bullet points */}
        <ul className="mt-8 space-y-2 text-sm text-foreground">
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <span>Lower share difficulty — more frequent payouts</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <span>PPLNS — earn proportional to your work</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <span>Supporting BTX network decentralisation</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <span>No signup required — just point and mine</span>
          </li>
        </ul>

        {/* Miner command */}
        <section className="mt-8 rounded-lg border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Miner command
            </span>
            <button
              onClick={handleCopy}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 text-xs text-foreground">
            <code>{MINER_COMMAND}</code>
          </pre>
        </section>

        {/* Wallet balance checker */}
        <section className="mt-8 rounded-lg border border-border bg-secondary/40 p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Wallet Balance Checker
          </h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Enter your BTX wallet"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleCheck}
              disabled={checking || !walletAddress.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {checking ? "Checking…" : "Check Balance"}
            </button>
          </div>

          {walletData && !walletData.error && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ResultCard
                label="Total shares"
                value={
                  walletData.totalShares != null
                    ? String(walletData.totalShares)
                    : "—"
                }
              />
              <ResultCard
                label="Estimated earnings"
                value={
                  walletData.estimatedEarnings != null
                    ? `${walletData.estimatedEarnings} BTX`
                    : "—"
                }
              />
              <ResultCard
                label="Last seen"
                value={walletData.lastSeen ?? "—"}
              />
            </div>
          )}

          {walletData?.error && (
            <p className="mt-4 text-sm text-destructive">{walletData.error}</p>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

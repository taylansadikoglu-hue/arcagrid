import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { POOL_API_BASE, fetchWalletBalance } from "@/lib/api/grid-api";

export const Route = createFileRoute("/pool")({
  head: () => ({
    meta: [
      { title: "Arca Grid Pool — Live BTX Mining Dashboard" },
      {
        name: "description",
        content:
          "Live Arca Grid mining pool stats: hashrate, miners online, blocks found, PPLNS payouts. Public Stratum pool for BTX.",
      },
      { property: "og:title", content: "Arca Grid Pool — Live BTX Mining Dashboard" },
      {
        property: "og:description",
        content:
          "Live Arca Grid mining pool stats: hashrate, miners online, blocks found, PPLNS payouts.",
      },
      { property: "og:url", content: "https://arcgrid.dev/pool" },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "https://arcgrid.dev/pool" }],
  }),
  component: PoolPage,
});

const STRATUM_URL = "stratum+tcp://pool.arcgrid.dev:3333";

// ─── helpers ──────────────────────────────────────────────────

function formatHashrate(hs: number | null | undefined): string {
  if (hs == null || !Number.isFinite(hs)) return "—";
  const units = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s"];
  let v = hs;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function relativeTime(sec: number): string {
  if (!Number.isFinite(sec)) return "—";
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function statusFor(ageSec: number): { label: string; color: string } {
  if (ageSec < 60) return { label: "online", color: "bg-emerald-500" };
  if (ageSec < 300) return { label: "stale", color: "bg-amber-500" };
  return { label: "offline", color: "bg-red-500" };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${POOL_API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

// ─── types (loose; API is loosely typed) ───────────────────────

interface RawMiner {
  worker_name: string;
  canonical_name?: string;
  last_seen: number;
  shares_valid?: number;
  shares_invalid?: number;
  hashrate_estimate?: number;
  hashrate?: { raw?: number; value?: number; display?: string };
}

interface RawShare {
  worker_name: string;
  difficulty: number;
  created_at: number;
}

interface RawBlock {
  height: number;
  reward?: number;
  found_at?: number;
  status?: string;
  confirmations?: number;
}

// ─── component ────────────────────────────────────────────────

function PoolPage() {
  const poolQ = useQuery({
    queryKey: ["pool-page-overview"],
    queryFn: () => getJson<any>("/api/pool"),
    refetchInterval: 10_000,
  });
  const minersQ = useQuery({
    queryKey: ["pool-page-miners"],
    queryFn: () => getJson<{ miners: RawMiner[] }>("/api/miners"),
    refetchInterval: 5_000,
  });
  const blocksQ = useQuery({
    queryKey: ["pool-page-blocks"],
    queryFn: () => getJson<{ blocks: RawBlock[] } | RawBlock[]>("/api/blocks"),
    refetchInterval: 30_000,
  });
  const sharesQ = useQuery({
    queryKey: ["pool-page-shares"],
    queryFn: () => getJson<{ shares: RawShare[] } | RawShare[]>("/api/shares"),
    refetchInterval: 3_000,
  });

  const pool = poolQ.data;
  const poolHash =
    pool?.stats?.pool?.hashrate?.raw ??
    pool?.totals?.miner_hashrate_sum ??
    null;
  const netHash = pool?.stats?.network?.hashrate?.raw ?? pool?.chain?.network_hashrate ?? null;
  const sharePct =
    pool?.stats?.pool?.network_share_percent != null
      ? pool.stats.pool.network_share_percent
      : poolHash != null && netHash
        ? (poolHash / netHash) * 100
        : null;
  const blocksFound = pool?.totals?.blocks ?? 0;
  const blockReward =
    pool?.chain?.coinbasevalue != null
      ? pool.chain.coinbasevalue / 1e8
      : null;
  const minersOnline = pool?.connected_miners ?? pool?.totals?.miners ?? null;
  const difficulty = pool?.chain?.difficulty ?? pool?.stats?.network?.difficulty;
  const nextDifficulty = pool?.chain?.next_difficulty ?? pool?.stats?.network?.next_difficulty;
  const blockHeight = pool?.chain?.height ?? pool?.stats?.network?.height;
  const avgBlockTime = pool?.stats?.network?.block_time?.display ?? null;
  const totalShares = pool?.totals?.shares ?? 0;

  const minersRaw = minersQ.data?.miners ?? [];
  const now = Date.now() / 1000;
  const miners = [...minersRaw].sort((a, b) => {
    const ah = a.hashrate?.raw ?? a.hashrate_estimate ?? 0;
    const bh = b.hashrate?.raw ?? b.hashrate_estimate ?? 0;
    return bh - ah;
  });

  const blocksRaw = blocksQ.data;
  const blocks: RawBlock[] = Array.isArray(blocksRaw)
    ? blocksRaw
    : (blocksRaw?.blocks ?? []);

  const sharesRaw = sharesQ.data;
  const allShares: RawShare[] = Array.isArray(sharesRaw)
    ? sharesRaw
    : (sharesRaw?.shares ?? []);
  const recentShares = allShares.slice(0, 10);

  // wallet checker
  const [walletAddress, setWalletAddress] = useState("");
  const [walletData, setWalletData] = useState<{
    balance?: number;
    pending?: number;
    paid?: number;
    workers?: number;
    lastSeen?: string;
    error?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(STRATUM_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCheck = async () => {
    const addr = walletAddress.trim();
    if (!addr) return;
    setChecking(true);
    setWalletData(null);
    try {
      const res: any = await fetchWalletBalance(addr);
      // Count workers from miners feed for this address
      const myMiners = minersRaw.filter((m) =>
        (m.canonical_name ?? "").startsWith(addr),
      );
      const lastSeenMax = myMiners.reduce(
        (acc, m) => Math.max(acc, m.last_seen ?? 0),
        0,
      );
      setWalletData({
        balance: res.balance,
        pending: res.pending,
        paid: res.paid,
        workers: myMiners.length,
        lastSeen: lastSeenMax ? relativeTime(now - lastSeenMax) : undefined,
      });
    } catch {
      setWalletData({ error: "Wallet not found or API error" });
    } finally {
      setChecking(false);
    }
  };

  const shortWorker = (w: string) => {
    const dot = w.lastIndexOf(".");
    return dot >= 0 ? w.slice(dot + 1) : w;
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Arca Grid Pool
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Public PPLNS Stratum pool for BTX. Live network and pool telemetry.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Live · pool.arcgrid.dev
          </div>
        </div>

        {/* Header stats bar */}
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Stat label="Miners Online" value={minersOnline != null ? String(minersOnline) : "—"} />
          <Stat label="Pool Hashrate" value={formatHashrate(poolHash)} />
          <Stat label="Network Hashrate" value={formatHashrate(netHash)} />
          <Stat
            label="Pool Share"
            value={sharePct != null ? `${sharePct.toFixed(sharePct < 1 ? 4 : 2)}%` : "—"}
          />
          <Stat label="Blocks Found" value={String(blocksFound)} />
          <Stat
            label="Block Reward"
            value={blockReward != null ? `${blockReward.toFixed(2)} BTX` : "—"}
          />
          <Stat label="Pool Fee" value="2%" />
        </section>

        {/* Connect + Wallet */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Connect to Pool
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <Field label="Mining server">
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-background px-3 py-2 text-xs font-mono text-foreground border border-border">
                    {STRATUM_URL}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </Field>
              <Field label="Username">
                <code className="block rounded-md bg-background px-3 py-2 text-xs font-mono text-foreground border border-border">
                  your_btx_wallet.rigname
                </code>
              </Field>
              <Field label="Password">
                <code className="block rounded-md bg-background px-3 py-2 text-xs font-mono text-foreground border border-border">
                  x
                </code>
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Wallet Checker
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Enter BTX wallet to check earnings"
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
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Mini label="Total shares" value={walletData.balance != null ? String(walletData.balance) : "—"} />
                <Mini label="Estimated BTX" value={walletData.pending != null ? `${walletData.pending}` : "—"} />
                <Mini label="Workers" value={walletData.workers != null ? String(walletData.workers) : "—"} />
                <Mini label="Last seen" value={walletData.lastSeen ?? "—"} />
              </div>
            )}
            {walletData?.error && (
              <p className="mt-4 text-sm text-destructive">{walletData.error}</p>
            )}
          </div>
        </section>

        {/* Live miners */}
        <section className="mt-8">
          <SectionHeader title="Live Miners" sub={`${miners.length} workers · refreshes every 5s`} />
          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-secondary/30">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <Th>Worker</Th>
                  <Th align="right">Est. H/s</Th>
                  <Th align="right">Shares</Th>
                  <Th align="right">Rejected</Th>
                  <Th>Last Seen</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {miners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      {minersQ.isLoading ? "Loading miners…" : "No miners online."}
                    </td>
                  </tr>
                )}
                {miners.map((m) => {
                  const hs = m.hashrate?.raw ?? m.hashrate_estimate ?? 0;
                  const age = now - (m.last_seen ?? 0);
                  const st = statusFor(age);
                  return (
                    <tr key={m.canonical_name ?? m.worker_name} className="border-b border-border/40 last:border-0">
                      <Td className="font-mono text-xs text-foreground">{shortWorker(m.worker_name)}</Td>
                      <Td align="right" className="font-mono-num">{formatHashrate(hs)}</Td>
                      <Td align="right" className="font-mono-num">{m.shares_valid ?? 0}</Td>
                      <Td align="right" className="font-mono-num">{m.shares_invalid ?? 0}</Td>
                      <Td className="text-muted-foreground">{relativeTime(age)}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${st.color}`} />
                          <span className="text-muted-foreground">{st.label}</span>
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Blocks + Recent shares */}
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <SectionHeader title="Blocks Found" sub="Last 20 blocks" />
            <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-secondary/30">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <Th>Height</Th>
                    <Th>When</Th>
                    <Th align="right">Reward</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                        No blocks found yet — {totalShares.toLocaleString()}+ shares submitted
                      </td>
                    </tr>
                  ) : (
                    blocks.slice(0, 20).map((b) => (
                      <tr key={b.height} className="border-b border-border/40 last:border-0">
                        <Td className="font-mono-num">{b.height}</Td>
                        <Td className="text-muted-foreground">
                          {b.found_at ? relativeTime(now - b.found_at) : "—"}
                        </Td>
                        <Td align="right" className="font-mono-num">
                          {b.reward != null ? `${b.reward} BTX` : "—"}
                        </Td>
                        <Td>
                          <span className="text-xs text-muted-foreground">
                            {b.status ?? ((b.confirmations ?? 0) > 100 ? "confirmed" : "pending")}
                          </span>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SectionHeader title="Recent Shares" sub="Live feed · refreshes every 3s" />
            <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-secondary/30">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <Th>Worker</Th>
                    <Th align="right">Difficulty</Th>
                    <Th>When</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentShares.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                        {sharesQ.isLoading ? "Loading shares…" : "No recent shares."}
                      </td>
                    </tr>
                  )}
                  {recentShares.map((s, i) => (
                    <tr key={`${s.created_at}-${i}`} className="border-b border-border/40 last:border-0">
                      <Td className="font-mono text-xs">{shortWorker(s.worker_name)}</Td>
                      <Td align="right" className="font-mono-num">{s.difficulty.toFixed(4)}</Td>
                      <Td className="text-muted-foreground">{relativeTime(now - s.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Payout + Network info */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Payout Info
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <DefRow term="Method" def="PPLNS — Fair proportional payouts" />
              <DefRow term="Minimum payout" def="5 BTX" />
              <DefRow term="Frequency" def="Every 24h" />
              <DefRow term="Pool fee" def="2%" />
            </dl>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Network Info
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <DefRow term="Block height" def={blockHeight != null ? String(blockHeight) : "—"} />
              <DefRow
                term="Current difficulty"
                def={difficulty != null ? Number(difficulty).toFixed(6) : "—"}
              />
              <DefRow
                term="Next difficulty"
                def={nextDifficulty != null ? Number(nextDifficulty).toFixed(6) : "—"}
              />
              <DefRow term="Avg block time" def={avgBlockTime ?? "—"} />
            </dl>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── presentational ───────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono-num text-lg font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono-num text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th className={`px-4 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td className={`px-4 py-2 ${align === "right" ? "text-right" : "text-left"} ${className}`}>
      {children}
    </td>
  );
}

function DefRow({ term, def }: { term: string; def: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-right font-medium text-foreground">{def}</dd>
    </>
  );
}
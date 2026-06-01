import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { getBtxSpot } from "@/lib/api/btx.functions";

const WALLET =
  "btx1zsjr4q3fwh4gku3qcp39x9vvjygklg5xkac229k0chlzsnpwhfggst42sr8";
const CLUSTER = "Sydney Cluster A";

// Pro-tier ARCA GRID worker baseline yield per 24h mining cycle. Derived
// from initial subsidy (20 BTX / block, 90s blocks → 19,200 BTX/day network
// wide) and the Pro tier's allocator weight share of the mesh.
const DEFAULT_BTX_PER_CYCLE = 6.4;

const LS_KEY = "arca-wallet-snapshot:sydney-a";

interface Snapshot {
  cycles: number;
  btxPerCycle: number;
  manualBalance: number | null; // overrides estimate when set
}

function loadSnapshot(): Snapshot {
  if (typeof window === "undefined")
    return { cycles: 1, btxPerCycle: DEFAULT_BTX_PER_CYCLE, manualBalance: null };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) throw new Error("empty");
    const v = JSON.parse(raw) as Partial<Snapshot>;
    return {
      cycles: Number.isFinite(v.cycles) ? Number(v.cycles) : 1,
      btxPerCycle: Number.isFinite(v.btxPerCycle)
        ? Number(v.btxPerCycle)
        : DEFAULT_BTX_PER_CYCLE,
      manualBalance:
        typeof v.manualBalance === "number" && Number.isFinite(v.manualBalance)
          ? v.manualBalance
          : null,
    };
  } catch {
    return { cycles: 1, btxPerCycle: DEFAULT_BTX_PER_CYCLE, manualBalance: null };
  }
}

function saveSnapshot(s: Snapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export const Route = createFileRoute("/cluster/sydney-a")({
  head: () => ({
    meta: [
      {
        title: `${CLUSTER} Wallet — Live BTX Valuation — Arca Grid`,
      },
      {
        name: "description",
        content:
          "Live BTX wallet valuation for Sydney Cluster A, anchored to the btxprice.com spot model price.",
      },
    ],
  }),
  component: SydneyAPage,
});

function SydneyAPage() {
  const fetchSpot = useServerFn(getBtxSpot);
  const [snap, setSnap] = useState<Snapshot>({
    cycles: 1,
    btxPerCycle: DEFAULT_BTX_PER_CYCLE,
    manualBalance: null,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSnap(loadSnapshot());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveSnapshot(snap);
  }, [snap, hydrated]);

  const { data: spot, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery(
    {
      queryKey: ["btx-spot"],
      queryFn: () => fetchSpot(),
      refetchInterval: 60_000,
      staleTime: 30_000,
    },
  );

  const balance = useMemo(() => {
    if (snap.manualBalance != null) return snap.manualBalance;
    return Math.max(0, snap.cycles) * Math.max(0, snap.btxPerCycle);
  }, [snap]);

  const priceUsd = spot?.ok ? spot.usd : null;
  const valueUsd = priceUsd != null ? balance * priceUsd : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          ARCA GRID · Sovereign Distributed Mesh
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {CLUSTER} — Wallet Valuation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live spot price from{" "}
          <a
            href="https://btxprice.com"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            btxprice.com
          </a>
          . Refreshes every 60 seconds.
        </p>

        {/* Wallet card */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Payout address
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(WALLET)}
              className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Copy
            </button>
          </div>
          <p className="font-mono-num mt-2 break-all text-sm text-foreground">
            {WALLET}
          </p>
        </section>

        {/* Live valuation grid */}
        <section className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat
            label="BTX spot price"
            value={
              isLoading
                ? "—"
                : priceUsd != null
                  ? `$${priceUsd.toFixed(4)}`
                  : "Unavailable"
            }
            sub={
              spot?.ok
                ? `${spot.sats?.toFixed(0) ?? "—"} sats · btxprice.com`
                : spot?.error
            }
          />
          <Stat
            label="Estimated balance"
            value={`${balance.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })} BTX`}
            sub={
              snap.manualBalance != null
                ? "Operator-entered balance"
                : `${snap.cycles} cycle${snap.cycles === 1 ? "" : "s"} × ${snap.btxPerCycle} BTX`
            }
          />
          <Stat
            label="USD value"
            value={
              valueUsd != null
                ? `$${valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : "—"
            }
            sub={
              dataUpdatedAt
                ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`
                : null
            }
            highlight
          />
        </section>

        {/* Controls */}
        <section className="mt-4 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Balance source
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            BTX mainnet went live 19 March 2026; no public on-chain balance
            endpoint is exposed yet. Set the verified balance below, or let
            the grid estimate it from completed mining cycles on this wallet.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <NumField
              label="Completed 24h cycles"
              value={snap.cycles}
              step={1}
              min={0}
              onChange={(v) => setSnap((s) => ({ ...s, cycles: v }))}
              disabled={snap.manualBalance != null}
            />
            <NumField
              label="BTX per cycle (Pro tier baseline)"
              value={snap.btxPerCycle}
              step={0.1}
              min={0}
              onChange={(v) => setSnap((s) => ({ ...s, btxPerCycle: v }))}
              disabled={snap.manualBalance != null}
            />
          </div>

          <div className="mt-5 border-t border-border/60 pt-5">
            <NumField
              label="Or override with verified on-chain balance (BTX)"
              value={snap.manualBalance ?? 0}
              step={0.01}
              min={0}
              onChange={(v) =>
                setSnap((s) => ({ ...s, manualBalance: v > 0 ? v : null }))
              }
            />
            {snap.manualBalance != null && (
              <button
                type="button"
                onClick={() =>
                  setSnap((s) => ({ ...s, manualBalance: null }))
                }
                className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear override · use cycle estimate
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {isFetching ? "Refreshing…" : "Refresh price now"}
            </button>
            <span className="text-[11px] text-muted-foreground">
              Auto-refresh: 60s
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="font-mono-num mt-2 text-2xl font-semibold">{value}</p>
      {sub && (
        <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
  min,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="font-mono-num mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      />
    </label>
  );
}
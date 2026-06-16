import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { signOut, useAuth } from "@/lib/use-auth";
import { getBtxSpot } from "@/lib/api/btx.functions";

export function SiteNav() {
  const { user } = useAuth();
  const fetchSpot = useServerFn(getBtxSpot);
  const { data: spot } = useQuery({
    queryKey: ["btx-spot"],
    queryFn: () => fetchSpot(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const priceLabel =
    spot && spot.ok
      ? `$${spot.usd.toFixed(spot.usd >= 1 ? 4 : 6)}`
      : "—";
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative grid h-7 w-7 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/40">
            <span className="text-sm font-bold text-primary">₿</span>
            <span className="pulse-dot absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            ARCA GRID <span className="text-muted-foreground">/ Enterprise GPU Orchestration Layer</span>
          </span>
        </Link>
        <div
          className="font-mono-num hidden items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] md:flex"
          title="Live BTX spot · btxprice.com oracle"
        >
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="uppercase tracking-widest text-muted-foreground">BTX</span>
          <span className="text-primary">{priceLabel}</span>
          <span className="text-muted-foreground">USD · oracle</span>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/join"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Join Pool
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            🖥️ Dashboard
          </Link>
          <Link
            to="/deploy"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            ⚡ Deploy Node
          </Link>
          <Link
            to="/billing"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            💳 Billing & Payouts
          </Link>
          <Link
            to="/support"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            🛠️ Support & Registry
          </Link>
          {user ? (
            <button
              onClick={() => signOut()}
              className="ml-2 hidden rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive sm:inline-flex"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/fleet"
              className="ml-2 hidden rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 sm:inline-flex"
            >
              Operator Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
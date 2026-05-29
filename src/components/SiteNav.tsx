import { Link } from "@tanstack/react-router";

import { signOut, useAuth } from "@/lib/use-auth";

export function SiteNav() {
  const { user } = useAuth();
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
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
          >
            Launch
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Dashboard
          </Link>
          <Link
            to="/fleet"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Fleet
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
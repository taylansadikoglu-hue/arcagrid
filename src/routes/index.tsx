import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { signInWithPassword, useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARCA GRID — Secure Operator Terminal" },
      {
        name: "description",
        content:
          "Internal infrastructure monitor for the ARCA GRID enterprise orchestration layer. Authorized operators only.",
      },
      { property: "og:title", content: "ARCA GRID — Secure Operator Terminal" },
      {
        property: "og:description",
        content:
          "Automated Containerized Flag Injection and Hardware Watchdog Optimization across the ARCA GRID mesh.",
      },
    ],
  }),
  component: OperatorTerminal,
});

function OperatorTerminal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/fleet" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TerminalHeader />
      <main className="relative">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <ClusterSyncPanel />
            <BatchOptimizationPanel />
          </section>
          <section className="lg:col-span-1">
            <OperatorSignIn />
          </section>
        </div>
      </main>
      <footer className="border-t border-border/60 py-6">
        <div className="font-mono-num mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 text-[11px] text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} ARCA GRID · Internal Use Only</span>
          <span>Automated Containerized Flag Injection · Hardware Watchdog Optimization</span>
        </div>
      </footer>
    </div>
  );
}

function TerminalHeader() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-sm bg-primary/15 ring-1 ring-primary/40">
            <span className="text-xs font-bold text-primary">₿</span>
          </div>
          <span className="font-mono-num text-xs uppercase tracking-widest text-muted-foreground">
            ARCA GRID <span className="text-foreground">· Secure Operator Terminal</span>
          </span>
        </div>
        <span className="font-mono-num flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          SESSION · UNAUTHENTICATED
        </span>
      </div>
    </header>
  );
}

function ClusterSyncPanel() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const nodes = useMemo(
    () => [
      { id: "ndA-04", region: "eu-west-3", sync: 99.98, peers: 18 },
      { id: "ndB-11", region: "us-east-1", sync: 99.92, peers: 20 },
      { id: "ndC-22", region: "ap-south-1", sync: 99.71, peers: 16 },
      { id: "ndD-07", region: "us-west-2", sync: 99.99, peers: 19 },
      { id: "ndE-19", region: "eu-north-1", sync: 99.84, peers: 17 },
    ],
    [],
  );

  return (
    <div
      className="rounded-xl border border-border bg-card/70 p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Live Cluster Sync Status
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Automated Containerized Flag Injection and Hardware Watchdog Optimization.
          </p>
        </div>
        <span className="font-mono-num text-[11px] text-primary">
          tick · {String(tick).padStart(4, "0")}
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-background/60 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Node</th>
              <th className="px-3 py-2 font-medium">Region</th>
              <th className="px-3 py-2 font-medium">Sync</th>
              <th className="px-3 py-2 font-medium">Peers</th>
              <th className="px-3 py-2 font-medium">State</th>
            </tr>
          </thead>
          <tbody className="font-mono-num">
            {nodes.map((n, i) => {
              const live = (n.sync + Math.sin((tick + i) / 2) * 0.02).toFixed(2);
              return (
                <tr key={n.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-foreground">{n.id}</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.region}</td>
                  <td className="px-3 py-2 text-primary">{live}%</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.peers}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-primary">
                      <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                      OK
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BatchOptimizationPanel() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((v) => v + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const series = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => 0.55 + Math.sin((i + t) / 3) * 0.18 + (i % 5) * 0.01),
    [t],
  );
  const max = Math.max(...series);

  const metrics = [
    { label: "Throughput", value: "OPTIMAL" },
    { label: "Flag Injection", value: "AUTO" },
    { label: "Watchdog", value: "HEALTHY" },
    { label: "Queue Pressure", value: "NOMINAL" },
  ];

  return (
    <div
      className="rounded-xl border border-border bg-card/70 p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Autonomous Batch Optimization Analytics
        </h2>
        <span className="font-mono-num text-[11px] text-muted-foreground">
          window · 32s
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-md border border-border bg-background/60 px-3 py-2"
          >
            <div className="font-mono-num text-sm text-primary">{m.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {m.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-28 items-end gap-1 rounded-md border border-border bg-background/60 p-2">
        {series.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/70"
            style={{ height: `${(v / max) * 100}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Autonomous routing maintains optimal containerized throughput across the
        ARCA GRID mesh without operator intervention.
      </p>
    </div>
  );
}

function OperatorSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signInWithPassword(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate({ to: "/fleet" });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="sticky top-6 rounded-xl border border-primary/30 bg-card/80 p-6"
      style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
    >
      <div className="flex items-center gap-2">
        <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="font-mono-num text-[11px] uppercase tracking-widest text-primary">
          Restricted Access
        </span>
      </div>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">
        Client Node Authorization
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Secure Sign-In · Authorized operators only.
      </p>

      <label className="mt-5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Operator Email
      </label>
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="font-mono-num mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />

      <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Authorization Key
      </label>
      <input
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="font-mono-num mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />

      {error && (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
      >
        {submitting ? "Authenticating…" : "Authorize Session"}
      </button>

      <p className="mt-4 text-[11px] text-muted-foreground">
        All access is logged. Unauthorized attempts are reported to the ARCA GRID
        security operations center.
      </p>
    </form>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { updatePassword } from "@/lib/use-auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset passphrase — Arca Grid" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Supabase puts the recovery session in the URL hash; the client picks it
  // up automatically and fires PASSWORD_RECOVERY.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      },
    );
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (password.length < 8) {
      setErr("Passphrase must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passphrases do not match.");
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Passphrase updated. Redirecting to console…");
    setTimeout(() => navigate({ to: "/fleet" }), 1200);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-md place-items-center px-6">
        <div
          className="w-full rounded-2xl border border-border bg-card p-8"
          style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
        >
          <h1 className="text-lg font-semibold">Reset passphrase</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a new operator passphrase to regain console access.
          </p>

          {!ready ? (
            <p className="mt-6 text-xs text-muted-foreground">
              Validating recovery link…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  New passphrase
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono-num mt-1.5 w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Confirm passphrase
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="font-mono-num mt-1.5 w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {err && (
                <p className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {err}
                </p>
              )}
              {msg && (
                <p className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                  {msg}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "…" : "Update passphrase"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
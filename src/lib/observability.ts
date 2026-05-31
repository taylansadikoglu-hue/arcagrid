import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

// Public Sentry DSN — safe to ship in client bundle.
const SENTRY_DSN =
  "https://a4a062b5a25a19c01c5d5ee907ff6899@o4511481772900352.ingest.us.sentry.io/4511481777029120";

let initialized = false;

export function initObservability() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  } catch (err) {
    console.warn("[observability] Sentry init failed", err);
  }

  const phKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const phHost =
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
    "https://us.i.posthog.com";
  if (phKey) {
    try {
      posthog.init(phKey, {
        api_host: phHost,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: "identified_only",
      });
    } catch (err) {
      console.warn("[observability] PostHog init failed", err);
    }
  }
}

export function track(event: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    if (posthog.__loaded) posthog.capture(event, props);
  } catch {
    /* noop */
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* noop */
  }
}

export const ErrorBoundary = Sentry.ErrorBoundary;
export { Sentry };
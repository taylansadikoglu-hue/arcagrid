import { useEffect, useState } from "react";

export type TierId =
  | "standard_24h"
  | "pro_24h"
  | "standard_monthly"
  | "pro_monthly"
  | "partner_share";
export type MiningMode = "pool" | "solo";

export interface Tier {
  id: TierId;
  name: string;
  tagline: string;
  price: number;
  unit: string;
  hardware: string;
  hashrate: string;
  features: string[];
  highlight?: boolean;
  description?: string;
}

export const TIERS: Tier[] = [
  {
    id: "standard_24h",
    name: "Standard",
    tagline: "Optimized Grid Capacity",
    price: 199,
    unit: "24h",
    hardware: "Standard Hashrate",
    hashrate: "Optimized throughput",
    description:
      "Autonomous spot-market allocation locks the cheapest qualified worker for steady, low-variance throughput.",
    features: [
      "Pinned CUDA 12.0 runtime",
      "Autonomous spot-market allocation",
      "Hard-capped thermal routing",
      "Live dashboard + signed lease logs",
    ],
  },
  {
    id: "pro_24h",
    name: "Pro",
    tagline: "Max Density Compute Clusters",
    price: 349,
    unit: "24h",
    hardware: "Pro Hashrate",
    hashrate: "Max density compute",
    description:
      "Reserves the top thermal-headroom class on the mesh for dense cryptographic workloads with priority allocator weight.",
    features: [
      "Top thermal-headroom class",
      "Priority allocator weight",
      "Hardened daemon peer flags",
      "Priority operator support",
    ],
  },
  {
    id: "standard_monthly",
    name: "Grid Node · Tier 1",
    tagline: "Monthly",
    price: 199,
    unit: "Month",
    hardware: "Dedicated Standard Performance Core",
    hashrate: "Optimized throughput",
    description:
      "Dedicated 1× Standard Performance Core — optimized for entry-level retail hashing loops.",
    features: [
      "Automated smart wallet routing",
      "Priority bootstrap sync",
      "Fault-tolerant protection",
      "⚡ Pay to Mine in under 30 mins",
    ],
  },
  {
    id: "pro_monthly",
    name: "Mesh Compute · Tier 2",
    tagline: "Monthly",
    price: 349,
    unit: "Month",
    hardware: "Dedicated Multi-GPU High-Efficiency Array",
    hashrate: "Max density compute",
    highlight: true,
    description:
      "Dedicated Multi-GPU High-Efficiency Array — optimized for aggressive pool block-hunting.",
    features: [
      "Priority allocator weight",
      "Dedicated mesh routing",
      "Hardened daemon peer flags",
      "⚡ Pay to Mine in under 30 mins",
    ],
  },
  {
    id: "partner_share",
    name: "Infrastructure Core",
    tagline: "Zero-Upfront",
    price: 0,
    unit: "rev-share",
    hardware: "Bring-your-own rig",
    hashrate: "Profit-share routing",
    description:
      "Deploy your rig with zero upfront cost. We take a flat 5% revenue share directly from your block earnings.",
    features: [
      "$0.00 upfront",
      "5% flat revenue share on block earnings",
      "Auto-injected BTX_DEV_FEE=0.05",
      "Cancel any session, any time",
    ],
  },
];

export interface MinerSession {
  wallet: string;
  mode: MiningMode;
  tier: TierId;
  instanceId: string;
  status: "mining" | "idle";
  startedAt: number;
  expiresAt: number;
  hostCost: number;
  paidPrice: number;
}

const KEY = "btx-miner-session";
const PREFS_KEY = "btx-miner-prefs";

export interface MinerPrefs {
  wallet: string;
  mode: MiningMode;
}

export function loadPrefs(): MinerPrefs {
  if (typeof window === "undefined") return { wallet: "", mode: "pool" };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : { wallet: "", mode: "pool" };
  } catch {
    return { wallet: "", mode: "pool" };
  }
}

export function savePrefs(prefs: MinerPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (e.g. Incognito / quota). Fail silent — prefs
    // are non-critical and the app continues to work in-memory.
  }
}

export function loadSession(): MinerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MinerSession> | null;
    if (!isValidSession(parsed)) {
      // Corrupted / legacy / partial payload — purge so we never re-enter
      // the broken state on next mount.
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function isValidSession(s: unknown): s is MinerSession {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  if (typeof o.wallet !== "string" || !o.wallet) return false;
  if (o.mode !== "pool" && o.mode !== "solo") return false;
  if (typeof o.tier !== "string") return false;
  if (!TIERS.some((t) => t.id === o.tier)) return false;
  if (typeof o.instanceId !== "string" || !o.instanceId) return false;
  if (o.status !== "mining" && o.status !== "idle") return false;
  if (typeof o.startedAt !== "number" || !Number.isFinite(o.startedAt)) return false;
  if (typeof o.expiresAt !== "number" || !Number.isFinite(o.expiresAt)) return false;
  if (typeof o.hostCost !== "number" || !Number.isFinite(o.hostCost)) return false;
  if (typeof o.paidPrice !== "number" || !Number.isFinite(o.paidPrice)) return false;
  return true;
}

export function saveSession(session: MinerSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable (Incognito, quota, sandboxed iframe). The
    // in-memory session still drives the current tab — we simply lose
    // persistence across reloads rather than crash the app.
  }
}

export function useMinerSession() {
  const [session, setSession] = useState<MinerSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      setSession(loadSession());
    } catch {
      setSession(null);
    } finally {
      setHydrated(true);
    }
  }, []);
  const update = (next: MinerSession | null) => {
    setSession(next);
    saveSession(next);
  };
  return { session, setSession: update, hydrated };
}

/**
 * Dynamic node-cost picker for ARCA GRID.
 *
 * Customer-first routing: hardware filters (vram ≥ 16, modern RTX) take
 * absolute priority. Margin targets a healthy 40% gross but is permitted
 * to dynamically compress down to 5% so a high-quality host is always
 * secured for the user instead of failing the deploy.
 */
export function pickHostCost(paidPrice: number, isMonthly: boolean): number {
  const dailyPaid = isMonthly ? paidPrice / 30 : paidPrice;
  // Up to 98% of paid (2% floor margin) when needed to guarantee hardware
  // binding. Securing a qualified host beats failing the deploy over margin.
  const maxCost = dailyPaid * 0.98;
  return Math.max(0.5, Number((maxCost * 0.92).toFixed(2)));
}

export function tierById(id: TierId): Tier | null {
  return TIERS.find((t) => t.id === id) ?? null;
}
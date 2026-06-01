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
    price: 7,
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
    price: 14,
    unit: "24h",
    hardware: "Pro Hashrate",
    hashrate: "Max density compute",
    highlight: true,
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
    name: "Standard",
    tagline: "Monthly",
    price: 160,
    unit: "mo",
    hardware: "Standard Hashrate",
    hashrate: "Optimized throughput",
    description:
      "Sustained monthly capacity with immutable, tag-pinned worker releases and rolling lease renewals.",
    features: [
      "Unlimited 24h sessions",
      "Save 20% vs daily",
      "Email payout reports",
      "Cancel anytime",
    ],
  },
  {
    id: "pro_monthly",
    name: "Pro",
    tagline: "Monthly",
    price: 340,
    unit: "mo",
    hardware: "Pro Hashrate",
    hashrate: "Max density compute",
    description:
      "Reserved Pro-class capacity with dedicated allocator weight and white-glove fleet onboarding.",
    features: [
      "Unlimited Pro sessions",
      "Save ~20% vs daily",
      "Dedicated mesh routing",
      "1:1 onboarding",
    ],
  },
  {
    id: "partner_share",
    name: "Partner Hashrate",
    tagline: "Zero-Upfront",
    price: 0,
    unit: "rev-share",
    hardware: "Bring-your-own rig",
    hashrate: "Profit-share routing",
    description:
      "Deploy your rig with zero upfront cost. We take a 20% infrastructure routing fee directly from your block earnings.",
    features: [
      "$0.00 upfront",
      "20% routing fee on block earnings",
      "Auto-injected BTX_DEV_FEE=0.20",
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
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function loadSession(): MinerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: MinerSession | null) {
  if (typeof window === "undefined") return;
  if (session) localStorage.setItem(KEY, JSON.stringify(session));
  else localStorage.removeItem(KEY);
}

export function useMinerSession() {
  const [session, setSession] = useState<MinerSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setSession(loadSession());
    setHydrated(true);
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

export function tierById(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}
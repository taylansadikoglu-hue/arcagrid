import { useEffect, useState } from "react";

export type TierId = "standard_24h" | "pro_24h" | "standard_monthly" | "pro_monthly";
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
}

export const TIERS: Tier[] = [
  {
    id: "standard_24h",
    name: "Standard",
    tagline: "High Efficiency",
    price: 5,
    unit: "24h",
    hardware: "RTX 4070 Ti SUPER",
    hashrate: "~ 1.4 GH/s",
    features: [
      "Optimized batch tuning",
      "Auto-selects cheapest Vast.ai host",
      "≥ 40% margin guarantee",
      "Live dashboard + logs",
    ],
  },
  {
    id: "pro_24h",
    name: "Pro",
    tagline: "Max Hashrate",
    price: 9,
    unit: "24h",
    hardware: "RTX 4090 / A6000",
    hashrate: "~ 2.6 GH/s",
    highlight: true,
    features: [
      "Top-tier GPU pool",
      "Priority instance allocation",
      "Pipeline async tuning",
      "Priority support",
    ],
  },
  {
    id: "standard_monthly",
    name: "Standard",
    tagline: "Monthly",
    price: 120,
    unit: "mo",
    hardware: "RTX 4070 Ti SUPER",
    hashrate: "~ 1.4 GH/s",
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
    price: 240,
    unit: "mo",
    hardware: "RTX 4090 / A6000",
    hashrate: "~ 2.6 GH/s",
    features: [
      "Unlimited Pro sessions",
      "Save 17% vs daily",
      "Dedicated host pool",
      "1:1 onboarding",
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
  hostCost: number; // mocked $/24h paid to Vast.ai
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

/** Mocked Vast.ai host-cost finder, enforces ≥ 40% margin. */
export function pickHostCost(paidPrice: number, isMonthly: boolean): number {
  // Convert monthly paid to daily-equivalent before applying margin
  const dailyPaid = isMonthly ? paidPrice / 30 : paidPrice;
  const maxCost = dailyPaid * 0.6; // at most 60% of paid price
  // Pretend we found a host slightly under the cap
  return Math.max(0.5, Number((maxCost * 0.92).toFixed(2)));
}

export function tierById(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}
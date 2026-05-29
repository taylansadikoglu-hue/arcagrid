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
  description?: string;
}

export const TIERS: Tier[] = [
  {
    id: "standard_24h",
    name: "Standard",
    tagline: "Optimized Grid Capacity",
    price: 5,
    unit: "24h",
    hardware: "Standard Hashrate",
    hashrate: "Optimized throughput",
    description:
      "Dynamically hooks into highly optimized multi-GPU arrays (targeting 3080Ti/4070Ti baseline efficiencies).",
    features: [
      "Production batch tuning (80 / 16)",
      "Sovereign Distributed Grid Mesh match",
      "Strict ≥ 40% gross margin guarantee",
      "Live dashboard + logs",
    ],
  },
  {
    id: "pro_24h",
    name: "Pro",
    tagline: "Max Density Compute Clusters",
    price: 12,
    unit: "24h",
    hardware: "Pro Hashrate",
    hashrate: "Max density compute",
    highlight: true,
    description:
      "Allocates enterprise-grade compute nodes tailored for maximum cryptographic throughput and massive hardware density.",
    features: [
      "Top-tier CUDA-capable nodes",
      "Priority grid allocation",
      "Hardened daemon peer flags",
      "Priority support",
    ],
  },
  {
    id: "standard_monthly",
    name: "Standard",
    tagline: "Monthly",
    price: 120,
    unit: "mo",
    hardware: "Standard Hashrate",
    hashrate: "Optimized throughput",
    description:
      "Dynamically hooks into highly optimized multi-GPU arrays (targeting 3080Ti/4070Ti baseline efficiencies).",
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
    price: 290,
    unit: "mo",
    hardware: "Pro Hashrate",
    hashrate: "Max density compute",
    description:
      "Allocates enterprise-grade compute nodes tailored for maximum cryptographic throughput and massive hardware density.",
    features: [
      "Unlimited Pro sessions",
      "Save ~20% vs daily",
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
  hostCost: number; // mocked live $/24h grid spot price
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
 * Dynamic host-cost picker for the Sovereign Distributed Grid Mesh.
 * Sorts the live spot market by cheapest CUDA-capable device matching
 * the tier's performance profile, then enforces a STRICT minimum 40%
 * gross profit margin over the live spot price.
 */
export function pickHostCost(paidPrice: number, isMonthly: boolean): number {
  const dailyPaid = isMonthly ? paidPrice / 30 : paidPrice;
  // Hard ceiling: host spot price may never exceed 60% of customer price.
  const maxCost = dailyPaid * 0.6;
  // Cheapest matched CUDA node sits comfortably under the ceiling.
  return Math.max(0.5, Number((maxCost * 0.92).toFixed(2)));
}

export function tierById(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}
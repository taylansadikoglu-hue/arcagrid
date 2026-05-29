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
      "Our proprietary intelligent routing layer dynamically matches your session with the highest-efficiency nodes across ARCA GRID, optimizing cryptographic throughput in real-time.",
    features: [
      "Production-tuned CUDA runtime",
      "ARCA GRID intelligent routing",
      "Automated infrastructure load balancing",
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
      "Our proprietary intelligent routing layer dynamically matches your session with the highest-efficiency nodes across ARCA GRID, optimizing cryptographic throughput in real-time.",
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
      "Priority mesh routing",
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
 */
export function pickHostCost(paidPrice: number, isMonthly: boolean): number {
  const dailyPaid = isMonthly ? paidPrice / 30 : paidPrice;
  const maxCost = dailyPaid * 0.6;
  return Math.max(0.5, Number((maxCost * 0.92).toFixed(2)));
}

export function tierById(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}
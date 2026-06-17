/**
 * Compatibility helpers: turning EmuReady performance ranks into UI tiers, and
 * matching community listings against a user's saved console.
 *
 * EmuReady performance ranks ascend as quality drops:
 *   1 Perfect · 2 Great · 3 Playable · 5 Ingame · 8 Nothing
 */

import type { Listing } from "./emuready";

export type CompatTier = "perfect" | "great" | "playable" | "partial" | "none";

export interface TierStyle {
  tier: CompatTier;
  /** Tailwind classes for the badge (bg + text + ring). */
  className: string;
  /** Hex dot color for compact indicators. */
  dot: string;
}

export function tierFromRank(rank: number | undefined): CompatTier {
  if (rank == null) return "none";
  if (rank <= 1) return "perfect";
  if (rank <= 2) return "great";
  if (rank <= 3) return "playable";
  if (rank <= 6) return "partial";
  return "none";
}

const TIER_STYLES: Record<CompatTier, Omit<TierStyle, "tier">> = {
  perfect: {
    className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "#10b981",
  },
  great: {
    className: "bg-green-100 text-green-700 ring-green-200",
    dot: "#22c55e",
  },
  playable: {
    className: "bg-amber-100 text-amber-700 ring-amber-200",
    dot: "#f59e0b",
  },
  partial: {
    className: "bg-orange-100 text-orange-700 ring-orange-200",
    dot: "#f97316",
  },
  none: {
    className: "bg-rose-100 text-rose-700 ring-rose-200",
    dot: "#f43f5e",
  },
};

export function tierStyle(tier: CompatTier): TierStyle {
  return { tier, ...TIER_STYLES[tier] };
}

/** Best (lowest-rank) performance among a set of listings, as a tier. */
export function bestTier(listings: Listing[]): CompatTier {
  const ranks = listings
    .map((l) => l.performance?.rank)
    .filter((r): r is number => r != null);
  if (ranks.length === 0) return "none";
  return tierFromRank(Math.min(...ranks));
}

export interface ConsoleMatch {
  /** Listings tested on this exact device. */
  exact: Listing[];
  /** Listings on a different device sharing the same SoC/GPU (close proxy). */
  similar: Listing[];
  /** Everything else (other hardware). */
  other: Listing[];
}

/**
 * Split listings by how well they match the user's console. `exact` wins when
 * device ids match; `similar` falls back to a shared SoC name (a strong signal
 * since GPU/CPU drive emulation performance).
 */
export function matchListingsToConsole(
  listings: Listing[],
  console: { deviceId: string; socName?: string | null } | null,
): ConsoleMatch {
  if (!console) return { exact: [], similar: [], other: listings };

  const exact: Listing[] = [];
  const similar: Listing[] = [];
  const other: Listing[] = [];
  const soc = console.socName?.toLowerCase();

  for (const l of listings) {
    if (l.deviceId === console.deviceId || l.device?.id === console.deviceId) {
      exact.push(l);
    } else if (soc && l.device?.soc?.name?.toLowerCase() === soc) {
      similar.push(l);
    } else {
      other.push(l);
    }
  }
  return { exact, similar, other };
}

/** Sort listings best-first (lowest performance rank, then most upvotes). */
export function sortByQuality(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => {
    const ra = a.performance?.rank ?? 99;
    const rb = b.performance?.rank ?? 99;
    if (ra !== rb) return ra - rb;
    return (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0);
  });
}

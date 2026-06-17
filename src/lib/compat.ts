/**
 * Compatibility helpers: turning EmuReady performance ranks into UI tiers, and
 * matching community listings against a user's saved console.
 *
 * EmuReady performance ranks ascend as quality drops:
 *   1 Perfect · 2 Great · 3 Playable · 5 Ingame · 8 Nothing
 */

import type { Game, Listing } from "./emuready";

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

// --- Recommendations --------------------------------------------------------

/** Points awarded for a listing's performance tier (higher is better). */
function tierPoints(rank: number | undefined): number {
  switch (tierFromRank(rank)) {
    case "perfect":
      return 100;
    case "great":
      return 82;
    case "playable":
      return 60;
    case "partial":
      return 28;
    default:
      return 5;
  }
}

const DAY_MS = 86_400_000;

/**
 * Normalize a game title for cross-platform de-duplication. Lowercases, strips
 * edition/port suffixes ("Definitive Edition", "Remaster", …) and punctuation
 * so the Windows and Switch entries of one game collapse together.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(
      /\b(definitive|complete|remaster(ed)?|enhanced|deluxe|goty|game of the year|anniversary|hd|remake|classic)\b/g,
      "",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface Recommendation {
  game: Game;
  /** Best (lowest) performance rank seen for this game on the console. */
  rank: number;
  /** Composite score used for ranking (higher is better). */
  score: number;
  /** How many relevant reports back this recommendation. */
  reportCount: number;
  /** True when at least one report is on the exact device (not just chipset). */
  exact: boolean;
  /** Set when this game was boosted by the user's library (system affinity). */
  becauseOfSystem?: string;
}

export interface RecommendOptions {
  limit?: number;
  /** Games to omit by EmuReady id (e.g. already in the user's library). */
  excludeGameIds?: Set<string>;
  /**
   * Normalized titles to omit. EmuReady has a separate entry per platform, so
   * excluding by id alone would still surface (say) the Switch port of a game
   * the user saved on Windows. Build with `normalizeTitle`.
   */
  excludeTitles?: Set<string>;
  /**
   * Systems the user plays, mapped to how many library games they have on each.
   * Games on these systems are boosted so recommendations reflect taste.
   */
  boostSystems?: Map<string, number>;
  /**
   * Worst performance rank to allow. Default 3 (Playable+). Pass 2 to keep only
   * games that run great or perfect ("definitely runs well").
   */
  maxRank?: number;
}

interface Agg {
  game: Game;
  bestRank: number;
  bestWeight: number;
  reportCount: number;
  upvotes: number;
  downvotes: number;
  newest: number;
  exact: boolean;
}

/**
 * Rank games to recommend for a console from its listings.
 *
 * A game's score blends four signals so that a single lucky report can't
 * outrank a broadly-corroborated one:
 *   - performance tier (the dominant factor), weighted down for chipset-only
 *     matches since they're a proxy rather than the exact device;
 *   - confidence from the number of corroborating reports;
 *   - community votes (upvotes minus downvotes); and
 *   - a small recency boost for reports from the last few months.
 * Only games that are at least "Playable" are returned.
 */
export function recommendGames(
  listings: Listing[],
  console: { deviceId: string; socName?: string | null } | null,
  opts: RecommendOptions = {},
): Recommendation[] {
  const { limit = 18, excludeGameIds, excludeTitles, boostSystems, maxRank = 3 } =
    opts;
  const { exact, similar } = matchListingsToConsole(listings, console);
  // Same-chipset reports are a strong proxy but rate slightly below the exact
  // device they were measured on.
  const weighted = [
    ...exact.map((l) => ({ l, weight: 1, exact: true })),
    ...similar.map((l) => ({ l, weight: 0.85, exact: false })),
  ];

  // Key by normalized title so a game's per-platform entries merge into one
  // recommendation (we keep the best-running variant as the representative).
  const byGame = new Map<string, Agg>();
  for (const { l, weight, exact: isExact } of weighted) {
    if (!l.game) continue;
    if (excludeGameIds?.has(l.game.id)) continue;
    const key = normalizeTitle(l.game.normalizedTitle ?? l.game.title);
    if (excludeTitles?.has(key)) continue;
    const rank = l.performance?.rank ?? 99;
    const created = Date.parse(l.createdAt ?? "") || 0;
    const cur = byGame.get(key);
    if (!cur) {
      byGame.set(key, {
        game: l.game,
        bestRank: rank,
        bestWeight: weight,
        reportCount: 1,
        upvotes: l.upvoteCount ?? 0,
        downvotes: l.downvoteCount ?? 0,
        newest: created,
        exact: isExact,
      });
    } else {
      if (rank < cur.bestRank) {
        cur.bestRank = rank;
        cur.bestWeight = weight;
        cur.game = l.game; // show the best-running variant
      }
      cur.reportCount += 1;
      cur.upvotes += l.upvoteCount ?? 0;
      cur.downvotes += l.downvoteCount ?? 0;
      cur.newest = Math.max(cur.newest, created);
      cur.exact = cur.exact || isExact;
    }
  }

  const now = Date.now();
  const recs: Recommendation[] = [];
  for (const a of byGame.values()) {
    // Honor the quality threshold (default Playable+, or Great+ when maxRank=2).
    if (a.bestRank > maxRank) continue;

    const base = tierPoints(a.bestRank) * a.bestWeight;
    const confidence = Math.min(a.reportCount, 5) * 4; // up to +20
    const community = Math.max(-10, Math.min(20, a.upvotes - a.downvotes));
    const recency = a.newest && now - a.newest < 120 * DAY_MS ? 8 : 0;

    // Boost games on systems the user plays (taste affinity from the library).
    const systemName = a.game.system?.name;
    const affinity = systemName ? (boostSystems?.get(systemName) ?? 0) : 0;
    const multiplier = 1 + Math.min(affinity, 4) * 0.2; // up to +80%

    recs.push({
      game: a.game,
      rank: a.bestRank,
      reportCount: a.reportCount,
      exact: a.exact,
      score: (base + confidence + community + recency) * multiplier,
      becauseOfSystem: affinity > 0 ? systemName : undefined,
    });
  }

  return recs
    .sort((x, y) => y.score - x.score || y.reportCount - x.reportCount)
    .slice(0, limit);
}

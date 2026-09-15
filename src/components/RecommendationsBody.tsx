import Link from "next/link";
import { getSavedGames, currentUserId } from "@/lib/user-data";
import { getSteamTaste } from "@/lib/steam-taste";
import { loadConsolePool } from "@/lib/recommendation-data";
import { recommendGames, recentlyTested, normalizeTitle } from "@/lib/compat";
import type { ConsoleRef } from "@/lib/compat";
import { RecommendationList } from "@/components/RecommendationList";
import { RecommendationSettings, type RecSettings } from "@/components/RecommendationSettings";
import { FreshRow } from "@/components/FreshRow";

const QUALITY_RANK = { playable: 3, great: 2, perfect: 1 } as const;

/** Fewer than this isn't a "fresh" row, it's noise. */
const MIN_FRESH = 4;

/**
 * The data half of /recommendations, split out so the page shell can render
 * instantly and stream this in behind a Suspense boundary.
 */
export async function RecommendationsBody({
  settings,
  consoleRef,
  modelName,
}: {
  settings: RecSettings;
  consoleRef: ConsoleRef;
  modelName: string;
}) {
  const maxRank = QUALITY_RANK[settings.quality];

  const userId = await currentUserId();
  const [saved, pool, taste] = await Promise.all([
    getSavedGames(),
    loadConsolePool(consoleRef, { maxRank }),
    // Optional: only present once a Steam library has been imported and enriched.
    userId ? getSteamTaste(userId).catch(() => null) : null,
  ]);

  const librarySystems = new Map<string, number>();
  for (const s of saved) {
    if (s.systemName) {
      librarySystems.set(s.systemName, (librarySystems.get(s.systemName) ?? 0) + 1);
    }
  }

  const excludeGameIds = new Set(saved.map((s) => s.gameId));
  const excludeTitles = new Set(saved.map((s) => normalizeTitle(s.title)));

  const fresh = recentlyTested(pool, consoleRef, {
    limit: 12,
    withinDays: 45,
    maxRank,
    excludeGameIds,
    excludeTitles,
  });

  let recs = recommendGames(pool, consoleRef, {
    limit: 300, // compute the full set; the client reveals it incrementally
    excludeGameIds,
    excludeTitles,
    boostSystems: settings.taste ? librarySystems : undefined,
    titleAffinity: settings.taste ? taste?.titleAffinity : undefined,
    titleAffinityReason: settings.taste ? taste?.titleAffinityReason : undefined,
    maxRank,
  });

  // Platforms available to filter by (before applying the platform filter).
  const systems = [
    ...new Set(recs.map((r) => r.game.system?.name).filter((n): n is string => !!n)),
  ].sort();

  if (settings.system !== "all") {
    recs = recs.filter((r) => r.game.system?.name === settings.system);
  }

  return (
    <div className="space-y-6">
      <RecommendationSettings current={settings} systems={systems} />

      {fresh.length >= MIN_FRESH && (
        <FreshRow picks={fresh} modelName={modelName} />
      )}

      {recs.length === 0 ? (
        <div className="card-surface p-8 text-center text-ink-soft">
          No games match these settings.{" "}
          <Link href="/recommendations" className="font-bold text-primary-strong underline">
            Reset filters
          </Link>
          .
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink-soft">
            {recs.length} game{recs.length === 1 ? "" : "s"} match
          </p>
          {/* Trim to what GameCard actually renders: the full Game objects would
              push a few hundred KB of RSC payload across the client boundary. */}
          <RecommendationList
            items={recs.map((r) => ({
              id: r.game.id,
              title: r.game.title,
              boxartUrl: r.game.boxartUrl,
              imageUrl: r.game.imageUrl,
              systemName: r.game.system?.name ?? null,
              rank: r.rank,
            }))}
          />
        </>
      )}
    </div>
  );
}

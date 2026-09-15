import "server-only";
import { cache } from "react";
import { getWindowsCatalog, type Game } from "@/lib/emuready";
import { normalizeTitle } from "@/lib/compat";

/**
 * Matching a Steam library against EmuReady's Windows catalog.
 *
 * The approach that does NOT scale is one `searchGames` call per owned title — a
 * 500-game library would be 500 uncached requests. Instead we page the whole
 * Windows catalog once (cached 24h and shared across all users) into a normalized
 * title index, after which matching a library is pure `Map.get`.
 */

/** Things in a Steam library that aren't games and would only waste lookups. */
const NOT_A_GAME =
  /\b(soundtrack|ost|sdk|dedicated server|server|demo|playtest|beta|artbook|art book|trailer|benchmark|wallpaper|toolkit|editor|bonus content|season pass)\b/i;

export function isLikelyGame(name: string): boolean {
  return !NOT_A_GAME.test(name);
}

/**
 * normalizeTitle(key) -> best EmuReady Windows game for that key.
 *
 * Keyed with exactly the expression `recommendGames` aggregates by, so the match
 * index and the recommendation engine always agree on what "the same game" means.
 * On collision the entry with the most listings wins — that's the one whose page
 * is worth linking to.
 */
export const windowsTitleIndex = cache(async function windowsTitleIndex(): Promise<
  Map<string, Game>
> {
  const games = await getWindowsCatalog().catch(() => [] as Game[]);
  const index = new Map<string, Game>();

  for (const g of games) {
    const key = normalizeTitle(g.normalizedTitle ?? g.title);
    if (!key) continue;
    const existing = index.get(key);
    if (
      !existing ||
      (g._count?.listings ?? 0) > (existing._count?.listings ?? 0)
    ) {
      index.set(key, g);
    }
  }
  return index;
});

/** Look one Steam title up in the index. Returns null when there's no match. */
export function matchSteamTitle(
  name: string,
  index: Map<string, Game>,
): Game | null {
  if (!isLikelyGame(name)) return null;
  const key = normalizeTitle(name);
  if (!key) return null;
  return index.get(key) ?? null;
}

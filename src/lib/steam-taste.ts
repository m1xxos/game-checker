import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { normalizeTitle } from "@/lib/compat";

/**
 * Turns an imported Steam library into signals the recommendation engine can use.
 *
 * An honest note on coverage: EmuReady's `Game` has no genre field, and Steam
 * gives us genres for games the user *owns*, not for the candidates we want to
 * recommend. Genre affinity can therefore only ever touch candidates whose title
 * we've resolved to a Steam app — a minority. That's why `ownedTitles` (the
 * backlog intersection, which is exact and complete) is the primary signal, and
 * `titleAffinity` is a small bonus rather than a reordering force.
 *
 * Everything crossing into compat.ts is a plain Map/Set keyed by `normalizeTitle`,
 * so the engine stays completely Steam-agnostic.
 */
export interface SteamTaste {
  /** Normalized titles the user owns on Steam. Feeds `restrictToTitles`. */
  ownedTitles: Set<string>;
  /** Genre -> 0..1 share of the user's playtime. */
  genreWeights: Map<string, number>;
  /** Normalized title -> 0..1 taste score, for resolved titles only. */
  titleAffinity: Map<string, number>;
  titleAffinityReason: Map<string, string>;
}

export const getSteamTaste = cache(async function getSteamTaste(
  userId: string,
): Promise<SteamTaste | null> {
  const games = await prisma.steamGame
    .findMany({
      where: { userId },
      include: { app: true },
    })
    .catch(() => []);

  if (games.length === 0) return null;

  const ownedTitles = new Set<string>();
  for (const g of games) {
    const key = normalizeTitle(g.name);
    if (key) ownedTitles.add(key);
    // The matched EmuReady title can be spelled differently; index both.
    if (g.app.emuTitle) {
      const emuKey = normalizeTitle(g.app.emuTitle);
      if (emuKey) ownedTitles.add(emuKey);
    }
  }

  // Playtime-weighted genre vector. Playtime is the only "did you actually like
  // it" signal Steam exposes, so it beats a plain genre count.
  const genreMinutes = new Map<string, number>();
  let totalMinutes = 0;
  for (const g of games) {
    const minutes = g.selected
      ? Math.max(g.playtimeMinutes, 60) // a ticked game counts even if untracked
      : g.playtimeMinutes;
    if (minutes <= 0 || g.app.genres.length === 0) continue;
    totalMinutes += minutes;
    for (const genre of g.app.genres) {
      genreMinutes.set(genre, (genreMinutes.get(genre) ?? 0) + minutes);
    }
  }

  const genreWeights = new Map<string, number>();
  if (totalMinutes > 0) {
    for (const [genre, minutes] of genreMinutes) {
      genreWeights.set(genre, minutes / totalMinutes);
    }
  }

  // Score each *known* app by how well its genres match the user's vector, then
  // key it by the EmuReady title so compat.ts can look it up.
  const titleAffinity = new Map<string, number>();
  const titleAffinityReason = new Map<string, string>();

  if (genreWeights.size > 0) {
    const known = await prisma.steamApp
      .findMany({
        where: { emuGameId: { not: null }, detailsFetchedAt: { not: null } },
        select: { emuTitle: true, genres: true },
      })
      .catch(() => []);

    for (const app of known) {
      if (!app.emuTitle || app.genres.length === 0) continue;
      const key = normalizeTitle(app.emuTitle);
      if (!key || ownedTitles.has(key)) continue; // already played it

      let best = 0;
      let bestGenre = "";
      let score = 0;
      for (const genre of app.genres) {
        const w = genreWeights.get(genre) ?? 0;
        score += w;
        if (w > best) {
          best = w;
          bestGenre = genre;
        }
      }
      if (score <= 0) continue;
      titleAffinity.set(key, Math.min(1, score));
      if (bestGenre) {
        titleAffinityReason.set(key, `You play a lot of ${bestGenre}`);
      }
    }
  }

  return {
    ownedTitles,
    genreWeights,
    titleAffinity,
    titleAffinityReason,
  };
});

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/actions";
import {
  SteamError,
  getOwnedGames,
  getPlayerSummary,
  getAppDetails,
  parseSteamInput,
  resolveSteamId,
  steamEnabled,
  steamIconUrl,
  type SteamProfileSummary,
} from "@/lib/steam";
import { windowsTitleIndex, matchSteamTitle, isLikelyGame } from "@/lib/steam-match";
import { getGames, WINDOWS_SYSTEM_ID } from "@/lib/emuready";
import { normalizeTitle } from "@/lib/compat";

/**
 * Steam actions return results rather than throwing.
 *
 * `addConsole` and friends throw because their only failure mode is a bug. Steam
 * fails for ordinary, user-facing reasons — a private profile, a typo'd link, a
 * rate limit — and those need to render as a message next to the form, not as an
 * error boundary.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof SteamError) return { ok: false, error: err.message };
  console.error("[steam] unexpected failure", err);
  return { ok: false, error: "Something went wrong talking to Steam." };
}

/** Guard every action: the UI hides these, but an action id can still be POSTed. */
function guard(): { ok: false; error: string } | null {
  return steamEnabled()
    ? null
    : { ok: false, error: "Steam import isn't set up on this server." };
}

/** Re-syncs are pointless in quick succession and cost API budget. */
const RESYNC_COOLDOWN_MS = 5 * 60_000;
/** Cap the preview payload: it crosses the RSC boundary. */
const PREVIEW_LIMIT = 500;

export interface SteamLibraryRow {
  appId: number;
  name: string;
  playtimeMinutes: number;
  lastPlayedAt: string | null;
  iconUrl: string | null;
  emuGameId: string | null;
  emuTitle: string | null;
  selected: boolean;
}

/** Link a Steam account. Resolves the profile but imports nothing yet. */
export async function connectSteamAction(
  input: string,
): Promise<Result<SteamProfileSummary>> {
  const disabled = guard();
  if (disabled) return disabled;

  try {
    const userId = await requireUserId();
    const steamId64 = await resolveSteamId(input);
    const summary = await getPlayerSummary(steamId64);
    const parsed = parseSteamInput(input);
    const vanityUrl = parsed?.kind === "vanity" ? parsed.vanity : null;

    // Confirm the library is actually readable before claiming success — a
    // private profile is the single most common failure and it's much kinder to
    // surface it here than after the user hits "import".
    await getOwnedGames(steamId64);

    await prisma.steamProfile.upsert({
      where: { userId },
      create: {
        userId,
        steamId64,
        vanityUrl,
        personaName: summary?.personaName ?? null,
        avatarUrl: summary?.avatarUrl ?? null,
      },
      update: {
        steamId64,
        vanityUrl,
        personaName: summary?.personaName ?? null,
        avatarUrl: summary?.avatarUrl ?? null,
      },
    });

    revalidatePath("/steam");
    return {
      ok: true,
      data: summary ?? { steamId64, personaName: null, avatarUrl: null, vanityUrl },
    };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Fetch the library and pair it with EmuReady matches, without writing anything.
 * The match pass is free: it's `Map.get` against the cached Windows index.
 */
export async function previewSteamLibraryAction(): Promise<
  Result<{ rows: SteamLibraryRow[]; totalOwned: number; hiddenCount: number }>
> {
  const disabled = guard();
  if (disabled) return disabled;

  try {
    const userId = await requireUserId();
    const profile = await prisma.steamProfile.findUnique({ where: { userId } });
    if (!profile) return { ok: false, error: "Connect your Steam account first." };

    const [owned, index, previouslySelected] = await Promise.all([
      getOwnedGames(profile.steamId64),
      windowsTitleIndex(),
      prisma.steamGame.findMany({
        where: { userId, selected: true },
        select: { appId: true },
      }),
    ]);

    const wasSelected = new Set(previouslySelected.map((g) => g.appId));
    const playable = owned
      .filter((g) => isLikelyGame(g.name))
      .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);

    const rows: SteamLibraryRow[] = playable.slice(0, PREVIEW_LIMIT).map((g) => {
      const match = matchSteamTitle(g.name, index);
      return {
        appId: g.appId,
        name: g.name,
        playtimeMinutes: g.playtimeMinutes,
        lastPlayedAt: g.lastPlayedAt?.toISOString() ?? null,
        iconUrl: steamIconUrl(g.appId, g.iconHash),
        emuGameId: match?.id ?? null,
        emuTitle: match?.title ?? null,
        selected: wasSelected.has(g.appId),
      };
    });

    return {
      ok: true,
      data: {
        rows,
        totalOwned: owned.length,
        hiddenCount: Math.max(0, playable.length - rows.length),
      },
    };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Persist the library, marking `selectedAppIds` as played.
 *
 * A full mirror (delete + recreate) is simpler and safer than diffing, but the
 * user's ticks are *not* derived from Steam — so they're read inside the
 * transaction and restored, or a re-sync would silently wipe them.
 */
export async function importSteamLibraryAction(
  selectedAppIds: number[],
): Promise<Result<{ owned: number; selected: number; matched: number }>> {
  const disabled = guard();
  if (disabled) return disabled;

  try {
    const userId = await requireUserId();
    const profile = await prisma.steamProfile.findUnique({ where: { userId } });
    if (!profile) return { ok: false, error: "Connect your Steam account first." };

    const [owned, index] = await Promise.all([
      getOwnedGames(profile.steamId64),
      windowsTitleIndex(),
    ]);

    const selected = new Set(selectedAppIds);
    const games = owned.filter((g) => isLikelyGame(g.name));

    // Carry the art and platform through, not just the id: these rows are what
    // the library grid renders, and SavedGame has no way to look them up later.
    // boxartUrl is usually set but not always, so fall back to imageUrl.
    const matches = new Map<
      number,
      { id: string; title: string; boxartUrl: string | null; systemName: string | null }
    >();
    for (const g of games) {
      const m = matchSteamTitle(g.name, index);
      if (m) {
        matches.set(g.appId, {
          id: m.id,
          title: m.title,
          boxartUrl: m.boxartUrl ?? m.imageUrl ?? null,
          systemName: m.system?.name ?? null,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      // Catalog skeletons first: SteamGame.appId has an FK onto SteamApp.
      await tx.steamApp.createMany({
        data: games.map((g) => ({
          appId: g.appId,
          name: g.name,
          genres: [],
          categories: [],
        })),
        skipDuplicates: true,
      });

      // Record matches we just discovered for free, so the backfill can skip them.
      for (const [appId, m] of matches) {
        await tx.steamApp.updateMany({
          where: { appId, matchedAt: null },
          data: { emuGameId: m.id, emuTitle: m.title, matchedAt: new Date() },
        });
      }

      await tx.steamGame.deleteMany({ where: { profileId: profile.id } });
      await tx.steamGame.createMany({
        data: games.map((g) => ({
          profileId: profile.id,
          userId,
          appId: g.appId,
          name: g.name,
          playtimeMinutes: g.playtimeMinutes,
          lastPlayedAt: g.lastPlayedAt,
          iconHash: g.iconHash,
          selected: selected.has(g.appId),
        })),
      });

      await tx.steamProfile.update({
        where: { id: profile.id },
        data: { syncedAt: new Date(), gameCount: owned.length },
      });

      // Played games that exist on EmuReady go straight into the library, which
      // is what seeds recommendations.
      const savedRows = [...selected]
        .map((appId) => {
          const m = matches.get(appId);
          return m
            ? {
                userId,
                gameId: m.id,
                title: m.title,
                boxartUrl: m.boxartUrl,
                systemName: m.systemName,
                source: "steam",
              }
            : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      // Replace the Steam-derived slice wholesale rather than createMany-skip:
      // an unticked game should leave the library, and re-importing has to be
      // able to repair rows written by an earlier version. Manual saves are
      // untouched, and a game saved both ways keeps its manual row (the unique
      // constraint makes skipDuplicates a no-op there).
      await tx.savedGame.deleteMany({ where: { userId, source: "steam" } });
      if (savedRows.length > 0) {
        await tx.savedGame.createMany({ data: savedRows, skipDuplicates: true });
      }
    });

    revalidatePath("/steam");
    revalidatePath("/dashboard");
    revalidatePath("/recommendations");

    return {
      ok: true,
      data: {
        owned: games.length,
        selected: selected.size,
        matched: matches.size,
      },
    };
  } catch (err) {
    return fail(err);
  }
}

/** Re-pull the library from Steam, preserving the user's ticks. */
export async function syncSteamLibraryAction(): Promise<Result<{ owned: number }>> {
  const disabled = guard();
  if (disabled) return disabled;

  try {
    const userId = await requireUserId();
    const profile = await prisma.steamProfile.findUnique({ where: { userId } });
    if (!profile) return { ok: false, error: "Connect your Steam account first." };

    if (
      profile.syncedAt &&
      Date.now() - profile.syncedAt.getTime() < RESYNC_COOLDOWN_MS
    ) {
      return { ok: false, error: "Just synced — try again in a few minutes." };
    }

    const existing = await prisma.steamGame.findMany({
      where: { userId, selected: true },
      select: { appId: true },
    });
    const result = await importSteamLibraryAction(existing.map((g) => g.appId));
    if (!result.ok) return result;
    return { ok: true, data: { owned: result.data.owned } };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Bounded, resumable backfill: genres from the rate-limited appdetails endpoint
 * and EmuReady matches for titles the free index pass missed. Returns how much is
 * left so the caller can loop with a progress bar.
 */
export async function enrichSteamAppsAction(
  batch = 20,
): Promise<Result<{ processed: number; remaining: number }>> {
  const disabled = guard();
  if (disabled) return disabled;

  try {
    const userId = await requireUserId();
    const size = Math.min(Math.max(batch, 1), 25);

    // Only enrich apps this user owns, most-played (and ticked) first.
    const owned = await prisma.steamGame.findMany({
      where: { userId, app: { detailsFetchedAt: null } },
      orderBy: [{ selected: "desc" }, { playtimeMinutes: "desc" }],
      select: { appId: true, name: true },
      take: size,
    });

    const remainingBefore = await prisma.steamGame.count({
      where: { userId, app: { detailsFetchedAt: null } },
    });

    let processed = 0;
    let rateLimited = false;

    // Concurrency 2 with light spacing: the store endpoint is shared budget.
    const queue = [...owned];
    async function worker(): Promise<void> {
      for (let item = queue.shift(); item != null; item = queue.shift()) {
        if (rateLimited) return;
        try {
          const details = await getAppDetails(item.appId);
          await prisma.steamApp.update({
            where: { appId: item.appId },
            data: {
              genres: details?.genres ?? [],
              categories: details?.categories ?? [],
              // Stamped even on a miss, so a delisted app is negatively cached
              // instead of being retried forever.
              detailsFetchedAt: new Date(),
            },
          });
          processed += 1;
        } catch (err) {
          if (err instanceof SteamError && err.code === "rate_limited") {
            rateLimited = true;
            return;
          }
          // A single bad app must not stall the batch.
          console.error(`[steam] appdetails failed for ${item.appId}`, err);
        }
        await new Promise((r) => setTimeout(r, 350));
      }
    }
    await Promise.all([worker(), worker()]);

    // Residual EmuReady matching for titles the free index missed.
    await backfillMatches(userId);

    return {
      ok: true,
      data: {
        processed,
        remaining: Math.max(0, remainingBefore - processed),
      },
    };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Second-chance matching for titles the normalized index missed (subtitle and
 * punctuation differences). Uses `games.get` with a systemId — never
 * `searchGames`, which is cross-platform and would happily return the Switch
 * entry for a PC title.
 */
async function backfillMatches(userId: string): Promise<void> {
  const unmatched = await prisma.steamGame.findMany({
    where: { userId, app: { matchedAt: null } },
    orderBy: [{ selected: "desc" }, { playtimeMinutes: "desc" }],
    select: { appId: true, name: true },
    take: 20,
  });

  for (const item of unmatched) {
    const { games } = await getGames({
      search: item.name,
      limit: 5,
      systemId: WINDOWS_SYSTEM_ID,
    }).catch(() => ({ games: [] }));

    const want = normalizeTitle(item.name);
    const hit = games.find(
      (g) => normalizeTitle(g.normalizedTitle ?? g.title) === want,
    );

    await prisma.steamApp.update({
      where: { appId: item.appId },
      data: {
        emuGameId: hit?.id ?? null,
        emuTitle: hit?.title ?? null,
        matchedAt: new Date(),
      },
    }).catch(() => {});
  }
}

/** Unlink Steam. Imported library rows cascade; saved games are opt-in. */
export async function disconnectSteamAction(
  alsoRemoveSavedGames: boolean,
): Promise<void> {
  if (!steamEnabled()) return;
  const userId = await requireUserId();

  if (alsoRemoveSavedGames) {
    await prisma.savedGame.deleteMany({ where: { userId, source: "steam" } });
  }
  await prisma.steamProfile.deleteMany({ where: { userId } });

  revalidatePath("/steam");
  revalidatePath("/dashboard");
  revalidatePath("/recommendations");
}

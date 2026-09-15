import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type {
  ConsoleProfile,
  SavedGame,
  SteamApp,
  SteamGame,
  SteamProfile,
} from "@/generated/prisma/client";

/** Current user id, or null when signed out. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getConsoles(): Promise<ConsoleProfile[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  return prisma.consoleProfile.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
}

/** The user's active console (or their first, or null). */
export async function getActiveConsole(): Promise<ConsoleProfile | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const active = await prisma.consoleProfile.findFirst({
    where: { userId, isActive: true },
  });
  if (active) return active;
  return prisma.consoleProfile.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getSavedGames(): Promise<SavedGame[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  return prisma.savedGame.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** Set of EmuReady game ids the user has saved (for quick membership checks). */
export async function savedGameIds(): Promise<Set<string>> {
  const userId = await currentUserId();
  if (!userId) return new Set();
  const rows = await prisma.savedGame.findMany({
    where: { userId },
    select: { gameId: true },
  });
  return new Set(rows.map((r) => r.gameId));
}

// --- Steam ------------------------------------------------------------------

export async function getSteamProfile(): Promise<SteamProfile | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  return prisma.steamProfile.findUnique({ where: { userId } });
}

/** The user's imported Steam games, most-played first, with the global app cache. */
export async function getSteamGames(
  opts: { selectedOnly?: boolean; take?: number } = {},
): Promise<(SteamGame & { app: SteamApp })[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  return prisma.steamGame.findMany({
    where: { userId, ...(opts.selectedOnly ? { selected: true } : {}) },
    orderBy: { playtimeMinutes: "desc" },
    include: { app: true },
    ...(opts.take ? { take: opts.take } : {}),
  });
}

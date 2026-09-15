import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { steamEnabled } from "@/lib/steam";
import {
  currentUserId,
  getActiveConsole,
  getSteamProfile,
  getSteamGames,
} from "@/lib/user-data";
import { resolveConsoleRef } from "@/lib/console-soc";
import { loadConsolePool } from "@/lib/recommendation-data";
import { recommendGames, normalizeTitle } from "@/lib/compat";
import { SteamConnect } from "@/components/SteamConnect";
import { SteamImport } from "@/components/SteamImport";
import { SteamEnrichProgress } from "@/components/SteamEnrichProgress";
import { SteamAccountActions } from "@/components/SteamDisconnect";
import { GameCard } from "@/components/GameCard";
import { ChannelGrid } from "@/components/ChannelGrid";

export const metadata: Metadata = { title: "Steam — Game Checker" };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-surface mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="mt-2 text-ink-soft">{children}</div>
    </div>
  );
}

export default async function SteamPage() {
  // An explanatory card rather than a 404: a bookmark shouldn't become a dead end
  // just because the server isn't configured for Steam.
  if (!steamEnabled()) {
    return (
      <Card title="Steam import isn't set up">
        This server doesn&apos;t have a Steam API key configured, so library import
        is unavailable. Everything else works normally.
      </Card>
    );
  }

  const userId = await currentUserId();
  if (!userId) {
    return (
      <Card title="Sign in to connect Steam">
        <Link href="/signin" className="font-bold text-primary-strong underline">
          Sign in
        </Link>{" "}
        to import the games you&apos;ve already played.
      </Card>
    );
  }

  const profile = await getSteamProfile();

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">Connect Steam</h1>
          <p className="text-ink-soft">
            Import what you&apos;ve played so recommendations know your taste from
            day one.
          </p>
        </div>
        <div className="card-surface p-6">
          <SteamConnect />
        </div>
      </div>
    );
  }

  const [games, active, savedFromSteam] = await Promise.all([
    getSteamGames({ take: 400 }),
    getActiveConsole(),
    prisma.savedGame.count({ where: { userId, source: "steam" } }),
  ]);

  // "You already own these, and they run on your handheld" — the highest-signal
  // surface we can build, and it needs no genre data at all.
  let backlog: Awaited<ReturnType<typeof recommendGames>> = [];
  if (active && games.length > 0) {
    const ref = await resolveConsoleRef(active);
    const pool = await loadConsolePool(ref).catch(() => []);
    const owned = new Set<string>();
    for (const g of games) {
      owned.add(normalizeTitle(g.name));
      if (g.app.emuTitle) owned.add(normalizeTitle(g.app.emuTitle));
    }
    backlog = recommendGames(pool, ref, { restrictToTitles: owned, limit: 24 });
  }

  const played = games.filter((g) => g.selected).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold">Your Steam library</h1>
            <p className="text-ink-soft">
              {games.length} games imported · {played} marked as played
            </p>
          </div>

          <SteamEnrichProgress />

          {backlog.length > 0 && active && (
            <section className="space-y-3">
              <div>
                <h2 className="text-xl font-extrabold">
                  From your Steam backlog
                </h2>
                <p className="text-sm text-ink-soft">
                  You already own {backlog.length} of these — and they run on your{" "}
                  {active.modelName}.
                </p>
              </div>
              <ChannelGrid>
                {backlog.map((r) => (
                  <GameCard key={r.game.id} game={r.game} rank={r.rank} />
                ))}
              </ChannelGrid>
            </section>
          )}

          {!active && (
            <div className="card-surface p-6 text-center text-ink-soft">
              <Link
                href="/consoles"
                className="font-bold text-primary-strong underline"
              >
                Add a console
              </Link>{" "}
              to see which of your Steam games run on it.
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-extrabold">Update what you&apos;ve played</h2>
            <div className="card-surface p-6">
              <SteamImport />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card-surface space-y-4 p-5">
            <div className="flex items-center gap-3">
              {profile.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="size-12 rounded-2xl"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-extrabold">
                  {profile.personaName ?? "Steam account"}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {profile.syncedAt
                    ? `Synced ${profile.syncedAt.toLocaleDateString()}`
                    : "Not imported yet"}
                </p>
              </div>
            </div>
            <SteamAccountActions savedFromSteam={savedFromSteam} />
          </div>
        </aside>
      </div>
    </div>
  );
}

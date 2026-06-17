import Link from "next/link";
import type { Metadata } from "next";
import { getListingsByDevice } from "@/lib/emuready";
import { getActiveConsole, getSavedGames, currentUserId } from "@/lib/user-data";
import { recommendGames, type Recommendation } from "@/lib/compat";
import { GameCard } from "@/components/GameCard";
import { ChannelGrid } from "@/components/ChannelGrid";
import { RunsWellToggle } from "@/components/RunsWellToggle";

export const metadata: Metadata = { title: "Library — Game Checker" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ well?: string }>;
}) {
  const userId = await currentUserId();

  if (!userId) {
    return (
      <div className="card-surface mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-extrabold">Sign in to see your library</h1>
        <p className="mt-2 text-ink-soft">
          Save games and get recommendations tuned to your console.
        </p>
        <Link
          href="/signin"
          className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { well } = await searchParams;
  const runsWellOnly = well === "1";

  const [active, saved] = await Promise.all([
    getActiveConsole(),
    getSavedGames(),
  ]);

  // What the user plays: count library games per system to bias recommendations.
  const librarySystems = new Map<string, number>();
  for (const s of saved) {
    if (s.systemName) {
      librarySystems.set(s.systemName, (librarySystems.get(s.systemName) ?? 0) + 1);
    }
  }
  // Most-played systems, for the section subtitle.
  const topSystems = [...librarySystems.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Recommendations from the single device fetch: scored, boosted toward the
  // systems in the library, excluding games already saved.
  let recommended: Recommendation[] = [];
  if (active) {
    const listings = await getListingsByDevice(active.deviceId, 100).catch(
      () => [],
    );
    recommended = recommendGames(listings, active, {
      limit: 24,
      excludeGameIds: new Set(saved.map((s) => s.gameId)),
      boostSystems: librarySystems,
      maxRank: runsWellOnly ? 2 : 3,
    });
  }

  const hasLibraryTaste = topSystems.length > 0;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">Your library</h1>
            <p className="text-ink-soft">Games you saved to check later.</p>
          </div>
          <Link
            href="/search"
            className="text-sm font-bold text-primary-strong hover:underline"
          >
            Find more →
          </Link>
        </div>

        {saved.length === 0 ? (
          <div className="card-surface p-8 text-center text-ink-soft">
            Nothing saved yet. Tap{" "}
            <span className="font-bold text-ink">☆ Save for later</span> on any
            game.
          </div>
        ) : (
          <ChannelGrid>
            {saved.map((s) => (
              <GameCard
                key={s.id}
                game={{
                  id: s.gameId,
                  title: s.title,
                  boxartUrl: s.boxartUrl,
                  imageUrl: null,
                  system: s.systemName
                    ? { id: "", name: s.systemName, key: "" }
                    : undefined,
                }}
              />
            ))}
          </ChannelGrid>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">
              {!active
                ? "Recommended for you"
                : hasLibraryTaste
                  ? "Because of your library"
                  : `Runs great on your ${active.modelName}`}
            </h2>
            <p className="text-ink-soft">
              {!active
                ? "Pick a console to personalize."
                : hasLibraryTaste
                  ? `More ${topSystems.join(", ")} games that run well on your ${active.modelName}.`
                  : `Standout games on your ${active.modelName}.`}
            </p>
          </div>
          {active && <RunsWellToggle runsWellOnly={runsWellOnly} />}
        </div>

        {!active ? (
          <div className="card-surface p-8 text-center text-ink-soft">
            <Link href="/consoles" className="font-bold text-primary-strong underline">
              Pick your console
            </Link>{" "}
            to get personalized recommendations.
          </div>
        ) : recommended.length === 0 ? (
          <div className="card-surface p-8 text-center text-ink-soft">
            {runsWellOnly
              ? "No games are confirmed to run great here yet. "
              : "No standout reports for this console yet. "}
            {runsWellOnly ? (
              <Link href="/dashboard" className="font-bold text-primary-strong underline">
                Show all playable games
              </Link>
            ) : (
              <Link href="/search" className="font-bold text-primary-strong underline">
                Browse games
              </Link>
            )}
            .
          </div>
        ) : (
          <ChannelGrid>
            {recommended.map(({ game, rank }) => (
              <GameCard key={game.id} game={game} rank={rank} />
            ))}
          </ChannelGrid>
        )}
      </section>
    </div>
  );
}

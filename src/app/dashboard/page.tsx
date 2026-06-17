import Link from "next/link";
import type { Metadata } from "next";
import { getListingsByDevice } from "@/lib/emuready";
import { getActiveConsole, getSavedGames, currentUserId } from "@/lib/user-data";
import { recommendGames, type Recommendation } from "@/lib/compat";
import { GameCard } from "@/components/GameCard";
import { ChannelGrid } from "@/components/ChannelGrid";

export const metadata: Metadata = { title: "Library — Game Checker" };

export default async function DashboardPage() {
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

  const [active, saved] = await Promise.all([
    getActiveConsole(),
    getSavedGames(),
  ]);

  // Recommendations: score games by performance, corroboration, votes and
  // recency for the active console (see recommendGames). One device fetch.
  let recommended: Recommendation[] = [];
  if (active) {
    const listings = await getListingsByDevice(active.deviceId, 100).catch(
      () => [],
    );
    recommended = recommendGames(listings, active, 18);
  }

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
        <h2 className="text-2xl font-extrabold">
          {active
            ? `Runs great on your ${active.modelName}`
            : "Recommended for you"}
        </h2>
        {!active ? (
          <div className="card-surface p-8 text-center text-ink-soft">
            <Link href="/consoles" className="font-bold text-primary-strong underline">
              Pick your console
            </Link>{" "}
            to get personalized recommendations.
          </div>
        ) : recommended.length === 0 ? (
          <div className="card-surface p-8 text-center text-ink-soft">
            No standout reports for this console yet. Try{" "}
            <Link href="/search" className="font-bold text-primary-strong underline">
              browsing games
            </Link>
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

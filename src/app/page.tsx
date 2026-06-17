import Link from "next/link";
import { getFeaturedListings, getGames, type Game } from "@/lib/emuready";
import { getActiveConsole } from "@/lib/user-data";
import { GameCard } from "@/components/GameCard";
import { ChannelGrid } from "@/components/ChannelGrid";
import { SearchBar } from "@/components/SearchBar";

export default async function HomePage() {
  const [featured, active] = await Promise.all([
    getFeaturedListings().catch(() => []),
    getActiveConsole(),
  ]);

  // Featured listings → unique games, keeping the best (lowest) rank seen.
  const byGame = new Map<string, { game: Game; rank: number }>();
  for (const l of featured) {
    if (!l.game) continue;
    const rank = l.performance?.rank ?? 99;
    const prev = byGame.get(l.game.id);
    if (!prev || rank < prev.rank) byGame.set(l.game.id, { game: l.game, rank });
  }
  let games = [...byGame.values()];

  // Fallback to the popular catalog if featured came back empty.
  if (games.length === 0) {
    const { games: popular } = await getGames({ limit: 18 }).catch(() => ({
      games: [],
    }));
    games = popular.map((g) => ({ game: g, rank: 99 }));
  }

  return (
    <div className="space-y-10">
      <section className="card-surface relative overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-5">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            Will it run on <span className="text-primary">your console?</span>
          </h1>
          <p className="text-lg text-ink-soft">
            Pick a game and instantly see how it performs on your Android
            handheld — powered by community reports from EmuReady and GameNative.
          </p>
          <div className="mx-auto max-w-md">
            <SearchBar autoFocus placeholder="Search 1000s of games…" />
          </div>
          {active ? (
            <p className="text-sm font-semibold text-ink-soft">
              Showing results for your{" "}
              <span className="text-primary-strong">{active.modelName}</span> ·{" "}
              <Link href="/consoles" className="underline">
                change
              </Link>
            </p>
          ) : (
            <Link
              href="/consoles"
              className="inline-block rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
            >
              Pick your console →
            </Link>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Featured games</h2>
          <Link
            href="/search"
            className="text-sm font-bold text-primary-strong hover:underline"
          >
            Browse all →
          </Link>
        </div>
        {games.length > 0 ? (
          <ChannelGrid>
            {games.map(({ game, rank }) => (
              <GameCard
                key={game.id}
                game={game}
                rank={rank < 99 ? rank : undefined}
              />
            ))}
          </ChannelGrid>
        ) : (
          <p className="text-ink-soft">
            Couldn&apos;t reach EmuReady right now. Try searching above.
          </p>
        )}
      </section>
    </div>
  );
}

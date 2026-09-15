import Link from "next/link";
import { searchGames, EmuReadyError, type Game } from "@/lib/emuready";
import { GameCard } from "@/components/GameCard";
import { ChannelGrid } from "@/components/ChannelGrid";
import { SearchBar } from "@/components/SearchBar";
import { NoResults } from "@/components/NoResults";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  // A genuine miss (HTTP 200 + []) and an outage (throws EmuReadyError) mean very
  // different things to the user, so keep them apart instead of collapsing both
  // into an empty array.
  let games: Game[] = [];
  let unreachable = false;
  if (query) {
    try {
      games = await searchGames(query, 36);
    } catch (err) {
      unreachable = true;
      if (!(err instanceof EmuReadyError)) {
        console.error("[search] unexpected failure", err);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl">
        <SearchBar defaultValue={query} autoFocus />
      </div>

      {!query ? (
        <p className="text-center text-ink-soft">
          Start typing to search for a game.
        </p>
      ) : unreachable ? (
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary-soft text-3xl">
            📡
          </span>
          <h1 className="mt-3 text-2xl font-extrabold">
            Couldn&apos;t reach EmuReady
          </h1>
          <p className="mt-2 text-ink-soft">
            The community database isn&apos;t responding right now — this isn&apos;t
            about your search. Give it a moment and try again.
          </p>
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            className="mt-5 inline-block rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
          >
            Retry
          </Link>
        </div>
      ) : games.length === 0 ? (
        <NoResults query={query} />
      ) : (
        <>
          <h1 className="text-xl font-extrabold">
            {games.length} result{games.length === 1 ? "" : "s"} for “{query}”
          </h1>
          <ChannelGrid>
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </ChannelGrid>
        </>
      )}
    </div>
  );
}

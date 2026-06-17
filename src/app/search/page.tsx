import { searchGames } from "@/lib/emuready";
import { GameCard } from "@/components/GameCard";
import { ChannelGrid } from "@/components/ChannelGrid";
import { SearchBar } from "@/components/SearchBar";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const games = query ? await searchGames(query, 36).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl">
        <SearchBar defaultValue={query} autoFocus />
      </div>

      {!query ? (
        <p className="text-center text-ink-soft">
          Start typing to search for a game.
        </p>
      ) : games.length === 0 ? (
        <p className="text-center text-ink-soft">
          No games found for <span className="font-bold">“{query}”</span>.
        </p>
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

import Image from "next/image";
import Link from "next/link";
import type { Game } from "@/lib/emuready";
import { CompatibilityBadge } from "./CompatibilityBadge";

/** A glossy game tile for the channel grid. */
export function GameCard({
  game,
  /** Optional best-known performance rank to show as a badge. */
  rank,
  listingCount,
}: {
  game: Pick<
    Game,
    "id" | "title" | "boxartUrl" | "imageUrl" | "system"
  > & { _count?: { listings: number } };
  rank?: number;
  listingCount?: number;
}) {
  const art = game.boxartUrl ?? game.imageUrl ?? null;
  const count = listingCount ?? game._count?.listings;

  return (
    <Link
      href={`/games/${game.id}`}
      className="channel-tile group flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
    >
      <div className="relative aspect-3/4 w-full overflow-hidden bg-canvas">
        {art ? (
          <Image
            src={art}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-soft">
            No art
          </div>
        )}
        {rank != null && (
          <div className="absolute right-2 top-2 z-10">
            <CompatibilityBadge rank={rank} size="sm" />
          </div>
        )}
      </div>
      <div className="relative z-10 flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 font-bold leading-tight">{game.title}</h3>
        <div className="mt-auto flex items-center justify-between text-xs text-ink-soft">
          {game.system?.name && (
            <span className="truncate">{game.system.name}</span>
          )}
          {count != null && <span>{count} reports</span>}
        </div>
      </div>
    </Link>
  );
}

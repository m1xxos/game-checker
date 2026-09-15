"use client";

import { useState } from "react";
import { GameCard } from "./GameCard";
import { ChannelGrid } from "./ChannelGrid";

/**
 * Minimal per-game shape crossing the server/client boundary — deliberately not
 * the full `Recommendation`, whose nested `Game` objects would add a few hundred
 * KB of RSC payload for 300 items.
 */
export interface RecommendationItem {
  id: string;
  title: string;
  boxartUrl: string | null;
  imageUrl: string | null;
  systemName: string | null;
  rank: number;
}

/** Recommendation grid with incremental "show more" (no refetch). */
export function RecommendationList({
  items,
  step = 24,
}: {
  items: RecommendationItem[];
  step?: number;
}) {
  const [count, setCount] = useState(step);
  const shown = items.slice(0, count);
  const remaining = items.length - count;

  return (
    <div className="space-y-6">
      <ChannelGrid>
        {shown.map((item) => (
          <GameCard
            key={item.id}
            game={{
              id: item.id,
              title: item.title,
              boxartUrl: item.boxartUrl,
              imageUrl: item.imageUrl,
              system: item.systemName
                ? { id: "", name: item.systemName, key: "" }
                : undefined,
            }}
            rank={item.rank}
          />
        ))}
      </ChannelGrid>

      {remaining > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setCount((c) => c + step)}
            className="rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong"
          >
            Show more ({remaining} left)
          </button>
        </div>
      )}
    </div>
  );
}

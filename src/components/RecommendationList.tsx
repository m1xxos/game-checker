"use client";

import { useState } from "react";
import { GameCard } from "./GameCard";
import { ChannelGrid } from "./ChannelGrid";
import type { Recommendation } from "@/lib/compat";

/** Recommendation grid with incremental "show more" (no refetch). */
export function RecommendationList({
  items,
  step = 24,
}: {
  items: Recommendation[];
  step?: number;
}) {
  const [count, setCount] = useState(step);
  const shown = items.slice(0, count);
  const remaining = items.length - count;

  return (
    <div className="space-y-6">
      <ChannelGrid>
        {shown.map(({ game, rank }) => (
          <GameCard key={game.id} game={game} rank={rank} />
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

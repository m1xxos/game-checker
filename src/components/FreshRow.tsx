import { GameCard } from "./GameCard";
import type { FreshPick } from "@/lib/compat";

/** Compact relative time. Kept local and English to match the rest of the UI. */
function timeAgo(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * "Just tested" strip. A horizontal snap-scroll row rather than another
 * ChannelGrid, so it reads as a different kind of surface from the main list.
 */
export function FreshRow({
  picks,
  modelName,
}: {
  picks: FreshPick[];
  modelName: string;
}) {
  if (picks.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-extrabold">
          Just tested on your {modelName}
        </h2>
        <p className="text-sm text-ink-soft">
          The newest community reports from your chipset.
        </p>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {picks.map((p) => (
          <div key={p.game.id} className="w-40 shrink-0 snap-start sm:w-44">
            <GameCard game={p.game} rank={p.rank} />
            <p className="mt-1.5 px-1 text-xs text-ink-soft">
              {timeAgo(p.testedAt)} ·{" "}
              {p.exact ? (
                <span className="font-bold text-primary-strong">your console</span>
              ) : (
                `${p.deviceName ?? "same chip"} · same chip`
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

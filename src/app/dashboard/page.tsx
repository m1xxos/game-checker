import Link from "next/link";
import type { Metadata } from "next";
import { getSavedGames, currentUserId } from "@/lib/user-data";
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

  const saved = await getSavedGames();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold">Your library</h1>
            <p className="text-ink-soft">Games you saved to check later.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/recommendations"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-primary-strong"
            >
              ✨ Recommendations
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-bold transition hover:border-primary"
            >
              Find more
            </Link>
          </div>
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
              <div key={s.id} className="relative">
                <GameCard
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
                {s.source === "steam" && (
                  <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">
                    Steam
                  </span>
                )}
              </div>
            ))}
          </ChannelGrid>
        )}
      </section>
    </div>
  );
}

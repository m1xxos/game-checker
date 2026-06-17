import Link from "next/link";
import type { Metadata } from "next";
import { getListingsByDevice } from "@/lib/emuready";
import { getActiveConsole, getSavedGames, currentUserId } from "@/lib/user-data";
import { recommendGames, normalizeTitle } from "@/lib/compat";
import { RecommendationList } from "@/components/RecommendationList";
import {
  RecommendationSettings,
  type RecSettings,
} from "@/components/RecommendationSettings";

export const metadata: Metadata = { title: "For You — Game Checker" };

const QUALITY_RANK = { playable: 3, great: 2, perfect: 1 } as const;

function Prompt({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-surface mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-ink-soft">{children}</p>
    </div>
  );
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ quality?: string; system?: string; taste?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) {
    return (
      <Prompt title="Sign in for recommendations">
        <Link href="/signin" className="font-bold text-primary-strong underline">
          Sign in
        </Link>{" "}
        to get games picked for your console and taste.
      </Prompt>
    );
  }

  const params = await searchParams;
  const settings: RecSettings = {
    quality:
      params.quality === "great" || params.quality === "perfect"
        ? params.quality
        : "playable",
    system: params.system ?? "all",
    taste: params.taste !== "0",
  };

  const [active, saved] = await Promise.all([
    getActiveConsole(),
    getSavedGames(),
  ]);

  if (!active) {
    return (
      <Prompt title="Pick your console first">
        <Link href="/consoles" className="font-bold text-primary-strong underline">
          Add a console
        </Link>{" "}
        so we can tune recommendations to your hardware.
      </Prompt>
    );
  }

  const librarySystems = new Map<string, number>();
  for (const s of saved) {
    if (s.systemName) {
      librarySystems.set(s.systemName, (librarySystems.get(s.systemName) ?? 0) + 1);
    }
  }

  // One paginated, cached device fetch feeds the whole page.
  const listings = await getListingsByDevice(active.deviceId, 150).catch(() => []);
  let recs = recommendGames(listings, active, {
    limit: 300, // compute the full set; the client reveals it incrementally
    excludeGameIds: new Set(saved.map((s) => s.gameId)),
    excludeTitles: new Set(saved.map((s) => normalizeTitle(s.title))),
    boostSystems: settings.taste ? librarySystems : undefined,
    maxRank: QUALITY_RANK[settings.quality],
  });

  // Platforms available to filter by (before applying the platform filter).
  const systems = [
    ...new Set(recs.map((r) => r.game.system?.name).filter((n): n is string => !!n)),
  ].sort();

  if (settings.system !== "all") {
    recs = recs.filter((r) => r.game.system?.name === settings.system);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">For You</h1>
          <p className="text-ink-soft">
            {settings.taste && librarySystems.size > 0
              ? `Tuned to your library and your ${active.modelName}.`
              : `Games that run well on your ${active.modelName}.`}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-bold text-primary-strong hover:underline"
        >
          Your library →
        </Link>
      </div>

      <RecommendationSettings current={settings} systems={systems} />

      {recs.length === 0 ? (
        <div className="card-surface p-8 text-center text-ink-soft">
          No games match these settings.{" "}
          <Link href="/recommendations" className="font-bold text-primary-strong underline">
            Reset filters
          </Link>
          .
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink-soft">
            {recs.length} game{recs.length === 1 ? "" : "s"} match
          </p>
          <RecommendationList items={recs} />
        </>
      )}
    </div>
  );
}

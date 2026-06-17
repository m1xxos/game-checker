import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGame, getListingsByGame } from "@/lib/emuready";
import { getActiveConsole, savedGameIds, currentUserId } from "@/lib/user-data";
import {
  matchListingsToConsole,
  sortByQuality,
  bestTier,
  tierStyle,
  type CompatTier,
} from "@/lib/compat";
import { emuReadyGameUrl, gameNativeSearchUrl } from "@/lib/links";
import { ListingCard } from "@/components/ListingCard";
import { CompatibilityBadge } from "@/components/CompatibilityBadge";
import { SaveGameButton } from "@/components/SaveGameButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const game = await getGame(id).catch(() => null);
  return { title: game ? `${game.title} — Game Checker` : "Game Checker" };
}

const VERDICT: Record<CompatTier, { title: string; blurb: string }> = {
  perfect: { title: "Runs perfectly 🎉", blurb: "Reported flawless on your console." },
  great: { title: "Runs great 👍", blurb: "Smooth with at most tiny issues." },
  playable: { title: "Playable 🙂", blurb: "Enjoyable, with some frame drops or tweaks." },
  partial: { title: "Runs with issues ⚠️", blurb: "Boots but expect problems." },
  none: { title: "No reports yet 🤷", blurb: "Nobody has tested this exact console." },
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [game, listings, active, savedIds, userId] = await Promise.all([
    getGame(id),
    getListingsByGame(id, 60).catch(() => []),
    getActiveConsole(),
    savedGameIds(),
    currentUserId(),
  ]);

  if (!game) notFound();

  const match = matchListingsToConsole(listings, active);
  const relevant = sortByQuality([...match.exact, ...match.similar]);
  const others = sortByQuality(match.other);

  // Verdict for the active console: prefer exact reports, then similar hardware.
  const verdictSource = match.exact.length
    ? match.exact
    : match.similar.length
      ? match.similar
      : [];
  const tier = bestTier(verdictSource);
  const art = game.boxartUrl ?? game.imageUrl;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative mx-auto aspect-3/4 w-44 shrink-0 overflow-hidden rounded-3xl shadow-soft sm:mx-0">
          {art ? (
            <Image src={art} alt={game.title} fill sizes="176px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-canvas text-ink-soft">
              No art
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div>
            {game.system?.name && (
              <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">
                {game.system.name}
              </p>
            )}
            <h1 className="text-3xl font-extrabold leading-tight">{game.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SaveGameButton
              game={{
                gameId: game.id,
                title: game.title,
                boxartUrl: art,
                systemName: game.system?.name ?? null,
              }}
              initialSaved={savedIds.has(game.id)}
              signedIn={Boolean(userId)}
            />
            <a
              href={emuReadyGameUrl(game.id)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold transition hover:border-primary"
            >
              Full reports on EmuReady ↗
            </a>
            <a
              href={gameNativeSearchUrl(game.title, active?.gpuModel ?? undefined)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold transition hover:border-accent"
            >
              Check on GameNative ↗
            </a>
          </div>
        </div>
      </div>

      {/* Will-it-run verdict */}
      <section
        className={`card-surface p-6 ring-2 ${tierStyle(tier).className.split(" ").find((c) => c.startsWith("ring-")) ?? "ring-line"}`}
      >
        {active ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">
                On your {active.brandName} {active.modelName}
              </p>
              <h2 className="text-2xl font-extrabold">{VERDICT[tier].title}</h2>
              <p className="text-ink-soft">{VERDICT[tier].blurb}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <CompatibilityBadge rank={verdictSource[0]?.performance?.rank} />
              <p className="text-xs text-ink-soft">
                {match.exact.length > 0
                  ? `${match.exact.length} report(s) on this exact device`
                  : match.similar.length > 0
                    ? `Based on ${match.similar.length} report(s) for the same chipset`
                    : "No reports for your console yet"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <h2 className="text-xl font-extrabold">Pick your console for a verdict</h2>
            <p className="text-ink-soft">
              Save your Android handheld and we&apos;ll tell you exactly how this
              game runs on it.
            </p>
            <Link
              href="/consoles"
              className="rounded-full bg-primary px-5 py-2.5 font-bold text-white transition hover:bg-primary-strong"
            >
              Pick your console →
            </Link>
          </div>
        )}
      </section>

      {/* Relevant reports */}
      {relevant.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">
            {active ? "Reports for your console & chipset" : "Top reports"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relevant.map((l) => (
              <ListingCard key={l.id} listing={l} highlight />
            ))}
          </div>
        </section>
      )}

      {/* All other reports */}
      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">
            {relevant.length > 0 ? "Other hardware" : "Community reports"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      {listings.length === 0 && (
        <p className="text-ink-soft">
          No community reports yet. Try{" "}
          <a
            href={gameNativeSearchUrl(game.title)}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-primary-strong underline"
          >
            checking GameNative
          </a>
          .
        </p>
      )}
    </div>
  );
}

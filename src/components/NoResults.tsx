import Link from "next/link";
import {
  GAMENATIVE_COMPATIBILITY_URL,
  emuReadyListingsUrl,
  steamDbSearchUrl,
  steamSearchUrl,
} from "@/lib/links";
import { GameNativeButton } from "./GameNativeButton";

/** Shared pill styling for the outbound handoffs. */
const PILL =
  "rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold transition hover:border-primary";

/**
 * Shown when a search finds nothing on EmuReady. EmuReady only covers games
 * somebody has already tested, so a miss usually means "untested", not
 * "doesn't exist" — every branch here is a way to keep looking rather than a
 * dead end.
 */
export function NoResults({ query }: { query: string }) {
  return (
    <div className="card-surface mx-auto max-w-xl space-y-6 p-8 text-center">
      <div className="space-y-2">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary-soft text-3xl">
          🔍
        </span>
        <h1 className="text-2xl font-extrabold">
          Nothing on EmuReady for “{query}”
        </h1>
        <p className="text-ink-soft">
          EmuReady only lists games somebody has already tested, so this one is
          probably just untested — not unplayable. Here&apos;s where to look next.
        </p>
      </div>

      <div className="space-y-3 text-left">
        <Handoff
          icon="🎮"
          title="Check GameNative"
          desc="Its own compatibility list covers Windows games running through Winlator."
        >
          <GameNativeButton title={query} />
        </Handoff>

        <Handoff
          icon="🛒"
          title="Look for a PC version"
          desc="If it's on Steam, GameNative may be able to run it."
        >
          <a href={steamSearchUrl(query)} target="_blank" rel="noreferrer" className={PILL}>
            Steam ↗
          </a>
          <a href={steamDbSearchUrl(query)} target="_blank" rel="noreferrer" className={PILL}>
            SteamDB ↗
          </a>
        </Handoff>

        <Handoff
          icon="📋"
          title="Browse recent reports"
          desc="Spelling differs surprisingly often — the full list may have it."
        >
          <a href={emuReadyListingsUrl()} target="_blank" rel="noreferrer" className={PILL}>
            All EmuReady listings ↗
          </a>
          <Link href="/" className={PILL}>
            Featured games
          </Link>
        </Handoff>
      </div>

      <p className="text-xs text-ink-soft">
        Tested it yourself?{" "}
        <a
          href={GAMENATIVE_COMPATIBILITY_URL}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-primary-strong underline"
        >
          Add a report
        </a>{" "}
        so the next person finds it.
      </p>
    </div>
  );
}

function Handoff({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-canvas p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{title}</p>
          <p className="text-sm text-ink-soft">{desc}</p>
          <div className="mt-3 flex flex-wrap gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

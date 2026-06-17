import Link from "next/link";

/**
 * Two-pill filter for the recommendations grid: all playable games vs only
 * those confirmed to run great/perfect ("definitely runs well"). URL-driven so
 * it stays server-rendered.
 */
export function RunsWellToggle({ runsWellOnly }: { runsWellOnly: boolean }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1 text-sm font-bold shadow-soft">
      <Link
        href="/dashboard"
        aria-pressed={!runsWellOnly}
        className={`rounded-full px-4 py-1.5 transition ${
          runsWellOnly ? "text-ink-soft hover:text-ink" : "bg-primary text-white"
        }`}
      >
        All playable
      </Link>
      <Link
        href="/dashboard?well=1"
        aria-pressed={runsWellOnly}
        className={`rounded-full px-4 py-1.5 transition ${
          runsWellOnly ? "bg-primary text-white" : "text-ink-soft hover:text-ink"
        }`}
      >
        Runs great ✓
      </Link>
    </div>
  );
}

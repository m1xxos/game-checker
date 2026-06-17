import Link from "next/link";

export interface RecSettings {
  quality: "playable" | "great" | "perfect";
  system: string; // "all" or a system name
  taste: boolean;
}

/**
 * URL-driven controls for tuning recommendations (stays server-rendered).
 * Each pill links to the same page with one setting changed.
 */
export function RecommendationSettings({
  current,
  systems,
}: {
  current: RecSettings;
  systems: string[];
}) {
  function href(overrides: Partial<RecSettings>): string {
    const next = { ...current, ...overrides };
    const p = new URLSearchParams();
    if (next.quality !== "playable") p.set("quality", next.quality);
    if (next.system !== "all") p.set("system", next.system);
    if (!next.taste) p.set("taste", "0");
    const qs = p.toString();
    return qs ? `/recommendations?${qs}` : "/recommendations";
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <PillGroup label="Performance">
        <Pill active={current.quality === "playable"} href={href({ quality: "playable" })}>
          Playable+
        </Pill>
        <Pill active={current.quality === "great"} href={href({ quality: "great" })}>
          Runs great
        </Pill>
        <Pill active={current.quality === "perfect"} href={href({ quality: "perfect" })}>
          Perfect only
        </Pill>
      </PillGroup>

      <PillGroup label="Based on">
        <Pill active={current.taste} href={href({ taste: true })}>
          My library
        </Pill>
        <Pill active={!current.taste} href={href({ taste: false })}>
          Everything
        </Pill>
      </PillGroup>

      {systems.length > 1 && (
        <PillGroup label="Platform">
          <Pill active={current.system === "all"} href={href({ system: "all" })}>
            All
          </Pill>
          {systems.map((s) => (
            <Pill key={s} active={current.system === s} href={href({ system: s })}>
              {s}
            </Pill>
          ))}
        </PillGroup>
      )}
    </div>
  );
}

function PillGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-sm font-bold text-ink-soft">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
        active
          ? "bg-primary text-white shadow-soft"
          : "border border-line bg-surface text-ink-soft hover:border-primary hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

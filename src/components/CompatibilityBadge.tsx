import { tierFromRank, tierStyle, type CompatTier } from "@/lib/compat";

const TIER_LABEL: Record<CompatTier, string> = {
  perfect: "Perfect",
  great: "Great",
  playable: "Playable",
  partial: "Runs w/ issues",
  none: "Unknown",
};

export function CompatibilityBadge({
  rank,
  label,
  size = "md",
}: {
  /** EmuReady performance rank (lower is better). */
  rank?: number;
  /** Override the displayed text (defaults to the tier label). */
  label?: string;
  size?: "sm" | "md";
}) {
  const tier = tierFromRank(rank);
  const { className } = tierStyle(tier);
  const text = label ?? TIER_LABEL[tier];
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ring-1 ${pad} ${className}`}
    >
      <span
        className="size-1.5 rounded-full bg-current opacity-70"
        aria-hidden
      />
      {text}
    </span>
  );
}

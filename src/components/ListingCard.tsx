import type { Listing } from "@/lib/emuready";
import { emuReadyListingUrl } from "@/lib/links";
import { CompatibilityBadge } from "./CompatibilityBadge";

/** Collapse EmuReady's markdown-ish notes into a short plain-text preview. */
function notesPreview(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const firstLine = notes
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("http"));
  if (!firstLine) return null;
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}…` : firstLine;
}

export function ListingCard({
  listing,
  highlight = false,
}: {
  listing: Listing;
  /** Emphasize listings that match the user's console. */
  highlight?: boolean;
}) {
  const device = listing.device;
  const preview = notesPreview(listing.notes);

  return (
    <a
      href={emuReadyListingUrl(listing.id)}
      target="_blank"
      rel="noreferrer"
      className={`card-surface block p-4 transition hover:shadow-lift ${
        highlight ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold">
            {device?.brand?.name} {device?.modelName}
          </p>
          <p className="truncate text-sm text-ink-soft">
            {listing.emulator?.name}
            {device?.soc?.name ? ` · ${device.soc.name}` : ""}
          </p>
        </div>
        <CompatibilityBadge
          rank={listing.performance?.rank}
          label={listing.performance?.label}
          size="sm"
        />
      </div>

      {preview && (
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{preview}</p>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-ink-soft">
        {listing.author?.name && <span>by {listing.author.name}</span>}
        {(listing.upvoteCount ?? 0) > 0 && (
          <span>▲ {listing.upvoteCount}</span>
        )}
        <span className="ml-auto text-primary-strong">View report →</span>
      </div>
    </a>
  );
}

/**
 * Builders for outbound links to the upstream compatibility sources.
 *
 * EmuReady has stable per-game pages we can deep-link to. GameNative has no
 * public API and no documented per-game URL scheme, so we link to its
 * compatibility search page (best-effort prefilled with the game title).
 */

import { EMUREADY_SITE } from "./emuready";

/** Link to a game's page on EmuReady (full community compatibility reports). */
export function emuReadyGameUrl(gameId: string): string {
  return `${EMUREADY_SITE}/games/${gameId}`;
}

/** Link to a single compatibility listing on EmuReady. */
export function emuReadyListingUrl(listingId: string): string {
  return `${EMUREADY_SITE}/listings/${listingId}`;
}

/** Link to EmuReady listings filtered/searched. */
export function emuReadyListingsUrl(): string {
  return `${EMUREADY_SITE}/listings`;
}

/**
 * Link to GameNative's compatibility search, prefilled with the game title (and
 * GPU model when we know the user's console). The site ignores params it does
 * not understand, so the base URL always resolves to the search page.
 */
export function gameNativeSearchUrl(title: string, gpuModel?: string): string {
  const url = new URL("https://gamenative.app/compatibility/");
  if (title) url.searchParams.set("q", title);
  if (gpuModel) url.searchParams.set("gpu", gpuModel);
  return url.toString();
}

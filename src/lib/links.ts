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
 * GameNative's compatibility page. Its filters are a client-side app that does
 * NOT hydrate from the URL (verified: initial filter state is hard-coded null
 * and nothing reads `useSearchParams`), so a `?q=`/`?gpu=` deep link just lands
 * on the empty "add a filter" screen. We therefore link to the bare page and
 * copy the title to the clipboard for the user to paste — see GameNativeButton.
 */
export const GAMENATIVE_COMPATIBILITY_URL = "https://gamenative.app/compatibility/";

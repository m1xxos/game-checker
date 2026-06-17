/**
 * Builders for outbound links to the upstream compatibility sources.
 *
 * EmuReady has stable per-game pages we can deep-link to. GameNative has no
 * public API and no documented per-game URL scheme, so we link to its
 * compatibility search page (best-effort prefilled with the game title).
 */

/** EmuReady's public site origin (for outbound links). */
const EMUREADY_SITE = "https://www.emuready.com";

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

/** True for PC/Windows titles (where Steam / SteamDB links make sense). */
export function isWindowsGame(system?: {
  key?: string;
  name?: string;
}): boolean {
  if (!system) return false;
  const key = system.key?.toLowerCase() ?? "";
  const name = system.name?.toLowerCase() ?? "";
  return (
    key.includes("windows") ||
    key.includes("pc") ||
    /\bwindows\b|\bpc\b/.test(name)
  );
}

/**
 * Steam store search for a title. EmuReady doesn't give us a Steam app id, so we
 * search by name (lands on the store page / results).
 */
export function steamSearchUrl(title: string): string {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;
}

/** SteamDB app search for a title. */
export function steamDbSearchUrl(title: string): string {
  return `https://steamdb.info/search/?a=app&q=${encodeURIComponent(title)}`;
}

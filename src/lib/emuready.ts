/**
 * Server-side client for EmuReady's public mobile tRPC API.
 *
 * The API lives at `${EMUREADY_BASE_URL}/<procedure>` and is reached over GET
 * with a single `input` query param. Both the request input and the response
 * payload are wrapped by superjson:
 *   - request:  ?input={"json": <actualInput>}
 *   - response: { result: { data: { json: <actualOutput> } } }
 * Errors come back as { error: { json: { message, data: { httpStatus, ... } } } }.
 *
 * All reads are public (no auth). These helpers are server-only; we never call
 * EmuReady from the browser (avoids CORS and keeps responses cached on the server).
 */

import "server-only";

const BASE_URL =
  process.env.EMUREADY_BASE_URL ?? "https://www.emuready.com/api/mobile/trpc";

// --- Types (subset of the API surface we use) -------------------------------

export interface System {
  id: string;
  name: string;
  key: string;
}

export interface Game {
  id: string;
  title: string;
  normalizedTitle: string;
  systemId: string;
  imageUrl: string | null;
  boxartUrl: string | null;
  bannerUrl: string | null;
  isErotic: boolean;
  status: string;
  system?: System;
  _count?: { listings: number };
}

/** A performance rating. Lower `rank` is better (1 = Perfect … 8 = Nothing). */
export interface Performance {
  id: number;
  label: string;
  rank: number;
  description: string | null;
}

export interface Soc {
  id: string;
  name: string;
  manufacturer: string | null;
  architecture: string | null;
  processNode: string | null;
  cpuCores: number | null;
  gpuModel: string | null;
}

/** Rich device shape embedded inside listings. */
export interface ListingDevice {
  id: string;
  modelName: string;
  brand?: { id: string; name: string };
  soc?: Soc | null;
}

export interface Emulator {
  id: string;
  name: string;
  logo: string | null;
}

export interface Listing {
  id: string;
  deviceId: string;
  gameId: string;
  emulatorId: string;
  notes: string | null;
  createdAt: string;
  successRate: number | null;
  upvoteCount: number;
  downvoteCount: number;
  game?: Game;
  device?: ListingDevice;
  emulator?: Emulator;
  performance?: Performance;
  author?: { id: string; name: string | null };
}

/** Compact device shape returned by `devices.get` (used by the console picker). */
export interface DeviceSummary {
  id: string;
  modelName: string;
  brandName: string;
  socName: string | null;
  listingsCount: number;
}

interface Paginated<T> {
  pagination?: { total: number; pages: number; page: number; limit: number };
  items: T[];
}

// --- Core fetch -------------------------------------------------------------

interface FetchOpts {
  /** Cache lifetime in seconds (Next.js fetch revalidation). */
  revalidate?: number;
}

class EmuReadyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly procedure: string,
  ) {
    super(message);
    this.name = "EmuReadyError";
  }
}

async function emuReadyFetch<T>(
  procedure: string,
  input: Record<string, unknown> = {},
  opts: FetchOpts = {},
): Promise<T> {
  const encoded = encodeURIComponent(JSON.stringify({ json: input }));
  const url = `${BASE_URL}/${procedure}?input=${encoded}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Default to a one-hour cache; catalog data (devices/emulators) can opt
    // into a longer TTL via `opts.revalidate`.
    next: { revalidate: opts.revalidate ?? 3600 },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || body?.error) {
    const raw = body?.error?.json?.message;
    let message = `EmuReady ${procedure} failed (${res.status})`;
    if (typeof raw === "string") message = raw;
    throw new EmuReadyError(message, res.status, procedure);
  }

  // Unwrap superjson: { result: { data: { json: <output> } } }
  return body?.result?.data?.json as T;
}

// --- Public API -------------------------------------------------------------

/** Free-text game search. Returns a flat array of games. */
export async function searchGames(query: string, limit = 20): Promise<Game[]> {
  if (!query.trim()) return [];
  const data = await emuReadyFetch<Game[]>(
    "games.searchGames",
    { query, limit },
    // Search results change slowly; cache for an hour to spare the API.
    { revalidate: 3600 },
  );
  return data ?? [];
}

/** Paginated game catalog (used for browse / featured fallbacks). */
export async function getGames(
  params: {
    limit?: number;
    page?: number;
    search?: string;
    /** Restrict to one platform, e.g. WINDOWS_SYSTEM_ID. */
    systemId?: string;
  } = {},
): Promise<{ games: Game[]; total: number }> {
  const data = await emuReadyFetch<{
    games: Game[];
    pagination?: { total: number };
  }>("games.get", { limit: 24, ...params });
  return { games: data?.games ?? [], total: data?.pagination?.total ?? 0 };
}

/**
 * EmuReady's "Microsoft Windows" system — the PC catalog we match Steam
 * libraries against (2,643 games at time of writing).
 */
export const WINDOWS_SYSTEM_ID = "1ed45a96-5845-4ae4-aa70-86cdb1ee1333";

/**
 * Every Windows game, paged and cached for a day.
 *
 * `games.get` caps `limit` at 50, so this is ~53 requests — but they're cached by
 * URL and therefore shared across every user and request, which makes matching an
 * entire Steam library cost zero incremental EmuReady calls. The alternative (one
 * `searchGames` per owned title) would be hundreds of uncached calls per user.
 */
export async function getWindowsCatalog(): Promise<Game[]> {
  const PER_PAGE = 50;
  const MAX_PAGES = 80; // safety net; the catalog is ~53 pages

  const first = await emuReadyFetch<{
    games: Game[];
    pagination?: { pages?: number };
  }>(
    "games.get",
    { limit: PER_PAGE, page: 1, systemId: WINDOWS_SYSTEM_ID },
    { revalidate: 86_400 },
  );

  const pages = Math.min(first?.pagination?.pages ?? 1, MAX_PAGES);
  const all: Game[] = [...(first?.games ?? [])];
  if (pages <= 1) return all;

  // Modest concurrency: enough to keep a cold build quick, gentle on the API.
  const CONCURRENCY = 5;
  const queue = Array.from({ length: pages - 1 }, (_, i) => i + 2);

  async function worker(): Promise<void> {
    for (let page = queue.shift(); page != null; page = queue.shift()) {
      const data = await emuReadyFetch<{ games: Game[] }>(
        "games.get",
        { limit: PER_PAGE, page, systemId: WINDOWS_SYSTEM_ID },
        { revalidate: 86_400 },
      ).catch(() => null);
      if (data?.games) all.push(...data.games);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
  );
  return all;
}

/** A single game by id. */
export async function getGame(id: string): Promise<Game | null> {
  try {
    return await emuReadyFetch<Game>("games.byId", { id });
  } catch (err) {
    if (err instanceof EmuReadyError && err.status === 404) return null;
    throw err;
  }
}

/** Compatibility listings for one game (richest endpoint we use). */
export async function getListingsByGame(
  gameId: string,
  limit = 50,
): Promise<Listing[]> {
  const data = await emuReadyFetch<{ listings: Listing[] }>(
    "listings.byGame",
    { gameId, limit },
    { revalidate: 1800 },
  );
  return data?.listings ?? [];
}

// --- Listing queries --------------------------------------------------------

/** `listings.get` hard-caps the page size at 50. */
const LISTINGS_PAGE_SIZE = 50;
/** Ceiling on pages per filter, so one render can't fan out unboundedly. */
const LISTINGS_MAX_PAGES = 8;

/**
 * EmuReady performance *ids* — deliberately NOT the ranks (verified against the
 * live API). `listings.get` filters on these ids, while `performance.rank` is what
 * compat.ts scores. Ranks 6 and 7 have no observed id, which is safe because these
 * ids are only ever used to *widen* a candidate pool, never to enforce a filter.
 */
export const PERFORMANCE_ID = {
  perfect: 49,
  great: 50,
  playable: 51,
  poor: 52,
  ingame: 53,
  nothing: 56,
} as const;

const PERFORMANCE_ID_BY_RANK: Record<number, number> = {
  1: 49,
  2: 50,
  3: 51,
  4: 52,
  5: 53,
  8: 56,
};

/** Performance ids for every rank at least as good as `maxRank`. */
export function performanceIdsUpToRank(maxRank: number): number[] {
  return Object.entries(PERFORMANCE_ID_BY_RANK)
    .filter(([rank]) => Number(rank) <= maxRank)
    .map(([, id]) => id);
}

export interface ListingFilter {
  deviceIds?: string[];
  socIds?: string[];
  performanceIds?: number[];
}

/**
 * Build the tRPC input with a FIXED key order.
 *
 * Next's fetch cache is keyed by URL, i.e. by this serialized JSON — so key order,
 * and omitting empty arrays rather than sending them, is what decides whether two
 * users with the same handheld share a cache entry. Never put a timestamp, a user
 * id, or anything request-specific in here.
 */
function listingInput(
  filter: ListingFilter,
  page: number,
  limit: number,
): Record<string, unknown> {
  const input: Record<string, unknown> = { limit, page };
  if (filter.deviceIds?.length) input.deviceIds = filter.deviceIds;
  if (filter.socIds?.length) input.socIds = filter.socIds;
  if (filter.performanceIds?.length) {
    input.performanceIds = [...filter.performanceIds].sort((a, b) => a - b);
  }
  return input;
}

/**
 * Dev-only tripwire. EmuReady's zod input schema *strips* unknown keys instead of
 * rejecting them, so a typo'd or renamed filter fails open and silently returns
 * the global newest listings — plausible-looking and completely wrong. Shout when
 * the response doesn't match what we asked for.
 */
function assertFilterApplied(filter: ListingFilter, batch: Listing[]): void {
  if (process.env.NODE_ENV === "production" || batch.length === 0) return;

  if (filter.socIds?.length) {
    const want = new Set(filter.socIds);
    const known = batch.filter((l) => l.device?.soc?.id);
    if (known.length > 0 && !known.every((l) => want.has(l.device!.soc!.id))) {
      console.warn(
        "[emuready] socIds appears IGNORED — listings.get returned other chipsets",
      );
    }
  }
  if (filter.deviceIds?.length) {
    const want = new Set(filter.deviceIds);
    if (!batch.every((l) => want.has(l.deviceId) || want.has(l.device?.id ?? ""))) {
      console.warn("[emuready] deviceIds appears IGNORED");
    }
  }
  if (filter.performanceIds?.length) {
    const want = new Set(filter.performanceIds);
    const known = batch.filter((l) => l.performance?.id != null);
    if (known.length > 0 && !known.every((l) => want.has(l.performance!.id))) {
      console.warn("[emuready] performanceIds appears IGNORED");
    }
  }
}

interface ListingPage {
  listings: Listing[];
  pagination?: { pages?: number; hasNextPage?: boolean };
}

function fetchListingPage(
  filter: ListingFilter,
  page: number,
  revalidate: number,
): Promise<ListingPage> {
  return emuReadyFetch<ListingPage>(
    "listings.get",
    listingInput(filter, page, LISTINGS_PAGE_SIZE),
    { revalidate },
  );
}

/**
 * Paginated `listings.get` over an arbitrary filter, newest-first.
 *
 * Page 1 reports the true page count, so the remaining pages are fetched in
 * parallel — two sequential network hops instead of one per page. Every caller
 * must use the same `revalidate` for a given URL; mixing TTLs on one URL is a
 * Next.js footgun.
 */
export async function getListings(
  filter: ListingFilter,
  opts: { count?: number; revalidate?: number } = {},
): Promise<Listing[]> {
  const { count = 100, revalidate = 1800 } = opts;
  const maxPages = Math.min(
    Math.ceil(count / LISTINGS_PAGE_SIZE),
    LISTINGS_MAX_PAGES,
  );

  const first = await fetchListingPage(filter, 1, revalidate);
  assertFilterApplied(filter, first.listings ?? []);

  const pages = Math.min(first.pagination?.pages ?? 1, maxPages);
  if (pages <= 1) return (first.listings ?? []).slice(0, count);

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      fetchListingPage(filter, i + 2, revalidate)
        .then((p) => p.listings ?? [])
        .catch(() => [] as Listing[]),
    ),
  );
  return [first.listings ?? [], ...rest].flat().slice(0, count);
}

/** Compatibility listings tested on a specific device. */
export async function getListingsByDevice(
  deviceId: string,
  count = 100,
): Promise<Listing[]> {
  return getListings({ deviceIds: [deviceId] }, { count });
}

/**
 * Every listing from any device sharing this chipset. Far wider than a single
 * device (e.g. Snapdragon 8 Gen 2: 5,414 listings vs 1,462 for one Odin 2), which
 * is what makes same-chipset recommendations possible.
 */
export async function getListingsBySoc(
  socId: string,
  count = 300,
): Promise<Listing[]> {
  return getListings({ socIds: [socId] }, { count });
}

/**
 * Same-chipset listings restricted to high-quality reports. Used only to top up
 * the pool when the user asks for "runs great"/"perfect", where a plain recency
 * window can be thin on top-rated games.
 */
export async function getTopQualityListingsBySoc(
  socId: string,
  maxRank: number,
  count = 100,
): Promise<Listing[]> {
  return getListings(
    { socIds: [socId], performanceIds: performanceIdsUpToRank(maxRank) },
    { count },
  );
}

/** Featured listings for the landing page. */
export async function getFeaturedListings(): Promise<Listing[]> {
  const data = await emuReadyFetch<Listing[]>(
    "listings.featured",
    {},
    { revalidate: 1800 },
  );
  return data ?? [];
}

/** Searchable device catalog for the console picker. */
export async function getDevices(
  params: { search?: string; brandId?: string; limit?: number } = {},
): Promise<DeviceSummary[]> {
  const data = await emuReadyFetch<{ devices: DeviceSummary[] }>(
    "devices.get",
    { limit: 30, ...params },
    { revalidate: 86_400 },
  );
  return data?.devices ?? [];
}

/** Device brands (Retroid, AYN, AYANEO, …). */
export async function getDeviceBrands(): Promise<{ id: string; name: string }[]> {
  const data = await emuReadyFetch<{ id: string; name: string }[]>(
    "devices.brands",
    {},
    { revalidate: 86_400 },
  );
  return data ?? [];
}

/** Full device detail including SoC/GPU (used when saving a console profile). */
export async function getDevice(id: string): Promise<ListingDevice | null> {
  try {
    return await emuReadyFetch<ListingDevice>(
      "devices.byId",
      { id },
      { revalidate: 86_400 },
    );
  } catch (err) {
    if (err instanceof EmuReadyError && err.status === 404) return null;
    throw err;
  }
}

/** Emulator catalog. */
export async function getEmulators(): Promise<Emulator[]> {
  const data = await emuReadyFetch<Emulator[]>(
    "emulators.get",
    {},
    { revalidate: 86_400 },
  );
  return data ?? [];
}

export { EmuReadyError };
export type { Paginated };

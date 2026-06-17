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
    { revalidate: 600 },
  );
  return data ?? [];
}

/** Paginated game catalog (used for browse / featured fallbacks). */
export async function getGames(
  params: { limit?: number; page?: number; search?: string } = {},
): Promise<{ games: Game[]; total: number }> {
  const data = await emuReadyFetch<{
    games: Game[];
    pagination?: { total: number };
  }>("games.get", { limit: 24, ...params });
  return { games: data?.games ?? [], total: data?.pagination?.total ?? 0 };
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

/** All compatibility listings tested on a specific device. */
export async function getListingsByDevice(
  deviceId: string,
  limit = 60,
): Promise<Listing[]> {
  const data = await emuReadyFetch<{ listings: Listing[] }>(
    "listings.get",
    { deviceIds: [deviceId], limit },
    { revalidate: 1800 },
  );
  return data?.listings ?? [];
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

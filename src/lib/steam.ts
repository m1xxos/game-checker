/**
 * Server-side client for Steam.
 *
 * Three different hosts, with three different rules:
 *
 *   1. `steamcommunity.com/id/<vanity>/?xml=1` — resolves a vanity name to a
 *      SteamID64 with NO API key. (The sibling `/games?tab=all&xml=1` endpoint
 *      that used to expose a public library is dead: it now 302s to /login, which
 *      is why the library has to come from the Web API and why STEAM_API_KEY is
 *      required at all.)
 *   2. `api.steampowered.com` — needs STEAM_API_KEY in the query string. Because
 *      the key is *in the URL*, these calls must never touch Next's fetch cache,
 *      which is a shared on-disk URL-keyed store.
 *   3. `store.steampowered.com/api/appdetails` — keyless, gives genres, and is
 *      rate limited to roughly 200 requests per 5 minutes. It does not batch:
 *      passing several appids together with `filters=` returns an empty body. So
 *      it is strictly one request per app and must never run on a render path.
 *
 * The whole feature is gated on STEAM_API_KEY (see `steamEnabled`), mirroring how
 * `enabledOAuthProviders()` hides unconfigured OAuth buttons.
 */

import "server-only";

const API = "https://api.steampowered.com";
const COMMUNITY = "https://steamcommunity.com";
const STORE = "https://store.steampowered.com";

// --- Types ------------------------------------------------------------------

export interface SteamProfileSummary {
  steamId64: string;
  personaName: string | null;
  avatarUrl: string | null;
  vanityUrl: string | null;
}

export interface SteamOwnedGame {
  appId: number;
  name: string;
  playtimeMinutes: number;
  lastPlayedAt: Date | null;
  iconHash: string | null;
}

export interface SteamAppDetails {
  appId: number;
  name: string;
  genres: string[];
  categories: string[];
}

export type SteamErrorCode =
  | "disabled"
  | "invalid_input"
  | "not_found"
  | "private"
  | "rate_limited"
  | "upstream";

export class SteamError extends Error {
  constructor(
    message: string,
    readonly code: SteamErrorCode,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SteamError";
  }
}

// --- Feature gate -----------------------------------------------------------

/** True when the server is configured for Steam import. */
export function steamEnabled(): boolean {
  return Boolean(process.env.STEAM_API_KEY);
}

function requireKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) {
    throw new SteamError("Steam import isn't set up on this server.", "disabled");
  }
  return key;
}

// --- Input parsing ----------------------------------------------------------

const ID64_RE = /^7656119\d{10}$/;
/** Steam vanity names are conservative; validating protects the URL we build. */
const VANITY_RE = /^[A-Za-z0-9_-]{2,32}$/;

export type SteamInput =
  | { kind: "id64"; steamId64: string }
  | { kind: "vanity"; vanity: string };

/**
 * Accepts a raw SteamID64, a /profiles/<id64> URL, a /id/<vanity> URL, or a bare
 * vanity slug. Returns null for anything else — notably anything with a path
 * separator, so a pasted `../../market/…` can't walk into another route.
 */
export function parseSteamInput(raw: string): SteamInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (ID64_RE.test(trimmed)) return { kind: "id64", steamId64: trimmed };

  const profiles = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profiles) return { kind: "id64", steamId64: profiles[1] };

  const vanityUrl = trimmed.match(/steamcommunity\.com\/id\/([^/?#\s]+)/i);
  if (vanityUrl) {
    const v = vanityUrl[1];
    return VANITY_RE.test(v) ? { kind: "vanity", vanity: v } : null;
  }

  if (VANITY_RE.test(trimmed)) return { kind: "vanity", vanity: trimmed };
  return null;
}

/**
 * Vanity name → SteamID64, without an API key. An unknown vanity still returns
 * HTTP 200 (with an XML <error> or an HTML page), so a regex miss is the only
 * reliable "not found" signal.
 */
export async function resolveVanity(vanity: string): Promise<string> {
  if (!VANITY_RE.test(vanity)) {
    throw new SteamError("That doesn't look like a Steam profile.", "invalid_input");
  }
  const url = `${COMMUNITY}/id/${encodeURIComponent(vanity)}/?xml=1`;
  const res = await fetch(url, {
    headers: { Accept: "text/xml", "User-Agent": "game-checker" },
    // Safe to cache: no secret in this URL, and the binding is permanent.
    next: { revalidate: 86_400 },
  }).catch(() => null);

  if (!res?.ok) {
    throw new SteamError("Couldn't reach Steam.", "upstream", res?.status);
  }
  const body = await res.text();
  const m = body.match(/<steamID64>(\d{17})<\/steamID64>/);
  if (!m) {
    throw new SteamError("No Steam profile with that name.", "not_found", 404);
  }
  return m[1];
}

/** Resolve any accepted profile reference to a SteamID64. */
export async function resolveSteamId(raw: string): Promise<string> {
  const parsed = parseSteamInput(raw);
  if (!parsed) {
    throw new SteamError(
      "Paste your profile link, e.g. steamcommunity.com/id/yourname",
      "invalid_input",
    );
  }
  return parsed.kind === "id64"
    ? parsed.steamId64
    : resolveVanity(parsed.vanity);
}

// --- Web API (keyed) --------------------------------------------------------

/**
 * Build a Web API URL. The key lives in the query string, so the resulting URL is
 * a secret: never log it, never put it in an error message, never let it reach
 * Next's data cache.
 */
function apiUrl(path: string, params: Record<string, string>): string {
  const qs = new URLSearchParams({ key: requireKey(), ...params });
  return `${API}${path}?${qs}`;
}

async function apiFetch<T>(url: string, what: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Never cached: the URL embeds the API key and the data is personal.
    cache: "no-store",
  }).catch(() => null);

  if (!res) throw new SteamError("Couldn't reach Steam.", "upstream");
  if (res.status === 401 || res.status === 403) {
    // Deliberately vague to the user; the detail is a server misconfiguration.
    console.error(`[steam] ${what} rejected the API key (${res.status})`);
    throw new SteamError("Steam rejected this server's credentials.", "upstream", res.status);
  }
  if (!res.ok) {
    throw new SteamError("Steam is having trouble right now.", "upstream", res.status);
  }
  return (await res.json()) as T;
}

export async function getPlayerSummary(
  steamId64: string,
): Promise<SteamProfileSummary | null> {
  const data = await apiFetch<{
    response?: { players?: Array<Record<string, unknown>> };
  }>(
    apiUrl("/ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId64 }),
    "GetPlayerSummaries",
  );

  const p = data.response?.players?.[0];
  if (!p) return null;
  return {
    steamId64,
    personaName: (p.personaname as string) ?? null,
    avatarUrl: (p.avatarfull as string) ?? (p.avatarmedium as string) ?? null,
    vanityUrl: null,
  };
}

/**
 * The user's owned games.
 *
 * Privacy detection is the subtle part: a private (or friends-only) profile
 * returns HTTP 200 with `{"response":{}}` — no `games` AND no `game_count`. A
 * public profile that genuinely owns nothing returns `{"response":{"game_count":0}}`.
 * Discriminating on the *presence of game_count* is what stops a private profile
 * from silently looking like an empty library.
 */
export async function getOwnedGames(steamId64: string): Promise<SteamOwnedGame[]> {
  const data = await apiFetch<{
    response?: { game_count?: number; games?: Array<Record<string, unknown>> };
  }>(
    apiUrl("/IPlayerService/GetOwnedGames/v1/", {
      steamid: steamId64,
      include_appinfo: "1",
      include_played_free_games: "1",
      format: "json",
    }),
    "GetOwnedGames",
  );

  const response = data.response ?? {};
  if (response.game_count == null) {
    throw new SteamError(
      "This Steam profile's game details are private.",
      "private",
    );
  }

  return (response.games ?? []).map((g) => {
    const last = Number(g.rtime_last_played ?? 0);
    return {
      appId: Number(g.appid),
      name: String(g.name ?? `App ${g.appid}`),
      playtimeMinutes: Number(g.playtime_forever ?? 0),
      lastPlayedAt: last > 0 ? new Date(last * 1000) : null,
      iconHash: (g.img_icon_url as string) || null,
    };
  });
}

// --- Store appdetails (keyless, rate limited) --------------------------------

/**
 * Module-level token bucket. One server IP serves every user, so the ~200 req /
 * 5 min limit is a shared budget; 150 leaves headroom. Note this is per-instance:
 * on a multi-replica deploy the SteamApp DB cache, not this bucket, is the real
 * protection.
 */
const BUCKET_CAPACITY = 150;
const BUCKET_WINDOW_MS = 5 * 60_000;
let bucketTokens = BUCKET_CAPACITY;
let bucketResetAt = Date.now() + BUCKET_WINDOW_MS;

function takeToken(): boolean {
  const now = Date.now();
  if (now >= bucketResetAt) {
    bucketTokens = BUCKET_CAPACITY;
    bucketResetAt = now + BUCKET_WINDOW_MS;
  }
  if (bucketTokens <= 0) return false;
  bucketTokens -= 1;
  return true;
}

/**
 * Store metadata for one app. Returns null when Steam says the app doesn't exist
 * or isn't visible (delisted, region-locked) — callers should negative-cache that
 * so a junk appid never burns the budget twice.
 *
 * `l=english` is mandatory: genre `description` strings are localized, and we
 * store them, so without it the cache would fill with mixed-language keys.
 */
export async function getAppDetails(appId: number): Promise<SteamAppDetails | null> {
  if (!takeToken()) {
    throw new SteamError("Steam rate limit reached; try again shortly.", "rate_limited");
  }

  const url = `${STORE}/api/appdetails?appids=${appId}&filters=basic,genres,categories&l=english&cc=us`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // No secret in this URL, so a long TTL is a free second cache layer.
    next: { revalidate: 604_800 },
  }).catch(() => null);

  if (!res) throw new SteamError("Couldn't reach the Steam store.", "upstream");
  if (res.status === 429) {
    throw new SteamError("Steam rate limit reached; try again shortly.", "rate_limited", 429);
  }
  if (!res.ok) return null;

  const body = (await res.json().catch(() => null)) as Record<
    string,
    { success?: boolean; data?: Record<string, unknown> }
  > | null;

  // Keyed by the appid as a *string*.
  const entry = body?.[String(appId)];
  if (!entry?.success || !entry.data) return null;

  const d = entry.data;
  // DLC, soundtracks and videos are not games; callers filter on this.
  const genres = Array.isArray(d.genres)
    ? (d.genres as Array<{ description?: string }>)
        .map((g) => g.description)
        .filter((g): g is string => Boolean(g))
    : [];
  const categories = Array.isArray(d.categories)
    ? (d.categories as Array<{ description?: string }>)
        .map((c) => c.description)
        .filter((c): c is string => Boolean(c))
    : [];

  return {
    appId,
    name: String(d.name ?? `App ${appId}`),
    genres,
    categories,
  };
}

// --- Link builders ----------------------------------------------------------

export function steamIconUrl(appId: number, iconHash: string | null): string | null {
  return iconHash
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg`
    : null;
}

export function steamHeaderUrl(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

export function steamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}/`;
}

/** Steam's own privacy settings page, for the "your library is private" error. */
export const STEAM_PRIVACY_SETTINGS_URL = "https://steamcommunity.com/my/edit/settings";

import "server-only";
import { cache } from "react";
import {
  getListings,
  getTopQualityListingsBySoc,
  type Listing,
} from "@/lib/emuready";
import type { ConsoleRef } from "@/lib/compat";

const EXACT_COUNT = 150; // 3 pages
const SOC_COUNT = 300; // 6 pages
const TOPUP_COUNT = 100; // 2 pages, only off the default quality toggle

/**
 * Candidate listings for a console: its own reports plus every report from any
 * device sharing its chipset.
 *
 * Both queries are issued even though `socIds` already includes the user's own
 * device — newest-first ordering can push the user's model out of the SoC window
 * entirely, and exact-device reports are the highest-value evidence we have, so
 * they're fetched separately and merged. De-duplication is by listing id.
 *
 * Falls back to device-only when `socId` is unknown, which is exactly the
 * behaviour this page had before chipset widening.
 */
export const loadConsolePool = cache(async function loadConsolePool(
  ref: ConsoleRef,
  opts: { maxRank?: number } = {},
): Promise<Listing[]> {
  const { maxRank = 3 } = opts;

  const [exact, soc, topup] = await Promise.all([
    getListings({ deviceIds: [ref.deviceId] }, { count: EXACT_COUNT }).catch(
      () => [] as Listing[],
    ),
    ref.socId
      ? getListings({ socIds: [ref.socId] }, { count: SOC_COUNT }).catch(
          () => [] as Listing[],
        )
      : Promise.resolve([] as Listing[]),
    // Only when the user asked for better-than-playable: a plain recency window
    // can be thin on top-rated games, so reach deeper for those specifically.
    ref.socId && maxRank < 3
      ? getTopQualityListingsBySoc(ref.socId, maxRank, TOPUP_COUNT).catch(
          () => [] as Listing[],
        )
      : Promise.resolve([] as Listing[]),
  ]);

  const byId = new Map<string, Listing>();
  for (const l of [...exact, ...soc, ...topup]) byId.set(l.id, l);
  return [...byId.values()];
});

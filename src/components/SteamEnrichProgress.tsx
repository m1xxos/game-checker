"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enrichSteamAppsAction } from "@/lib/steam-actions";

/**
 * Drives the bounded genre/match backfill to completion.
 *
 * The work is deliberately outside the import action: `appdetails` is one request
 * per app and rate limited, so it can't live on any path a user waits on. Looping
 * a resumable batch here doubles as visible progress, and navigating away simply
 * leaves the rest for next time.
 */
export function SteamEnrichProgress() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      // Guard against a pathological loop if the server keeps reporting work.
      for (let round = 0; round < 40 && !cancelled; round++) {
        const result = await enrichSteamAppsAction(20);
        if (cancelled) return;
        if (!result.ok) return;

        setRemaining(result.data.remaining);
        if (result.data.remaining <= 0 || result.data.processed === 0) {
          setDone(true);
          router.refresh();
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (remaining === null || done || remaining <= 0) return null;

  return (
    <div className="rounded-2xl bg-canvas p-4">
      <p className="text-sm font-bold">Fetching genres from Steam…</p>
      <p className="mt-0.5 text-xs text-ink-soft">
        {remaining} games left. You can keep browsing — this picks up where it
        left off.
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}

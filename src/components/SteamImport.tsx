"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewSteamLibraryAction,
  importSteamLibraryAction,
  type SteamLibraryRow,
} from "@/lib/steam-actions";

function hours(minutes: number): string {
  if (minutes <= 0) return "never played";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

/** Threshold options in minutes — Steam only gives playtime, never "completed". */
const THRESHOLDS = [0, 60, 120, 300, 600, 1200];

/**
 * The import step: pick which games count as "played".
 *
 * Steam has no completion flag, only playtime, so the slider is a starting guess
 * and the checkboxes are the real answer. Being upfront about that is better than
 * inventing a confident-looking heuristic.
 */
export function SteamImport({
  onDone,
  compact = false,
}: {
  onDone?: () => void;
  compact?: boolean;
}) {
  const [rows, setRows] = useState<SteamLibraryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thresholdIdx, setThresholdIdx] = useState(2); // 120 min
  // The slider is the coarse control and the checkboxes the fine one, so the
  // selection is *derived*: threshold decides the default, and this map holds
  // only the rows the user has explicitly overridden. Moving the slider clears
  // the overrides, which is what makes it feel like a reset.
  const [overrides, setOverrides] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const threshold = THRESHOLDS[thresholdIdx];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await previewSteamLibraryAction();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setRows(result.data.rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isPicked = useCallback(
    (row: SteamLibraryRow) =>
      overrides.get(row.appId) ?? row.playtimeMinutes >= threshold,
    [overrides, threshold],
  );

  const picked = useMemo(
    () => new Set((rows ?? []).filter(isPicked).map((r) => r.appId)),
    [rows, isPicked],
  );

  const matchedCount = useMemo(
    () => (rows ?? []).filter((r) => picked.has(r.appId) && r.emuGameId).length,
    [rows, picked],
  );

  function toggle(row: SteamLibraryRow) {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(row.appId, !isPicked(row));
      return next;
    });
  }

  function confirm() {
    startTransition(async () => {
      const result = await importSteamLibraryAction([...picked]);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  if (loading) {
    return <p className="py-6 text-center text-ink-soft">Reading your library…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="py-6 text-center text-ink-soft">
        No games found in that Steam library.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="threshold" className="text-sm font-bold">
            Count as played after
          </label>
          <span className="text-sm font-bold text-primary-strong">
            {threshold === 0 ? "any playtime" : hours(threshold)}
          </span>
        </div>
        <input
          id="threshold"
          type="range"
          min={0}
          max={THRESHOLDS.length - 1}
          step={1}
          value={thresholdIdx}
          onChange={(e) => {
            setThresholdIdx(Number(e.target.value));
            setOverrides(new Map());
          }}
          className="mt-2 w-full accent-[var(--color-primary)]"
        />
        <p className="mt-1 text-xs text-ink-soft">
          Steam only records playtime, not whether you finished a game — adjust the
          ticks below if this guesses wrong.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-2 text-sm">
        <span className="font-bold">{picked.size} selected</span>
        <span className="text-ink-soft">{matchedCount} on EmuReady</span>
      </div>

      <ul
        className={`space-y-1 overflow-y-auto ${compact ? "max-h-64" : "max-h-96"}`}
      >
        {rows.map((r) => (
          <li key={r.appId}>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 hover:bg-canvas">
              <input
                type="checkbox"
                checked={picked.has(r.appId)}
                onChange={() => toggle(r)}
                className="size-4 shrink-0 accent-[var(--color-primary)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{r.name}</span>
                <span className="text-xs text-ink-soft">
                  {hours(r.playtimeMinutes)}
                  {r.emuGameId && (
                    <span className="ml-2 text-primary-strong">
                      ✓ on EmuReady
                    </span>
                  )}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="w-full rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong disabled:opacity-60"
      >
        {pending ? "Importing…" : `Import ${picked.size} games`}
      </button>
    </div>
  );
}

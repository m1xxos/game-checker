"use client";

import { useEffect, useRef, useState } from "react";
import { searchDevicesAction } from "@/lib/actions";
import type { DeviceSummary } from "@/lib/emuready";

/**
 * Debounced device search shared by the console pickers. Designed to be gentle
 * on EmuReady's API:
 *   - 400ms debounce,
 *   - ignores 1-character queries (too noisy to be useful),
 *   - caches results per query for the component's lifetime, so backspacing or
 *     retyping a previous query never re-hits the server.
 */
export function useDeviceSearch(query: string): {
  results: DeviceSummary[];
  loading: boolean;
} {
  const [results, setResults] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, DeviceSummary[]>());

  useEffect(() => {
    const key = query.trim().toLowerCase();
    if (key.length === 1) return; // wait for a more specific query

    const cached = cache.current.get(key);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const devices = await searchDevicesAction(key);
      if (cancelled) return;
      cache.current.set(key, devices);
      setResults(devices);
      setLoading(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return { results, loading };
}

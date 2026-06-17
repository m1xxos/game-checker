"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addConsole } from "@/lib/actions";
import { useDeviceSearch } from "@/lib/useDeviceSearch";

/** Searchable device picker that adds a console to the user's account. */
export function AddConsole({ savedDeviceIds }: { savedDeviceIds: string[] }) {
  const [query, setQuery] = useState("");
  const { results, loading } = useDeviceSearch(query);
  const [adding, setAdding] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const saved = new Set(savedDeviceIds);

  function add(deviceId: string) {
    setAdding(deviceId);
    startTransition(async () => {
      await addConsole(deviceId);
      setAdding(null);
      router.refresh();
    });
  }

  return (
    <div className="card-surface p-5">
      <h2 className="text-lg font-extrabold">Add a console</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Search the EmuReady device catalog for your Android handheld.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Retroid Pocket 5, Odin 2, AYANEO…"
        aria-label="Search devices"
        className="w-full rounded-full border border-line bg-surface px-4 py-3 font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
      />

      <ul className="mt-3 max-h-96 space-y-1 overflow-y-auto">
        {loading && <li className="px-2 py-3 text-sm text-ink-soft">Searching…</li>}
        {!loading && results.length === 0 && (
          <li className="px-2 py-3 text-sm text-ink-soft">No devices found.</li>
        )}
        {results.map((d) => {
          const already = saved.has(d.id);
          return (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2 hover:bg-canvas"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">{d.modelName}</p>
                <p className="truncate text-xs text-ink-soft">
                  {d.brandName}
                  {d.socName ? ` · ${d.socName}` : ""} · {d.listingsCount} reports
                </p>
              </div>
              <button
                type="button"
                disabled={already || (pending && adding === d.id)}
                onClick={() => add(d.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                  already
                    ? "bg-canvas text-ink-soft"
                    : "bg-primary text-white hover:bg-primary-strong"
                } disabled:opacity-60`}
              >
                {already ? "Added" : adding === d.id ? "Adding…" : "Add"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

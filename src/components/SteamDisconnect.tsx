"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectSteamAction, syncSteamLibraryAction } from "@/lib/steam-actions";

export function SteamAccountActions({ savedFromSteam }: { savedFromSteam: number }) {
  const [confirming, setConfirming] = useState(false);
  const [alsoRemove, setAlsoRemove] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function sync() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncSteamLibraryAction();
      setMessage(result.ok ? "Library updated." : result.error);
      router.refresh();
    });
  }

  function disconnect() {
    startTransition(async () => {
      await disconnectSteamAction(alsoRemove);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sync}
          disabled={pending}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60"
        >
          {pending ? "Working…" : "Sync now"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming((c) => !c)}
          className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-bold transition hover:border-primary"
        >
          Disconnect
        </button>
      </div>

      {message && <p className="text-sm text-ink-soft">{message}</p>}

      {confirming && (
        <div className="space-y-3 rounded-2xl bg-canvas p-4">
          <p className="text-sm font-bold">Disconnect Steam?</p>
          <p className="text-sm text-ink-soft">
            Your imported Steam list will be removed.
          </p>
          {savedFromSteam > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={alsoRemove}
                onChange={(e) => setAlsoRemove(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-primary)]"
              />
              <span>
                Also remove the {savedFromSteam} game
                {savedFromSteam === 1 ? "" : "s"} Steam added to my library
              </span>
            </label>
          )}
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {pending ? "Disconnecting…" : "Yes, disconnect"}
          </button>
        </div>
      )}
    </div>
  );
}

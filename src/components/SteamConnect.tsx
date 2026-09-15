"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { connectSteamAction } from "@/lib/steam-actions";

/**
 * Paste-your-profile-link step. Steam's OpenID flow would avoid the typing, but
 * it isn't OAuth and would need a hand-rolled callback — a link is enough.
 */
export function SteamConnect({ onConnected }: { onConnected?: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await connectSteamAction(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onConnected?.();
      router.refresh();
    });
  }

  const isPrivacy = error?.toLowerCase().includes("private");

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="steam-url" className="block text-sm font-bold">
        Your Steam profile link
      </label>
      <input
        id="steam-url"
        type="text"
        inputMode="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="steamcommunity.com/id/yourname"
        className="w-full rounded-full border border-line bg-surface px-4 py-3 font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-bold">{error}</p>
          {isPrivacy && (
            <p className="mt-1">
              Set <span className="font-bold">Game details</span> to Public in{" "}
              <a
                href="https://steamcommunity.com/my/edit/settings"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                your privacy settings
              </a>
              , then try again.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="w-full rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong disabled:opacity-60"
      >
        {pending ? "Checking…" : "Connect Steam"}
      </button>
      <p className="text-xs text-ink-soft">
        We only read your public game list — never your credentials.
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { GAMENATIVE_COMPATIBILITY_URL } from "@/lib/links";

/**
 * Opens GameNative's compatibility search and copies the game title to the
 * clipboard so the user can paste it straight into GameNative's search box.
 *
 * GameNative's filters don't hydrate from the URL, so we can't deep-link to a
 * specific game — copying the title is the most useful reliable handoff.
 */
export function GameNativeButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(title);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard may be blocked (e.g. insecure context); opening still works.
    }
    window.open(GAMENATIVE_COMPATIBILITY_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Copies the title so you can paste it into GameNative's search"
      className="rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-bold transition hover:border-accent"
    >
      {copied ? "Title copied — paste in GameNative ✓" : "Check on GameNative ↗"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSavedGame } from "@/lib/actions";

interface Props {
  game: {
    gameId: string;
    title: string;
    boxartUrl?: string | null;
    systemName?: string | null;
  };
  initialSaved: boolean;
  /** When false, clicking sends the user to sign in. */
  signedIn: boolean;
}

/** Toggles a game in the user's library with optimistic feedback. */
export function SaveGameButton({ game, initialSaved, signedIn }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!signedIn) {
      router.push("/signin");
      return;
    }
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      const result = await toggleSavedGame(game);
      setSaved(result);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold shadow-soft transition disabled:opacity-60 ${
        saved
          ? "bg-accent text-white"
          : "border border-line bg-surface hover:border-accent"
      }`}
    >
      <span aria-hidden>{saved ? "★" : "☆"}</span>
      {saved ? "In your library" : "Save for later"}
    </button>
  );
}

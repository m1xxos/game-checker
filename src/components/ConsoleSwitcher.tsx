"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setActiveConsole } from "@/lib/actions";

interface ConsoleOption {
  id: string;
  modelName: string;
  brandName: string;
  isActive: boolean;
}

/** Compact dropdown in the header to switch the active console. */
export function ConsoleSwitcher({ consoles }: { consoles: ConsoleOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const active = consoles.find((c) => c.isActive) ?? consoles[0];

  function choose(id: string) {
    setOpen(false);
    startTransition(async () => {
      await setActiveConsole(id);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-sm font-bold shadow-soft transition hover:border-primary disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span aria-hidden>🎮</span>
        <span className="max-w-[10rem] truncate">{active.modelName}</span>
        <span className="text-ink-soft" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="listbox"
            className="card-surface absolute right-0 z-30 mt-2 w-64 overflow-hidden p-2"
          >
            {consoles.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.isActive}
                  onClick={() => choose(c.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-primary-soft ${
                    c.isActive ? "bg-primary-soft text-primary-strong" : ""
                  }`}
                >
                  <span className="truncate">
                    {c.modelName}
                    <span className="block text-xs font-normal text-ink-soft">
                      {c.brandName}
                    </span>
                  </span>
                  {c.isActive && <span aria-hidden>✓</span>}
                </button>
              </li>
            ))}
            <li className="mt-1 border-t border-line pt-1">
              <Link
                href="/consoles"
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-3 py-2 text-sm font-bold text-primary-strong hover:bg-primary-soft"
              >
                Manage consoles →
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Search input that navigates to /search?q=… on submit. */
export function SearchBar({
  defaultValue = "",
  autoFocus = false,
  placeholder = "Search games…",
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      role="search"
      className="relative w-full"
    >
      <svg
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search games"
        className="w-full rounded-full border border-line bg-surface py-3 pl-12 pr-4 font-semibold text-ink shadow-soft outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
      />
    </form>
  );
}

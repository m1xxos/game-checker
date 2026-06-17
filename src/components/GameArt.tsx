"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Box art with a graceful fallback. EmuReady art comes from several third-party
 * CDNs (thegamesdb, rawg, …) where individual URLs sometimes 404 or time out;
 * on any load error we swap in a tidy placeholder instead of a broken image.
 */
export function GameArt({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary-soft to-canvas text-ink-soft">
        <span className="text-3xl" aria-hidden>
          🎮
        </span>
        <span className="line-clamp-2 px-2 text-center text-xs font-bold">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setFailed(true)}
    />
  );
}

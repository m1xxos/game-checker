import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained build for a small Docker image.
  output: "standalone",
  images: {
    // EmuReady art is served by a shifting set of third-party CDNs
    // (thegamesdb, rawg, …). Allow any HTTPS host so the optimizer never
    // rejects an unknown source; GameArt handles per-image load failures.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // Cache optimized images for a day to cut repeat fetches to those CDNs.
    minimumCacheTTL: 86_400,
  },
};

export default nextConfig;

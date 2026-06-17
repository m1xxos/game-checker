import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained build for a small Docker image.
  output: "standalone",
  images: {
    // Box art / banners served by EmuReady come from these CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "cdn.thegamesdb.net" },
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "*.emuready.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;

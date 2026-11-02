import type { NextConfig } from "next";

/**
 * When the dev server is reached from a non-localhost origin (e.g. a phone/tablet
 * on the LAN via `./start.sh lan`), Next 16 blocks the HMR channel by default,
 * which makes the page fall back to constant full reloads. Allow-list those
 * origins so hot reload works instead. `start.sh` sets `ALLOWED_DEV_ORIGINS` to
 * the machine's LAN IP; add more as a comma-separated list if needed.
 */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

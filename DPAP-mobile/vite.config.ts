import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Offline-first PWA build.
 *
 * `injectManifest` strategy: we ship our own service worker (`src/sw.ts`) so it
 * can precache the app shell, runtime-cache OpenStreetMap tiles, AND replay the
 * outbox on a Background Sync `sync` event. Registration uses `autoUpdate` so an
 * online device adopts the latest deployed version automatically (a single
 * reload per new deployment — see `src/sw.ts` and the update checks in
 * `src/main.tsx`). Application data is NOT HTTP-cached — it lives in IndexedDB
 * (Dexie) and syncs through the outbox; see `src/sync`.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
      includeAssets: ["icon.svg"],
      manifest: {
        name: "e-DPAP — Recolha de Dados",
        short_name: "e-DPAP",
        description:
          "Recolha offline de atores da agricultura, pecuária, pescas e aquacultura — DPAP Maputo",
        lang: "pt",
        dir: "ltr",
        theme_color: "#047857",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});

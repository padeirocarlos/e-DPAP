import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

/**
 * Test config, kept separate from vite.config.ts so the PWA plugin doesn't run
 * under the test runner. Tests run in Node with a fake IndexedDB (see
 * `src/test/setup.ts`) so Dexie works headlessly.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Unit/integration tests live under src; the e2e/ specs are Playwright's.
    include: ["src/**/*.test.ts"],
    // Live backend integration test is opt-in (needs DPAP-api running).
    testTimeout: 15_000,
  },
});

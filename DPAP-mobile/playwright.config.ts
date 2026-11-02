import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the PWA in a real headless Chromium.
 *
 * Exercises the browser-only behaviour the unit tests can't: the service
 * worker (registration + offline app shell), GPS capture (emulated
 * geolocation), the install manifest, and the offline→reconnect sync flow.
 *
 * Login/sync specs need DPAP-api running (http://localhost:8080). The
 * `webServer` builds and previews the PWA on :4173 (CORS is allowed for it).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:4173",
    // Emulated field GPS near Boane; the capture button resolves to this.
    geolocation: { latitude: -26.04, longitude: 32.33, accuracy: 12 },
    permissions: ["geolocation"],
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

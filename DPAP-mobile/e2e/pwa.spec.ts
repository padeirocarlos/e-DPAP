import { test, expect, type Page } from "@playwright/test";

/**
 * E2E for the offline-first PWA. The "PWA infrastructure" specs (service
 * worker, manifest, offline shell) need no backend; the "sync flows" specs
 * require DPAP-api on :8080 (login + push/pull).
 */

const DEMO = { email: "admin@dpap.gov.mz", password: "dpap2024" };

async function login(page: Page) {
  await page.goto("/");
  await page.locator("#email").fill(DEMO.email);
  await page.locator("#password").fill(DEMO.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Registos locais" })).toBeVisible();
}

async function captureActor(page: Page, name: string) {
  await page.getByRole("button", { name: "Novo ator" }).click();
  await expect(page.getByRole("heading", { name: "Novo ator" })).toBeVisible();
  await page.locator("#name").fill(name);
  await page.selectOption("#atype", "PRODUCER");
  await page.selectOption("#legal", "INDIVIDUAL");
  await page.selectOption("#sector", "AGRICULTURE");
  await page.selectOption("#district", "BOA");
  await page.selectOption("#post", "BOA-SED");
  // Emulated GPS fills the coordinates.
  await page.getByRole("button", { name: "Capturar GPS" }).click();
  await expect(page.locator("#lat")).not.toHaveValue("");
  await expect(page.locator("#lon")).not.toHaveValue("");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Registos locais" })).toBeVisible();
}

function uniqueName(tag: string) {
  return `Ator E2E ${tag} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

test.describe("PWA infrastructure", () => {
  test("registers an active service worker", async ({ page }) => {
    await page.goto("/");
    const active = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg.active);
    });
    expect(active).toBe(true);
  });

  test("serves a valid install manifest", async ({ page }) => {
    await page.goto("/");
    const href = await page.getAttribute("link[rel=manifest]", "href");
    expect(href).toBeTruthy();
    const res = await page.request.get(new URL(href!, "http://localhost:4173").toString());
    const manifest = await res.json();
    expect(manifest.name).toContain("e-DPAP");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("pt");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test("loads the app shell offline (precache)", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    // The shell + bundle are precached, so the login screen still renders offline.
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe("sync flows (require DPAP-api)", () => {
  test("captures an actor with GPS and syncs it online", async ({ page }) => {
    await login(page);
    const name = uniqueName("online");
    await captureActor(page, name);

    const row = page.getByRole("button").filter({ hasText: name });
    await expect(row).toBeVisible();
    // Online → the outbox drains and the record becomes SYNCED.
    await expect(row).toContainText("Sincronizado");
  });

  test("captures offline, then syncs on reconnect", async ({ page, context }) => {
    await login(page);
    const name = uniqueName("offline");

    await context.setOffline(true);
    await captureActor(page, name);
    const row = page.getByRole("button").filter({ hasText: name });
    await expect(row).toContainText("Por sincronizar");

    // Reconnect → the online event triggers an automatic sync.
    await context.setOffline(false);
    await expect(row).toContainText("Sincronizado");
  });

  test("pulls the central registry into the device on login", async ({ page }) => {
    await login(page);
    // A seeded central actor (not created on this device) appears in the list.
    await expect(
      page.getByRole("button").filter({ hasText: "Associação Agrícola de Boane" }),
    ).toBeVisible();
  });
});

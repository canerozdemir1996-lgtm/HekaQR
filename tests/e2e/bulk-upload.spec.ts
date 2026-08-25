import { expect, test, type Page } from "@playwright/test";
import { createBulkTemplateXlsx } from "../../lib/bulk-import";

const hasAuth = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const hasHarness = process.env.E2E_UI_HARNESS === "1";
const BATCH_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta|email/i).fill(process.env.E2E_USER_EMAIL!);
  await page.getByLabel(/sifre|password/i).fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole("button", { name: /giris|sign in/i }).click();
  await page.waitForURL(/dashboard/);
}

async function mockBulkReads(page: Page, imports: unknown[] = []) {
  await page.route("**/api/v1/styles", route => route.fulfill({ json: { styles: [] } }));
  await page.route(/\/api\/v1\/imports\?limit=/, route => route.fulfill({ json: { imports } }));
  await page.route("**/api/v1/plan", route => route.fulfill({ json: {
    plan: "starter",
    plan_label: "Starter",
    limits: { max_qr: 100, bulk_upload: true, max_bulk_qr_per_month: 100 },
    usage: { bulk_qr_used: 0, bulk_qr_limit: 100, bulk_qr_remaining: 100 },
  } }));
}

async function openBulkPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "qrpublish_cookie_pref_v1",
      JSON.stringify({ choice: "necessary", savedAt: new Date().toISOString() }),
    );
  });
  if (hasAuth) {
    await login(page);
    await page.goto("/dashboard/qrcodes/new?mode=bulk");
    return;
  }
  await page.goto("/dev-tools/bulk-e2e");
}

test.describe("Bulk Upload", () => {
  test.beforeEach(() => {
    test.skip(!hasAuth && !hasHarness, "Authenticated credentials or the development-only E2E harness are required.");
  });

  test("QR creation scene exposes and opens the bulk workflow", async ({ page }) => {
    test.skip(!hasAuth, "Authenticated credentials are required to verify the real creation entry point.");
    await login(page);
    await page.goto("/dashboard/qrcodes/new");

    const bulkTab = page.getByRole("tab", { name: /Toplu QR oluştur/i });
    await expect(bulkTab).toBeVisible();
    await bulkTab.click();

    await expect(page).toHaveURL(/\/dashboard\/qrcodes\/new\?mode=bulk/);
    await expect(page.locator("#bulk-qr-file")).toBeAttached();
  });

  test("CSV preview can be edited and submitted through the durable import API", async ({ page }) => {
    await mockBulkReads(page);
    let idempotencyKey = "";
    await page.route("**/api/v1/imports", async route => {
      if (route.request().method() !== "POST") return route.fallback();
      idempotencyKey = route.request().headers()["idempotency-key"] ?? "";
      const payload = route.request().postDataJSON();
      expect(payload.rows).toHaveLength(2);
      expect(payload.rows[0].title).toBe("Düzenlenmiş ürün");
      await route.fulfill({
        status: 201,
        json: {
          import: {
            id: BATCH_ID,
            name: "e2e.csv",
            status: "ready",
            total_rows: 2,
            created_rows: 0,
            failed_rows: 0,
            skipped_rows: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          idempotent_replay: false,
        },
      });
    });
    await page.route(`**/api/v1/imports/${BATCH_ID}/process`, route => route.fulfill({
      json: {
        remaining: 0,
        processed: [
          { row: 2, status: "created", qr_code_id: "qr-1" },
          { row: 3, status: "created", qr_code_id: "qr-2" },
        ],
      },
    }));

    await openBulkPage(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("QR Name,Destination\nÜrün,https://example.com/a\nBlog,https://example.com/b", "utf8"),
    });
    await page.getByText("Kolonları Eşleştir", { exact: true }).click();
    await page.getByLabel("Başlık kolonu").selectOption("0");
    await page.getByLabel("URL kolonu").selectOption("1");
    await expect(page.locator("span").filter({ hasText: /2 geçerli satır/i })).toBeVisible();
    await page.getByLabel(/Satır 2 başlığı/i).fill("Düzenlenmiş ürün");
    await page.getByRole("button", { name: /2 QR Kodları Üretmeye Başla/i }).click();

    await expect(page.getByText("Import Batch: " + BATCH_ID)).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    expect(idempotencyKey.length).toBeGreaterThanOrEqual(8);
  });

  test("XLSX template previews on a mobile viewport without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockBulkReads(page);
    await openBulkPage(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: "qrpublish-bulk-sablon.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(await createBulkTemplateXlsx()),
    });

    await expect(page.locator("span").filter({ hasText: /3 geçerli satır/i })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("failed history rows dispatch one retry run id", async ({ page }) => {
    await mockBulkReads(page, [{
      id: BATCH_ID,
      name: "Hatalı import",
      status: "partial",
      total_rows: 2,
      created_rows: 1,
      failed_rows: 1,
      skipped_rows: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
    let retryRunId = "";
    await page.route(`**/api/v1/imports/${BATCH_ID}/process`, async route => {
      const payload = route.request().postDataJSON();
      expect(payload.retry_failed).toBe(true);
      retryRunId = payload.retry_run_id;
      await route.fulfill({ json: { remaining: 0, processed: [{ row: 3, status: "created", qr_code_id: "qr-retry" }] } });
    });

    await openBulkPage(page);
    await page.getByRole("button", { name: /yeniden dene/i }).click();
    await expect(page.getByText("Import Batch: " + BATCH_ID)).toBeVisible();
    expect(retryRunId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

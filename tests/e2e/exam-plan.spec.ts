import { expect, test, type Page } from "@playwright/test";

const hasAuth = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const examSlug = process.env.E2E_EXAM_SLUG?.trim();

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta|email/i).fill(process.env.E2E_USER_EMAIL!);
  await page.getByLabel(/sifre|password/i).fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole("button", { name: /giris|sign in/i }).click();
  await page.waitForURL(/dashboard/);
}

test.describe("Exam and plan release matrix", () => {
  test("public exam is keyboard reachable and responsive", async ({ page }) => {
    test.skip(!examSlug, "E2E_EXAM_SLUG is required for a non-destructive public exam check.");
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`/exam/${encodeURIComponent(examSlug!)}`);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("server plan badge and upgrade action have distinct accessible semantics", async ({ page }) => {
    test.skip(!hasAuth, "E2E_USER_EMAIL and E2E_USER_PASSWORD are required for plan UI validation.");
    await page.route("**/api/v1/plan", route => route.fulfill({
      json: {
        plan: "pro",
        plan_label: "Pro",
        entitlement_plan: "pro",
        entitlement_plan_label: "Pro",
        status: "active",
        status_label: "Aktif",
        expires_at: null,
        days_left: 120,
        grace_days_left: null,
        limits: { max_qr: 100 },
        usage: { qr_count: 2, qr_limit: 100, qr_pct: 2 },
        can_create_qr: true,
        at_qr_limit: false,
      },
    }));
    await login(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole("status", { name: /Pro planı, Aktif/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /paketi yükseltme seçeneklerini aç/i })).toBeVisible();
  });

  test("expired server status cannot look active", async ({ page }) => {
    test.skip(!hasAuth, "E2E_USER_EMAIL and E2E_USER_PASSWORD are required for plan UI validation.");
    await page.route("**/api/v1/plan", route => route.fulfill({
      json: {
        plan: "vip",
        plan_label: "VIP",
        entitlement_plan: "vip",
        entitlement_plan_label: "VIP",
        status: "expired",
        status_label: "Süresi doldu",
        expires_at: "2026-07-01T00:00:00.000Z",
        days_left: -15,
        grace_days_left: 0,
        limits: { max_qr: -1 },
        usage: { qr_count: 10, qr_limit: -1, qr_pct: 100 },
        can_create_qr: false,
        at_qr_limit: false,
      },
    }));
    await login(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    const badge = page.getByRole("status", { name: /VIP planı, Süresi doldu/i });
    await expect(badge).toContainText(/VIP.*Süresi doldu/i);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

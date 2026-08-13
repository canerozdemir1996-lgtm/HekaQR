import { expect, test } from "@playwright/test";

const hasAuth = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const hasPublicSlug = Boolean(process.env.E2E_PUBLIC_QR_SLUG);

test.describe("MVP launch smoke", () => {
  test("landing exposes legal and pricing links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /gizlilik/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /kullan[ıi]m/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /[çc]erez/i })).toBeVisible();
  });

  test("signup page shows legal disclosure", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("link", { name: /gizlilik/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /[çc]erez/i })).toBeVisible();
  });

  test("dashboard authenticated flow", async ({ page }) => {
    test.skip(!hasAuth, "E2E_USER_EMAIL and E2E_USER_PASSWORD are required for dashboard flow.");

    await page.goto("/login");
    await page.getByLabel(/e-posta|email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/sifre|password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: /giris|sign in/i }).click();

    await page.waitForURL(/dashboard/);
    await expect(page).toHaveURL(/dashboard/);
  });

  test("public QR route resolves", async ({ page }) => {
    test.skip(!hasPublicSlug, "E2E_PUBLIC_QR_SLUG is required for public QR validation.");

    const response = await page.goto(`/q/${process.env.E2E_PUBLIC_QR_SLUG}`);
    expect(response?.status()).toBeLessThan(400);
  });
});

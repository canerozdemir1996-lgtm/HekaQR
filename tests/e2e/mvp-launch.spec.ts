import { expect, test } from "@playwright/test";

const hasAuth = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const hasPublicSlug = Boolean(process.env.E2E_PUBLIC_QR_SLUG);

test.describe("MVP launch smoke", () => {
  test("landing exposes legal and pricing links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /gizlilik/i })).toBeVisible();
<<<<<<< HEAD
    await expect(page.getByRole("link", { name: /kullan[ıi]m/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /[çc]erez/i })).toBeVisible();
=======
    await expect(page.getByRole("link", { name: /kullanım|kullanim/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /çerez|cerez/i })).toBeVisible();
>>>>>>> d2fae5c5a2645814d939adf5366fc1113891c5b3
  });

  test("signup page shows legal disclosure", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("link", { name: /gizlilik/i })).toBeVisible();
<<<<<<< HEAD
    await expect(page.getByRole("link", { name: /[çc]erez/i })).toBeVisible();
=======
    await expect(page.getByRole("link", { name: /çerez|cerez/i })).toBeVisible();
>>>>>>> d2fae5c5a2645814d939adf5366fc1113891c5b3
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

  test("onboarding opens the QR builder as a visible modal", async ({ page }) => {
    test.skip(!hasAuth, "E2E_USER_EMAIL and E2E_USER_PASSWORD are required for onboarding flow.");

    await page.addInitScript(() => {
      window.localStorage.removeItem("qrpublish_dashboard_onboarding_v1");
    });
    await page.route("**/api/v1/qrcodes", route => route.fulfill({ json: { qrcodes: [] } }));
    await page.route("**/api/v1/stats", route => route.fulfill({ json: { stats: { total_qr: 0, active_qr: 0, total_scans: 0, scans_today: 0 } } }));
    await page.route("**/api/v1/folders", route => route.fulfill({ json: { folders: [] } }));
    await page.route("**/api/v1/styles", route => route.fulfill({ json: { styles: [] } }));
    await page.route("**/api/v1/settings", route => route.fulfill({ json: { settings: { current_plan: "free", custom_domain: null } } }));
    await page.route("**/api/v1/plan", route => route.fulfill({
      json: {
        plan: "free",
        plan_label: "Free",
        status: "free",
        status_label: "Free",
        expires_at: null,
        days_left: null,
        grace_days_left: null,
        limits: { max_qr: 5 },
        usage: { qr_count: 0, qr_limit: 5, qr_pct: 0 },
        can_create_qr: true,
        at_qr_limit: false,
      },
    }));

    await page.goto("/login");
    await page.getByLabel(/e-posta|email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/sifre|password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: /giris|sign in/i }).click();

    await page.waitForURL(/dashboard/);
    await expect(page.getByText(/Adım 1 \/ 3/i)).toBeVisible();
    await page.getByRole("button", { name: /devam et/i }).click();
    await page.getByRole("button", { name: /ilk qr.*oluştur/i }).click();

    await expect(page.getByRole("heading", { name: "QR Türünü Seçin" })).toBeVisible();
    await expect(page.getByText(/Adım 2 \/ 3/i)).toBeHidden();
  });

  test("public QR route resolves", async ({ page }) => {
    test.skip(!hasPublicSlug, "E2E_PUBLIC_QR_SLUG is required for public QR validation.");

    const response = await page.goto(`/q/${process.env.E2E_PUBLIC_QR_SLUG}`);
    expect(response?.status()).toBeLessThan(400);
  });
});

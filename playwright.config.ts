import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const adminRun = process.env.PLAYWRIGHT_ADMIN_RUN === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: !adminRun,
  forbidOnly: Boolean(process.env.CI),
  retries: adminRun ? 0 : process.env.CI ? 2 : 0,
  workers: adminRun ? 1 : undefined,
  reporter: adminRun ? [["line"]] : process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: adminRun ? "off" : "on-first-retry",
    screenshot: "only-on-failure",
    video: adminRun ? "off" : "retain-on-failure",
    launchOptions: adminRun ? { args: ["--disable-gpu", "--renderer-process-limit=1"] } : undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

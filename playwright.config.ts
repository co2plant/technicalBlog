import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run dev -- --port 4173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

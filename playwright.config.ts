import { defineConfig, devices } from "@playwright/test";
import { getLocalEnv } from "./scripts/local-env.mjs";

const baseURL = "http://127.0.0.1:4173";
const localEnv = getLocalEnv(process.env, "e2e");
Object.assign(process.env, localEnv);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
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
    command: "node scripts/run-local-dev.mjs --e2e",
    env: localEnv,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
});

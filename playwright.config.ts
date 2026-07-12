import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ quiet: true });

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.AUTH_SECRET;

if (!databaseUrl || !authSecret) {
  throw new Error(
    "DATABASE_URL and AUTH_SECRET are required for critical browser tests.",
  );
}

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node .next/standalone/server.js",
    env: {
      AUTH_SECRET: authSecret,
      DATABASE_URL: databaseUrl,
      HOSTNAME: "127.0.0.1",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_ENV: "production",
      PORT: String(port),
      TZ: "America/Sao_Paulo",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `${baseURL}/api/health/live`,
  },
});

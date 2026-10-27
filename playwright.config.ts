import { defineConfig, devices } from "@playwright/test";

// Smoke test against the built Docker image, not `next dev`. Start it first:
//   docker build -t dsc-panel-guides .
//   docker run --rm -d --name dsc-e2e -p 3100:3000 --add-host=host.docker.internal:host-gateway \
//     --env-file .env.test dsc-panel-guides
// The container talks to dsc_test; global setup seeds an admin there and teardown removes it.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"] } }],
});

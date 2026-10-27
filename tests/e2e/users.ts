import { spawnSync } from "node:child_process";
import pg from "pg";

// Every e2e account uses this domain so teardown can find and delete them all.
export const E2E_DOMAIN = "e2e.example.test";
export const E2E_PASSWORD = "e2e-password-123";

// The host-side URL of dsc_test (the container reaches it through host.docker.internal).
export function readTestDatabaseUrl(): string {
  const result = process.env.TEST_DATABASE_URL;
  if (!result) throw new Error("tests/e2e: TEST_DATABASE_URL is not set (see .env)");
  return result;
}

// Promote an existing account with the real seed script, pointed at dsc_test.
export function promoteAdmin(email: string): void {
  const run = spawnSync("npx", ["tsx", "scripts/seed-admin.ts", email], {
    env: { ...process.env, DATABASE_URL: readTestDatabaseUrl() },
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`seed:admin failed: ${run.stderr || run.stdout}`);
}

// Remove every e2e account; sessions and accounts cascade.
export async function deleteE2eUsers(): Promise<number> {
  const client = new pg.Client({ connectionString: readTestDatabaseUrl() });
  await client.connect();
  try {
    const res = await client.query(`delete from "user" where email like $1`, [`%@${E2E_DOMAIN}`]);
    const result = res.rowCount ?? 0;
    return result;
  } finally {
    await client.end();
  }
}

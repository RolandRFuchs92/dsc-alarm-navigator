import { afterAll, expect, test } from "vitest";

// The route reads DATABASE_URL; tests must only ever touch the test database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

import { GET } from "@/app/api/health/route";
import { pool } from "@/lib/db/client";

afterAll(async () => {
  await pool.end();
});

test("GET /api/health reports ok and a live database", async () => {
  const response = await GET();
  const body = await response.json();
  expect(body).toEqual({ ok: true, db: true });
});

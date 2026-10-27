import { afterAll, expect, test } from "vitest";

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

test("the shared pool is connected to dsc_test, never dsc_dev", async () => {
  const result = await pool.query("select current_database() as name");
  expect(result.rows[0].name).toBe("dsc_test");
});

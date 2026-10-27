import { pool } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// Liveness plus a database round trip; used by deploys and tests.
export async function GET() {
  await pool.query("select 1");
  const result = Response.json({ ok: true, db: true });
  return result;
}

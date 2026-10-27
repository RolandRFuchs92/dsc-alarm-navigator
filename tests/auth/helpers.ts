import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth/auth";

// Wipe users (sessions/accounts cascade) so each test starts clean.
async function resetUsers() {
  await db.execute(sql`truncate table "user", "verification" cascade`);
}

// Sign up + sign in, returning a Cookie header carrying the real session.
async function createSessionCookie(email: string, password: string): Promise<string> {
  await auth.api.signUpEmail({ body: { email, password, name: "Test User" } });
  const res = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const setCookies = res.headers.getSetCookie();
  const result = setCookies.map((c) => c.split(";")[0]).join("; ");
  return result;
}

export { resetUsers, createSessionCookie };

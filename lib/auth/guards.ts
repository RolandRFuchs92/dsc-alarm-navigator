import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

type AppUser = { id: string; email: string; name: string; approved: boolean; isAdmin: boolean };

// Look up the session, then re-read the gate flags from the DB every call so
// a revoke takes effect on the next request (session user fields may be cached).
// Never redirects: null means no session (or the user row is gone).
async function findAppUser(): Promise<AppUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const rows = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const result: AppUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    approved: row.approved,
    isAdmin: row.isAdmin,
  };
  return result;
}

async function loadAppUser(): Promise<AppUser> {
  const result = await findAppUser();
  if (!result) redirect("/login");
  return result;
}

async function requireApprovedUser(): Promise<AppUser> {
  const result = await loadAppUser();
  if (!result.approved) redirect("/pending");
  return result;
}

async function requireAdmin(): Promise<AppUser> {
  const result = await requireApprovedUser();
  if (!result.isAdmin) notFound();
  return result;
}

export { findAppUser, requireApprovedUser, requireAdmin };
export type { AppUser };

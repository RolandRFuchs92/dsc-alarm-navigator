import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { account, user } from "@/lib/db/schema";

class UserNotFoundError extends Error {
  constructor(email: string) {
    super(`No account for ${email}`);
    this.name = "UserNotFoundError";
  }
}

class CannotRevokeAdminError extends Error {
  constructor() {
    super("Admins cannot be revoked");
    this.name = "CannotRevokeAdminError";
  }
}

type UserRow = { id: string; email: string; createdAt: Date; approved: boolean; isAdmin: boolean };

// Approve + make admin in one step; used by the seed script.
async function promoteToAdmin(email: string): Promise<void> {
  const rows = await db
    .update(user)
    .set({ approved: true, isAdmin: true })
    .where(eq(user.email, email))
    .returning({ id: user.id });
  if (rows.length === 0) throw new UserNotFoundError(email);
}

// Admins can never be un-approved, so Roland can't lock himself out.
async function setApproved(userId: string, approved: boolean): Promise<void> {
  if (!approved) {
    const rows = await db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, userId)).limit(1);
    if (rows[0]?.isAdmin) throw new CannotRevokeAdminError();
  }
  await db.update(user).set({ approved }).where(eq(user.id, userId));
}

async function listUsers(): Promise<UserRow[]> {
  const result = await db
    .select({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      approved: user.approved,
      isAdmin: user.isAdmin,
    })
    .from(user)
    .orderBy(desc(user.createdAt));
  return result;
}

// Hash with better-auth's own hasher so signInEmail verifies the result.
async function resetPassword(email: string, newPassword: string): Promise<void> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (!rows[0]) throw new UserNotFoundError(email);
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);
  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, rows[0].id), eq(account.providerId, "credential")))
    .returning({ id: account.id });
  if (updated.length === 0) throw new UserNotFoundError(email);
}

export { UserNotFoundError, CannotRevokeAdminError, promoteToAdmin, setApproved, listUsers, resetPassword };
export type { UserRow };

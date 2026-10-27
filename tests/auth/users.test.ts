import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth/auth";
import {
  CannotRevokeAdminError,
  UserNotFoundError,
  listUsers,
  promoteToAdmin,
  resetPassword,
  setApproved,
} from "@/lib/auth/users";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { resetUsers } from "./helpers";

async function signUp(email: string, password = "correct-horse-battery") {
  await auth.api.signUpEmail({ body: { email, password, name: "Test User" } });
  const rows = await db.select().from(user).where(eq(user.email, email));
  return rows[0];
}

beforeEach(async () => {
  await resetUsers();
});

describe("users", () => {
  it("promoteToAdmin and resetPassword trim and lowercase the email", async () => {
    await signUp("foo@example.com");
    await promoteToAdmin(" Foo@Example.com ");
    const rows = await db.select().from(user).where(eq(user.email, "foo@example.com"));
    expect(rows[0].isAdmin).toBe(true);
    await expect(resetPassword(" FOO@example.com ", "another-long-password")).resolves.toBeUndefined();
  });

  it("promoteToAdmin sets approved and isAdmin", async () => {
    const created = await signUp("a@example.com");
    expect(created.approved).toBe(false);
    await promoteToAdmin("a@example.com");
    const rows = await db.select().from(user).where(eq(user.id, created.id));
    expect(rows[0].approved).toBe(true);
    expect(rows[0].isAdmin).toBe(true);
  });

  it("promoteToAdmin throws UserNotFoundError for an unknown email", async () => {
    await expect(promoteToAdmin("nobody@example.com")).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("setApproved false on an admin is refused", async () => {
    const created = await signUp("b@example.com");
    await promoteToAdmin("b@example.com");
    await expect(setApproved(created.id, false)).rejects.toBeInstanceOf(CannotRevokeAdminError);
    const rows = await db.select().from(user).where(eq(user.id, created.id));
    expect(rows[0].approved).toBe(true);
  });

  it("setApproved toggles a normal user and listUsers is newest first", async () => {
    const first = await signUp("c@example.com");
    const second = await signUp("d@example.com");
    await setApproved(first.id, true);
    const list = await listUsers();
    expect(list.map((u) => u.email)).toEqual(["d@example.com", "c@example.com"]);
    expect(list.find((u) => u.id === first.id)?.approved).toBe(true);
    await setApproved(first.id, false);
    expect((await listUsers()).find((u) => u.id === first.id)?.approved).toBe(false);
    expect(second.approved).toBe(false);
  });

  it("resetPassword lets the user sign in with the new password and not the old one", async () => {
    await signUp("e@example.com", "old-password-123");
    await resetPassword("e@example.com", "new-password-456");
    const ok = await auth.api.signInEmail({ body: { email: "e@example.com", password: "new-password-456" } });
    expect(ok.user.email).toBe("e@example.com");
    await expect(
      auth.api.signInEmail({ body: { email: "e@example.com", password: "old-password-123" } }),
    ).rejects.toThrow();
  });
});

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { createSessionCookie, resetUsers } from "./helpers";

// Next's redirect()/notFound() throw; mimic that with sentinel errors.
const mocks = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(mocks.cookie ? { cookie: mocks.cookie } : {}),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { requireApprovedUser, requireAdmin } = await import("@/lib/auth/guards");

async function setFlags(email: string, flags: { approved?: boolean; isAdmin?: boolean }) {
  await db.update(user).set(flags).where(eq(user.email, email));
}

beforeEach(async () => {
  await resetUsers();
  mocks.cookie = "";
});

describe("guards", () => {
  it("redirects to /login with no session", async () => {
    await expect(requireApprovedUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("requireApprovedUser redirects an unapproved user to /pending", async () => {
    mocks.cookie = await createSessionCookie("a@example.com", "correct-horse-battery");
    await expect(requireApprovedUser()).rejects.toThrow("REDIRECT:/pending");
  });

  it("requireApprovedUser redirects to /pending after the user is revoked mid-session", async () => {
    mocks.cookie = await createSessionCookie("b@example.com", "correct-horse-battery");
    await setFlags("b@example.com", { approved: true });
    const ok = await requireApprovedUser();
    expect(ok.email).toBe("b@example.com");
    expect(ok.approved).toBe(true);
    await setFlags("b@example.com", { approved: false });
    await expect(requireApprovedUser()).rejects.toThrow("REDIRECT:/pending");
  });

  it("requireAdmin rejects an approved non-admin", async () => {
    mocks.cookie = await createSessionCookie("c@example.com", "correct-horse-battery");
    await setFlags("c@example.com", { approved: true });
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });

  it("requireAdmin returns an approved admin", async () => {
    mocks.cookie = await createSessionCookie("d@example.com", "correct-horse-battery");
    await setFlags("d@example.com", { approved: true, isAdmin: true });
    const result = await requireAdmin();
    expect(result.isAdmin).toBe(true);
  });
});

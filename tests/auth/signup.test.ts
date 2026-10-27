import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { resetUsers } from "./helpers";

beforeEach(resetUsers);

describe("signup", () => {
  it("ignores approved and isAdmin in the request body", async () => {
    await auth.api.signUpEmail({
      body: {
        email: "evil@example.com",
        password: "correct-horse-battery",
        name: "Evil",
        approved: true,
        isAdmin: true,
      } as never,
    });
    const rows = await db.select().from(user).where(eq(user.email, "evil@example.com"));
    expect(rows).toHaveLength(1);
    expect(rows[0].approved).toBe(false);
    expect(rows[0].isAdmin).toBe(false);
  });
});

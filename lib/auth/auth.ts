import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

// Open sign-up; the gate columns are server-only (input: false) so a client
// can never self-approve or self-promote through the sign-up body.
const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      approved: { type: "boolean", required: false, defaultValue: false, input: false },
      isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  plugins: [nextCookies()],
});

export { auth };

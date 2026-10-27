import "dotenv/config";
import type { FullConfig } from "@playwright/test";
import { E2E_DOMAIN, E2E_PASSWORD, deleteE2eUsers, promoteAdmin } from "./users";

// Sign the admin up through the real auth API, then promote it with seed:admin.
export default async function setupE2e(config: FullConfig): Promise<void> {
  const baseURL = String(config.projects[0].use.baseURL);
  await deleteE2eUsers();
  const email = `admin-${Date.now()}@${E2E_DOMAIN}`;
  const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseURL },
    body: JSON.stringify({ email, password: E2E_PASSWORD, name: "E2E Admin" }),
  });
  if (!res.ok) throw new Error(`admin sign-up failed: ${res.status} ${await res.text()}`);
  promoteAdmin(email);
  process.env.E2E_ADMIN_EMAIL = email;
}

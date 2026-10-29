import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { E2E_DOMAIN, E2E_PASSWORD } from "./users";

// End-to-end smoke against the Docker image: sign-up gate, admin approve/revoke,
// a guide, the map, and a CSP that the browser never has to block anything under.

const cspErrors: string[] = [];

// Report CSP violations twice over: the browser's own console message and the DOM event.
async function watchCsp(context: BrowserContext): Promise<Page> {
  await context.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(`CSP-VIOLATION ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Content Security Policy") || text.startsWith("CSP-VIOLATION")) {
      cspErrors.push(`${page.url()}: ${text}`);
    }
  });
  const result = page;
  return result;
}

async function logIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/(devices|pending)$/);
}

test("sign-up, approval, guide, map, revoke, with a clean CSP", async ({ browser }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  if (!adminEmail) throw new Error("global setup did not seed an admin");
  const userEmail = `user-${Date.now()}@${E2E_DOMAIN}`;

  // The app itself sends a nonce-based CSP.
  const adminContext = await browser.newContext();
  const admin = await watchCsp(adminContext);
  const loginRes = await admin.goto("/login");
  const csp = loginRes?.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");

  // B signs up and waits for approval.
  const userContext = await browser.newContext();
  const user = await watchCsp(userContext);
  await user.goto("/signup");
  await user.getByLabel("Name").fill("E2E User");
  await user.getByLabel("Email").fill(userEmail);
  await user.getByLabel("Password").fill(E2E_PASSWORD);
  await user.getByRole("button", { name: "Sign up" }).click();
  await expect(user).toHaveURL(/\/pending$/);

  // The admin approves B.
  await logIn(admin, adminEmail);
  await expect(admin).toHaveURL(/\/devices$/);
  await admin.goto("/admin/users");
  const row = admin.getByRole("row").filter({ hasText: userEmail });
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row).toContainText("Approved");

  // B logs in and walks a guide.
  await userContext.clearCookies();
  await logIn(user, userEmail);
  await expect(user).toHaveURL(/\/devices$/);
  await user.goto("/devices/pc1864/guides/create-partition");
  await user.getByRole("link", { name: "Next ›" }).click();
  await expect(user).toHaveURL(/\?step=2$/);
  await user.getByRole("link", { name: "Next ›" }).click();
  await expect(user).toHaveURL(/\?step=3$/);

  // The map works out a computed section label.
  await user.goto("/devices/pc1864/map/211");
  await expect(user.getByText("Partition 2, zones 9-16").first()).toBeVisible();

  // The IDS X64 guide shows the Classic LED keypad.
  await user.goto("/devices/x64/guides/add-zone?step=6");
  await expect(user.locator('[aria-label*="Classic"]').first()).toBeVisible();

  // The X64 deep link opens in installer program mode inside location 201 and keeps its URL. A short click on *
  // sends * on release, so 9 * switches zone 9 into partition 1 and light 9 comes on.
  await user.goto("/devices/x64/map/201");
  const face = user.locator('[aria-label*="Classic"]').first();
  await expect(face).toBeVisible();
  await expect(user.locator(".where .waiting")).toContainText("You are in [201]");
  for (const key of ["9", "*"]) {
    await face.locator(`button[data-key="${key}"]`).click();
  }
  await expect(face.getByTestId("zone-light").filter({ hasText: /^9$/ })).toHaveAttribute("data-state", "on");
  await expect(user).toHaveURL(/\/devices\/x64\/map\/201$/);

  // The admin revokes B; B's next navigation is gated.
  await admin.goto("/admin/users");
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(row).toContainText("Pending");
  await user.goto("/devices");
  await expect(user).toHaveURL(/\/pending$/);

  expect(cspErrors).toEqual([]);
  await adminContext.close();
  await userContext.close();
});

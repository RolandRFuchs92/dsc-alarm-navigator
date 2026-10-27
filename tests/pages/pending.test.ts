import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("@/components/LogoutButton", () => ({ LogoutButton: () => null }));
const mocks = vi.hoisted(() => ({ findAppUser: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ findAppUser: mocks.findAppUser }));

const { default: PendingPage } = await import("@/app/(auth)/pending/page");

const person = { id: "u", email: "u@example.com", name: "U", approved: false, isAdmin: false };

beforeEach(() => mocks.findAppUser.mockReset());

describe("pending page", () => {
  it("redirects an approved user to /devices", async () => {
    mocks.findAppUser.mockResolvedValue({ ...person, approved: true });
    await expect(PendingPage()).rejects.toThrow("REDIRECT:/devices");
  });

  it("redirects to /login with no session", async () => {
    mocks.findAppUser.mockResolvedValue(null);
    await expect(PendingPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("keeps an unapproved user on the page", async () => {
    mocks.findAppUser.mockResolvedValue(person);
    await expect(PendingPage()).resolves.toBeTruthy();
  });
});

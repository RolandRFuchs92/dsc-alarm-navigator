import { describe, expect, it, vi } from "vitest";

// Next's notFound() throws; mimic it with a sentinel so the page stops there.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("@/lib/auth/guards", () => ({
  requireApprovedUser: vi.fn(async () => ({ id: "page-test-user", email: "p@example.com", name: "P", approved: true, isAdmin: false })),
  requireAdmin: vi.fn(),
}));

const { notFound } = await import("next/navigation");
const { requireApprovedUser } = await import("@/lib/auth/guards");
const { default: MapPage } = await import("@/app/(app)/devices/[model]/map/page");
const { default: SectionPage } = await import("@/app/(app)/devices/[model]/map/[section]/page");
const { default: ModelPage } = await import("@/app/(app)/devices/[model]/page");

const noSearch = Promise.resolve({});

describe("map pages", () => {
  it("/devices/nope/map → notFound()", async () => {
    await expect(MapPage({ params: Promise.resolve({ model: "nope" }), searchParams: noSearch })).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(requireApprovedUser).toHaveBeenCalled();
  });

  it("/devices/pc1864/map/989 → notFound()", async () => {
    vi.mocked(notFound).mockClear();
    const params = Promise.resolve({ model: "pc1864", section: "989" });
    await expect(SectionPage({ params, searchParams: noSearch })).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("/devices/pc1864/map/abc → notFound()", async () => {
    const params = Promise.resolve({ model: "pc1864", section: "abc" });
    await expect(SectionPage({ params, searchParams: noSearch })).rejects.toThrow("NOT_FOUND");
  });

  it("/devices/pc1864/map/005 renders", async () => {
    vi.mocked(notFound).mockClear();
    const params = Promise.resolve({ model: "pc1864", section: "005" });
    const page = await SectionPage({ params, searchParams: Promise.resolve({ sub: "02" }) });
    expect(page).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("/devices/nope → notFound()", async () => {
    await expect(ModelPage({ params: Promise.resolve({ model: "nope" }) })).rejects.toThrow("NOT_FOUND");
  });
});

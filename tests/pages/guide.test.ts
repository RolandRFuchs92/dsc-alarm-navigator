import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Next's notFound() throws; mimic it with a sentinel so the page stops there.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/auth/guards", () => ({
  requireApprovedUser: vi.fn(async () => ({ id: "page-test-user", email: "p@example.com", name: "P", approved: true, isAdmin: false })),
  requireAdmin: vi.fn(),
}));

const { notFound } = await import("next/navigation");
const { requireApprovedUser } = await import("@/lib/auth/guards");
const { default: GuidePage } = await import("@/app/(app)/devices/[model]/guides/[slug]/page");
const { default: HomePage } = await import("@/app/page");

function openGuide(model: string, slug: string, step?: string | string[]) {
  const result = GuidePage({ params: Promise.resolve({ model, slug }), searchParams: Promise.resolve(step === undefined ? {} : { step }) });
  return result;
}

describe("guide page", () => {
  it("unknown guide slug → notFound()", async () => {
    vi.mocked(requireApprovedUser).mockClear();
    await expect(openGuide("pc1864", "no-such-guide")).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(requireApprovedUser).toHaveBeenCalled();
  });

  it("unknown model → notFound()", async () => {
    vi.mocked(notFound).mockClear();
    await expect(openGuide("nope", "create-partition")).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("renders step 1 by default with the unverified badge and labelled placeholder", async () => {
    vi.mocked(notFound).mockClear();
    const html = renderToStaticMarkup(await openGuide("pc1864", "create-partition"));
    expect(notFound).not.toHaveBeenCalled();
    expect(html).toContain("Step 1 of 11");
    expect(html).toContain("Enter installer programming");
    expect(html).toContain("installer code");
    expect(html).toMatch(/class="badge unverified"[^>]*>unverified/);
    expect(html).not.toContain("View this section");
    expect(html).toContain('href="/devices/pc1864/guides/create-partition?step=2"');
  });

  it("?step=3 shows step 3 with its section link", async () => {
    const html = renderToStaticMarkup(await openGuide("pc1864", "create-partition", "3"));
    expect(html).toContain("Step 3 of 11");
    expect(html).toContain("Give it zones 9");
    expect(html).toContain('href="/devices/pc1864/map/211"');
    expect(html).toContain('href="/devices/pc1864/guides/create-partition?step=2"');
    expect(html).toContain('href="/devices/pc1864/guides/create-partition?step=4"');
  });

  it("out-of-range and junk ?step= clamp", async () => {
    expect(renderToStaticMarkup(await openGuide("pc1864", "create-partition", "99"))).toContain("Step 11 of 11");
    expect(renderToStaticMarkup(await openGuide("pc1864", "create-partition", "abc"))).toContain("Step 1 of 11");
    expect(renderToStaticMarkup(await openGuide("pc1864", "create-partition", ["4", "5"]))).toContain("Step 4 of 11");
  });

  it("step 4 shows its warning", async () => {
    const html = renderToStaticMarkup(await openGuide("pc1864", "create-partition", "4"));
    expect(html).toContain("only arms when both are armed");
  });
});

describe("home page", () => {
  it("/ redirects an approved user to /devices", async () => {
    vi.mocked(requireApprovedUser).mockClear();
    await expect(HomePage()).rejects.toThrow("REDIRECT:/devices");
    expect(requireApprovedUser).toHaveBeenCalled();
  });
});

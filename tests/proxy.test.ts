import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCsp } from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildCsp", () => {
  it("production: nonce on style-src, no unsafe-inline, no unsafe-eval", () => {
    vi.stubEnv("NODE_ENV", "production");
    const csp = buildCsp("abc");
    expect(csp).toContain("style-src 'self' 'nonce-abc'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("development: unsafe-inline on style-src with no style nonce, unsafe-eval on scripts", () => {
    vi.stubEnv("NODE_ENV", "development");
    const csp = buildCsp("abc");
    const style = csp.split("; ").find((d) => d.startsWith("style-src"));
    expect(style).toBe("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic' 'unsafe-eval'");
  });
});

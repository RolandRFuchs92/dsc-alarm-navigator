import { describe, expect, it } from "vitest";
import { listDevHosts, listTrustedOrigins } from "@/lib/auth/trusted-origins";

describe("trusted origins", () => {
  it("is empty when TRUSTED_ORIGINS is unset or blank", () => {
    expect(listTrustedOrigins(undefined)).toEqual([]);
    expect(listTrustedOrigins(" ")).toEqual([]);
  });

  it("splits, trims and drops trailing slashes", () => {
    const result = listTrustedOrigins(" http://192.168.10.177:3001/ ,http://pi.local:3001");
    expect(result).toEqual(["http://192.168.10.177:3001", "http://pi.local:3001"]);
  });

  it("gives Next's dev allow list the bare host names", () => {
    expect(listDevHosts("http://192.168.10.177:3001,http://pi.local:3001")).toEqual(["192.168.10.177", "pi.local"]);
  });

  it("rejects a value that is not a URL", () => {
    expect(() => listTrustedOrigins("192.168.10.177")).toThrow(/TRUSTED_ORIGINS/);
  });
});

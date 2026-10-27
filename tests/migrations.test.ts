import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

function tern(...args: string[]) {
  return spawnSync("node", ["scripts/tern.mjs", "--test", ...args], { encoding: "utf8" });
}

describe("migrations", () => {
  // Leave dsc_test at the latest version for the other test files.
  afterAll(() => {
    tern("migrate");
  });

  it("go up and down cleanly", () => {
    for (const args of [["migrate"], ["migrate", "-d", "0"], ["migrate"]]) {
      const r = tern(...args);
      expect(r.status, `${args.join(" ")}: ${r.stderr}`).toBe(0);
    }
  });
});

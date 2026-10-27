import { describe, expect, it } from "vitest";
import { ruleSchema } from "@/lib/content/schemas";

describe("ruleSchema", () => {
  it("rejects an unknown rule kind", () => {
    expect(ruleSchema.safeParse({ kind: "script" }).success).toBe(false);
  });

  it("accepts the three spec examples", () => {
    // [181]-[188]: offset
    expect(
      ruleSchema.safeParse({ kind: "offset", start: 181, base: 1, describe: "Partition {i}" }).success,
    ).toBe(true);
    // [320]-[323]: block
    expect(
      ruleSchema.safeParse({
        kind: "block", start: 320, size: 16, base: 1, describe: "Zones {first}-{last}",
      }).success,
    ).toBe(true);
    // [202]-[265]: grid
    expect(
      ruleSchema.safeParse({
        kind: "grid", start: 202, perGroup: 4, size: 16,
        describe: "Partition {group}, zones {first}-{last}",
        options: { count: 16, on: "Zone {first + k - 1} on this partition", off: "Not on this partition", def: false },
        defaultWhen: { n: 202 },
      }).success,
    ).toBe(true);
  });
});

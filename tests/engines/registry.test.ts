import { describe, expect, it } from "vitest";
import { getEngine } from "@/lib/engines";

describe("getEngine", () => {
  it("returns the DSC PowerSeries engine", () => {
    const engine = getEngine("dsc-powerseries");
    expect(typeof engine.pressKey).toBe("function");
  });

  it("lists the DSC keys", () => {
    expect(getEngine("dsc-powerseries").keys).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "<", ">"]);
  });

  it("throws for an unknown engine key", () => {
    expect(() => getEngine("nope")).toThrow(/nope/);
  });
});

import { describe, expect, it } from "vitest";
import { getEngine } from "@/lib/engines";

describe("getEngine", () => {
  it("returns the DSC PowerSeries engine", () => {
    const engine = getEngine("dsc-powerseries");
    expect(typeof engine.pressKey).toBe("function");
  });

  it("throws for an unknown engine key", () => {
    expect(() => getEngine("nope")).toThrow(/nope/);
  });
});

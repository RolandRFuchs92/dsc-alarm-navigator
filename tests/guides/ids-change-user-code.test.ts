import { describe, expect, it } from "vitest";
import { buildStepState } from "@/lib/guides/replay";
import { getGuide, getPanelModel } from "@/lib/content/repo";
import { getEngine } from "@/lib/engines";

// Guide "Change a user code" (user manual option 1): the master code 1234 becomes 4321.
describe("IDS change-user-code guide", async () => {
  const model = (await getPanelModel("x64"))!;
  const guide = (await getGuide("x64", "change-user-code"))!;
  const engine = getEngine(model.engineKey);
  const stateAfter = (n: number) => buildStepState(engine, model, guide.steps, n);
  const modeAfter = (n: number) => engine.selectFocus!(stateAfter(n), model).mode;
  const ledsAfter = (n: number) => engine.selectLeds(stateAfter(n));

  it("is stored, unverified, with 7 steps", () => {
    expect(guide).not.toBeNull();
    expect(guide.verified).toBe(false);
    expect(guide.steps.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("hold * opens the master code prompt with READY and ARMED alternating", () => {
    expect(modeAfter(2)).toBe("userCode");
    expect(ledsAfter(2)).toMatchObject({ ready: "alternate", armed: "alternate" });
  });

  it("walks through option 1 with the expected lights", () => {
    expect(modeAfter(3)).toBe("userTop");
    expect(ledsAfter(4)).toMatchObject({ ready: "flash", armed: "flash" });
    expect(ledsAfter(5)).toMatchObject({ ready: "flash", away: "flash", armed: "on" });
    expect(ledsAfter(6)).toMatchObject({ ready: "flash", armed: "flash" });
  });

  it("# # leaves to idle", () => {
    expect(modeAfter(7)).toBe("idle");
  });

  it("never puts anything in the worksheet and never errors", () => {
    for (let n = 1; n <= 7; n++) {
      expect(engine.selectWorksheet(stateAfter(n))).toEqual({ values: {}, toggles: {} });
      expect(engine.selectLocation(stateAfter(n), model).isError).toBe(false);
    }
  });
});

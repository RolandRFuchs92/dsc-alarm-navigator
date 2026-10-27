import { describe, expect, it } from "vitest";
import { buildStepState, clampStep } from "@/lib/guides/replay";
import { getGuide, getPanelModel } from "@/lib/content/repo";
import { getEngine } from "@/lib/engines";
import { parseKeys } from "@/lib/guides/keys";

describe("clampStep", () => {
  it("clamps to 1..count and treats non-numbers as 1", () => {
    expect(clampStep("0", 10)).toBe(1);
    expect(clampStep("99", 10)).toBe(10);
    expect(clampStep("abc", 10)).toBe(1);
    expect(clampStep(undefined, 10)).toBe(1);
    expect(clampStep("4", 10)).toBe(4);
    expect(clampStep("2.5", 10)).toBe(1);
    expect(clampStep("-3", 10)).toBe(1);
  });
});

describe("buildStepState", async () => {
  const model = (await getPanelModel("pc1864"))!;
  const guide = (await getGuide("pc1864", "create-partition"))!;
  const engine = getEngine(model.engineKey);

  it("the sample guide is stored, unverified, with 10 steps", () => {
    expect(guide).not.toBeNull();
    expect(guide.verified).toBe(false);
    expect(guide.steps.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("before step 1 the keypad is fresh", () => {
    const state = buildStepState(engine, model, guide.steps, 0);
    expect(state).toEqual(engine.createInitialState(model));
  });

  it("before step 2 of create-partition is at Enter Section", () => {
    const state = buildStepState(engine, model, guide.steps, 1);
    const location = engine.selectLocation(state, model);
    expect(location.waitingFor).toMatch(/top of installer programming/);
    expect(location.sectionNum).toBeNull();
    expect(location.isError).toBe(false);
  });

  it("during step 3 the keys land in [211] = Partition 2, zones 9-16", () => {
    const before = buildStepState(engine, model, guide.steps, 2);
    const keys = ["2", "1", "1"] as const;
    const state = keys.reduce((s, k) => engine.pressKey(s, k, model), before);
    const location = engine.selectLocation(state, model);
    expect(location.sectionNum).toBe(211);
    expect(location.waitingFor).toContain("Partition 2, zones 9-16");
  });

  // The check that would have caught `# #` leaving installer mode early: every installer-mode
  // step must start at Enter Section, and leaving installer programming must land at idle.
  it.each([2, 3, 4, 5, 6, 7, 8, 9])("before step %i the keypad is at Enter Section in installer programming", (n) => {
    const state = buildStepState(engine, model, guide.steps, n - 1);
    const location = engine.selectLocation(state, model);
    expect(location.waitingFor, `before step ${n}`).toMatch(/top of installer programming/);
    expect(location.sectionNum, `before step ${n}`).toBeNull();
    expect(engine.selectLeds(state).armed, `before step ${n}`).toBe("on");
  });

  it("after step 9 the keypad is idle, out of installer programming", () => {
    const state = buildStepState(engine, model, guide.steps, 9);
    const location = engine.selectLocation(state, model);
    expect(location.waitingFor).toMatch(/keypad is idle/);
    expect(location.crumbs.map((c) => c.label)).toEqual(["Keypad"]);
  });

  it("step 3's keys up to its # leave the keypad in [211] = Partition 2, zones 9-16", () => {
    const step = guide.steps[2];
    const keys = parseKeys(step.keys, model);
    expect(keys.at(-1)).toBe("#");
    const state = keys.slice(0, -1).reduce((s, k) => engine.pressKey(s, k, model), buildStepState(engine, model, guide.steps, 2));
    const location = engine.selectLocation(state, model);
    expect(location.sectionNum).toBe(211);
    expect(location.waitingFor).toContain("Partition 2, zones 9-16");
  });

  it("starts from an empty worksheet: only the replayed keys are recorded", () => {
    const state = buildStepState(engine, model, guide.steps, 2);
    expect(engine.selectWorksheet(state)).toEqual({ values: {}, toggles: { "201": [1, 2] } });
  });
});

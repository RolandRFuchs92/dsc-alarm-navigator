import { describe, expect, it } from "vitest";
import { buildStepState } from "@/lib/guides/replay";
import { getGuide, getPanelModel } from "@/lib/content/repo";
import { getEngine } from "@/lib/engines";

// "Clear the Stay zones" swaps zone 5 (example) from 05 back to 04; "Create a new Stay" makes zones 5-8 type 05.
describe("stay guides", async () => {
  const model = (await getPanelModel("pc1864"))!;
  const engine = getEngine(model.engineKey);
  const clear = (await getGuide("pc1864", "clear-stay"))!;
  const create = (await getGuide("pc1864", "create-stay"))!;

  it("both are stored and unverified", () => {
    expect(clear?.verified).toBe(false);
    expect(create?.verified).toBe(false);
    expect(clear.steps.map((s) => s.position)).toEqual([1, 2, 3, 4, 5]);
    expect(create.steps.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("clear-stay: after step 3 only zone 5 is written, as 04, and the cursor is on zone 6", () => {
    const state = buildStepState(engine, model, clear.steps, 3);
    expect(engine.selectWorksheet(state).values).toEqual({ "1||4": "04" });
    const location = engine.selectLocation(state, model);
    expect(location.sectionNum).toBe(1);
    expect(location.waitingFor).toContain("Zone 6");
  });

  it("clear-stay: ends idle with the change kept", () => {
    const state = buildStepState(engine, model, clear.steps, 5);
    expect(engine.selectLocation(state, model).waitingFor).toMatch(/keypad is idle/);
    expect(engine.selectWorksheet(state).values).toEqual({ "1||4": "04" });
  });

  it("create-stay: after step 3 the cursor sits on zone 5 in [001]", () => {
    const state = buildStepState(engine, model, create.steps, 3);
    const location = engine.selectLocation(state, model);
    expect(location.sectionNum).toBe(1);
    expect(location.waitingFor).toContain("Zone 5");
  });

  it("create-stay: zones 5-8 become 05 and nothing else changes", () => {
    const expected = { "1||4": "05", "1||5": "05", "1||6": "05", "1||7": "05" };
    expect(engine.selectWorksheet(buildStepState(engine, model, create.steps, 4)).values).toEqual(expected);
    const end = buildStepState(engine, model, create.steps, 6);
    expect(engine.selectLocation(end, model).waitingFor).toMatch(/keypad is idle/);
    expect(engine.selectWorksheet(end).values).toEqual(expected);
  });
});

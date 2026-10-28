import { describe, expect, it } from "vitest";
import { buildStepState } from "@/lib/guides/replay";
import { getGuide, getPanelModel } from "@/lib/content/repo";
import { getEngine } from "@/lib/engines";

// Guide "Permanently bypass a zone": zone 5 becomes a Null Zone (00) in [001]; nothing else changes.
describe("bypass-zone guide", async () => {
  const model = (await getPanelModel("pc1864"))!;
  const guide = (await getGuide("pc1864", "bypass-zone"))!;
  const engine = getEngine(model.engineKey);

  it("is stored, unverified, with 6 steps", () => {
    expect(guide).not.toBeNull();
    expect(guide.verified).toBe(false);
    expect(guide.steps.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("after step 3 the cursor sits on zone 5 in [001]", () => {
    const state = buildStepState(engine, model, guide.steps, 3);
    const location = engine.selectLocation(state, model);
    expect(location.sectionNum).toBe(1);
    expect(location.isError).toBe(false);
    expect(location.waitingFor).toContain("Zone 5");
  });

  it("after step 4 only zone 5 is written, as 00", () => {
    const state = buildStepState(engine, model, guide.steps, 4);
    expect(engine.selectWorksheet(state).values).toEqual({ "1||4": "00" });
  });

  it("after step 6 the keypad is idle and zone 5 is still 00", () => {
    const state = buildStepState(engine, model, guide.steps, 6);
    const location = engine.selectLocation(state, model);
    expect(location.waitingFor).toMatch(/keypad is idle/);
    expect(engine.selectWorksheet(state).values).toEqual({ "1||4": "00" });
  });
});

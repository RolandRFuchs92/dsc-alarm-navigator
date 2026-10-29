import { describe, expect, it } from "vitest";
import { buildStepState } from "@/lib/guides/replay";
import { getGuide, getPanelModel } from "@/lib/content/repo";
import { getEngine } from "@/lib/engines";

// Guide "Add a new zone": zone 9 becomes an Instant zone (04), is allocated to partition 1 in [201],
// and its properties in [109] are checked but not changed.
describe("IDS add-zone guide", async () => {
  const model = (await getPanelModel("x64"))!;
  const guide = (await getGuide("x64", "add-zone"))!;
  const engine = getEngine(model.engineKey);
  const keypad = model.keypads[0];
  const stateAfter = (n: number) => buildStepState(engine, model, guide.steps, n);
  const modeAfter = (n: number) => engine.selectFocus!(stateAfter(n), model).mode;
  const lightsAfter = (n: number) => {
    const display = engine.selectDisplay(stateAfter(n), model, keypad);
    return display.type === "lights" ? display.lights : {};
  };

  it("is stored, unverified, with 10 steps", () => {
    expect(guide).not.toBeNull();
    expect(guide.verified).toBe(false);
    expect(guide.steps.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("installer mode opens, then location 2 sits on zone 9", () => {
    expect(modeAfter(1)).toBe("programTop");
    expect(modeAfter(2)).toBe("zoneList");
    const location = engine.selectLocation(stateAfter(2), model);
    expect(location.sectionNum).toBe(2);
    expect(location.waitingFor).toContain("Zone 9");
  });

  it("zone 9 is stored as type 04 and the cursor moves to zone 10", () => {
    expect(engine.selectWorksheet(stateAfter(3)).values).toEqual({ "2||0": "04" });
    expect(engine.selectLocation(stateAfter(3), model).waitingFor).toContain("Zone 10");
    expect(modeAfter(4)).toBe("programTop");
  });

  it("201 page 1 opens, then toggling 9 switches light 9 on", () => {
    expect(modeAfter(5)).toBe("bitmap");
    const location = engine.selectLocation(stateAfter(5), model);
    expect(location.sectionNum).toBe(201);
    expect(location.waitingFor).toContain("page 1");
    expect(engine.selectWorksheet(stateAfter(6)).toggles["201"]).toEqual([9]);
    expect(lightsAfter(6)[9]).toBe("on");
    expect(modeAfter(7)).toBe("programTop");
  });

  it("109 shows light 6 on and changes nothing", () => {
    expect(modeAfter(8)).toBe("bitmap");
    expect(engine.selectLocation(stateAfter(8), model).sectionNum).toBe(109);
    // The worksheet only holds what was changed, so the untouched default (light 6 on) has no "109" entry.
    expect(engine.selectWorksheet(stateAfter(8)).toggles["109"]).toBeUndefined();
    expect(lightsAfter(8)[6]).toBe("on");
    expect(modeAfter(9)).toBe("programTop");
  });

  it("step 10 leaves programming, with the zone settings kept and no step in error", () => {
    expect(modeAfter(10)).toBe("idle");
    const worksheet = engine.selectWorksheet(stateAfter(10));
    expect(worksheet.values["2||0"]).toBe("04");
    expect(worksheet.toggles["201"]).toEqual([9]);
    for (let n = 1; n <= 10; n++) {
      expect(engine.selectLocation(stateAfter(n), model).isError).toBe(false);
    }
  });
});

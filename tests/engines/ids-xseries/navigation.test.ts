import { describe, expect, it } from "vitest";
import { createIdle, engine, freezeDeep, model, press, readLeds, readLitZones } from "./helpers";
import type { IdsState } from "@/lib/engines/ids-xseries/state";

// Map navigation (tree, search, deep links, buttons) on the IDS engine: no key presses, same states as the keys give.
const focusOf = (state: IdsState) => engine.selectFocus!(state, model);
const goToSection = (state: IdsState, num: number) => freezeDeep(engine.navigateToSection!(freezeDeep(state), model, num));
const goToNode = (state: IdsState, id: string, num?: number) => freezeDeep(engine.navigateToNode!(freezeDeep(state), model, id, num));

describe("IDS X-Series: map navigation", () => {
  it("navigateToSection(201) is exactly # {installer} * 2 0 1 *", () => {
    const typed = press(createIdle(), "# {installer} * 2 0 1 *");
    const navigated = goToSection(createIdle(), 201);
    expect({ ...navigated, beep: null }).toEqual({ ...typed, beep: null });
    expect(focusOf(navigated)).toMatchObject({ mode: "bitmap", nodeId: "partition-zones" });
    expect(engine.selectLocation(navigated, model).sectionNum).toBe(201);
    expect(readLeds(navigated).ready).toBe("on");
  });

  it("navigateToSection(2) opens zone types for zones 9-16 on zone 9", () => {
    const navigated = goToSection(createIdle(), 2);
    expect(focusOf(navigated)).toMatchObject({ mode: "zoneList", nodeId: "zone-types", entryIndex: 0 });
    expect(readLeds(navigated)).toMatchObject({ ready: "on", armed: "flash", away: "flash" });
  });

  it("navigateToSection uses the programmed installer code in the trail and keeps the worksheet", () => {
    const changed = press(createIdle(), "# {installer} * 1 9 7 * 1 2 3 4 * #");
    const navigated = goToSection(changed, 23);
    expect(focusOf(navigated).trail.map((c) => c.key)).toEqual(["#", "1234", "*", "23", "*"]);
    expect(engine.selectWorksheet(navigated).values["197||0"]).toBe("1234");
  });

  it("navigateToSection from inside another location or user program mode starts afresh", () => {
    const inUserMode = press(createIdle(), "hold* {master} *");
    const navigated = goToSection(inUserMode, 109);
    expect(focusOf(navigated)).toMatchObject({ mode: "bitmap", nodeId: "zone-properties", buffer: "" });
    expect(engine.selectLocation(navigated, model).sectionNum).toBe(109);
  });

  it("navigateToSection on an unknown number leaves the state alone", () => {
    const idle = createIdle();
    expect(engine.navigateToSection!(idle, model, 999)).toBe(idle);
  });

  it("navigateToNode on a range opens its first location, or the one asked for", () => {
    expect(engine.selectLocation(goToNode(createIdle(), "zone-types"), model).sectionNum).toBe(1);
    expect(engine.selectLocation(goToNode(createIdle(), "zone-properties", 109), model).sectionNum).toBe(109);
    expect(engine.selectLocation(goToNode(createIdle(), "installer-code"), model).sectionNum).toBe(197);
  });

  it("navigateToNode on a bitmap opens page 1", () => {
    const paged = press(goToSection(createIdle(), 201), "*");
    const navigated = goToNode(paged, "partition-zones", 202);
    expect(navigated.page).toBe(1);
    expect(readLeds(navigated)).toMatchObject({ ready: "on", armed: "off", away: "off", power: "off" });
  });

  it("navigateToNode on a user program command shows it with the keypad idle", () => {
    const navigated = goToNode(goToSection(createIdle(), 201), "u3");
    expect(focusOf(navigated)).toMatchObject({ mode: "idle", nodeId: "u3", buffer: "", trail: [] });
    expect(engine.selectLocation(navigated, model)).toMatchObject({ sectionNum: null, sectionSlug: null });
    // Hold * still works from there, and the command focus is dropped once a key leaves idle.
    expect(focusOf(press(navigated, "hold*"))).toMatchObject({ mode: "userCode", nodeId: null });
    expect(focusOf(press(navigated, "#"))).toMatchObject({ mode: "installerCode", nodeId: null });
  });

  it("navigateToNode on an unknown id leaves the state alone", () => {
    const idle = createIdle();
    expect(engine.navigateToNode!(idle, model, "nope")).toBe(idle);
  });

  it("resetKeypad goes back to idle and keeps the worksheet and codes", () => {
    const worked = press(createIdle(), "# {installer} * 2 * 4 * # 2 0 1 * 9 *");
    const withCode = { ...worked, codes: { ...worked.codes, 2: "5555" } };
    const reset = freezeDeep(engine.resetKeypad!(freezeDeep(withCode)));
    expect(focusOf(reset)).toMatchObject({ mode: "idle", nodeId: null, trail: [], beep: null });
    expect(reset.values).toEqual(worked.values);
    expect(reset.toggles).toEqual(worked.toggles);
    expect(reset.codes).toEqual({ 1: "1234", 2: "5555" });
  });

  it("clearWorksheet empties values and toggles, keeps codes, and the installer code is the default again", () => {
    const worked = press(createIdle(), "# {installer} * 1 9 7 * 1 2 3 4 * 2 0 1 * 9 *");
    const withCode = { ...worked, codes: { ...worked.codes, 2: "5555" } };
    const cleared = freezeDeep(engine.clearWorksheet!(freezeDeep(withCode)));
    expect(engine.selectWorksheet(cleared)).toEqual({ values: {}, toggles: {} });
    expect(cleared.codes).toEqual({ 1: "1234", 2: "5555" });
    expect(readLitZones(cleared)).toEqual([]);
    const reentered = press(engine.resetKeypad!(cleared), "# 9 9 9 9 *");
    expect(focusOf(reentered).mode).toBe("programTop");
  });

  it("the Program mode crumb inside a location goes back to the top", () => {
    const inside = goToSection(createIdle(), 23);
    const crumbs = engine.selectLocation(inside, model).crumbs;
    expect(crumbs[0]).toEqual({ label: "Program mode", target: "program" });
    const top = freezeDeep(engine.followCrumb!(freezeDeep(inside), model, "program"));
    expect(focusOf(top)).toMatchObject({ mode: "programTop", nodeId: null });
    expect(engine.selectLocation(top, model).crumbs).toEqual([{ label: "Program mode", target: null }]);
  });

  it("isInstallerTop is true at the top of program mode only, not while the installer code is typed", () => {
    expect(focusOf(press(createIdle(), "# 9")).isInstallerTop).toBe(false);
    expect(focusOf(press(createIdle(), "# {installer} *")).isInstallerTop).toBe(true);
  });

  it("entry, lookup and option clicks stay inert: the engine doesn't offer them", () => {
    expect(engine.navigateToEntry).toBeUndefined();
    expect(engine.applyLookupValue).toBeUndefined();
    expect(engine.flipOption).toBeUndefined();
    expect(engine.navigateToSub).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { engine, freezeDeep, model, pressKeys } from "./helpers";

const fresh = () => freezeDeep(engine.createInitialState(model));

describe("map navigation (optional engine methods)", () => {
  it("navigateToSection opens [005] sub-section [02] like typing * 8 5555 005 02", () => {
    const viaLink = engine.navigateToSection!(fresh(), model, 5, "02");
    const viaKeys = pressKeys("* 8 5 5 5 5 0 0 5 0 2");
    expect(engine.selectLocation(viaLink, model)).toEqual(engine.selectLocation(viaKeys, model));
    expect(engine.selectFocus!(viaLink, model).trail.map((c) => c.key)).toEqual(["*", "8", "5555", "005", "02"]);
  });

  it("navigateToSection resolves a number inside a range and ignores an unknown one", () => {
    const loc = engine.selectLocation(engine.navigateToSection!(fresh(), model, 211), model);
    expect(loc).toMatchObject({ sectionNum: 211, sectionSlug: "s202" });
    const same = fresh();
    expect(engine.navigateToSection!(same, model, 989)).toBe(same);
  });

  it("selectFocus shows typed digits as a pending chip", () => {
    const focus = engine.selectFocus!(pressKeys("* 8 5 5 5 5 0 1"), model);
    expect(focus.trail.at(-1)).toEqual({ key: "01", label: "typing" });
    expect(focus.isInstallerTop).toBe(true);
  });

  it("flipOption on a row flips that option and re-enters the toggle section", () => {
    const inside = engine.navigateToSection!(fresh(), model, 13);
    const before = engine.selectWorksheet(inside).toggles["13"];
    const after = engine.selectWorksheet(engine.flipOption!(freezeDeep(inside), model, 1)).toggles["13"];
    expect(after.includes(1)).toBe(!before.includes(1));
  });

  it("followCrumb star opens the [*] menu; installer opens Enter Section", () => {
    const deep = engine.navigateToSection!(fresh(), model, 5, "02");
    expect(engine.selectFocus!(engine.followCrumb!(deep, model, "star"), model)).toMatchObject({ mode: "star", trail: [{ key: "*", label: "" }] });
    expect(engine.selectFocus!(engine.followCrumb!(deep, model, "installer"), model).mode).toBe("section");
    expect(engine.selectLocation(engine.followCrumb!(deep, model, "section:5"), model)).toMatchObject({ sectionNum: 5, subCode: null });
  });

  it("clearWorksheet empties entries and resetKeypad goes idle", () => {
    const typed = pressKeys("* 8 5 5 5 5 0 0 1 0 3");
    expect(Object.keys(engine.selectWorksheet(typed).values).length).toBeGreaterThan(0);
    const cleared = engine.clearWorksheet!(typed);
    expect(engine.selectWorksheet(cleared)).toEqual({ values: {}, toggles: {} });
    expect(engine.selectDisplay(cleared, model, model.keypads.find((k) => k.displayType === "text")!)).toEqual({ type: "text", lines: ["Entries cleared", "Back to defaults"] });
    expect(engine.selectFocus!(engine.resetKeypad!(typed), model).mode).toBe("ready");
  });
});

import { describe, expect, it } from "vitest";
import type { Key } from "@/lib/engines/types";
import { createIdle, engine, freezeDeep, model, press } from "./helpers";

const focusOf = (state: ReturnType<typeof createIdle>) => engine.selectFocus!(state, model);
const programTop = () => press(createIdle(), "# {installer} *");

describe("IDS X-Series: entering and leaving program mode (installer manual §8)", () => {
  it("starts idle", () => {
    expect(focusOf(createIdle())).toMatchObject({ mode: "idle", nodeId: null, beep: null, buffer: "" });
  });

  it("# 9 9 9 9 * enters program mode with a long beep", () => {
    const focus = focusOf(programTop());
    expect(focus).toMatchObject({ mode: "programTop", beep: "long", isInstallerTop: true });
  });

  it("# with a wrong code gives the error beep and goes back to idle", () => {
    const state = press(createIdle(), "# 1 2 3 4 *");
    expect(focusOf(state)).toMatchObject({ mode: "idle", beep: "error" });
    expect(engine.selectLocation(state, model).isError).toBe(true);
  });

  it("# at the top of program mode goes back to idle", () => {
    const state = press(programTop(), "#");
    expect(focusOf(state).mode).toBe("idle");
    expect(engine.selectLocation(state, model).isError).toBe(false);
  });

  it("an unused location gives the error beep and stays at the top", () => {
    const state = press(programTop(), "9 9 9 *");
    expect(focusOf(state)).toMatchObject({ mode: "programTop", beep: "error", nodeId: null });
    expect(engine.selectLocation(state, model).isError).toBe(true);
  });

  it("a fourth location digit gives the error beep and keeps the buffer", () => {
    const state = press(programTop(), "1 0 9 1");
    expect(focusOf(state)).toMatchObject({ mode: "programTop", beep: "error", buffer: "109" });
  });
});

describe("IDS X-Series: standard locations (installer manual §8, Location 23 and 197)", () => {
  it("2 3 * opens location 23", () => {
    const state = press(programTop(), "2 3 *");
    expect(focusOf(state)).toMatchObject({ mode: "location", nodeId: "code-length" });
    const location = engine.selectLocation(state, model);
    expect(location.sectionNum).toBe(23);
    expect(location.crumbs.map((c) => c.label)).toEqual(["Program mode", "[23] Code length"]);
  });

  it("6 * saves 6 with a long beep and returns to the top", () => {
    const state = press(programTop(), "2 3 * 6 *");
    expect(focusOf(state)).toMatchObject({ mode: "programTop", beep: "long" });
    // Changing the code length also resets the installer code to the Table 12 default (coordinator ruling).
    expect(engine.selectWorksheet(state).values).toEqual({ "23||0": "6", "197||0": "999999" });
  });

  it("5 * in location 23 gives the error beep (only 4 or 6 are valid)", () => {
    const state = press(programTop(), "2 3 * 5 *");
    expect(focusOf(state)).toMatchObject({ mode: "location", beep: "error", buffer: "" });
    expect(engine.selectLocation(state, model).isError).toBe(true);
    expect(engine.selectWorksheet(state).values).toEqual({});
  });

  it("a second digit in a 1-digit location gives the error beep and keeps the buffer", () => {
    const state = press(programTop(), "2 3 * 6 6");
    expect(focusOf(state)).toMatchObject({ mode: "location", beep: "error", buffer: "6" });
  });

  it("# leaves a location unchanged and goes back to the top", () => {
    const state = press(programTop(), "2 3 * 6 #");
    expect(focusOf(state).mode).toBe("programTop");
    expect(engine.selectWorksheet(state).values).toEqual({});
  });

  it("a short value in location 197 gives the error beep", () => {
    const state = press(programTop(), "1 9 7 * 1 2 *");
    expect(focusOf(state)).toMatchObject({ mode: "location", beep: "error" });
  });

  it("a new installer code in location 197 replaces 9999", () => {
    const changed = press(programTop(), "1 9 7 * 1 2 3 4 * #");
    expect(focusOf(changed).mode).toBe("idle");
    expect(focusOf(press(changed, "# 1 2 3 4 *")).mode).toBe("programTop");
    const old = press(changed, "# 9 9 9 9 *");
    expect(focusOf(old)).toMatchObject({ mode: "idle", beep: "error" });
  });

  it("mode 3 inside a data location types D (Table 3)", () => {
    const state = press(programTop(), "1 9 7 * 1 mode 3");
    expect(focusOf(state).buffer).toBe("1D");
  });

  it("mode followed by a digit above 5 gives the error beep", () => {
    const state = press(programTop(), "1 9 7 * 1 mode 7");
    expect(focusOf(state)).toMatchObject({ buffer: "1", beep: "error" });
  });
});

describe("IDS X-Series: code length resets the installer code (Location 23, Table 12)", () => {
  const sixDigits = () => press(programTop(), "2 3 * 6 * #");

  it("after 2 3 * 6 *, 999999 enters program mode and 9999 errors", () => {
    expect(focusOf(press(sixDigits(), "# 9 9 9 9 9 9 *")).mode).toBe("programTop");
    expect(focusOf(press(sixDigits(), "# 9 9 9 9 *"))).toMatchObject({ mode: "idle", beep: "error" });
  });

  it("with 6-digit codes location 197 takes 6 digits and the new code works", () => {
    const changed = press(sixDigits(), "# 9 9 9 9 9 9 * 1 9 7 * 1 2 3 4 5 6 *");
    expect(focusOf(changed)).toMatchObject({ mode: "programTop", beep: "long" });
    expect(engine.selectWorksheet(changed).values["197||0"]).toBe("123456");
    expect(focusOf(press(changed, "# # 1 2 3 4 5 6 *")).mode).toBe("programTop");
  });

  it("switching back to 4 makes 9999 valid again", () => {
    const back = press(sixDigits(), "# 9 9 9 9 9 9 * 2 3 * 4 * #");
    expect(focusOf(press(back, "# 9 9 9 9 *")).mode).toBe("programTop");
    // A 5th code digit is refused with the error beep (the buffer can't exceed the code length).
    expect(focusOf(press(back, "# 9 9 9 9 9"))).toMatchObject({ mode: "installerCode", beep: "error", buffer: "9999" });
  });

  it("saving the same length leaves a changed installer code alone", () => {
    const state = press(programTop(), "1 9 7 * 1 2 3 4 * 2 3 * 4 * #");
    expect(focusOf(press(state, "# 1 2 3 4 *")).mode).toBe("programTop");
  });
});

describe("IDS X-Series: zone types, star-advance (installer manual §9, Location 1-8)", () => {
  const zoneList = () => press(programTop(), "2 *");

  it("2 * opens location 2 on zone 9", () => {
    const state = zoneList();
    expect(focusOf(state)).toMatchObject({ mode: "zoneList", nodeId: "zone-types", entryIndex: 0 });
    expect(engine.selectLocation(state, model).waitingFor).toContain("Zone 9");
  });

  it("* moves to zone 10", () => {
    const state = press(zoneList(), "*");
    expect(focusOf(state).entryIndex).toBe(1);
    expect(engine.selectLocation(state, model).waitingFor).toContain("Zone 10");
  });

  it("4 * on zone 9 saves 04 and moves to zone 10", () => {
    const state = press(zoneList(), "4 *");
    expect(engine.selectWorksheet(state).values).toEqual({ "2||0": "04" });
    expect(focusOf(state)).toMatchObject({ mode: "zoneList", entryIndex: 1, beep: "long" });
  });

  it("the manual's example sets zone 12 to Instant", () => {
    const state = press(zoneList(), "* * * 4 *");
    expect(engine.selectWorksheet(state).values).toEqual({ "2||3": "04" });
  });

  it("6 * gives the error beep (6 is not a valid zone type)", () => {
    const state = press(zoneList(), "6 *");
    expect(focusOf(state)).toMatchObject({ mode: "zoneList", entryIndex: 0, beep: "error", buffer: "" });
    expect(engine.selectWorksheet(state).values).toEqual({});
  });

  it("9 * is accepted (zone type 09 ruling), 1 6 * is not", () => {
    expect(engine.selectWorksheet(press(zoneList(), "9 *")).values).toEqual({ "2||0": "09" });
    expect(focusOf(press(zoneList(), "1 6 *")).beep).toBe("error");
  });

  it("a third digit gives the error beep and keeps the buffer", () => {
    const state = press(zoneList(), "1 0 1");
    expect(focusOf(state)).toMatchObject({ buffer: "10", beep: "error" });
  });

  it("* on the last zone of the location stays on it", () => {
    const state = press(zoneList(), "* * * * * * * *");
    expect(focusOf(state).entryIndex).toBe(7);
    expect(engine.selectLocation(state, model).waitingFor).toContain("Zone 16");
  });

  it("# goes back to the top", () => {
    expect(focusOf(press(zoneList(), "#")).mode).toBe("programTop");
  });
});

describe("IDS X-Series: bitmapped locations (installer manual §8, Tables 23 and 26)", () => {
  it("1 0 9 * opens zone 9's properties", () => {
    const state = press(programTop(), "1 0 9 *");
    expect(focusOf(state)).toMatchObject({ mode: "bitmap", nodeId: "zone-properties" });
  });

  it("5 * switches property 5 on and # saves 5 and 6", () => {
    const state = press(programTop(), "1 0 9 * 5 * #");
    expect(focusOf(state).mode).toBe("programTop");
    expect(engine.selectWorksheet(state).toggles).toEqual({ "109": [5, 6] });
  });

  it("1 7 * gives the error beep (only lights 1-16)", () => {
    const state = press(programTop(), "1 0 9 * 1 7 *");
    expect(focusOf(state)).toMatchObject({ mode: "bitmap", beep: "error" });
  });

  it("partition 1: 9 * then * then 1 * allocates zones 9 and 17", () => {
    const state = press(programTop(), "2 0 1 * 9 * * 1 * #");
    expect(engine.selectWorksheet(state).toggles).toEqual({ "201": [9, 17] });
  });
});

describe("IDS X-Series: keys and purity", () => {
  const states = () => [
    createIdle(),
    press(createIdle(), "# 9"),
    programTop(),
    press(programTop(), "2 3 *"),
    press(programTop(), "2 *"),
    press(programTop(), "1 0 9 *"),
    press(programTop(), "2 0 1 *"),
  ];

  it.each(["<", ">", "f", "m", "p"])("%s returns a state equal to the input in every mode", (key) => {
    states().forEach((state) => {
      expect(engine.pressKey(freezeDeep(state), key as Key, model)).toEqual(state);
    });
  });

  it("hold* and hold9 leave the state unchanged for now (user program mode and bypass come later)", () => {
    const idle = createIdle();
    expect(engine.pressKey(idle, "hold*", model)).toEqual(idle);
    expect(engine.pressKey(idle, "hold9", model)).toEqual(idle);
  });

  it("works on deep-frozen states", () => {
    expect(() => press(createIdle(), "# {installer} * 2 3 * 6 * 2 * 4 * 1 0 9 * 5 * # 2 0 1 * 9 * * #")).not.toThrow();
  });

  it("declares the X-Series keys", () => {
    expect(engine.keys).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "mode", "f", "m", "p", "hold*", "hold9"]);
  });

  it("selectFocus's trail lists the keys pressed", () => {
    const trail = focusOf(press(programTop(), "2 3 *")).trail;
    expect(trail.map((c) => c.key)).toEqual(["#", "9999", "*", "23", "*"]);
  });
});

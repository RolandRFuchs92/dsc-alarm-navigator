import { describe, expect, it } from "vitest";
import type { IdsState } from "@/lib/engines/ids-xseries/state";
import { createIdle, engine, model, press, readLeds, readLitZones, readVerified } from "./helpers";

const focusOf = (state: IdsState) => engine.selectFocus!(state, model);
const locationOf = (state: IdsState) => engine.selectLocation(state, model);
const userTop = () => press(createIdle(), "hold* 1 2 3 4 *");
const CODES = ["1234", "4321", "5555", "6666", "123456", "654321"];

// User codes never reach the worksheet, and are never shown as digits (rulings).
function expectNoCodes(state: IdsState): void {
  const worksheet = JSON.stringify(engine.selectWorksheet(state));
  const shown = JSON.stringify([focusOf(state), locationOf(state)]);
  CODES.forEach((code) => {
    expect(worksheet).not.toContain(code);
    expect(shown).not.toContain(code);
  });
  const keys = [...Object.keys(engine.selectWorksheet(state).values), ...Object.keys(engine.selectWorksheet(state).toggles)];
  keys.forEach((k) => expect(k).toMatch(/^\d+\|\|\d+$|^\d+$/));
}

describe("IDS X-Series: entering user program mode (user manual §9)", () => {
  it("hold * enters code entry: READY and ARM alternate", () => {
    const state = press(createIdle(), "hold*");
    expect(focusOf(state).mode).toBe("userCode");
    expect(readLeds(state)).toMatchObject({ ready: "alternate", armed: "alternate", away: "off" });
    expectNoCodes(state);
  });

  it("the master code then * reaches the top: READY flashes, long beep", () => {
    const state = userTop();
    expect(focusOf(state)).toMatchObject({ mode: "userTop", beep: "long" });
    expect(readLeds(state)).toMatchObject({ ready: "flash", armed: "off", away: "off" });
    expectNoCodes(state);
  });

  it("a wrong master code gives the error beep and stays in code entry", () => {
    const state = press(createIdle(), "hold* 1 1 1 1 *");
    expect(focusOf(state)).toMatchObject({ mode: "userCode", beep: "error" });
    expect(locationOf(state).isError).toBe(true);
  });

  it("the master code being typed is masked in focus and location", () => {
    const state = press(createIdle(), "hold* 1 2 3");
    const shown = JSON.stringify([focusOf(state), locationOf(state)]);
    expect(shown).not.toContain("123");
    expect(focusOf(state).trail.at(-1)?.key).toBe("•••");
  });

  it("# at the top leaves user program mode", () => {
    expect(focusOf(press(userTop(), "#")).mode).toBe("idle");
  });
});

describe("IDS X-Series: Option 1, edit a user code (user manual §9)", () => {
  it("walks old code → new code with the manual's lights", () => {
    const option = press(userTop(), "1 *");
    expect(focusOf(option).mode).toBe("userOption");
    expect(readLeds(option)).toMatchObject({ ready: "flash", armed: "flash", away: "off" });
    const old = press(option, "1 2 3 4 *");
    expect(readLeds(old)).toMatchObject({ ready: "flash", away: "flash", armed: "on" });
    expectNoCodes(old);
    const changed = press(old, "4 3 2 1 *");
    expect(readLeds(changed)).toMatchObject({ ready: "flash", armed: "flash", away: "off" });
    expectNoCodes(changed);
    const idle = press(changed, "# #");
    expect(focusOf(idle).mode).toBe("idle");
    expect(focusOf(press(idle, "hold* 4 3 2 1 *")).mode).toBe("userTop");
    const wrong = press(idle, "hold* 1 2 3 4 *");
    expect(focusOf(wrong)).toMatchObject({ mode: "userCode", beep: "error" });
    expectNoCodes(wrong);
  });

  it("an old code that doesn't exist errors and keeps waiting for the old code", () => {
    const state = press(userTop(), "1 * 9 8 7 6 *");
    expect(focusOf(state)).toMatchObject({ mode: "userOption", beep: "error" });
    expect(readLeds(state)).toMatchObject({ ready: "flash", armed: "flash", away: "off" });
  });

  it("a new code that duplicates an existing code errors and keeps waiting for the new code", () => {
    const withTwo = press(userTop(), "0 * 5 5 5 5 * #");
    const state = press(withTwo, "1 * 1 2 3 4 * 5 5 5 5 *");
    expect(focusOf(state)).toMatchObject({ mode: "userOption", beep: "error" });
    expect(readLeds(state)).toMatchObject({ ready: "flash", away: "flash", armed: "on" });
    expectNoCodes(state);
  });

  it("a new code of the wrong length errors and keeps waiting for the new code", () => {
    const state = press(userTop(), "1 * 1 2 3 4 * 4 3 2 *");
    expect(focusOf(state)).toMatchObject({ mode: "userOption", beep: "error" });
    expect(readLeds(state)).toMatchObject({ ready: "flash", away: "flash", armed: "on" });
  });

  it("with 6-digit codes (location 23 = 6) a 4-digit new code errors", () => {
    const six = press(createIdle(), "# {installer} * 2 3 * 6 * #");
    const old = press(six, "hold* 1 2 3 4 5 6 * 1 * 1 2 3 4 5 6 *");
    expect(readLeds(old)).toMatchObject({ armed: "on" });
    const state = press(old, "4 3 2 1 *");
    expect(focusOf(state)).toMatchObject({ mode: "userOption", beep: "error" });
    const ok = press(old, "6 5 4 3 2 1 *");
    expect(focusOf(ok)).toMatchObject({ mode: "userOption", beep: "long" });
    expectNoCodes(ok);
  });
});

describe("IDS X-Series: Options 0, 2, 3, 4 (user manual §9)", () => {
  it("Option 0 adds a code to the first free slot", () => {
    const state = press(userTop(), "0 * 5 5 5 5 *");
    expect(readLeds(state)).toMatchObject({ ready: "flash", armed: "flash" });
    expectNoCodes(state);
    const back = press(state, "# #");
    expect(focusOf(press(back, "hold9 5 5 5 5 *")).mode).toBe("bypass"); // §5: any user code opens bypass
    expect(focusOf(press(back, "hold* 1 2 3 4 * 4 * 2 *")).beep).toBe("long"); // slot 2 holds it
  });

  it("an added code is not the master code: hold * with it gives the error beep (§9 MASTER USER CODE)", () => {
    const back = press(userTop(), "0 * 5 5 5 5 * # #");
    const state = press(back, "hold* 5 5 5 5 *");
    expect(focusOf(state)).toMatchObject({ mode: "userCode", beep: "error" });
    expectNoCodes(state);
  });

  it("Option 0 refuses a duplicate", () => {
    const state = press(userTop(), "0 * 1 2 3 4 *");
    expect(focusOf(state)).toMatchObject({ mode: "userOption", beep: "error" });
  });

  it("Option 2 deletes a code", () => {
    const added = press(userTop(), "0 * 5 5 5 5 * #");
    const deleted = press(added, "2 * 5 5 5 5 *");
    expect(focusOf(deleted)).toMatchObject({ mode: "userOption", beep: "long" });
    expectNoCodes(deleted);
    expect(focusOf(press(deleted, "# # hold9 5 5 5 5 *")).mode).toBe("bypassCode");
  });

  it("Option 2 on slot 1's code sets it back to 1234 (step 4)", () => {
    const changed = press(userTop(), "1 * 1 2 3 4 * 4 3 2 1 * #");
    const reset = press(changed, "2 * 4 3 2 1 * # #");
    expect(focusOf(press(reset, "hold* 1 2 3 4 *")).mode).toBe("userTop");
    expect(focusOf(press(reset, "hold* 4 3 2 1 *")).beep).toBe("error");
  });

  it("Option 2 with an unknown code errors", () => {
    expect(focusOf(press(userTop(), "2 * 9 9 9 9 *")).beep).toBe("error");
  });

  it("Option 3 sets a slot", () => {
    const slot = press(userTop(), "3 * 2 *");
    expect(readLeds(slot)).toMatchObject({ ready: "flash", away: "flash", armed: "on" });
    const state = press(slot, "6 6 6 6 *");
    expect(readLeds(state)).toMatchObject({ ready: "flash", armed: "flash", away: "off" });
    expectNoCodes(state);
    expect(focusOf(press(state, "# # hold9 6 6 6 6 *")).mode).toBe("bypass");
  });

  it("Option 3 with a slot outside 1-128 errors", () => {
    expect(focusOf(press(userTop(), "3 * 1 2 9 *")).beep).toBe("error");
  });

  it("Option 4 deletes a slot", () => {
    const set = press(userTop(), "3 * 2 * 6 6 6 6 * #");
    const deleted = press(set, "4 * 2 *");
    expect(focusOf(deleted)).toMatchObject({ mode: "userOption", beep: "long" });
    expectNoCodes(deleted);
    expect(focusOf(press(deleted, "# # hold9 6 6 6 6 *")).mode).toBe("bypassCode");
  });
});

describe("IDS X-Series: options not simulated", () => {
  it.each(["5", "6", "1 0", "4 0"])("option %s gives the error beep and says it isn't simulated", (option) => {
    const state = press(userTop(), `${option} *`);
    expect(focusOf(state)).toMatchObject({ mode: "userTop", beep: "error" });
    expect(locationOf(state).waitingFor).toContain("this option isn't simulated yet");
  });
});

describe("IDS X-Series: bypass (user manual §5, LED keypad)", () => {
  const bypass = () => press(createIdle(), "hold9 1 2 3 4 *");

  it("hold 9 waits for a user code: AWAY flashes", () => {
    const state = press(createIdle(), "hold9");
    expect(focusOf(state).mode).toBe("bypassCode");
    expect(readLeds(state)).toMatchObject({ away: "flash" });
  });

  it("a user code then * opens bypass: READY on, no zone lights", () => {
    const state = bypass();
    expect(focusOf(state).mode).toBe("bypass");
    expect(readLeds(state)).toMatchObject({ ready: "on" });
    expect(readLitZones(state)).toEqual([]);
    expectNoCodes(state);
  });

  it("any valid user code opens bypass, not only the master", () => {
    const added = press(userTop(), "0 * 5 5 5 5 * # #");
    expect(focusOf(press(added, "hold9 5 5 5 5 *")).mode).toBe("bypass");
  });

  it("a wrong code gives the error beep and keeps waiting", () => {
    const state = press(createIdle(), "hold9 9 8 7 6 *");
    expect(focusOf(state)).toMatchObject({ mode: "bypassCode", beep: "error" });
  });

  it("2 * toggles light 2, * pages, # exits", () => {
    const on = press(bypass(), "2 *");
    expect(readLitZones(on)).toEqual([2]);
    expect(readLitZones(press(on, "2 *"))).toEqual([]);
    expect(readVerified(on)).toBe(true);
    const page2 = press(on, "*");
    expect(focusOf(page2).mode).toBe("bypass");
    expect(readLitZones(page2)).toEqual([]);
    const idle = press(page2, "#");
    expect(focusOf(idle).mode).toBe("idle");
    expectNoCodes(idle);
    expect(engine.selectWorksheet(press(page2, "3 * #"))).toEqual({ values: {}, toggles: {} });
  });

  // Ruling: [ZONE NUMBER] [*] takes real zone numbers 1-64; the lights show the current page.
  it("1 9 * on page 1 bypasses zone 19; page 2 shows light 3, unverified", () => {
    const zone19 = press(bypass(), "1 9 *");
    expect(focusOf(zone19).beep).toBeNull();
    expect(readLitZones(zone19)).toEqual([]);
    expect(readVerified(zone19)).toBe(false); // the last zone toggled is not on this page
    const page2 = press(zone19, "*");
    expect(readLitZones(page2)).toEqual([3]);
    expect(readVerified(page2)).toBe(false);
    expect(readLeds(page2)).toEqual({ ready: "on", armed: "off", away: "off", power: "on" }); // no page markers
  });

  it("3 * on page 2 toggles zone 3, not zone 19", () => {
    const page2 = press(bypass(), "*");
    const state = press(page2, "3 *");
    expect(readLitZones(state)).toEqual([]);
    expect(readLitZones(press(state, "* * *"))).toEqual([3]); // back on page 1
  });

  it("zone 0 or 65 gives the error beep", () => {
    expect(focusOf(press(bypass(), "6 5 *")).beep).toBe("error");
    expect(focusOf(press(bypass(), "0 *")).beep).toBe("error");
  });

  it("* from page 4 wraps to page 1", () => {
    const state = press(bypass(), "2 * * * * *");
    expect(readLitZones(state)).toEqual([2]);
    expect(readVerified(state)).toBe(true);
  });
});

describe("IDS X-Series: hold keys only from idle", () => {
  const states: Array<[string, () => IdsState]> = [
    ["installerCode", () => press(createIdle(), "#")],
    ["programTop", () => press(createIdle(), "# {installer} *")],
    ["location", () => press(createIdle(), "# {installer} * 2 3 *")],
    ["userCode", () => press(createIdle(), "hold*")],
    ["userTop", userTop],
    ["userOption", () => press(userTop(), "1 *")],
    ["bypassCode", () => press(createIdle(), "hold9")],
    ["bypass", () => press(createIdle(), "hold9 1 2 3 4 *")],
  ];
  it.each(states)("%s: hold * and hold 9 return the state unchanged", (_name, make) => {
    const state = make();
    expect(engine.pressKey(state, "hold*", model)).toBe(state);
    expect(engine.pressKey(state, "hold9", model)).toBe(state);
  });
});

describe("IDS X-Series: code length and user codes (installer manual Location 23, Table 12)", () => {
  it("4 → 6: slot 1 still 1234 becomes 123456; other codes stay", () => {
    const added = press(userTop(), "0 * 5 5 5 5 * # #");
    const six = press(added, "# {installer} * 2 3 * 6 * #");
    expect(focusOf(press(six, "hold* 1 2 3 4 5 6 *")).mode).toBe("userTop");
    expect(focusOf(press(six, "hold9 5 5 5 5 *")).mode).toBe("bypass");
  });

  it("4 → 6: a changed slot 1 code stays as it is", () => {
    const changed = press(userTop(), "1 * 1 2 3 4 * 4 3 2 1 * # #");
    const six = press(changed, "# {installer} * 2 3 * 6 * #");
    expect(focusOf(press(six, "hold* 4 3 2 1 *")).mode).toBe("userTop");
  });

  it("6 → 4: every user code goes back to the default (only 1234 in slot 1)", () => {
    const six = press(createIdle(), "# {installer} * 2 3 * 6 * #");
    const added = press(six, "hold* 1 2 3 4 5 6 * 0 * 6 5 4 3 2 1 * # #");
    const four = press(added, "# 9 9 9 9 9 9 * 2 3 * 4 * #");
    expect(focusOf(press(four, "hold* 1 2 3 4 *")).mode).toBe("userTop");
    expect(focusOf(press(four, "hold9 6 5 4 3 *")).beep).toBe("error");
    expect(focusOf(press(four, "hold* 1 2 3 4 * 4 * 2 *")).beep).toBe("error"); // slot 2 is empty again
  });
});

describe("IDS X-Series: installer code prompt shows the current default", () => {
  it("says 9999 with 4-digit codes and 999999 with 6", () => {
    expect(locationOf(press(createIdle(), "#")).waitingFor).toContain("default 9999)");
    const six = press(createIdle(), "# {installer} * 2 3 * 6 * # #");
    expect(locationOf(six).waitingFor).toContain("default 999999)");
  });
});

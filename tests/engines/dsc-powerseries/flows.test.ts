import { describe, expect, it } from "vitest";
import { engine, freezeDeep, model, pressKeys, readLcd, textKeypad } from "./helpers";

const INSTALLER = "* 8 5 5 5 5";

describe("dsc-powerseries programming flows", () => {
  it("starts idle with the Ready light on", () => {
    const state = engine.createInitialState(model);
    expect(readLcd(state)).toEqual(["System is Ready", "Enter code  <>"]);
    expect(engine.selectLeds(state)).toEqual({ ready: "on", armed: "off", trouble: "off", ac: "on" });
  });

  it("[*][8][5555] → armed on, waitingFor mentions the 3-digit section", () => {
    const state = pressKeys(INSTALLER);
    expect(engine.selectLeds(state)).toMatchObject({ ready: "off", armed: "on" });
    expect(readLcd(state)).toEqual(["Enter Section", "      ___"]);
    const location = engine.selectLocation(state, model);
    expect(location.waitingFor).toContain("3-digit section number");
    expect(location.crumbs.map((c) => c.label)).toEqual(["Keypad", "Installer programming [*][8]"]);
    expect(location.isError).toBe(false);
  });

  it("the installer code prompt masks digits and accepts any 4-digit code, as the legacy simulator did", () => {
    expect(readLcd(pressKeys("* 8 1 2"))).toEqual(["Installer code", "Enter: **__"]);
    const state = pressKeys("* 8 9 8 7 6");
    expect(readLcd(state)).toEqual(["Enter Section", "      ___"]);
    expect(state.installerCode).toBe("9876");
  });

  it("[001] takes 16 two-digit entries then beeps out to Enter Section", () => {
    let state = pressKeys(`${INSTALLER} 0 0 1`);
    expect(readLcd(state)).toEqual(["Zone 1", "01"]);
    expect(engine.selectLocation(state, model).waitingFor).toContain("entry 1 of 16");
    for (let i = 1; i <= 15; i += 1) {
      state = pressKeys("0 3", state);
      expect(state.beep).toBe("double");
    }
    expect(readLcd(state)).toEqual(["Zone 16", "00"]);
    state = pressKeys("0 5", state);
    expect(state.beep).toBe("five");
    expect(readLcd(state)).toEqual(["Section complete", "5 beeps, exiting"]);
    expect(engine.selectLocation(state, model).isError).toBe(false);
    expect(engine.selectWorksheet(state).values["1||0"]).toBe("03");
    expect(engine.selectWorksheet(state).values["1||15"]).toBe("05");
    // The flash sits over Enter Section; the next key lands there.
    expect(state.mode).toBe("section");
    expect(readLcd(pressKeys("0", state))).toEqual(["Enter Section", "      0__"]);
  });

  it("[005] asks for a 2-digit sub-section; [02] gives Entry 1/Entry 2/Exit with defaults 030/045/120", () => {
    let state = pressKeys(`${INSTALLER} 0 0 5`);
    expect(readLcd(state)).toEqual(["[005] System tim", "Sub-section: __"]);
    expect(engine.selectLocation(state, model).waitingFor).toContain("2-digit sub-section");
    state = pressKeys("0 2", state);
    expect(state.subCode).toBe("02");
    expect(readLcd(state)).toEqual(["Entry Delay 1 (s", "030"]);
    state = pressKeys(">", state);
    expect(readLcd(state)).toEqual(["Entry Delay 2 (s", "045"]);
    state = pressKeys(">", state);
    expect(readLcd(state)).toEqual(["Exit Delay (seco", "120"]);
    const location = engine.selectLocation(state, model);
    expect(location.subCode).toBe("02");
    expect(location.crumbs.at(-1)).toEqual({ label: "Exit Delay (seconds)", target: null });
    // [#] from a sub-section's data goes back to the sub-section prompt, not Enter Section.
    state = pressKeys("#", state);
    expect(readLcd(state)[1]).toBe("Sub-section: __");
  });

  it("[201] pressing 2 toggles partition 2 on; # returns to Enter Section", () => {
    let state = pressKeys(`${INSTALLER} 2 0 1`);
    expect(readLcd(state)).toEqual(["[201] Opt 1-8", "   1-------"]);
    state = pressKeys("2", state);
    expect(readLcd(state)).toEqual(["[201] Opt 1-8", "   12------"]);
    expect(engine.selectWorksheet(state).toggles["201"]).toEqual([1, 2]);
    state = pressKeys("#", state);
    expect(readLcd(state)).toEqual(["Enter Section", "      ___"]);
  });

  it("[123] is zone 23's attributes, and [9] switches to options 9-16", () => {
    let state = pressKeys(`${INSTALLER} 1 2 3`);
    const location = engine.selectLocation(state, model);
    expect(location.sectionNum).toBe(123);
    expect(location.sectionSlug).toBe("s101");
    expect(location.crumbs.at(-1)?.label).toBe("[123] Zone attributes (Zone 23)");
    expect(readLcd(state)[0]).toBe("[123] Opt 1-8");
    state = pressKeys("9", state);
    expect(readLcd(state)[0]).toBe("[123] Opt 9-16");
    expect(engine.selectLeds(state).armed).toBe("on");
  });

  it('[211] location reads "Partition 2, zones 9-16"', () => {
    const state = pressKeys(`${INSTALLER} 2 1 1`);
    const location = engine.selectLocation(state, model);
    expect(location.crumbs.at(-1)).toEqual({ label: "[211] Partition zone assignment (Partition 2, zones 9-16)", target: "section:211" });
    expect(location.waitingFor).toContain("(Partition 2, zones 9-16)");
  });

  it("[301] phone accepts HEX via * 4 * and # ends early", () => {
    let state = pressKeys(`${INSTALLER} 3 0 1`);
    expect(readLcd(state)).toEqual(["[301] Phone no.", "_"]);
    state = pressKeys("5 5 5 *", state);
    expect(engine.selectLeds(state).ready).toBe("flash");
    expect(readLcd(state)).toEqual(["[301] Phone no. ", "555_"]);
    state = pressKeys("4 * 1", state);
    expect(readLcd(state)).toEqual(["[301] Phone no.", "555D1_"]);
    state = pressKeys("#", state);
    expect(readLcd(state)).toEqual(["Enter Section", "      ___"]);
    expect(engine.selectWorksheet(state).values["301||0"]).toBe("555D1");
    // Re-entering shows the saved number.
    expect(readLcd(pressKeys("3 0 1", state))).toEqual(["[301] Phone no.", "555D1_"]);
  });

  it("[999] asks for confirmation", () => {
    let state = pressKeys(`${INSTALLER} 9 9 9`);
    expect(readLcd(state)).toEqual(["[999] Enter code", "      ____"]);
    expect(engine.selectLocation(state, model).waitingFor).toContain("needs confirming");
    state = pressKeys("5 5 5 5", state);
    expect(readLcd(state)).toEqual(["[999] Re-enter s", "      ___"]);
    const done = pressKeys("9 9 9", state);
    expect(readLcd(done)).toEqual(["[999] done", "(simulated only)"]);
    expect(done.beep).toBe("five");
    const wrong = pressKeys("9 9 8", state);
    expect(readLcd(wrong)).toEqual(["Mismatch", "Nothing changed"]);
    expect(engine.selectLocation(wrong, model).isError).toBe(true);
  });

  it("[989] is invalid → Invalid Section flash", () => {
    let state = pressKeys(`${INSTALLER} 9 8 9`);
    expect(readLcd(state)).toEqual(["Invalid Section", "[989] not used"]);
    expect(state.beep).toBe("error");
    expect(engine.selectLocation(state, model).isError).toBe(true);
    state = pressKeys("0", state);
    expect(readLcd(state)).toEqual(["Enter Section", "      0__"]);
    expect(engine.selectLocation(state, model).isError).toBe(false);
  });

  it("[000] needs three # presses to reach idle", () => {
    let state = pressKeys(`${INSTALLER} 0 0 0 0`);
    expect(readLcd(state)).toEqual(["Partition (0-8) ", "11"]);
    state = pressKeys("#", state);
    expect(readLcd(state)[1]).toBe("Sub-section: _");
    state = pressKeys("#", state);
    expect(readLcd(state)).toEqual(["Enter Section", "      ___"]);
    state = pressKeys("#", state);
    expect(readLcd(state)).toEqual(["Exited installer", "programming"]);
    expect(state.mode).toBe("ready");
    expect(engine.selectLocation(state, model).crumbs).toEqual([{ label: "Keypad", target: "ready" }]);
  });

  it("HEX mode rejects digits with no HEX letter", () => {
    const state = pressKeys(`${INSTALLER} 0 0 1 * 9`);
    expect(state.beep).toBe("error");
    expect(engine.selectLocation(state, model).isError).toBe(false);
    expect(readLcd(state)).toEqual(["Zone 1", "01  HEX"]);
  });

  it("pressKey does not mutate its input", () => {
    const state = freezeDeep(pressKeys(`${INSTALLER} 2 0 1`));
    const before = JSON.stringify(state);
    const next = engine.pressKey(state, "2", model);
    expect(JSON.stringify(state)).toBe(before);
    expect(next).not.toBe(state);
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  });

  it("starts from a saved worksheet and hands it back", () => {
    const worksheet = { values: { "1||0": "05" }, toggles: { "201": [1, 3] } };
    const state = engine.createInitialState(model, worksheet);
    expect(engine.selectWorksheet(state)).toEqual(worksheet);
    expect(readLcd(pressKeys(`${INSTALLER} 0 0 1`, state))).toEqual(["Zone 1", "05"]);
    expect(readLcd(pressKeys(`${INSTALLER} 2 0 1`, state))[1]).toBe("   1-3-----");
  });

  it("[701] option 5 switches codes to 6 digits", () => {
    const state = pressKeys(`${INSTALLER} 7 0 1 5 # #`);
    expect(readLcd(pressKeys("* 8 1 2", state))[1]).toBe("Enter: **____");
  });

  it("LED and icon keypads get an unverified all-off placeholder until Task 9", () => {
    const state = pressKeys(INSTALLER);
    const pk5508 = model.keypads.find((k) => k.slug === "pk5508")!;
    const lights = engine.selectDisplay(state, model, pk5508);
    expect(lights).toEqual({ type: "lights", count: 8, lights: { 1: "off", 2: "off", 3: "off", 4: "off", 5: "off", 6: "off", 7: "off", 8: "off" }, verified: false });
    const icons = engine.selectDisplay(state, model, { ...textKeypad, displayType: "icons" });
    expect(icons).toEqual({ type: "icons", on: [], verified: false });
  });
});

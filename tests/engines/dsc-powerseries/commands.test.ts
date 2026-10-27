import { describe, expect, it } from "vitest";
import { engine, model, pressKeys, readLcd } from "./helpers";

// One test per [*] command that app.js simulates.
describe("dsc-powerseries user-mode commands", () => {
  it("[*] opens the command menu and [#] backs out", () => {
    const state = pressKeys("*");
    expect(readLcd(state)).toEqual(["Press (*) for <>", "Select 1-9 or 0"]);
    expect(engine.selectLocation(state, model).crumbs).toEqual([
      { label: "Keypad", target: "ready" },
      { label: "[*] Commands", target: "star" },
    ]);
    expect(readLcd(pressKeys("#", state))).toEqual(["System is Ready", "Enter code  <>"]);
  });

  it("a digit while idle hints at [*]", () => {
    expect(readLcd(pressKeys("1"))).toEqual(["Code entry arms/", "disarms. Try [*]"]);
  });

  it("[*][1] bypasses and unbypasses zones, 00 clears", () => {
    let state = pressKeys("* 1");
    expect(readLcd(state)).toEqual(["Zone bypass", "Zone: __"]);
    state = pressKeys("0 5", state);
    expect(readLcd(state)).toEqual(["Zone bypass", "Zone 05 bypassed"]);
    expect(engine.selectLocation(state, model).waitingFor).toContain("Bypassed now: 5.");
    state = pressKeys("1 2 0 5", state);
    expect(readLcd(state)[1]).toBe("Zone 05 active");
    state = pressKeys("0 0", state);
    expect(readLcd(state)[1]).toBe("All cleared");
    expect(state.bypassed).toEqual([]);
    expect(readLcd(pressKeys("7 7", state))[1]).toBe("Invalid zone");
    expect(engine.selectLocation(state, model).crumbs.at(-1)).toEqual({ label: "[*][1] Bypass zones", target: "node:k1" });
  });

  it("[*][2] shows the trouble for the number pressed", () => {
    expect(readLcd(pressKeys("* 2"))).toEqual(["View trouble", "Press 1-8, #"]);
    expect(readLcd(pressKeys("* 2 2"))).toEqual(["View trouble", "AC failure"]);
  });

  it("[*][3] alarm memory", () => {
    expect(readLcd(pressKeys("* 3"))).toEqual(["Alarm memory", "No alarms"]);
  });

  it("[*][4] door chime", () => {
    expect(readLcd(pressKeys("* 4"))).toEqual(["Door chime on/of", "Chime toggled"]);
  });

  it("[*][5][master][05][code] saves a user code, [*] deletes it", () => {
    let state = pressKeys("* 5");
    expect(readLcd(state)).toEqual(["Master code", "Enter: ____"]);
    state = pressKeys("1 2 3 4", state);
    expect(readLcd(state)).toEqual(["User codes", "User no.: __"]);
    state = pressKeys("0 5", state);
    expect(readLcd(state)).toEqual(["User 05", "New: ____"]);
    const saved = pressKeys("1 1 1 1", state);
    expect(readLcd(saved)).toEqual(["User 05 saved", "User no.: __"]);
    expect(saved.beep).toBe("double");
    expect(readLcd(pressKeys("*", state))).toEqual(["User 05 deleted", "User no.: __"]);
    expect(readLcd(pressKeys("* 5 1 2 3 4 9 6"))).toEqual(["Invalid user", "Use 01-95"]);
  });

  it("[*][5][master][98][user] flips partitions for that user", () => {
    let state = pressKeys("* 5 1 2 3 4 9 8");
    expect(readLcd(state)).toEqual(["Partitions for", "User: __"]);
    state = pressKeys("0 3", state);
    expect(readLcd(state)).toEqual(["User 03 parts", "   1-------"]);
    state = pressKeys("2", state);
    expect(readLcd(state)).toEqual(["User 03 parts", "   12------"]);
    expect(engine.selectWorksheet(state).toggles["part-03"]).toEqual([1, 2]);
    state = pressKeys("#", state);
    expect(readLcd(state)).toEqual(["User codes", "User no.: __"]);
  });

  it("[*][5][master][99][user] flips attributes for that user", () => {
    const state = pressKeys("* 5 1 2 3 4 9 9 0 7 3");
    expect(readLcd(state)).toEqual(["User 07 attrib", "   --3-----"]);
  });

  it("[*][6][master] user functions", () => {
    const state = pressKeys("* 6 1 2 3 4 1");
    expect(readLcd(state)).toEqual(["User functions", "Time and date"]);
    expect(engine.selectLocation(state, model).crumbs.at(-1)?.target).toBe("node:k6");
  });

  it("[*][7] command outputs", () => {
    expect(readLcd(pressKeys("* 7"))).toEqual(["Command output", "Press 1-4"]);
    expect(readLcd(pressKeys("* 7 2"))).toEqual(["Command outputs", "Output 2 active"]);
  });

  it("[*][9][user] no-entry arming lights Armed", () => {
    const state = pressKeys("* 9 1 2 3 4");
    expect(readLcd(state)).toEqual(["No-entry arming", "Armed, no entry"]);
    expect(engine.selectLeds(state).armed).toBe("flash"); // install guide p.7
    expect(readLcd(pressKeys("#", state))).toEqual(["System is Ready", "Enter code  <>"]);
  });

  it("[*][0] quick arm", () => {
    expect(readLcd(pressKeys("* 0"))).toEqual(["Quick arm / quic", "Quick arm/exit"]);
  });
});

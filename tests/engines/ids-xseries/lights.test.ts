import { describe, expect, it } from "vitest";
import { encodeBcd } from "@/lib/engines/ids-xseries/selectors";
import { createIdle, engine, keypad, model, press, readLeds, readLitZones, readVerified } from "./helpers";

const programTop = () => press(createIdle(), "# {installer} *");

describe("encodeBcd (installer manual §6, Table 1)", () => {
  it("lights 1-4 are units, 5-8 tens, 9-12 hundreds, 13-16 thousands", () => {
    expect(encodeBcd("")).toEqual([]);
    expect(encodeBcd("0")).toEqual([]);
    expect(encodeBcd("4")).toEqual([3]);
    expect(encodeBcd("15")).toEqual([1, 3, 5]); // the manual's example
    expect(encodeBcd("04")).toEqual([3]);
    expect(encodeBcd("9999")).toEqual([1, 4, 5, 8, 9, 12, 13, 16]);
  });

  it("hex digits A-F count 10-15 (Table 3)", () => {
    expect(encodeBcd("D")).toEqual([1, 3, 4]);
  });
});

describe("IDS X-Series status and zone lights", () => {
  it("idle: READY on, ARMED and AWAY off, POWER on, zone lights off (§8 standby mode)", () => {
    const state = createIdle();
    expect(readLeds(state)).toEqual({ ready: "on", armed: "off", away: "off", power: "on" });
    expect(readLitZones(state)).toEqual([]);
    expect(engine.selectDisplay(state, model, keypad)).toMatchObject({ type: "lights", count: 16, verified: true });
  });

  it("program mode: READY flashes, ARMED and AWAY off (§8 Entering Program Mode)", () => {
    const state = programTop();
    expect(readLeds(state)).toEqual({ ready: "flash", armed: "off", away: "off", power: "on" });
    expect(readVerified(state)).toBe(true);
  });

  it("standard location: READY on, AWAY flashes, the value in BCD (§8 Programming Standard Locations, Table 1)", () => {
    const state = press(programTop(), "2 3 *");
    expect(readLeds(state)).toEqual({ ready: "on", armed: "off", away: "flash", power: "on" });
    expect(readLitZones(state)).toEqual([3]);
    expect(readVerified(state)).toBe(true);
  });

  it("standard location while typing: the typed digits, unverified (§8 does not describe it)", () => {
    const state = press(programTop(), "2 3 * 6");
    expect(readLitZones(state)).toEqual([2, 3]);
    expect(readVerified(state)).toBe(false);
  });

  it("after saving: READY flashes and AWAY is off again (§8 Programming Standard Locations)", () => {
    expect(readLeds(press(programTop(), "2 3 * 6 *"))).toEqual({ ready: "flash", armed: "off", away: "off", power: "on" });
  });

  it("zone list: READY on, ARMED and AWAY flash, zone 9 shows 00 (§8 Extended Locations, Table 6)", () => {
    const state = press(programTop(), "2 *");
    expect(readLeds(state)).toEqual({ ready: "on", armed: "flash", away: "flash", power: "on" });
    expect(readLitZones(state)).toEqual([]);
    expect(readVerified(state)).toBe(false);
  });

  it("zone list on location 1 shows zone 1's default type 01 (§8 Extended Locations, Table 7)", () => {
    expect(readLitZones(press(programTop(), "1 *"))).toEqual([1]);
    expect(readLitZones(press(programTop(), "1 * * *"))).toEqual([3]);
  });

  it("zone properties: READY on, AWAY flashes, light 6 on (§8 Programming a Bitmapped Location, Table 23)", () => {
    const state = press(programTop(), "1 0 9 *");
    expect(readLeds(state)).toEqual({ ready: "on", armed: "off", away: "flash", power: "on" });
    expect(readLitZones(state)).toEqual([6]);
    expect(readVerified(state)).toBe(true);
  });

  it("zone properties: 5 * switches light 5 on (§8 Programming a Bitmapped Location)", () => {
    expect(readLitZones(press(programTop(), "1 0 9 * 5 *"))).toEqual([5, 6]);
    expect(readLitZones(press(programTop(), "1 0 9 * 6 *"))).toEqual([]);
  });

  it("zone properties: * alone stays on the only page (§7 bitmapped [*] scrolls pages)", () => {
    expect(readLitZones(press(programTop(), "1 0 9 * *"))).toEqual([6]);
  });

  it("partition 1 page 1: READY marker on, the rest off, no zones, unverified (§9 Locations 201-208, Table 26)", () => {
    const state = press(programTop(), "2 0 1 *");
    expect(readLeds(state)).toEqual({ ready: "on", armed: "off", away: "off", power: "off" });
    expect(readLitZones(state)).toEqual([]);
    expect(readVerified(state)).toBe(false);
  });

  it("partition 1: 9 * turns light 9 on (§9 Locations 201-208)", () => {
    expect(readLitZones(press(programTop(), "2 0 1 * 9 *"))).toEqual([9]);
  });

  it("partition 1 page 2: ARMED marker, 1 * shows zone 17 on light 1 (Table 26)", () => {
    const page2 = press(programTop(), "2 0 1 * 9 * *");
    expect(readLeds(page2)).toEqual({ ready: "off", armed: "on", away: "off", power: "off" });
    expect(readLitZones(page2)).toEqual([]);
    expect(readLitZones(press(page2, "1 *"))).toEqual([1]);
  });

  it("partition pages 3 and 4 use AWAY and POWER, then wrap to READY (Table 26)", () => {
    const page3 = press(programTop(), "2 0 1 * * *");
    expect(readLeds(page3)).toEqual({ ready: "off", armed: "off", away: "on", power: "off" });
    const page4 = press(page3, "*");
    expect(readLeds(page4)).toEqual({ ready: "off", armed: "off", away: "off", power: "on" });
    expect(readLeds(press(page4, "*")).ready).toBe("on");
  });

  it("an error beep is a beep, not a light change (§7 error beep)", () => {
    const state = press(programTop(), "9 9 9 *");
    expect(engine.selectFocus!(state, model).beep).toBe("error");
    expect(readLeds(state)).toEqual({ ready: "flash", armed: "off", away: "off", power: "on" });
  });
});

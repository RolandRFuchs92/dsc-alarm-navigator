import { describe, expect, it } from "vitest";
import type { KeypadModelDef } from "@/lib/content/types";
import type { Display } from "@/lib/engines/types";
import { BINARY_DIGIT_LIGHTS } from "@/lib/engines/dsc-powerseries/selectors";
import type { DscState } from "@/lib/engines/dsc-powerseries/state";
import { engine, model, pressKeys } from "./helpers";

const pk5508 = model.keypads.find((k) => k.slug === "pk5508")!;
const pk5516 = model.keypads.find((k) => k.slug === "pk5516")!;

function readLights(state: DscState, keypad: KeypadModelDef = pk5508): Extract<Display, { type: "lights" }> {
  const display = engine.selectDisplay(state, model, keypad);
  if (display.type !== "lights") throw new Error("expected a lights display");
  return display;
}

function listOn(display: Extract<Display, { type: "lights" }>): number[] {
  const result = Object.entries(display.lights).filter(([, v]) => v === "on").map(([n]) => Number(n));
  return result;
}

describe("LED keypad display", () => {
  it("toggle section 201 with partitions 1 and 2 on lights zones 1 and 2", () => {
    const base = engine.createInitialState(model, { values: {}, toggles: { "201": [1, 2] } });
    const state = pressKeys("* 8 5 5 5 5 2 0 1", base);
    const display = readLights(state);
    expect(listOn(display)).toEqual([1, 2]);
    expect(display.verified).toBe(true);
  });

  it("toggle page 2 is unverified", () => {
    const state = pressKeys("* 8 5 5 5 5 1 0 1 9", engine.createInitialState(model));
    expect(state.page).toBe(2);
    const display = readLights(state);
    expect(listOn(display)).toEqual([]);
    expect(display.verified).toBe(false);
  });

  it("data section shows the current digit using BINARY_DIGIT_LIGHTS", () => {
    const state = pressKeys("* 8 5 5 5 5 0 0 1 3", engine.createInitialState(model));
    expect(state.mode).toBe("data");
    expect(listOn(readLights(state))).toEqual(BINARY_DIGIT_LIGHTS["3"]);
    expect(listOn(readLights(state))).toEqual([1, 2]);
    expect(readLights(state).verified).toBe(false); // typed buffer: §3.3.4 does not describe echo
    const hex = pressKeys("* 8 5 5 5 5 0 0 1 * 1", engine.createInitialState(model));
    expect(hex.buffer).toBe("A");
    const display = readLights(hex);
    expect(listOn(display)).toEqual([2, 4]);
    expect(display.verified).toBe(false);
  });

  it("data section with no typed digit shows the default value's first digit", () => {
    const state = pressKeys("* 8 5 5 5 5 0 2 0", engine.createInitialState(model));
    expect(state.mode).toBe("data");
    const display = readLights(state); // [020] keypad slot 1 defaults to "00" -> digit 0
    expect(listOn(display)).toEqual([]);
    expect(display.verified).toBe(true);
    const saved = pressKeys("5", state); // buffer "5" -> lights 1 and 3
    expect(listOn(readLights(saved))).toEqual([1, 3]);
    expect(readLights(saved).verified).toBe(false);
  });

  it("half-typed section number is unverified and all lights off", () => {
    const state = pressKeys("* 8 5 5 5 5 0 0", engine.createInitialState(model));
    expect(state.mode).toBe("section");
    const display = readLights(state);
    expect(listOn(display)).toEqual([]);
    expect(display.verified).toBe(false);
  });

  it("16-light keypad reports count 16", () => {
    const display = readLights(engine.createInitialState(model), pk5516);
    expect(display.count).toBe(16);
    expect(Object.keys(display.lights)).toHaveLength(16);
  });

  it("throws when a lights keypad has no lightCount", () => {
    expect(() => readLights(engine.createInitialState(model), { ...pk5508, lightCount: null })).toThrow(/lightCount/);
  });
});

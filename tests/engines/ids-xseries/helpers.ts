import { getPanelModel } from "@/lib/content/repo";
import { getEngine } from "@/lib/engines";
import { parseKeys } from "@/lib/guides/keys";
import type { Key, LedState, PanelEngine } from "@/lib/engines/types";
import type { IdsState } from "@/lib/engines/ids-xseries/state";
import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";

export const model: PanelModelData = (await getPanelModel("x64"))!;
export const keypad: KeypadModelDef = model.keypads[0];
export const engine = getEngine("ids-xseries") as PanelEngine<IdsState>;

// Freeze every nested object so any mutation inside pressKey throws.
export function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((v) => freezeDeep(v));
    Object.freeze(value);
  }
  const result = value;
  return result;
}

export function createIdle(): IdsState {
  const result = freezeDeep(engine.createInitialState(model));
  return result;
}

// Press guide-style keys ("# {installer} * 2 3 *") from a state; every intermediate state is deep-frozen first.
export function press(state: IdsState, text: string): IdsState {
  let next = state;
  parseKeys(text, model).forEach((key: Key) => {
    next = engine.pressKey(freezeDeep(next), key, model);
  });
  const result = freezeDeep(next);
  return result;
}

// The zone light numbers that are on.
export function readLitZones(state: IdsState): number[] {
  const display = engine.selectDisplay(state, model, keypad);
  if (display.type !== "lights") throw new Error("expected a lights display");
  const result = Object.entries(display.lights).filter(([, s]) => s === "on").map(([n]) => Number(n));
  return result;
}

export function readVerified(state: IdsState): boolean {
  const display = engine.selectDisplay(state, model, keypad);
  if (display.type !== "lights") throw new Error("expected a lights display");
  const result = display.verified;
  return result;
}

export function readLeds(state: IdsState): Record<string, LedState> {
  const result = engine.selectLeds(state);
  return result;
}

import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";

// The contract every panel-family engine implements. Engines are pure: no DOM, no storage.
export type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "*" | "#" | "<" | ">";
export type Worksheet = { values: Record<string, string>; toggles: Record<string, number[]> };
export type LedState = "on" | "off" | "flash";
export type Leds = { ready: LedState; armed: LedState; trouble: LedState; ac: LedState };
export type Display =
  | { type: "text"; lines: [string, string] }
  | { type: "lights"; count: number; lights: Record<number, LedState>; verified: boolean }
  | { type: "icons"; on: string[]; verified: boolean };
export type Location = {
  crumbs: Array<{ label: string; target: string | null }>;
  waitingFor: string;
  sectionNum: number | null;
  sectionSlug: string | null;
  subCode: string | null;
  isError: boolean;
};

export interface PanelEngine<S> {
  createInitialState(model: PanelModelData, worksheet?: Worksheet): S;
  pressKey(state: S, key: Key, model: PanelModelData): S; // pure; never mutates `state`
  selectDisplay(state: S, model: PanelModelData, keypad: KeypadModelDef): Display;
  selectLeds(state: S): Leds;
  selectLocation(state: S, model: PanelModelData): Location;
  selectWorksheet(state: S): Worksheet;
}

import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";

// The contract every panel-family engine implements. Engines are pure: no DOM, no storage.
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type DscKey = Digit | "*" | "#" | "<" | ">";
export type IdsKey = Digit | "*" | "#" | "mode" | "f" | "m" | "p" | "hold*" | "hold9";
export type Key = DscKey | IdsKey;
export type Worksheet = { values: Record<string, string>; toggles: Record<string, number[]> };
export type LedState = "on" | "off" | "flash" | "alternate"; // alternate: flashing out of phase with other flashing lights
export type Leds = Record<string, LedState>; // each engine names the lights its keypads have
export type Display =
  | { type: "text"; lines: [string, string] }
  | { type: "lights"; count: number; lights: Record<number, LedState>; verified: boolean }
  | { type: "icons"; on: string[]; verified: boolean };
export type Location = {
  crumbs: Array<{ label: string; target: string | null }>;
  waitingFor: string;
  waitingParts?: Array<{ text: string; strong: boolean }>; // waitingFor split where the legacy app bolded it
  sectionNum: number | null;
  sectionSlug: string | null;
  subCode: string | null;
  isError: boolean;
};

// What the map UI needs beyond the display: the tree node to highlight and the key chips.
export type Focus = {
  nodeId: string | null; // section slug or command slug the keypad is on
  mode: string; // engine-specific mode name, e.g. "data" or "toggle"
  entryIndex: number | null; // entry being typed, only while typing data
  buffer: string; // digits typed but not saved yet
  trail: Array<{ key: string; label: string }>; // keys pressed to get here, pending digits last
  isInstallerTop: boolean; // at "Enter Section" or typing the installer code
  beep: string | null; // set on the state right after a beep, for the LCD flash
};

export interface PanelEngine<S> {
  keys: readonly Key[]; // the keys this panel family's keypads have
  createInitialState(model: PanelModelData, worksheet?: Worksheet): S;
  pressKey(state: S, key: Key, model: PanelModelData): S; // pure; never mutates `state`
  selectDisplay(state: S, model: PanelModelData, keypad: KeypadModelDef): Display;
  selectLeds(state: S): Leds;
  selectLocation(state: S, model: PanelModelData): Location;
  selectWorksheet(state: S): Worksheet;

  // Optional: map-page navigation without key presses (tree clicks, links, crumbs).
  selectFocus?(state: S, model: PanelModelData): Focus;
  navigateToNode?(state: S, model: PanelModelData, id: string, num?: number): S;
  navigateToSection?(state: S, model: PanelModelData, num: number, subCode?: string | null): S;
  navigateToSub?(state: S, model: PanelModelData, code: string): S;
  navigateToEntry?(state: S, index: number): S;
  applyLookupValue?(state: S, model: PanelModelData, code: string): S;
  flipOption?(state: S, model: PanelModelData, n: number): S;
  followCrumb?(state: S, model: PanelModelData, target: string): S;
  resetKeypad?(state: S): S;
  clearWorksheet?(state: S): S;
}

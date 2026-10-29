/* IDS X-Series simulator state plus the lookups every part of the engine shares.
   Behaviour follows the X-Series Installer Manual 700-398-02O §7-9; the state is plain JSON so it can be
   compared, frozen and serialised. */
import { findSection } from "@/lib/content/find-section";
import { resolveRangeSection } from "@/lib/content/rules";
import type { EntryDef, OptionDef, PanelModelData, SectionDef } from "@/lib/content/types";
import type { Worksheet } from "../types";

// userCode … userOption: user program mode (hold *, user manual §9); bypassCode, bypass: hold 9 (user manual §5).
export type Mode =
  | "idle" | "installerCode" | "programTop" | "location" | "zoneList" | "bitmap"
  | "userCode" | "userTop" | "userOption" | "bypassCode" | "bypass";
export type Beep = "error" | "long";
export type PathChip = { key: string; label: string };

export type IdsState = {
  mode: Mode;
  nodeId: string | null; // slug of the open section
  location: number | null;
  entryIndex: number; // zone within a zone list; 0 in a standard location
  page: number; // bitmap page, 1-based
  pageCount: number; // bitmap pages of 16 lights; kept here so selectLeds can mark the page without the model
  buffer: string;
  hexNext: boolean; // [MODE] pressed: the next digit 0-5 types A-F (Table 3)
  path: PathChip[];
  beep: Beep | null;
  values: Record<string, string>;
  toggles: Record<string, number[]>;
  // User codes by slot (1-128), in memory only: never read from or written to a worksheet (ruling).
  codes: Record<number, string>;
  bypassed: number[]; // bypassed zones (user manual §5); not in the worksheet either
  userOption: number | null; // the user program option open in userOption mode
  userSlot: number | null; // Option 1's old code slot or Option 3's slot, once accepted (second step)
  unsimulatedOption: number | null; // the option just refused because it isn't simulated
};

export const LIGHTS_PER_PAGE = 16;
// Table 3: [MODE] then [0]-[5] types A-F.
export const HEX_DIGITS: Record<string, string> = { 0: "A", 1: "B", 2: "C", 3: "D", 4: "E", 5: "F" };

/* ---------- state ---------- */

export function createInitialState(model: PanelModelData, worksheet?: Worksheet): IdsState {
  const toggles: Record<string, number[]> = {};
  Object.entries(worksheet?.toggles ?? {}).forEach(([k, list]) => { toggles[k] = [...list]; });
  const result: IdsState = {
    mode: "idle",
    nodeId: null,
    location: null,
    entryIndex: 0,
    page: 1,
    pageCount: 1,
    buffer: "",
    hexNext: false,
    path: [],
    beep: null,
    values: { ...(worksheet?.values ?? {}) },
    toggles,
    codes: {},
    bypassed: [],
    userOption: null,
    userSlot: null,
    unsimulatedOption: null,
  };
  // Never seeded from the worksheet; slot 1 starts as the master code default for the code length.
  result.codes = { 1: readMasterDefault(model, readCodeLength(result)) };
  return result;
}

export function resetToIdle(state: IdsState): IdsState {
  const result: IdsState = {
    ...state, mode: "idle", nodeId: null, location: null, entryIndex: 0, page: 1, pageCount: 1, buffer: "", hexNext: false, path: [],
    userOption: null, userSlot: null,
  };
  return result;
}

export function buildProgramPath(state: IdsState, model: PanelModelData): PathChip[] {
  const result: PathChip[] = [
    { key: "#", label: "" },
    { key: readInstallerCode(state, model), label: "Installer code" },
    { key: "*", label: "Program mode" },
  ];
  return result;
}

// The top of program mode: READY flashing, waiting for a location number (§8).
export function openProgramTop(state: IdsState, model: PanelModelData): IdsState {
  const result: IdsState = {
    ...state, mode: "programTop", nodeId: null, location: null, entryIndex: 0, page: 1, pageCount: 1, buffer: "", hexNext: false,
    path: buildProgramPath(state, model),
  };
  return result;
}

/* ---------- lookups ---------- */

export { findSection };

export function readSection(state: IdsState, model: PanelModelData): SectionDef | null {
  const result = state.location === null ? null : findSection(model, state.location);
  return result;
}

export function readEntries(section: SectionDef, num: number): EntryDef[] {
  const result = section.range && section.rule ? resolveRangeSection(section, num).entries : (section.entries ?? []);
  return result;
}

export function readOptions(section: SectionDef, num: number): OptionDef[] {
  const result = section.range && section.rule ? resolveRangeSection(section, num).options : (section.options ?? []);
  return result;
}

export function describeInstance(section: SectionDef, num: number): string {
  const result = section.range && section.rule ? resolveRangeSection(section, num).describe : "";
  return result;
}

// The location 197 value once programmed, else the model default (9999).
export function readInstallerCode(state: IdsState, model: PanelModelData): string {
  const result = state.values[readValueKey(197, 0)] || model.installerCodeDefault;
  return result;
}

// Location 23 (Table 12): 4 or 6 digit codes.
export function readCodeLength(state: IdsState): number {
  const result = state.values[readValueKey(23, 0)] === "6" ? 6 : 4;
  return result;
}

// Table 12: the installer code default for each code length. The manual only gives the defaults; ruling: changing
// location 23 resets the installer code to the default for the new length.
export const INSTALLER_CODE_DEFAULTS: Record<number, string> = { 4: "9999", 6: "999999" };

// User manual §8 and Table 12: master code 1 defaults to 1234, or 123456 with 6-digit codes.
const MASTER_CODE_SIX_DIGIT_DEFAULT = "123456";

export function readMasterDefault(model: PanelModelData, length: number): string {
  const result = length === 6 ? MASTER_CODE_SIX_DIGIT_DEFAULT : model.masterCodeDefault;
  return result;
}

// Digits a standard location takes. Location 197 (installer code) follows the location 23 code length.
export function readEntryDigits(state: IdsState, num: number, entry: EntryDef): number {
  const result = num === 197 ? readCodeLength(state) : entry.digits;
  return result;
}

/* ---------- worksheet ---------- */

// Same shape as the DSC worksheet keys: "<loc>|<sub>|<index>", with no sub-locations here.
export function readValueKey(num: number, index: number): string {
  const result = `${num}||${index}`;
  return result;
}

// The saved value of an entry, else its default.
export function readValue(state: IdsState, num: number, index: number, entry: EntryDef | undefined): string {
  const result = state.values[readValueKey(num, index)] ?? entry?.def ?? "";
  return result;
}

// Saved toggles for a location, or its factory defaults when it has never been changed.
export function readToggleSet(state: IdsState, section: SectionDef, num: number): number[] {
  const saved = state.toggles[String(num)];
  const result = saved ?? readOptions(section, num).filter((o) => o.def).map((o) => o.n);
  return result;
}

export function flipNumber(list: number[], n: number): number[] {
  const result = list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b);
  return result;
}

export function readWorksheet(state: IdsState): Worksheet {
  const result: Worksheet = { values: state.values, toggles: state.toggles };
  return result;
}

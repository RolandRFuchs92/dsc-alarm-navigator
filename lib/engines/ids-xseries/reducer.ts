/* Key handling for the X-Series LED keypad: idle, installer code entry and installer programming
   (Installer Manual 700-398-02O §7-9). Every function takes a state and returns a new one; nothing is mutated. */
import type { PanelModelData } from "@/lib/content/types";
import type { Key } from "../types";
import {
  HEX_DIGITS,
  INSTALLER_CODE_DEFAULTS,
  LIGHTS_PER_PAGE,
  findSection,
  flipNumber,
  openProgramTop,
  readCodeLength,
  readEntries,
  readEntryDigits,
  readInstallerCode,
  readMasterDefault,
  readOptions,
  readSection,
  readToggleSet,
  readValueKey,
  resetToIdle,
} from "./state";
import type { IdsState, Mode } from "./state";
import { USER_HANDLERS, applyHoldKey } from "./user-mode";

type Handler = (state: IdsState, key: Key, model: PanelModelData) => IdsState;

const isDigit = (key: Key): boolean => /^\d$/.test(key);

// Keys with no programming meaning. F, M and P are panic keys and < > are DSC keys. They leave the state exactly as it was.
const IGNORED_KEYS = new Set<string>(["<", ">", "f", "m", "p"]);
const HOLD_KEYS = new Set<string>(["hold*", "hold9"]);
// Location numbers are typed as up to 3 digits (locations 0-999 in the §9 summary).
const LOCATION_DIGITS = 3;
// Ruling on zone type 09: the valid-range line under Table 7 says 00-05, 08, 10-15 and Table 5 adds 09 (new).
const ZONE_TYPES = new Set(["00", "01", "02", "03", "04", "05", "08", "09", "10", "11", "12", "13", "14", "15"]);
// Location 23 (Table 12): code length is 4 or 6.
const VALID_VALUES: Record<number, string[]> = { 23: ["4", "6"] };
// A zone list holds 8 zones per location (Location 1-8, star-advance method).
const ZONES_PER_LOCATION = 8;

const beepError = (state: IdsState): IdsState => ({ ...state, beep: "error", hexNext: false });

/* ---------- transitions ---------- */

// [LOCATION NUMBER] [*] (§8): a data range of 8 entries is a zone list, other data a standard location, toggles a bitmap.
export function enterLocation(state: IdsState, model: PanelModelData, num: number): IdsState {
  const section = findSection(model, num);
  if (!section || (section.kind !== "data" && section.kind !== "toggle")) return { ...beepError(state), buffer: "" };
  const entries = section.kind === "data" ? readEntries(section, num) : [];
  const mode: Mode = section.kind === "toggle" ? "bitmap" : section.range && entries.length === ZONES_PER_LOCATION ? "zoneList" : "location";
  const optionCount = section.kind === "toggle" ? readOptions(section, num).length : 0;
  const result: IdsState = {
    ...state, mode, nodeId: section.slug, location: num, entryIndex: 0, page: 1, buffer: "", hexNext: false,
    pageCount: Math.max(1, Math.ceil(optionCount / LIGHTS_PER_PAGE)),
    path: [...state.path, { key: String(num), label: section.label }, { key: "*", label: "" }],
  };
  return result;
}

// One digit into the buffer: [MODE] first makes 0-5 type A-F (Table 3); a digit past `max` is an error beep.
function typeDigit(state: IdsState, key: Key, max: number): IdsState {
  if (state.buffer.length >= max) return beepError(state);
  const digit = state.hexNext ? HEX_DIGITS[key] : key;
  if (!digit) return beepError(state);
  const result: IdsState = { ...state, buffer: state.buffer + digit, hexNext: false };
  return result;
}

function saveValue(state: IdsState, index: number, value: string): IdsState {
  const values = { ...state.values, [readValueKey(state.location ?? 0, index)]: value };
  const result: IdsState = { ...state, values, buffer: "", hexNext: false, beep: "long" };
  return result;
}

// Location 23 changing the code length resets the installer code (location 197) to the Table 12 default for the
// new length. The manual only gives the defaults, so this reset is a ruling.
// User codes: "If the code length is changed from 6 to 4, then all user codes are automatically set to their default
// values as per Table 12" (Location 23), so 6 → 4 leaves only slot 1 = 1234. Table 12 gives 123456 as the 6-digit master
// default; the manual only gives defaults, so (ruling) 4 → 6 changes slot 1 only while it is still 1234 and keeps the rest.
function applyCodeLength(before: IdsState, after: IdsState, model: PanelModelData): IdsState {
  const length = readCodeLength(after);
  if (length === readCodeLength(before)) return after;
  const fourDigitMaster = readMasterDefault(model, 4);
  const codes: Record<number, string> = length === 4 ? { 1: fourDigitMaster } : { ...after.codes };
  if (length === 6 && codes[1] === fourDigitMaster) codes[1] = readMasterDefault(model, 6);
  const values = { ...after.values, [readValueKey(197, 0)]: INSTALLER_CODE_DEFAULTS[length] };
  const result: IdsState = { ...after, values, codes };
  return result;
}

/* ---------- key handling, one function per mode ---------- */

const HANDLERS: Partial<Record<Mode, Handler>> = {
  idle(state, key) {
    // [#] [INSTALLER CODE] [*] enters program mode (§8).
    // A user program command shown from the map (nodeId) is left behind once a key leaves idle.
    const result: IdsState = key === "#" ? { ...state, mode: "installerCode", nodeId: null, buffer: "", path: [{ key: "#", label: "" }] } : state;
    return result;
  },

  installerCode(state, key, model) {
    if (key === "#") return resetToIdle(state);
    if (isDigit(key)) return typeDigit(state, key, readCodeLength(state));
    if (key !== "*") return state;
    if (state.buffer === readInstallerCode(state, model)) return { ...openProgramTop(state, model), beep: "long" };
    const result: IdsState = { ...resetToIdle(state), beep: "error" };
    return result;
  },

  programTop(state, key, model) {
    if (key === "#") return state.buffer ? { ...state, buffer: "" } : resetToIdle(state);
    if (isDigit(key)) return typeDigit(state, key, LOCATION_DIGITS);
    const result = key === "*" && state.buffer ? enterLocation(state, model, Number(state.buffer)) : state;
    return result;
  },

  // Standard location (§8): [NEW DATA] [*] saves with a long beep, [#] leaves it unchanged.
  location(state, key, model) {
    const section = readSection(state, model)!;
    const num = state.location ?? 0;
    const digits = readEntryDigits(state, num, readEntries(section, num)[0]);
    if (key === "#") return openProgramTop(state, model);
    if (key === "mode") return state.buffer.length < digits ? { ...state, hexNext: true } : beepError(state);
    if (isDigit(key)) return typeDigit(state, key, digits);
    if (key !== "*" || !state.buffer) return state;
    const allowed = VALID_VALUES[num];
    const valid = state.buffer.length === digits && (!allowed || allowed.includes(state.buffer));
    if (!valid) return { ...beepError(state), buffer: "" };
    const result = openProgramTop(applyCodeLength(state, saveValue(state, 0, state.buffer), model), model);
    return result;
  },

  // Star-advance (§9 Location 1-8): [*] moves to the next zone, [TYPE] [*] sets the zone and moves on.
  zoneList(state, key, model) {
    if (key === "#") return openProgramTop(state, model);
    if (key === "mode") return state.buffer.length < 2 ? { ...state, hexNext: true } : beepError(state);
    if (isDigit(key)) return typeDigit(state, key, 2);
    if (key !== "*") return state;
    // The manual doesn't say what [*] does on the 8th zone; the engine stays on it.
    const next = Math.min(state.entryIndex + 1, ZONES_PER_LOCATION - 1);
    if (!state.buffer) return { ...state, entryIndex: next };
    const type = state.buffer.padStart(2, "0"); // "the zone type does not have to be 2 digits, i.e. enter 1 or 01"
    if (!ZONE_TYPES.has(type)) return { ...beepError(state), buffer: "" };
    const result: IdsState = { ...saveValue(state, state.entryIndex, type), entryIndex: next };
    return result;
  },

  // Bitmapped location: [N] [*] flips light N on this page, [*] alone goes to the next page and wraps (§7 NOTE, Table 26).
  bitmap(state, key, model) {
    if (key === "#") return openProgramTop(state, model);
    if (isDigit(key)) return typeDigit(state, key, 2);
    if (key !== "*") return state;
    if (!state.buffer) return { ...state, page: (state.page % state.pageCount) + 1 };
    const section = readSection(state, model)!;
    const num = state.location ?? 0;
    const light = Number(state.buffer);
    const n = (state.page - 1) * LIGHTS_PER_PAGE + light;
    const exists = light >= 1 && light <= LIGHTS_PER_PAGE && readOptions(section, num).some((o) => o.n === n);
    if (!exists) return { ...beepError(state), buffer: "" };
    const toggles = { ...state.toggles, [String(num)]: flipNumber(readToggleSet(state, section, num), n) };
    const result: IdsState = { ...state, toggles, buffer: "" };
    return result;
  },

  ...USER_HANDLERS,
};

export function pressKey(state: IdsState, key: Key, model: PanelModelData): IdsState {
  if (IGNORED_KEYS.has(key)) return state;
  if (HOLD_KEYS.has(key)) return applyHoldKey(state, key);
  const handler = HANDLERS[state.mode];
  const cleared: IdsState = { ...state, beep: null, unsimulatedOption: null };
  const result = handler ? handler(cleared, key, model) : cleared;
  return result;
}

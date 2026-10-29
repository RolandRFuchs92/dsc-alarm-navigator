/* Key handling for user program mode (hold *, User Manual 700-398-01J §9, options 0-4) and bypass
   (hold 9, §5, LED keypad). Codes live in state.codes only; they never reach the worksheet or the path as digits. */
import type { PanelModelData } from "@/lib/content/types";
import type { Key } from "../types";
import { LIGHTS_PER_PAGE, flipNumber, readCodeLength, readMasterDefault, resetToIdle } from "./state";
import type { IdsState, Mode, PathChip } from "./state";

type Handler = (state: IdsState, key: Key, model: PanelModelData) => IdsState;

// §8: 128 programmable user codes, one per slot.
export const USER_SLOTS = 128;
// §5 step 7: [*] pages through zones 1-16, 17-32, 33-48, 49-64.
const BYPASS_PAGES = 4;
const BYPASS_ZONES = BYPASS_PAGES * LIGHTS_PER_PAGE; // zones 1-64
const SLOT_DIGITS = 3;
const OPTION_DIGITS = 2; // Table 5 lists options up to 41
// §9 option headings; only options 0-4 are simulated. Option 5 shows the slot on the zone lights (Table 2), not simulated.
export const USER_OPTION_LABELS: Record<number, string> = {
  0: "Add a new user code",
  1: "Edit a selected user code",
  2: "Delete a user code (code known)",
  3: "Add/edit slot",
  4: "Delete a user code (slot known)",
};

const isDigit = (key: Key): boolean => /^\d$/.test(key);
const beepError = (state: IdsState): IdsState => ({ ...state, beep: "error", buffer: "" });

// Dots instead of digits, so a code never shows in the trail or the focus buffer.
export function maskCode(code: string): string {
  const result = "•".repeat(code.length);
  return result;
}

// Options 0, 1 and 2, and Option 3 once a slot is chosen, take a code; Option 3's first step and Option 4 take a slot.
export function isTypingCode(state: IdsState): boolean {
  const codeModes: Mode[] = ["userCode", "bypassCode"];
  const inOption = state.mode === "userOption" && ([0, 1, 2].includes(state.userOption ?? -1) || state.userSlot !== null);
  const result = codeModes.includes(state.mode) || inOption;
  return result;
}

function typeDigit(state: IdsState, key: Key, max: number): IdsState {
  const result: IdsState = state.buffer.length >= max ? { ...state, beep: "error" } : { ...state, buffer: state.buffer + key };
  return result;
}

function findSlot(state: IdsState, code: string): number | null {
  const found = Object.entries(state.codes).find(([, c]) => c === code);
  const result = found ? Number(found[0]) : null;
  return result;
}

// A new code must have the location 23 length and not match another slot's code.
function isValidNewCode(state: IdsState, code: string, slot: number | null): boolean {
  const owner = findSlot(state, code);
  const result = code.length === readCodeLength(state) && (owner === null || owner === slot);
  return result;
}

// §9 Option 2 step 4: "deleting" slot 1 reprograms it to 1234. The manual only says 1234 there; with 6-digit codes the
// engine uses 123456 instead, a ruling based on the 6-digit master default in §9 step 4 and Table 12.
function deleteSlot(state: IdsState, slot: number, model: PanelModelData): IdsState {
  const codes = { ...state.codes };
  if (slot === 1) codes[1] = readMasterDefault(model, readCodeLength(state));
  else delete codes[slot];
  const result: IdsState = { ...state, codes, buffer: "", beep: "long" };
  return result;
}

function saveCode(state: IdsState, slot: number, code: string): IdsState {
  const result: IdsState = { ...state, codes: { ...state.codes, [slot]: code }, buffer: "", userSlot: null, beep: "long" };
  return result;
}

function readSlotNumber(buffer: string): number | null {
  const n = Number(buffer);
  const result = n >= 1 && n <= USER_SLOTS ? n : null;
  return result;
}

// The path to the top of user program mode: hold *, the master code (masked), *.
function buildUserPath(state: IdsState): PathChip[] {
  const result: PathChip[] = [
    { key: "hold*", label: "User program mode" },
    { key: "•".repeat(readCodeLength(state)), label: "Master code" },
    { key: "*", label: "" },
  ];
  return result;
}

function openUserTop(state: IdsState): IdsState {
  const result: IdsState = { ...state, mode: "userTop", buffer: "", userOption: null, userSlot: null, path: buildUserPath(state) };
  return result;
}

function openOption(state: IdsState, option: number): IdsState {
  const path = [...buildUserPath(state), { key: String(option), label: USER_OPTION_LABELS[option] }, { key: "*", label: "" }];
  // §9 step 7 (LCD): a valid option is confirmed by a long beep.
  const result: IdsState = { ...state, mode: "userOption", userOption: option, userSlot: null, buffer: "", path, beep: "long" };
  return result;
}

// The second step of Options 1 and 3: the old code's slot or the chosen slot. No beep is described for it.
function openSecondStep(state: IdsState, slot: number, chip: PathChip): IdsState {
  const result: IdsState = { ...state, userSlot: slot, buffer: "", path: [...state.path, chip, { key: "*", label: "" }] };
  return result;
}

// [CODE or SLOT] [*] inside an option (§9 options 0-4).
function applyOptionEntry(state: IdsState, model: PanelModelData): IdsState {
  const code = state.buffer;
  const backToFirstStep = (s: IdsState): IdsState => ({ ...s, path: s.path.slice(0, buildUserPath(s).length + 2) });
  if (state.userOption === 0) {
    const free = Array.from({ length: USER_SLOTS }, (_, i) => i + 1).find((n) => state.codes[n] === undefined);
    // §9 Option 0 NOTE: the new code goes to the first available slot.
    return isValidNewCode(state, code, null) && free ? saveCode(state, free, code) : beepError(state);
  }
  if (state.userOption === 2) {
    const slot = findSlot(state, code);
    return slot === null ? beepError(state) : deleteSlot(state, slot, model);
  }
  if (state.userOption === 4) {
    const slot = readSlotNumber(code);
    return slot === null || state.codes[slot] === undefined ? beepError(state) : deleteSlot(state, slot, model);
  }
  if (state.userSlot === null) {
    const slot = state.userOption === 1 ? findSlot(state, code) : readSlotNumber(code);
    if (slot === null) return beepError(state);
    const chip = state.userOption === 1 ? { key: maskCode(code), label: "Old code" } : { key: String(slot), label: "Slot" };
    return openSecondStep(state, slot, chip);
  }
  const result = isValidNewCode(state, code, state.userSlot) ? backToFirstStep(saveCode(state, state.userSlot, code)) : beepError(state);
  return result;
}

export const USER_HANDLERS: Partial<Record<Mode, Handler>> = {
  // §9 steps 4-5: [MASTER CODE] [*]; a long beep and READY flashing, or an error beep. Only the master code
  // (slot 1, §8 "user code 1 is the Master User Code") opens it; Table 6 master rights for other codes aren't simulated.
  userCode(state, key) {
    if (key === "#") return resetToIdle(state);
    if (isDigit(key)) return typeDigit(state, key, readCodeLength(state));
    if (key !== "*") return state;
    const result = state.buffer === state.codes[1] ? { ...openUserTop(state), beep: "long" as const } : beepError(state);
    return result;
  },

  // §9 step 6: [OPTION] [*]; [#] leaves user programming.
  userTop(state, key) {
    if (key === "#") return state.buffer ? { ...state, buffer: "" } : resetToIdle(state);
    if (isDigit(key)) return typeDigit(state, key, OPTION_DIGITS);
    if (key !== "*" || !state.buffer) return state;
    const option = Number(state.buffer);
    const result = USER_OPTION_LABELS[option] ? openOption(state, option) : { ...beepError(state), unsimulatedOption: option };
    return result;
  },

  // Options 0-4; [#] exits the current option back to the top (§9 "Press the [#] key to exit the current option").
  userOption(state, key, model) {
    if (key === "#") return openUserTop(state);
    if (isDigit(key)) return typeDigit(state, key, isTypingCode(state) ? readCodeLength(state) : SLOT_DIGITS);
    if (key !== "*" || !state.buffer) return state;
    const result = applyOptionEntry(state, model);
    return result;
  },

  // §5 step 3: [USER CODE] [*], any valid user code.
  bypassCode(state, key) {
    if (key === "#") return resetToIdle(state);
    if (isDigit(key)) return typeDigit(state, key, readCodeLength(state));
    if (key !== "*") return state;
    if (findSlot(state, state.buffer) === null) return beepError(state);
    const path = [{ key: "hold9", label: "Bypass" }, { key: maskCode(state.buffer), label: "User code" }, { key: "*", label: "" }];
    const result: IdsState = { ...state, mode: "bypass", buffer: "", page: 1, pageCount: BYPASS_PAGES, lastBypassZone: null, path };
    return result;
  },

  // §5 steps 5-9: [ZONE NUMBER] [*] toggles that zone (1-64), [*] alone pages the lights through zones 1-16, 17-32,
  // 33-48, 49-64 and wraps, [#] exits. §5 doesn't spell out how paging and zone numbers interact: ruling, a zone number
  // is the real zone wherever it is, and the lights keep showing the current page.
  bypass(state, key) {
    if (key === "#") return resetToIdle(state);
    if (isDigit(key)) return typeDigit(state, key, 2);
    if (key !== "*") return state;
    if (!state.buffer) return { ...state, page: (state.page % BYPASS_PAGES) + 1 };
    const zone = Number(state.buffer);
    if (zone < 1 || zone > BYPASS_ZONES) return beepError(state);
    const result: IdsState = { ...state, bypassed: flipNumber(state.bypassed, zone), lastBypassZone: zone, buffer: "" };
    return result;
  },
};

// Hold * (§9 step 2) and hold 9 (§5 step 2) only work from idle; anywhere else they change nothing.
export function applyHoldKey(state: IdsState, key: Key): IdsState {
  if (state.mode !== "idle") return state;
  const mode: Mode = key === "hold*" ? "userCode" : "bypassCode";
  const chip = key === "hold*" ? { key, label: "User program mode" } : { key, label: "Bypass" };
  const result: IdsState = { ...state, mode, nodeId: null, buffer: "", beep: null, unsimulatedOption: null, path: [chip] };
  return result;
}

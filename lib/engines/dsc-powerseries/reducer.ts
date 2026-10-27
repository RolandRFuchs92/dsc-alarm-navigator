/* Installer programming ([*][8]) key handling plus the pressKey dispatcher. Ported from src/app.js.
   Every function takes a state and returns a new one; nothing is mutated in place. */
import type { PanelModelData } from "@/lib/content/types";
import type { Key } from "../types";
import { COMMAND_HANDLERS, startCommand } from "./commands";
import {
  HEX_DIGITS,
  buildInstallerPath,
  describeInstance,
  findNode,
  findSection,
  findSub,
  flipNumber,
  formatSection,
  openSectionPrompt,
  readCodeLength,
  readEntries,
  readOptions,
  readSection,
  readToggleSet,
  readValueKey,
  resetToReady,
} from "./state";
import type { DscState, Mode } from "./state";

type Handler = (state: DscState, key: Key, model: PanelModelData) => DscState;

const isDigit = (key: Key): boolean => /\d/.test(key);

/* ---------- transitions ---------- */

export function enterSection(state: DscState, model: PanelModelData, num: number): DscState {
  const section = findSection(model, num);
  if (!section) {
    const result: DscState = { ...state, flash: ["Invalid Section", `${formatSection(num)} not used`], beep: "error", buffer: "" };
    return result;
  }
  const instance = describeInstance(section, num);
  const modeByKind: Record<string, Mode> = { sub: "sub", data: "data", toggle: "toggle", phone: "phone", module: "module", action: "action" };
  let result: DscState = {
    ...state,
    nodeId: section.slug, section: num, subCode: null, entryIndex: 0, buffer: "", hex: false, page: 1, confirmStep: null, infoLine: null,
    path: [...buildInstallerPath(state), { key: String(num).padStart(3, "0"), label: instance ? `${section.label}: ${instance}` : section.label }],
    mode: modeByKind[section.kind] ?? "action",
  };
  if (section.kind === "action" && section.confirm) result = { ...result, mode: "confirm", confirmStep: "code" };
  if (section.kind === "phone") result = { ...result, buffer: state.values[readValueKey(num, null, 0)] || "" };
  // Legacy rendering stored a toggle section's defaults as soon as it was shown; keep that worksheet shape.
  if (section.kind === "toggle" && !state.toggles[String(num)]) {
    result = { ...result, toggles: { ...result.toggles, [String(num)]: readToggleSet(state, section, num) } };
  }
  return result;
}

export function enterSub(state: DscState, model: PanelModelData, code: string): DscState {
  const section = readSection(state, model);
  const sub = section ? findSub(section, code) : null;
  if (!sub) {
    const result: DscState = { ...state, flash: ["Invalid entry", `Sub-section ${code}?`], beep: "error", buffer: "" };
    return result;
  }
  const result: DscState = {
    ...state, mode: "data", subCode: code, entryIndex: 0, buffer: "", hex: false,
    path: [...state.path.slice(0, 4), { key: code, label: sub.label }],
  };
  return result;
}

function leaveData(state: DscState, model: PanelModelData): DscState {
  const section = readSection(state, model);
  if (section && section.kind === "sub" && state.subCode !== null) {
    const result: DscState = { ...state, mode: "sub", subCode: null, entryIndex: 0, buffer: "", hex: false, path: state.path.slice(0, 4) };
    return result;
  }
  const result = openSectionPrompt(state);
  return result;
}

function commitEntry(state: DscState, model: PanelModelData): DscState {
  const section = readSection(state, model)!;
  const num = state.section ?? 0;
  const entries = readEntries(section, num, findSub(section, state.subCode));
  const values = { ...state.values, [readValueKey(num, state.subCode, state.entryIndex)]: state.buffer };
  const saved: DscState = { ...state, values, buffer: "", hex: false };
  if (state.entryIndex + 1 < entries.length) {
    const result: DscState = { ...saved, entryIndex: state.entryIndex + 1, beep: "double" };
    return result;
  }
  const result = leaveData({ ...saved, beep: "five", flash: ["Section complete", "5 beeps, exiting"] }, model);
  return result;
}

// In HEX mode keys 1-6 type A-F; anything else is refused with an error beep.
function typeDigit(state: DscState, key: Key): string | null {
  const result = state.hex ? (HEX_DIGITS[key] ?? null) : key;
  return result;
}

export function flipOption(state: DscState, model: PanelModelData, n: number): DscState {
  const section = readSection(state, model)!;
  const num = state.section ?? 0;
  if (!readOptions(section, num).some((o) => o.n === n)) return state;
  const toggles = { ...state.toggles, [String(num)]: flipNumber(readToggleSet(state, section, num), n) };
  const result: DscState = { ...state, toggles };
  return result;
}

/* ---------- key handling, one function per programming mode ---------- */

const PROGRAMMING_HANDLERS: Record<string, Handler> = {
  section(state, key, model) {
    if (key === "#") {
      if (state.buffer) return { ...state, buffer: "" };
      const result: DscState = { ...resetToReady(state), flash: ["Exited installer", "programming"] };
      return result;
    }
    if (!isDigit(key)) return state;
    const typed: DscState = { ...state, buffer: state.buffer + key };
    const result = typed.buffer.length === 3 ? enterSection(typed, model, Number(typed.buffer)) : typed;
    return result;
  },

  sub(state, key, model) {
    const section = readSection(state, model)!;
    if (key === "#") return openSectionPrompt(state);
    if (!isDigit(key)) return state;
    const typed: DscState = { ...state, buffer: state.buffer + key };
    const result = typed.buffer.length === section.subDigits ? enterSub(typed, model, typed.buffer) : typed;
    return result;
  },

  data(state, key, model) {
    const section = readSection(state, model)!;
    const entries = readEntries(section, state.section ?? 0, findSub(section, state.subCode));
    if (key === "#") return leaveData(state, model);
    if (entries.length === 0) return { ...state, beep: "error" };
    if (key === "*") return { ...state, hex: !state.hex };
    if (key === "<") return { ...state, entryIndex: Math.max(0, state.entryIndex - 1), buffer: "" };
    if (key === ">") return { ...state, entryIndex: Math.min(entries.length - 1, state.entryIndex + 1), buffer: "" };
    const digit = typeDigit(state, key);
    if (!digit) return { ...state, beep: "error" };
    const typed: DscState = { ...state, buffer: state.buffer + digit };
    const result = typed.buffer.length >= entries[state.entryIndex].digits ? commitEntry(typed, model) : typed;
    return result;
  },

  phone(state, key) {
    if (key === "#") {
      const values = { ...state.values, [readValueKey(state.section, null, 0)]: state.buffer };
      const result = openSectionPrompt({ ...state, values });
      return result;
    }
    if (key === "*") return { ...state, hex: !state.hex };
    if (key === "<" || key === ">") return state;
    const digit = typeDigit(state, key);
    if (!digit) return { ...state, beep: "error" };
    const result: DscState = state.buffer.length < 32 ? { ...state, buffer: state.buffer + digit } : state;
    return result;
  },

  toggle(state, key, model) {
    const section = readSection(state, model)!;
    if (key === "#") return openSectionPrompt(state);
    if (key === "9" && section.pages === 2) return { ...state, page: state.page === 1 ? 2 : 1 };
    if (!/[1-8]/.test(key)) return state;
    const result = flipOption(state, model, Number(key) + (state.page === 2 ? 8 : 0));
    return result;
  },

  module(state, key) {
    const result = key === "#" ? openSectionPrompt(state) : state;
    return result;
  },

  action(state, key) {
    if (key === "#") return openSectionPrompt(state);
    const result: DscState = state.section === 901 && isDigit(key) ? { ...state, infoLine: "Trip a zone" } : state;
    return result;
  },

  confirm(state, key) {
    if (key === "#") return openSectionPrompt(state);
    if (!isDigit(key)) return state;
    const typed: DscState = { ...state, buffer: state.buffer + key };
    if (typed.confirmStep === "code" && typed.buffer.length === readCodeLength(typed)) {
      const result: DscState = { ...typed, path: [...typed.path, { key: typed.buffer, label: "Installer code" }], buffer: "", confirmStep: "repeat" };
      return result;
    }
    if (typed.confirmStep === "repeat" && typed.buffer.length === 3) {
      const ok = Number(typed.buffer) === typed.section;
      const sectionText = formatSection(typed.section ?? 0);
      const result: DscState = {
        ...openSectionPrompt(typed),
        flash: ok ? [`${sectionText} done`, "(simulated only)"] : ["Mismatch", "Nothing changed"],
        beep: ok ? "five" : "error",
      };
      return result;
    }
    return typed;
  },
};

const KEY_HANDLERS: Record<Mode, Handler> = { ...COMMAND_HANDLERS, ...PROGRAMMING_HANDLERS } as Record<Mode, Handler>;

// Modes whose info line survives the next key press.
const KEEPS_INFO_LINE: Mode[] = ["bypass", "trouble", "userCodes", "userFn", "action", "info"];

export function pressKey(state: DscState, key: Key, model: PanelModelData): DscState {
  const cleared: DscState = {
    ...state, flash: null, beep: null, infoLine: KEEPS_INFO_LINE.includes(state.mode) ? state.infoLine : null,
  };
  const result = KEY_HANDLERS[state.mode](cleared, key, model);
  return result;
}

/* ---------- navigation from the section tree and links (no key press) ---------- */

// Jump straight to a section (num picks one inside a range) or to a [*] command.
export function navigateToNode(state: DscState, model: PanelModelData, id: string, num?: number): DscState {
  const node = findNode(model, id);
  if (!node) return state;
  const cleared: DscState = { ...state, flash: null, beep: null };
  if (node.isKeypad) return startCommand(cleared, model, node.command.slug);
  const s = node.section;
  const target = num || (s.range ? s.range[0] : (s.num ?? 0));
  const result = enterSection(openSectionPrompt(cleared), model, target);
  return result;
}

export function navigateToEntry(state: DscState, index: number): DscState {
  const result: DscState = state.mode === "data" ? { ...state, entryIndex: index, buffer: "", hex: false } : state;
  return result;
}

export function navigateToSub(state: DscState, model: PanelModelData, code: string): DscState {
  const left = state.subCode ? leaveData(state, model) : state;
  const result = enterSub(left, model, code);
  return result;
}

// Clicking a lookup value (e.g. a zone type) types it into the current entry.
export function applyLookupValue(state: DscState, model: PanelModelData, code: string): DscState {
  const result = state.mode === "data" ? commitEntry({ ...state, buffer: code }, model) : state;
  return result;
}

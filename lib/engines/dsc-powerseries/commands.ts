/* User-mode key handling: the idle keypad and the [*] command menu. Ported from src/app.js. */
import type { PanelModelData } from "@/lib/content/types";
import type { Key } from "../types";
import { flipNumber, openSectionPrompt, readCodeLength, resetToReady } from "./state";
import type { DscState, Mode } from "./state";

type Handler = (state: DscState, key: Key, model: PanelModelData) => DscState;

export const TROUBLES: Record<string, string> = {
  1: "Service required", 2: "AC failure", 3: "Phone line", 4: "Fail to comm.", 5: "Zone fault", 6: "Zone tamper", 7: "Wls low battery", 8: "Loss of clock",
};
export const USER_FUNCTIONS: Record<string, string> = {
  1: "Time and date", 2: "Auto-arm on/off", 3: "Auto-arm time", 4: "System test", 5: "Enable DLS", 6: "User call-up", 7: "Future use", 8: "Future use",
};

// [*] digit → mode for commands that need no code first.
const DIRECT_MODES: Record<string, Mode> = { 1: "bypass", 2: "trouble", 3: "info", 4: "info", 7: "cmdOut", 0: "info" };
const INFO_LINES: Record<string, string> = { 3: "No alarms", 4: "Chime toggled", 9: "Armed, no entry", 0: "Quick arm/exit" };

const isDigit = (key: Key): boolean => /\d/.test(key);

// Drop back to "User no.:" inside [*][5].
function clearUserStep(state: DscState): DscState {
  const result: DscState = { ...state, userStep: null, userTarget: null, buffer: "", path: state.path.slice(0, 3) };
  return result;
}

export const COMMAND_HANDLERS: Partial<Record<Mode, Handler>> = {
  ready(state, key) {
    if (key === "*") return { ...state, mode: "star", path: [{ key: "*", label: "" }] };
    const result: DscState = isDigit(key) ? { ...state, flash: ["Code entry arms/", "disarms. Try [*]"] } : state;
    return result;
  },

  star(state, key, model) {
    if (key === "#") return resetToReady(state);
    if (!isDigit(key)) return state;
    const command = model.commands.find((c) => c.slug === `k${key}`);
    if (!command) return state;
    const chosen: DscState = { ...state, nodeId: command.slug, path: [...state.path, { key, label: command.label }] };
    const next = DIRECT_MODES[key];
    if (next) {
      const infoLine = key === "3" || key === "4" || key === "0" ? INFO_LINES[key] : chosen.infoLine;
      const result: DscState = { ...chosen, mode: next, infoLine };
      return result;
    }
    const codeFor = ({ 5: "master", 6: "master", 8: "installer", 9: "user" } as const)[key as "5" | "6" | "8" | "9"];
    const result: DscState = { ...chosen, mode: "code", codeFor, buffer: "" };
    return result;
  },

  code(state, key) {
    if (key === "#") return resetToReady(state);
    if (!isDigit(key)) return state;
    const typed: DscState = { ...state, buffer: state.buffer + key };
    if (typed.buffer.length < readCodeLength(typed)) return typed;
    const code = typed.buffer;
    const done: DscState = { ...typed, buffer: "" };
    // The simulator accepts any installer code and remembers it for the path chips.
    if (done.codeFor === "installer") return openSectionPrompt({ ...done, installerCode: code });
    const label = done.codeFor === "user" ? "User code" : "Master code";
    const nextMode = ({ k5: "userCodes", k6: "userFn", k9: "info" } as Record<string, Mode>)[done.nodeId ?? ""];
    const result: DscState = {
      ...done, path: [...done.path, { key: code, label }], mode: nextMode,
      infoLine: done.nodeId === "k9" ? INFO_LINES[9] : done.infoLine,
    };
    return result;
  },

  bypass(state, key) {
    if (key === "#") return resetToReady(state);
    if (!isDigit(key)) return state;
    const typed: DscState = { ...state, buffer: state.buffer + key };
    if (typed.buffer.length < 2) return typed;
    const zone = Number(typed.buffer);
    const done: DscState = { ...typed, buffer: "" };
    if (zone >= 1 && zone <= 64) {
      const bypassed = flipNumber(done.bypassed, zone);
      const result: DscState = { ...done, bypassed, infoLine: `Zone ${String(zone).padStart(2, "0")} ${bypassed.includes(zone) ? "bypassed" : "active"}` };
      return result;
    }
    const special: Record<number, string> = { 0: "All cleared", 99: "Recalled last", 95: "Group saved", 91: "Group recalled" };
    const result: DscState = { ...done, bypassed: zone === 0 ? [] : done.bypassed, infoLine: special[zone] || "Invalid zone" };
    return result;
  },

  trouble(state, key) {
    if (key === "#") return resetToReady(state);
    const result: DscState = TROUBLES[key] ? { ...state, infoLine: TROUBLES[key] } : state;
    return result;
  },

  info(state, key) {
    const result = key === "#" ? resetToReady(state) : state;
    return result;
  },

  cmdOut(state, key) {
    if (key === "#") return resetToReady(state);
    if (!/[1-4]/.test(key)) return state;
    const result: DscState = { ...state, path: [...state.path, { key, label: `Output ${key}` }], mode: "info", infoLine: `Output ${key} active` };
    return result;
  },

  userCodes(state, key) {
    if (key === "#") {
      const result = state.userStep ? clearUserStep(state) : resetToReady(state);
      return result;
    }
    const step = state.userStep;
    if (step === "newCode") {
      if (key === "*") return { ...clearUserStep(state), userTarget: state.userTarget, infoLine: `User ${state.userTarget} deleted` };
      if (!isDigit(key)) return state;
      const typed: DscState = { ...state, buffer: state.buffer + key };
      if (typed.buffer.length !== readCodeLength(typed)) return typed;
      const result: DscState = { ...clearUserStep(typed), userTarget: typed.userTarget, infoLine: `User ${typed.userTarget} saved`, beep: "double" };
      return result;
    }
    if (step === "attrUser" || step === "partUser") {
      if (!isDigit(key)) return state;
      const typed: DscState = { ...state, buffer: state.buffer + key };
      if (typed.buffer.length < 2) return typed;
      const target = typed.buffer;
      const result: DscState = {
        ...typed, userTarget: target, buffer: "", path: [...typed.path, { key: target, label: `User ${target}` }],
        userStep: step === "attrUser" ? "attr" : "part",
      };
      return result;
    }
    if (step === "attr" || step === "part") {
      if (!/[1-8]/.test(key)) return state;
      const setKey = `${step}-${state.userTarget}`;
      const current = state.toggles[setKey] ?? (step === "part" ? [1] : []);
      const result: DscState = { ...state, toggles: { ...state.toggles, [setKey]: flipNumber(current, Number(key)) } };
      return result;
    }
    if (!isDigit(key)) return state;
    const typed: DscState = { ...state, buffer: state.buffer + key };
    if (typed.buffer.length < 2) return typed;
    const target = typed.buffer;
    const done: DscState = { ...typed, buffer: "" };
    if (target === "98" || target === "99") {
      const result: DscState = {
        ...done, userStep: target === "99" ? "attrUser" : "partUser",
        path: [...done.path, { key: target, label: target === "99" ? "User attributes" : "Partition assignment" }],
      };
      return result;
    }
    const num = Number(target);
    if (num < 1 || num > 95) return { ...done, flash: ["Invalid user", "Use 01-95"], beep: "error" };
    const result: DscState = {
      ...done, userTarget: target, userStep: "newCode", path: [...done.path, { key: target, label: num === 40 ? "Master code" : `User ${target}` }],
    };
    return result;
  },

  userFn(state, key) {
    if (key === "#") return resetToReady(state);
    const name = USER_FUNCTIONS[key];
    const result: DscState = name ? { ...state, infoLine: name, path: [...state.path.slice(0, 3), { key, label: name }] } : state;
    return result;
  },
};

// Open a [*] command directly (from the tree), as if its keys and default codes had been typed.
export function startCommand(state: DscState, model: PanelModelData, slug: string): DscState {
  const command = model.commands.find((c) => c.slug === slug);
  if (!command) return state;
  const key = slug.slice(1);
  const base: DscState = { ...resetToReady(state), nodeId: slug, path: [{ key: "*", label: "" }, { key, label: command.label }] };
  if (key === "8") return openSectionPrompt(base);
  const master = model.masterCodeDefault;
  const codeChip = key === "5" || key === "6" ? [{ key: master, label: "Master code" }] : key === "9" ? [{ key: master, label: "User code" }] : [];
  const modes: Record<string, Mode> = { 1: "bypass", 2: "trouble", 3: "info", 4: "info", 5: "userCodes", 6: "userFn", 7: "cmdOut", 9: "info", 0: "info" };
  const result: DscState = { ...base, path: [...base.path, ...codeChip], mode: modes[key], infoLine: INFO_LINES[key] || null };
  return result;
}

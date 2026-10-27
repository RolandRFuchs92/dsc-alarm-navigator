/* Derived views: LCD lines, LEDs, "you are here" text and breadcrumbs. Ported from src/app.js
   (computeLcd, computeLeds, describeWaiting, buildCrumbs). The waiting text is plain text: the
   legacy <strong> emphasis is dropped and React does the escaping. */
import type { KeypadModelDef, PanelModelData, SectionDef } from "@/lib/content/types";
import type { Display, LedState, Leds, Location, Worksheet } from "../types";
import {
  describeInstance,
  findNode,
  findSub,
  formatNodeCode,
  formatSection,
  readCodeLength,
  readEntries,
  readSection,
  readToggleSet,
  readValueKey,
  readWorksheet,
  truncate,
} from "./state";
import type { DscState, FoundNode, Mode } from "./state";

/* ---------- LEDs ---------- */

export function selectLeds(state: DscState): Leds {
  const installerWaiting = ["section", "module", "action", "confirm"].includes(state.mode);
  const dataModes = ["sub", "data", "phone", "toggle"].includes(state.mode);
  const armed = installerWaiting || (state.mode === "toggle" && state.page === 2) || (state.mode === "info" && state.nodeId === "k9");
  const ready: LedState = dataModes && state.hex ? "flash" : installerWaiting ? "off" : "on";
  const result: Leds = { ready, armed: armed ? "on" : "off", trouble: "off", ac: "on" };
  return result;
}

/* ---------- LCD ---------- */

function buildToggleString(state: DscState, section: SectionDef, num: number): string {
  const set = readToggleSet(state, section, num);
  const offset = state.page === 2 ? 8 : 0;
  const result = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (set.includes(i + offset) ? String(i) : "-")).join("");
  return result;
}

function computeDataLcd(state: DscState, section: SectionDef): [string, string] {
  const entries = readEntries(section, state.section ?? 0, findSub(section, state.subCode));
  const entry = entries[state.entryIndex];
  const current = state.values[readValueKey(state.section, state.subCode, state.entryIndex)] || entry.def || "";
  const typed = state.buffer ? state.buffer.padEnd(entry.digits, "_") : current;
  const result: [string, string] = [truncate(entry.label, 16), `${typed}${state.hex ? "  HEX" : ""}`];
  return result;
}

function computeUserCodesLcd(state: DscState): [string, string] {
  const step = state.userStep;
  if (step === "newCode") {
    const result: [string, string] = [`User ${state.userTarget}`, `New: ${"*".repeat(state.buffer.length).padEnd(readCodeLength(state), "_")}`];
    return result;
  }
  if (step === "attrUser" || step === "partUser") {
    const result: [string, string] = [step === "attrUser" ? "Attributes for" : "Partitions for", `User: ${state.buffer.padEnd(2, "_")}`];
    return result;
  }
  if (step === "attr" || step === "part") {
    const set = state.toggles[`${step}-${state.userTarget}`] ?? (step === "part" ? [1] : []);
    const marks = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (set.includes(i) ? String(i) : "-")).join("");
    const result: [string, string] = [`User ${state.userTarget} ${step === "attr" ? "attrib" : "parts"}`, `   ${marks}`];
    return result;
  }
  const result: [string, string] = [state.infoLine || "User codes", `User no.: ${state.buffer.padEnd(2, "_")}`];
  return result;
}

function readNodeLabel(node: FoundNode | null): string {
  const result = !node ? "" : node.isKeypad ? node.command.label : node.section.label;
  return result;
}

export function computeLcd(state: DscState, model: PanelModelData): [string, string] {
  if (state.flash) return state.flash;
  const node = findNode(model, state.nodeId);
  const section = readSection(state, model);
  const label = readNodeLabel(node);
  const sec = state.section !== null ? formatSection(state.section) : "";
  const codeMask = "*".repeat(state.buffer.length).padEnd(readCodeLength(state), "_");
  const codeTitles = { installer: "Installer code", master: "Master code", user: "User code" };
  const views: Record<Mode, () => [string, string]> = {
    ready: () => ["System is Ready", "Enter code  <>"],
    star: () => ["Press (*) for <>", "Select 1-9 or 0"],
    code: () => [state.codeFor ? codeTitles[state.codeFor] : "", `Enter: ${codeMask}`],
    section: () => ["Enter Section", `      ${state.buffer.padEnd(3, "_")}`],
    sub: () => [`${sec} ${truncate(label, 10)}`, `Sub-section: ${state.buffer.padEnd(section?.subDigits ?? 0, "_")}`],
    data: () => computeDataLcd(state, section!),
    phone: () => [`${sec} Phone no.${state.hex ? " H" : ""}`, `${state.buffer.slice(-15)}_`],
    toggle: () => [`${sec} Opt ${state.page === 2 ? "9-16" : "1-8"}`, `   ${buildToggleString(state, section!, state.section ?? 0)}`],
    module: () => [`${sec} Module`, "See module manual"],
    action: () => [`${sec} ${truncate(label, 10)}`, state.infoLine || "Press # to exit"],
    confirm: () => [
      `${sec} ${state.confirmStep === "code" ? "Enter code" : "Re-enter sect."}`,
      state.confirmStep === "code" ? `      ${codeMask}` : `      ${state.buffer.padEnd(3, "_")}`,
    ],
    bypass: () => ["Zone bypass", state.infoLine || `Zone: ${state.buffer.padEnd(2, "_")}`],
    trouble: () => ["View trouble", state.infoLine || "Press 1-8, #"],
    info: () => [truncate(label, 16), state.infoLine || "Press # to exit"],
    cmdOut: () => ["Command output", "Press 1-4"],
    userCodes: () => computeUserCodesLcd(state),
    userFn: () => ["User functions", state.infoLine || "Press 1-8"],
  };
  const [top, bottom] = views[state.mode]();
  const result: [string, string] = [truncate(top, 16), truncate(bottom, 16)];
  return result;
}

/* ---------- LED keypad lights ---------- */

// Binary digit chart: digit or HEX letter -> which zone lights are ON.
// DSC 29007359R003 v4.2 install guide §3.3.4 p.9 (Viewing Programming): Zone 1 = 1, Zone 2 = 2, Zone 3 = 4, Zone 4 = 8.
// HEX A-F are entered with [*][1]-[*][6] (§3.3.2) and show as 10-15.
export const BINARY_DIGIT_LIGHTS: Record<string, number[]> = {
  "0": [],
  "1": [1],
  "2": [2],
  "3": [1, 2],
  "4": [3],
  "5": [1, 3],
  "6": [2, 3],
  "7": [1, 2, 3],
  "8": [4],
  "9": [1, 4],
  A: [2, 4],
  B: [1, 2, 4],
  C: [3, 4],
  D: [1, 3, 4],
  E: [2, 3, 4],
  F: [1, 2, 3, 4],
};

function buildLights(count: number, on: number[]): Record<number, LedState> {
  const result: Record<number, LedState> = {};
  for (let i = 1; i <= count; i += 1) result[i] = on.includes(i) ? "on" : "off";
  return result;
}

// The digit a data section shows: the first digit of the current entry, typed buffer first, else saved or default value.
function readCurrentDigit(state: DscState, section: SectionDef): string {
  const entries = readEntries(section, state.section ?? 0, findSub(section, state.subCode));
  const entry = entries[state.entryIndex];
  const saved = state.values[readValueKey(state.section, state.subCode, state.entryIndex)] || entry?.def || "";
  const result = (state.buffer || saved).charAt(0).toUpperCase();
  return result;
}

/* Zone lights for an LED keypad. Only what install guide §3.3 p.8-9 describes is verified: toggle sections page 1
   (light n = option n) and the binary digit of a data section. Everything else is all off and unverified. */
function computeLights(state: DscState, model: PanelModelData, keypad: KeypadModelDef): Display {
  if (keypad.lightCount === null) throw new Error(`Keypad ${keypad.slug} is a lights keypad with no lightCount`);
  const count = keypad.lightCount;
  const section = readSection(state, model);
  let on: number[] = [];
  let verified = false;
  if (state.mode === "toggle" && section && state.page === 1) {
    on = readToggleSet(state, section, state.section ?? 0).filter((n) => n >= 1 && n <= 8 && n <= count);
    verified = true;
  } else if ((state.mode === "data" || state.mode === "phone") && section) {
    const digit = readCurrentDigit(state, section);
    const lit = BINARY_DIGIT_LIGHTS[digit];
    if (lit) {
      on = lit.filter((n) => n <= count);
      verified = true;
    }
  }
  const result: Display = { type: "lights", count, lights: buildLights(count, on), verified };
  return result;
}

// LED keypads follow the install guide; icon keypads stay an unverified placeholder.
export function selectDisplay(state: DscState, model: PanelModelData, keypad: KeypadModelDef): Display {
  if (keypad.displayType === "lights") return computeLights(state, model, keypad);
  if (keypad.displayType === "icons") {
    const result: Display = { type: "icons", on: [], verified: false };
    return result;
  }
  const result: Display = { type: "text", lines: computeLcd(state, model) };
  return result;
}

/* ---------- "you are here" ---------- */

function describeDataWaiting(state: DscState, section: SectionDef, name: string): string {
  const sub = findSub(section, state.subCode);
  const entries = readEntries(section, state.section ?? 0, sub);
  const entry = entries[state.entryIndex];
  const where = sub ? `${name}, sub-section [${sub.code}] ${sub.label}` : name;
  const variable = entry.variable ? "up to 32 digits" : `${entry.digits} digits`;
  const after = state.entryIndex + 1 < entries.length
    ? `After that it double-beeps and moves to ${entries[state.entryIndex + 1].label}.`
    : `This is the last entry. After it the keypad beeps 5 times and returns to ${sub ? "the sub-section prompt" : "Enter Section"}.`;
  const result = `You are in ${where}. The panel wants ${variable} for ${entry.label} (entry ${state.entryIndex + 1} of ${entries.length}). ${after}${state.hex ? " HEX mode is on: 1-6 type A-F, [*] turns it off." : ""}`;
  return result;
}

function describeUserCodesWaiting(state: DscState, name: string): string {
  const texts: Record<string, string> = {
    newCode: `Type the new ${readCodeLength(state)}-digit code for user ${state.userTarget}, or [*] to delete it.`,
    attrUser: "Type the 2-digit user number whose attributes you want.",
    partUser: "Type the 2-digit user number whose partitions you want.",
    attr: `Press 1-8 to flip attributes for user ${state.userTarget}. [#] to finish.`,
    part: `Press 1-8 to flip partitions for user ${state.userTarget}. [#] to finish.`,
  };
  const fallback = "Type a 2-digit user number (01-95, 40 = master), or 98 for partitions, 99 for attributes.";
  const result = `You are in ${name}. ${(state.userStep && texts[state.userStep]) || fallback}`;
  return result;
}

export function describeWaiting(state: DscState, model: PanelModelData): string {
  const node = findNode(model, state.nodeId);
  const section = readSection(state, model);
  const sec = state.section !== null ? formatSection(state.section) : "";
  const instance = section && state.section !== null ? describeInstance(section, state.section) : "";
  const name = node ? `${sec || formatNodeCode(node)} ${readNodeLabel(node)}${instance ? ` (${instance})` : ""}` : "";
  const bypassed = [...state.bypassed].sort((a, b) => a - b);
  const codePrompts = {
    installer: `Type the installer code (default ${model.installerCodeDefault}).`,
    master: `Type the master code (default ${model.masterCodeDefault}).`,
    user: "Type any valid user code.",
  };
  const views: Record<Mode, () => string> = {
    ready: () => "The keypad is idle. Press [*] to open the command menu.",
    star: () => "You pressed [*]. Now press one number: 1 bypass, 2 troubles, 3 alarm memory, 4 chime, 5 user codes, 6 user functions, 7 outputs, 8 installer programming, 9 no-entry arm, 0 quick arm.",
    code: () => (state.codeFor ? codePrompts[state.codeFor] : ""),
    section: () => "You are at the top of installer programming. The Armed light is on: type a 3-digit section number, for example 001. Press [#] here to leave installer programming.",
    sub: () => `You are in ${name}. Type a ${section?.subDigits}-digit sub-section: ${(section?.subs ?? []).map((s) => `${s.code} = ${s.label}`).join(", ")}. Press [#] to go back to Enter Section.`,
    data: () => describeDataWaiting(state, section!, name),
    phone: () => `You are in ${name}. Type up to 32 digits, then press [#] to save. Press [*] to switch to HEX digits (D = wait for dial tone).`,
    toggle: () => `You are in ${name}. These are on/off options. Press 1-8 to flip one${section?.pages === 2 ? ", and [9] to switch between options 1-8 and 9-16" : ""}. Press [#] to save and go back to Enter Section.`,
    module: () => `You are in ${name}. This opens a separate module menu with its own sub-sections. Press [#] to go back.`,
    action: () => `You ran ${name}. Press [#] to go back to Enter Section.`,
    confirm: () => `${name} needs confirming: type the ${state.confirmStep === "code" ? "installer code" : `section number ${sec} again`}. Press [#] to cancel. The simulator never changes a real panel.`,
    bypass: () => `You are in ${name}. Type a 2-digit zone number to bypass or unbypass it. [#] to finish.${bypassed.length ? ` Bypassed now: ${bypassed.join(", ")}.` : ""}`,
    trouble: () => `You are in ${name}. Press a number 1-8 to see the trouble detail. [#] to exit.`,
    info: () => `You ran ${name}. Press [#] to go back to idle.`,
    cmdOut: () => `You are in ${name}. Press 1-4 for the output.`,
    userCodes: () => describeUserCodesWaiting(state, name),
    userFn: () => `You are in ${name}. Press 1-8 for a function. [#] to exit.`,
  };
  const result = views[state.mode]();
  return result;
}

// Crumb targets keep the legacy action strings: ready, star, installer, node:<slug>, section:<n>, sub:<code>.
export function buildCrumbs(state: DscState, model: PanelModelData): Location["crumbs"] {
  const crumbs: Location["crumbs"] = [{ label: "Keypad", target: "ready" }];
  if (state.mode === "ready") return crumbs;
  const node = findNode(model, state.nodeId);
  const installerModes: Mode[] = ["section", "sub", "data", "phone", "toggle", "module", "action", "confirm"];
  const isInstaller = installerModes.includes(state.mode) || (state.mode === "code" && state.codeFor === "installer");
  if (!isInstaller) {
    crumbs.push({ label: "[*] Commands", target: "star" });
    if (node) crumbs.push({ label: `${formatNodeCode(node)} ${readNodeLabel(node)}`, target: `node:${state.nodeId}` });
    return crumbs;
  }
  crumbs.push({ label: "Installer programming [*][8]", target: "installer" });
  if (!node || node.isKeypad) return crumbs;
  const section = node.section;
  const num = state.section ?? 0;
  const instance = describeInstance(section, num);
  crumbs.push({ label: node.groupLabel, target: null });
  crumbs.push({ label: `${formatSection(num)} ${section.label}${instance ? ` (${instance})` : ""}`, target: `section:${num}` });
  const sub = findSub(section, state.subCode);
  if (sub) crumbs.push({ label: `[${sub.code}] ${sub.label}`, target: `sub:${sub.code}` });
  if (state.mode === "data") {
    const entries = readEntries(section, num, sub);
    if (entries.length > 1) crumbs.push({ label: entries[state.entryIndex].label, target: null });
  }
  const result = crumbs;
  return result;
}

export function selectLocation(state: DscState, model: PanelModelData): Location {
  const section = readSection(state, model);
  const result: Location = {
    crumbs: buildCrumbs(state, model),
    waitingFor: describeWaiting(state, model),
    sectionNum: state.section,
    sectionSlug: section ? section.slug : null,
    subCode: state.subCode,
    isError: state.flash !== null && state.beep === "error",
  };
  return result;
}

export function selectWorksheet(state: DscState): Worksheet {
  const result = readWorksheet(state);
  return result;
}

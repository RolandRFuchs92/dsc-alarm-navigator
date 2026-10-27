/* DSC PowerSeries simulator state plus the lookups every part of the engine shares.
   Ported from src/app.js; the state is plain JSON so it can be compared, frozen and serialised. */
import { findSection } from "@/lib/content/find-section";
import { resolveRangeSection } from "@/lib/content/rules";
import type { EntryDef, KeypadCommandDef, OptionDef, PanelModelData, SectionDef, SubDef } from "@/lib/content/types";
import type { Worksheet } from "../types";

export type Mode =
  | "ready" | "star" | "code" | "section" | "sub" | "data" | "phone" | "toggle" | "module" | "action" | "confirm"
  | "bypass" | "trouble" | "info" | "cmdOut" | "userCodes" | "userFn";
export type Beep = "error" | "double" | "five";
export type PathChip = { key: string; label: string };
export type UserStep = "newCode" | "attrUser" | "partUser" | "attr" | "part";

export type DscState = {
  mode: Mode;
  nodeId: string | null; // section slug (s005) or command slug (k5)
  section: number | null;
  subCode: string | null;
  entryIndex: number;
  buffer: string;
  hex: boolean;
  page: 1 | 2;
  path: PathChip[]; // keys pressed so far, for the "you are here" chips
  codeFor: "installer" | "master" | "user" | null;
  installerCode: string;
  userTarget: string | null;
  userStep: UserStep | null;
  confirmStep: "code" | "repeat" | null;
  infoLine: string | null;
  flash: [string, string] | null;
  beep: Beep | null;
  bypassed: number[];
  values: Record<string, string>;
  toggles: Record<string, number[]>;
};

export type FoundNode =
  | { isKeypad: false; section: SectionDef; groupLabel: string }
  | { isKeypad: true; command: KeypadCommandDef };

export const HEX_DIGITS: Record<string, string> = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F" };

/* ---------- state ---------- */

export function createInitialState(model: PanelModelData, worksheet?: Worksheet): DscState {
  const toggles: Record<string, number[]> = {};
  Object.entries(worksheet?.toggles ?? {}).forEach(([k, list]) => { toggles[k] = [...list]; });
  const result: DscState = {
    mode: "ready",
    nodeId: null,
    section: null,
    subCode: null,
    entryIndex: 0,
    buffer: "",
    hex: false,
    page: 1,
    path: [],
    codeFor: null,
    installerCode: model.installerCodeDefault,
    userTarget: null,
    userStep: null,
    confirmStep: null,
    infoLine: null,
    flash: null,
    beep: null,
    bypassed: [],
    values: { ...(worksheet?.values ?? {}) },
    toggles,
  };
  return result;
}

export function resetToReady(state: DscState): DscState {
  const result: DscState = {
    ...state, mode: "ready", nodeId: null, section: null, subCode: null, entryIndex: 0, buffer: "", hex: false, page: 1,
    path: [], codeFor: null, userTarget: null, userStep: null, confirmStep: null, infoLine: null,
  };
  return result;
}

export function buildInstallerPath(state: DscState): PathChip[] {
  const result: PathChip[] = [
    { key: "*", label: "" },
    { key: "8", label: "Installer programming" },
    { key: state.installerCode, label: "Installer code" },
  ];
  return result;
}

export function openSectionPrompt(state: DscState): DscState {
  const result: DscState = {
    ...state, mode: "section", nodeId: null, section: null, subCode: null, entryIndex: 0, buffer: "", hex: false, page: 1,
    path: buildInstallerPath(state), confirmStep: null, infoLine: null,
  };
  return result;
}

/* ---------- lookups ---------- */

export function findNode(model: PanelModelData, slug: string | null): FoundNode | null {
  if (!slug) return null;
  const command = model.commands.find((c) => c.slug === slug);
  if (command) {
    const result: FoundNode = { isKeypad: true, command };
    return result;
  }
  let result: FoundNode | null = null;
  model.groups.some((group) => group.sections.some((section) => {
    const matches = section.slug === slug;
    if (matches) result = { isKeypad: false, section, groupLabel: group.label };
    return matches;
  }));
  return result;
}

// The section the state is in, or null when it is on a [*] command or idle.
export function readSection(state: DscState, model: PanelModelData): SectionDef | null {
  const node = findNode(model, state.nodeId);
  const result = node && !node.isKeypad ? node.section : null;
  return result;
}

export { findSection };

export function formatSection(num: number): string {
  const result = `[${String(num).padStart(3, "0")}]`;
  return result;
}

export function formatNodeCode(node: FoundNode): string {
  if (node.isKeypad) {
    const result = node.command.keys;
    return result;
  }
  const s = node.section;
  const result = s.range ? `${formatSection(s.range[0])}-${formatSection(s.range[1])}` : formatSection(s.num ?? 0);
  return result;
}

export function describeInstance(section: SectionDef, num: number): string {
  const result = section.range && section.rule ? resolveRangeSection(section, num).describe : "";
  return result;
}

export function findSub(section: SectionDef, code: string | null): SubDef | null {
  const result = code === null ? null : ((section.subs ?? []).find((s) => s.code === code) ?? null);
  return result;
}

export function readEntries(section: SectionDef, num: number, sub: SubDef | null): EntryDef[] {
  if (sub) {
    const result = sub.entries ?? [];
    return result;
  }
  const result = section.range && section.rule ? resolveRangeSection(section, num).entries : (section.entries ?? []);
  return result;
}

export function readOptions(section: SectionDef, num: number): OptionDef[] {
  const result = section.range && section.rule ? resolveRangeSection(section, num).options : (section.options ?? []);
  return result;
}

export function truncate(text: string, width: number): string {
  const result = text.length > width ? text.slice(0, width) : text;
  return result;
}

/* ---------- worksheet ---------- */

export function readValueKey(num: number | null, subCode: string | null, index: number): string {
  const result = `${num}|${subCode || ""}|${index}`;
  return result;
}

// Saved toggles for a section, or its factory defaults when it has never been opened.
export function readToggleSet(state: DscState, section: SectionDef, num: number): number[] {
  const saved = state.toggles[String(num)];
  const result = saved ?? readOptions(section, num).filter((o) => o.def).map((o) => o.n);
  return result;
}

export function flipNumber(list: number[], n: number): number[] {
  const result = list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b);
  return result;
}

// [701] option 5 switches access codes to 6 digits.
export function readCodeLength(state: DscState): number {
  const intl = state.toggles["701"];
  const result = intl && intl.includes(5) ? 6 : 4;
  return result;
}

export function readWorksheet(state: DscState): Worksheet {
  const result: Worksheet = { values: state.values, toggles: state.toggles };
  return result;
}

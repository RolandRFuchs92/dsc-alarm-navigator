/* Display helpers for sections and [*] commands, shared by the map UI and search.
   Pure and client-safe: no DB imports. Ported from src/app.js. */
import { resolveRangeSection } from "./rules";
import type { EntryDef, KeypadCommandDef, OptionDef, PanelModelData, SectionDef } from "./types";

export type LookupTable = { title: string; values: Record<string, string> };

export function formatSection(num: number): string {
  const result = `[${String(num).padStart(3, "0")}]`;
  return result;
}

// "[005]" for a section, "[202]-[265]" for a range, "[*][5][Master code]" for a command.
export function formatNodeCode(node: SectionDef | KeypadCommandDef): string {
  if ("keys" in node) {
    const result = node.keys;
    return result;
  }
  const result = node.range ? `${formatSection(node.range[0])}-${formatSection(node.range[1])}` : formatSection(node.num ?? 0);
  return result;
}

// Range sections describe each number ("Zones 9-16"); plain sections have nothing to add.
export function describeInstance(section: SectionDef, num: number | null): string {
  const inRange = section.range && section.rule && num !== null && num >= section.range[0] && num <= section.range[1];
  const result = inRange ? resolveRangeSection(section, num).describe : "";
  return result;
}

export function readEntries(section: SectionDef, num: number | null, subCode: string | null): EntryDef[] {
  const sub = subCode === null ? null : (section.subs ?? []).find((s) => s.code === subCode);
  if (sub) {
    const result = sub.entries ?? [];
    return result;
  }
  const inRange = section.range && section.rule && num !== null;
  const result = inRange ? resolveRangeSection(section, num).entries : (section.entries ?? []);
  return result;
}

export function readOptions(section: SectionDef, num: number | null): OptionDef[] {
  const inRange = section.range && section.rule && num !== null;
  const result = inRange ? resolveRangeSection(section, num).options : (section.options ?? []);
  return result;
}

// Lookups are stored as loose JSON; only hand out ones with the { title, values } shape.
export function readLookup(model: PanelModelData, key: string): LookupTable | null {
  const raw = model.lookups[key] as Partial<LookupTable> | undefined;
  const result = raw && typeof raw.title === "string" && raw.values && typeof raw.values === "object"
    ? { title: raw.title, values: raw.values }
    : null;
  return result;
}

export function readValueKey(num: number | null, subCode: string | null, index: number): string {
  const result = `${num}|${subCode || ""}|${index}`;
  return result;
}

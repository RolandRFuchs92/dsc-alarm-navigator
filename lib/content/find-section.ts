import type { PanelModelData, SectionDef } from "./types";

// Pure lookup with no DB imports, so client code (the keypad engine) can use it.
// An exact section number wins over a range that contains it.
export function findSection(model: PanelModelData, num: number): SectionDef | null {
  const all = model.groups.flatMap((g) => g.sections);
  const exact = all.find((s) => s.num === num);
  const result = exact ?? all.find((s) => s.range !== null && num >= s.range[0] && num <= s.range[1]) ?? null;
  return result;
}

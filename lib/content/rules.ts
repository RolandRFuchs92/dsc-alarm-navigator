import type { EntryDef, OptionDef, SectionDef } from "./types";

type Vars = Record<string, number>;

// Replace {name} with the variable's value; unknown names are left as written.
function fillTemplate(text: string, vars: Vars): string {
  const result = text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = name in vars ? String(vars[name]) : whole;
    return value;
  });
  return result;
}

// Work out i / group / first / last for section n from the rule kind.
function computeVars(rule: NonNullable<SectionDef["rule"]>, n: number): Vars {
  const index = n - rule.start;
  let result: Vars;
  if (rule.kind === "offset") {
    const i = index + rule.base;
    result = { i, group: i, first: i, last: i };
  } else if (rule.kind === "block") {
    const first = index * rule.size + rule.base + 1;
    const raw = first + rule.size - 1;
    const last = rule.max === undefined ? raw : Math.min(raw, rule.max);
    result = { i: index + 1, group: index + 1, first, last };
  } else {
    const within = index % rule.perGroup;
    const first = within * rule.size + 1;
    result = { i: index, group: Math.floor(index / rule.perGroup) + 1, first, last: first + rule.size - 1 };
  }
  return result;
}

function buildEntries(rule: NonNullable<SectionDef["rule"]>, vars: Vars): EntryDef[] {
  const t = rule.entries;
  const result: EntryDef[] = [];
  if (!t) return result;
  const count = t.labels ? t.labels.length : (t.count ?? (rule.kind === "offset" ? 1 : vars.last - vars.first + 1));
  for (let k = 1; k <= count; k += 1) {
    const item = vars.first + k - 1;
    const itemVars = { ...vars, k, item };
    const text = t.labels ? t.labels[k - 1] : (t.label ?? "");
    const entry: EntryDef = { label: fillTemplate(text, itemVars), digits: t.digits };
    const def = t.defByItem?.[String(item)] ?? t.def;
    if (def !== undefined) entry.def = def;
    if (t.lookup !== undefined) entry.lookup = t.lookup;
    if (t.note !== undefined) entry.note = fillTemplate(t.note, itemVars);
    result.push(entry);
  }
  return result;
}

function buildOptions(rule: NonNullable<SectionDef["rule"]>, vars: Vars, n: number): OptionDef[] {
  const t = rule.options;
  const result: OptionDef[] = [];
  if (!t) return result;
  const isDefault = rule.defaultWhen ? rule.defaultWhen.n === n : true;
  for (let k = 1; k <= t.count; k += 1) {
    const itemVars = { ...vars, k, item: vars.first + k - 1 };
    result.push({ n: k, on: fillTemplate(t.on, itemVars), off: fillTemplate(t.off, itemVars), def: t.def && isDefault });
  }
  return result;
}

// Resolve a range section ([202]-[265] etc.) for one section number from its stored rule.
export function resolveRangeSection(
  section: SectionDef,
  n: number,
): { describe: string; entries: EntryDef[]; options: OptionDef[] } {
  const rule = section.rule;
  if (!section.range || !rule) throw new RangeError(`Section ${section.slug} has no range rule`);
  if (n < section.range[0] || n > section.range[1]) {
    throw new RangeError(`[${n}] is outside [${section.range[0]}]-[${section.range[1]}]`);
  }
  const vars = computeVars(rule, n);
  // Fixed labels win over a describe template.
  const text = rule.labels ? (rule.labels[n - rule.start] ?? "") : fillTemplate(rule.describe ?? "", vars);
  const result = { describe: text, entries: buildEntries(rule, vars), options: buildOptions(rule, vars, n) };
  return result;
}

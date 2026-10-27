// One-off: converted the legacy static site's menu map (src/data.js, since retired) into
// PanelModelData and rendered it as the body of migrations/003_content_pc1864.sql.
// Its input is now a frozen fixture, tests/fixtures/legacy/data.js, kept so the parity
// test can keep checking the migration against it. New content goes in new migrations.
// Usage: npx tsx scripts/convert-legacy.ts > migrations/003_content_pc1864.sql
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ruleSchema } from "../lib/content/schemas";
import type {
  KeypadCommandDef,
  PanelModelData,
  SectionDef,
  SectionKind,
  SectionRule,
  RuleTemplates,
} from "../lib/content/types";

type Json = Record<string, unknown>;

// One section node as written in the legacy data.js (functions only on range sections).
export type LegacyNode = {
  id: string;
  num?: number;
  range?: [number, number];
  label: string;
  kind: SectionKind;
  desc?: string;
  subDigits?: number;
  subs?: unknown[];
  entries?: unknown[];
  options?: unknown[];
  tips?: string[];
  related?: string[];
  pages?: number;
  confirm?: boolean;
  danger?: boolean;
  describe?: (n: number) => string;
  entriesFor?: (n: number) => unknown[];
  optionsFor?: (n: number) => unknown[];
};
export type LegacyCommand = {
  id: string;
  keys: string[];
  label: string;
  desc: string;
  entries?: unknown[];
  attributes?: unknown[];
  tips?: string[];
  related?: string[];
};
export type LegacyData = {
  INSTALLER_GROUPS: Array<{ id: string; label: string; sections: LegacyNode[] }>;
  KEYPAD_COMMANDS: LegacyCommand[];
  LOOKUPS: Record<string, unknown>;
};

// Evaluate the frozen legacy data.js fixture in a bare vm context (build time only, never on user input).
// Top-level consts are not context properties, so a trailing expression hands them back.
export function loadLegacyData(): LegacyData {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures", "legacy", "data.js");
  const source = `${fs.readFileSync(file, "utf8")}\n;({ INSTALLER_GROUPS, KEYPAD_COMMANDS, LOOKUPS })`;
  const result = vm.runInNewContext(source, {}) as LegacyData;
  return result;
}

type Rule = SectionRule & RuleTemplates;

// Hand-written rule per range section; the parity test is the gate. Sections whose entries or
// options do not depend on n keep them as static lists and the rule only supplies the label.
const offsetOf = (start: number, describe: string): Rule => ({ kind: "offset", start, base: 1, describe });
const partitionOffset = (start: number): Rule => offsetOf(start, "Partition {i}");
const zoneBlock = (start: number, entries: Rule["entries"]): Rule => ({
  kind: "block", start, size: 16, base: 0, describe: "Zones {first}-{last}", entries,
});
const codeBlock = (start: number, base: number, max?: number): Rule => ({
  kind: "block", start, size: 16, base, ...(max === undefined ? {} : { max }),
  describe: "Users {first}-{last}", entries: { label: "Code {item}", digits: 2 },
});

const RULE_OVERRIDES: Record<string, Rule> = {
  s001: zoneBlock(1, {
    label: "Zone {item}", digits: 2, def: "00", lookup: "zoneTypes",
    defByItem: { "1": "01", "2": "03", "3": "03", "4": "03", "5": "04", "6": "04", "7": "04", "8": "04" },
  }),
  s101: offsetOf(101, "Zone {i}"),
  s501: offsetOf(501, "PGM {i}"),
  s551: offsetOf(551, "PGM {i}"),
  s181: partitionOffset(181),
  s191: partitionOffset(191),
  s681: partitionOffset(681),
  s691: partitionOffset(691),
  s202: {
    kind: "grid", start: 202, perGroup: 8, size: 8, describe: "Partition {group}, zones {first}-{last}",
    options: { count: 8, on: "Zone {item} on this partition", off: "Not on this partition", def: true },
    defaultWhen: { n: 202 },
  },
  s301: { kind: "offset", start: 301, base: 1, labels: ["1st number", "2nd number", "3rd number (backup for 1st)"] },
  s311: partitionOffset(311),
  s351: partitionOffset(351),
  s359: partitionOffset(359),
  s367: partitionOffset(367),
  s320: zoneBlock(320, { label: "Zone {item}", digits: 2 }),
  s324: zoneBlock(324, { label: "Zone {item}", digits: 2 }),
  s330: zoneBlock(330, { label: "Zone {item}", digits: 2 }),
  s334: zoneBlock(334, { label: "Zone {item}", digits: 2 }),
  s339: { ...codeBlock(339, 0), describe: "Users {first}-{last}" },
  s342: { ...codeBlock(342, 0), describe: "Users {first}-{last}" },
  s601: codeBlock(601, 32, 95),
  s605: codeBlock(605, 32, 95),
};

// Content flagged as not yet checked against the installation guide.
const UNVERIFIED = new Set(["s501", "s311"]);

// Drop undefined-valued keys the way jsonb storage would.
function stripUndefined<T>(value: T): T {
  const result = JSON.parse(JSON.stringify(value)) as T;
  return result;
}

function convertSection(node: LegacyNode): SectionDef {
  const rule = node.range ? (RULE_OVERRIDES[node.id] ?? null) : null;
  if (node.range && !rule) throw new Error(`No rule override for range section ${node.id}`);
  if (rule) ruleSchema.parse(rule);
  // Static lists: fixed sections keep theirs; range sections keep them only when the rule has no template
  // for them (the lists then don't depend on n, so the first section's output stands for all).
  const first = node.range ? node.range[0] : 0;
  const entries = node.range
    ? (rule?.entries ? null : node.entriesFor ? node.entriesFor(first) : (node.entries ?? null))
    : (node.entries ?? null);
  const options = node.range
    ? (rule?.options ? null : node.optionsFor ? node.optionsFor(first) : (node.options ?? null))
    : (node.options ?? null);
  const result: SectionDef = stripUndefined({
    slug: node.id,
    num: node.num ?? null,
    range: node.range ?? null,
    label: node.label,
    kind: node.kind,
    description: node.desc ?? "",
    subDigits: node.subDigits ?? null,
    rule,
    entries: entries as SectionDef["entries"],
    options: options as SectionDef["options"],
    subs: (node.subs ?? null) as SectionDef["subs"],
    tips: node.tips ?? [],
    related: node.related ?? [],
    pages: node.pages ?? 1,
    confirm: node.confirm ?? false,
    danger: node.danger ?? false,
    verified: !UNVERIFIED.has(node.id),
  });
  return result;
}

function convertCommand(cmd: LegacyCommand): KeypadCommandDef {
  const payload: KeypadCommandDef["payload"] = {};
  if (cmd.entries) payload.entries = cmd.entries as never;
  if (cmd.attributes) payload.attributes = cmd.attributes as never;
  if (cmd.tips) payload.tips = cmd.tips;
  if (cmd.related) payload.related = cmd.related;
  const result: KeypadCommandDef = stripUndefined({
    slug: cmd.id,
    // Keys are stored as they are shown on screen, e.g. [*][5][Master code].
    keys: cmd.keys.map((k) => `[${k}]`).join(""),
    label: cmd.label,
    kind: "command",
    description: cmd.desc,
    payload,
  });
  return result;
}

export function convertLegacy(data: LegacyData): PanelModelData {
  const result: PanelModelData = {
    slug: "pc1864",
    name: "PC1864",
    firmware: "4.2",
    installerCodeDefault: "5555",
    masterCodeDefault: "1234",
    engineKey: "dsc-powerseries",
    groups: data.INSTALLER_GROUPS.map((g) => ({ slug: g.id, label: g.label, sections: g.sections.map(convertSection) })),
    commands: data.KEYPAD_COMMANDS.map(convertCommand),
    lookups: stripUndefined(data.LOOKUPS),
    keypads: [
      { slug: "pk5500", name: "PK5500", componentKey: "pk5500", displayType: "text", lightCount: null, isDefault: true },
      { slug: "pk5508", name: "PK5508", componentKey: "pk-led", displayType: "lights", lightCount: 8, isDefault: false },
      { slug: "pk5516", name: "PK5516", componentKey: "pk-led", displayType: "lights", lightCount: 16, isDefault: false },
    ],
  };
  return result;
}

const SOURCE_DOC = "29007359R003";
const PANEL = "(SELECT id FROM panel_model WHERE slug = 'pc1864')";

// Dollar-quote a value so apostrophes need no escaping; refuse content that would close the quote.
function quote(text: string): string {
  if (text.includes("$q$")) throw new Error("Content contains the $q$ dollar-quote tag");
  const result = `$q$${text}$q$`;
  return result;
}
const jsonb = (value: unknown): string => `${quote(JSON.stringify(value))}::jsonb`;
const nullable = (value: number | null): string => (value === null ? "NULL" : String(value));
const orNull = (value: unknown): string => (value === null ? "NULL" : jsonb(value));

export function renderContentSql(model: PanelModelData): string {
  const out: string[] = [];
  out.push(
    "-- PC1864 content converted from the legacy src/data.js by scripts/convert-legacy.ts.",
    "-- Generated: regenerate with `npx tsx scripts/convert-legacy.ts > migrations/003_content_pc1864.sql`; do not edit by hand.",
    "",
    `INSERT INTO manufacturer (slug, name) VALUES ('dsc', 'DSC');`,
    `INSERT INTO panel_family (manufacturer_id, slug, name, engine_key)`,
    `	SELECT id, 'dsc-powerseries', 'PowerSeries', ${quote(model.engineKey)} FROM manufacturer WHERE slug = 'dsc';`,
    `INSERT INTO panel_model (family_id, slug, name, firmware, installer_code_default, master_code_default, source_doc)`,
    `	SELECT id, ${quote(model.slug)}, ${quote(model.name)}, ${quote(model.firmware)}, ${quote(model.installerCodeDefault)}, ${quote(model.masterCodeDefault)}, ${quote(SOURCE_DOC)}`,
    `	FROM panel_family WHERE slug = 'dsc-powerseries';`,
    "",
  );
  for (const k of model.keypads) {
    out.push(
      `INSERT INTO keypad_model (family_id, slug, name, component_key, display_type, light_count)`,
      `	SELECT id, ${quote(k.slug)}, ${quote(k.name)}, ${quote(k.componentKey)}, ${quote(k.displayType)}, ${nullable(k.lightCount)}`,
      `	FROM panel_family WHERE slug = 'dsc-powerseries';`,
      `INSERT INTO panel_model_keypad (panel_model_id, keypad_model_id, is_default)`,
      `	SELECT ${PANEL}, id, ${k.isDefault} FROM keypad_model WHERE slug = ${quote(k.slug)};`,
    );
  }
  out.push("");
  model.groups.forEach((g, gi) => {
    out.push(
      `INSERT INTO menu_group (panel_model_id, slug, label, position)`,
      `	VALUES (${PANEL}, ${quote(g.slug)}, ${quote(g.label)}, ${gi});`,
    );
  });
  out.push("");
  model.groups.forEach((g) => {
    g.sections.forEach((s, si) => {
      out.push(
        `INSERT INTO section (panel_model_id, group_id, slug, num, range_start, range_end, kind, label, description, sub_digits, rule, entries, options, subs, tips, related, pages, confirm, danger, verified, position)`,
        `	SELECT ${PANEL}, id, ${quote(s.slug)}, ${nullable(s.num)}, ${nullable(s.range ? s.range[0] : null)}, ${nullable(s.range ? s.range[1] : null)}, ${quote(s.kind)}, ${quote(s.label)}, ${quote(s.description)}, ${nullable(s.subDigits)}, ${orNull(s.rule)}, ${orNull(s.entries)}, ${orNull(s.options)}, ${orNull(s.subs)}, ${jsonb(s.tips)}, ${jsonb(s.related)}, ${s.pages}, ${s.confirm}, ${s.danger}, ${s.verified}, ${si}`,
        `	FROM menu_group WHERE panel_model_id = ${PANEL} AND slug = ${quote(g.slug)};`,
      );
    });
  });
  out.push("");
  model.commands.forEach((c, ci) => {
    out.push(
      `INSERT INTO keypad_command (panel_model_id, slug, keys, label, kind, description, position, payload)`,
      `	VALUES (${PANEL}, ${quote(c.slug)}, ${quote(c.keys)}, ${quote(c.label)}, ${quote(c.kind)}, ${quote(c.description)}, ${ci}, ${jsonb(c.payload)});`,
    );
  });
  out.push("");
  for (const key of Object.keys(model.lookups)) {
    out.push(`INSERT INTO lookup (panel_model_id, key, values) VALUES (${PANEL}, ${quote(key)}, ${jsonb(model.lookups[key])});`);
  }
  out.push("", "---- create above / drop below ----", "", `DELETE FROM manufacturer WHERE slug = 'dsc';`, "");
  const result = out.join("\n");
  return result;
}

// Run as a script: print the migration to stdout.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(renderContentSql(convertLegacy(loadLegacyData())));
}

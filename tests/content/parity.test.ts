import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadLegacyData, convertLegacy, renderContentSql } from "@/scripts/convert-legacy";
import type { LegacyNode } from "@/scripts/convert-legacy";
import { resolveRangeSection } from "@/lib/content/rules";
import {
  entriesSchema,
  keypadCommandPayloadSchema,
  lookupValuesSchema,
  optionsSchema,
  ruleSchema,
  subsSchema,
  stringListSchema,
} from "@/lib/content/schemas";
import type { SectionDef } from "@/lib/content/types";

// Strip undefined-valued keys the way jsonb storage does, so deep equality compares stored shape.
function normalize<T>(value: T): T {
  const result = JSON.parse(JSON.stringify(value)) as T;
  return result;
}

const legacy = loadLegacyData();
const model = convertLegacy(legacy);
const converted = new Map<string, SectionDef>();
for (const g of model.groups) for (const s of g.sections) converted.set(s.slug, s);
const legacyNodes: LegacyNode[] = legacy.INSTALLER_GROUPS.flatMap((g) => g.sections);

const stats = { fixed: 0, ranges: 0, numbers: 0, mismatches: 0 };

describe("legacy content parity", () => {
  it("keeps every section, command and lookup key", () => {
    expect(legacyNodes).toHaveLength(109);
    expect(converted.size).toBe(109);
    expect(model.groups.map((g) => g.slug)).toEqual(legacy.INSTALLER_GROUPS.map((g) => g.id));
    expect(model.commands.map((c) => c.slug)).toEqual(legacy.KEYPAD_COMMANDS.map((c) => c.id));
    expect(Object.keys(model.lookups)).toEqual(Object.keys(legacy.LOOKUPS));
    expect(model.lookups).toEqual(normalize(legacy.LOOKUPS));
  });

  it("converts fixed sections field for field", () => {
    for (const node of legacyNodes.filter((n) => !n.range)) {
      const got = converted.get(node.id)!;
      expect(got, node.id).toBeDefined();
      expect(got.range, node.id).toBeNull();
      expect(got.rule, node.id).toBeNull();
      expect(got.num, node.id).toBe(node.num);
      expect(got.label).toBe(node.label);
      expect(got.kind).toBe(node.kind);
      expect(got.description, node.id).toBe(node.desc ?? "");
      expect(got.subDigits, node.id).toBe(node.subDigits ?? null);
      expect(got.entries, node.id).toEqual(node.entries ? normalize(node.entries) : null);
      expect(got.options, node.id).toEqual(node.options ? normalize(node.options) : null);
      expect(got.subs, node.id).toEqual(node.subs ? normalize(node.subs) : null);
      expect(got.tips, node.id).toEqual(node.tips ?? []);
      expect(got.related, node.id).toEqual(node.related ?? []);
      expect(got.pages, node.id).toBe(node.pages ?? 1);
      expect(got.confirm, node.id).toBe(node.confirm ?? false);
      expect(got.danger, node.id).toBe(node.danger ?? false);
      stats.fixed += 1;
    }
  });

  it("resolves every range section to the legacy output for every n", () => {
    for (const node of legacyNodes.filter((n) => n.range)) {
      const got = converted.get(node.id)!;
      expect(got.range, node.id).toEqual(node.range);
      expect(got.rule, node.id).not.toBeNull();
      expect(got.num).toBeNull();
      expect(got.label).toBe(node.label);
      expect(got.kind).toBe(node.kind);
      expect(got.description, node.id).toBe(node.desc ?? "");
      expect(got.tips, node.id).toEqual(node.tips ?? []);
      expect(got.related, node.id).toEqual(node.related ?? []);
      expect(got.pages, node.id).toBe(node.pages ?? 1);
      const [from, to] = node.range!;
      for (let n = from; n <= to; n += 1) {
        const resolved = resolveRangeSection(got, n);
        const want = {
          describe: node.describe ? node.describe(n) : "",
          entries: normalize(node.entriesFor ? node.entriesFor(n) : (node.entries ?? [])),
          options: normalize(node.optionsFor ? node.optionsFor(n) : (node.options ?? [])),
        };
        expect(resolved, `${node.id} [${n}]`).toEqual(want);
        stats.numbers += 1;
      }
      stats.ranges += 1;
    }
    console.log(`parity: ${stats.fixed} fixed + ${stats.ranges} range sections, ${stats.numbers} section numbers checked, ${stats.mismatches} mismatches`);
    expect(stats.ranges).toBe(22);
  });

  it("converts every keypad command", () => {
    for (const cmd of legacy.KEYPAD_COMMANDS) {
      const got = model.commands.find((c) => c.slug === cmd.id)!;
      expect(got.keys).toBe(cmd.keys.map((k) => `[${k}]`).join(""));
      expect(got.label).toBe(cmd.label);
      expect(got.kind).toBe("command");
      expect(got.description).toBe(cmd.desc);
      expect(got.payload.entries).toEqual(cmd.entries ? normalize(cmd.entries) : undefined);
      expect(got.payload.attributes).toEqual(cmd.attributes ? normalize(cmd.attributes) : undefined);
      expect(got.payload.tips).toEqual(cmd.tips);
      expect(got.payload.related).toEqual(cmd.related);
    }
  });

  it("marks only s501 and s311 unverified", () => {
    const unverified = [...converted.values()].filter((s) => !s.verified).map((s) => s.slug).sort();
    expect(unverified).toEqual(["s311", "s501"]);
  });

  it("stores only data the zod schemas accept", () => {
    for (const s of converted.values()) {
      if (s.rule) ruleSchema.parse(s.rule);
      if (s.entries) entriesSchema.parse(s.entries);
      if (s.options) optionsSchema.parse(s.options);
      if (s.subs) subsSchema.parse(s.subs);
      stringListSchema.parse(s.tips);
      stringListSchema.parse(s.related);
    }
    for (const c of model.commands) keypadCommandPayloadSchema.parse(c.payload);
    for (const v of Object.values(model.lookups)) lookupValuesSchema.parse(v);
  });

  it("describes the pc1864 model and its keypads", () => {
    expect(model).toMatchObject({ slug: "pc1864", name: "PC1864", firmware: "4.2", installerCodeDefault: "5555", masterCodeDefault: "1234", engineKey: "dsc-powerseries" });
    expect(model.keypads).toEqual([
      { slug: "pk5500", name: "PK5500", componentKey: "pk5500", displayType: "text", lightCount: null, isDefault: true },
      { slug: "pk5508", name: "PK5508", componentKey: "pk-led", displayType: "lights", lightCount: 8, isDefault: false },
      { slug: "pk5516", name: "PK5516", componentKey: "pk-led", displayType: "lights", lightCount: 16, isDefault: false },
    ]);
  });

  it("renders deterministic SQL that matches the committed migration", () => {
    const sql = renderContentSql(model);
    expect(renderContentSql(convertLegacy(loadLegacyData()))).toBe(sql);
    expect(sql).toContain("---- create above / drop below ----");
    const file = fs.readFileSync(path.join(process.cwd(), "migrations/003_content_pc1864.sql"), "utf8");
    expect(file).toBe(sql);
  });

  // Task 7 enables this once getPanelModel exists: migrate dsc_test, read pc1864 back, deep-equal to `model`.
  it.todo("round-trips through dsc_test via getPanelModel('pc1864')");
});

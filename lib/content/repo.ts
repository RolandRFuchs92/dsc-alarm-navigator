import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  guide,
  guideStep,
  keypadCommand,
  keypadModel,
  lookup,
  manufacturer,
  menuGroup,
  panelFamily,
  panelModel,
  panelModelKeypad,
  section,
  userKeypadChoice,
} from "@/lib/db/schema";
import {
  entriesSchema,
  keypadCommandPayloadSchema,
  lookupValuesSchema,
  optionsSchema,
  ruleSchema,
  stringListSchema,
  subsSchema,
} from "./schemas";
import type { KeypadCommandDef, KeypadModelDef, PanelModelData, SectionDef } from "./types";

export type GuideSummary = { slug: string; title: string; summary: string; danger: boolean; verified: boolean };
export type GuideStep = {
  position: number;
  title: string;
  keys: string;
  note: string | null;
  warning: string | null;
  sectionRef: number | null;
};
export type GuideWithSteps = GuideSummary & { steps: GuideStep[] };

export class UnknownModelError extends Error {
  constructor(slug: string) {
    super(`Unknown panel model: ${slug}`);
    this.name = "UnknownModelError";
  }
}

export class KeypadNotOfferedError extends Error {
  constructor(modelSlug: string, keypadSlug: string) {
    super(`Keypad ${keypadSlug} is not offered for model ${modelSlug}`);
    this.name = "KeypadNotOfferedError";
  }
}

async function listPanelModels(): Promise<Array<{ slug: string; name: string; firmware: string; manufacturer: string }>> {
  const rows = await db
    .select({ slug: panelModel.slug, name: panelModel.name, firmware: panelModel.firmware, manufacturer: manufacturer.name })
    .from(panelModel)
    .innerJoin(panelFamily, eq(panelModel.familyId, panelFamily.id))
    .innerJoin(manufacturer, eq(panelFamily.manufacturerId, manufacturer.id))
    .orderBy(asc(manufacturer.name), asc(panelModel.name));
  return rows;
}

// Null columns stay null; non-null jsonb is validated before it leaves the repo.
function parseNullable<T>(parse: (v: unknown) => T, value: unknown): T | null {
  const result = value === null || value === undefined ? null : parse(value);
  return result;
}

async function loadPanelModel(slug: string): Promise<PanelModelData | null> {
  const [model] = await db
    .select({ row: panelModel, engineKey: panelFamily.engineKey })
    .from(panelModel)
    .innerJoin(panelFamily, eq(panelModel.familyId, panelFamily.id))
    .where(eq(panelModel.slug, slug));
  if (!model) return null;
  const modelId = model.row.id;

  const groupRows = await db.select().from(menuGroup).where(eq(menuGroup.panelModelId, modelId)).orderBy(asc(menuGroup.position));
  const sectionRows = await db
    .select()
    .from(section)
    .where(eq(section.panelModelId, modelId))
    .orderBy(asc(section.position));
  const commandRows = await db
    .select()
    .from(keypadCommand)
    .where(eq(keypadCommand.panelModelId, modelId))
    .orderBy(asc(keypadCommand.position));
  const lookupRows = await db.select().from(lookup).where(eq(lookup.panelModelId, modelId)).orderBy(asc(lookup.key));
  const keypadRows = await db
    .select({ k: keypadModel, isDefault: panelModelKeypad.isDefault })
    .from(panelModelKeypad)
    .innerJoin(keypadModel, eq(panelModelKeypad.keypadModelId, keypadModel.id))
    .where(eq(panelModelKeypad.panelModelId, modelId))
    .orderBy(asc(keypadModel.id));

  const sectionsByGroup = new Map<number, SectionDef[]>();
  for (const r of sectionRows) {
    const def: SectionDef = {
      slug: r.slug,
      num: r.num,
      range: r.rangeStart !== null && r.rangeEnd !== null ? [r.rangeStart, r.rangeEnd] : null,
      label: r.label,
      kind: r.kind,
      description: r.description,
      subDigits: r.subDigits,
      rule: parseNullable((v) => ruleSchema.parse(v), r.rule) as SectionDef["rule"],
      entries: parseNullable((v) => entriesSchema.parse(v), r.entries),
      options: parseNullable((v) => optionsSchema.parse(v), r.options),
      subs: parseNullable((v) => subsSchema.parse(v), r.subs) as SectionDef["subs"],
      tips: stringListSchema.parse(r.tips),
      related: stringListSchema.parse(r.related),
      pages: r.pages,
      confirm: r.confirm,
      danger: r.danger,
      verified: r.verified,
    };
    const list = sectionsByGroup.get(r.groupId) ?? [];
    list.push(def);
    sectionsByGroup.set(r.groupId, list);
  }

  const commands: KeypadCommandDef[] = commandRows.map((c) => ({
    slug: c.slug,
    keys: c.keys,
    label: c.label,
    kind: c.kind,
    description: c.description,
    payload: keypadCommandPayloadSchema.parse(c.payload),
  }));

  const lookups: Record<string, unknown> = {};
  for (const l of lookupRows) lookups[l.key] = lookupValuesSchema.parse(l.values);

  const keypads: KeypadModelDef[] = keypadRows.map(({ k, isDefault }) => ({
    slug: k.slug,
    name: k.name,
    componentKey: k.componentKey,
    displayType: k.displayType,
    lightCount: k.lightCount,
    isDefault,
  }));

  const result: PanelModelData = {
    slug: model.row.slug,
    name: model.row.name,
    firmware: model.row.firmware,
    installerCodeDefault: model.row.installerCodeDefault,
    masterCodeDefault: model.row.masterCodeDefault,
    engineKey: model.engineKey,
    groups: groupRows.map((g) => ({ slug: g.slug, label: g.label, sections: sectionsByGroup.get(g.id) ?? [] })),
    commands,
    lookups,
    keypads,
  };
  return result;
}

// Per-request memo inside Next; a passthrough elsewhere (vitest).
const getPanelModel = cache(loadPanelModel);

// Exact num match first, then the section whose range contains num.
function findSection(model: PanelModelData, num: number): SectionDef | null {
  const all = model.groups.flatMap((g) => g.sections);
  const exact = all.find((s) => s.num === num);
  const result = exact ?? all.find((s) => s.range !== null && num >= s.range[0] && num <= s.range[1]) ?? null;
  return result;
}

async function findModelId(slug: string): Promise<number | null> {
  const [row] = await db.select({ id: panelModel.id }).from(panelModel).where(eq(panelModel.slug, slug));
  const result = row?.id ?? null;
  return result;
}

async function listGuides(modelSlug: string): Promise<GuideSummary[]> {
  const rows = await db
    .select({ slug: guide.slug, title: guide.title, summary: guide.summary, danger: guide.danger, verified: guide.verified })
    .from(guide)
    .innerJoin(panelModel, eq(guide.panelModelId, panelModel.id))
    .where(eq(panelModel.slug, modelSlug))
    .orderBy(asc(guide.position), asc(guide.id));
  return rows;
}

async function getGuide(modelSlug: string, guideSlug: string): Promise<GuideWithSteps | null> {
  const [g] = await db
    .select({ id: guide.id, slug: guide.slug, title: guide.title, summary: guide.summary, danger: guide.danger, verified: guide.verified })
    .from(guide)
    .innerJoin(panelModel, eq(guide.panelModelId, panelModel.id))
    .where(and(eq(panelModel.slug, modelSlug), eq(guide.slug, guideSlug)));
  if (!g) return null;
  const stepRows = await db.select().from(guideStep).where(eq(guideStep.guideId, g.id)).orderBy(asc(guideStep.position));
  const steps: GuideStep[] = stepRows.map((s) => ({
    position: s.position,
    title: s.title,
    keys: s.keys,
    note: s.note === "" ? null : s.note,
    warning: s.warning,
    sectionRef: s.sectionRef,
  }));
  const result: GuideWithSteps = { slug: g.slug, title: g.title, summary: g.summary, danger: g.danger, verified: g.verified, steps };
  return result;
}

async function getKeypadChoice(userId: string, modelSlug: string): Promise<string | null> {
  const [row] = await db
    .select({ slug: keypadModel.slug })
    .from(userKeypadChoice)
    .innerJoin(panelModel, eq(userKeypadChoice.panelModelId, panelModel.id))
    .innerJoin(keypadModel, eq(userKeypadChoice.keypadModelId, keypadModel.id))
    .where(and(eq(userKeypadChoice.userId, userId), eq(panelModel.slug, modelSlug)));
  const result = row?.slug ?? null;
  return result;
}

async function saveKeypadChoice(userId: string, modelSlug: string, keypadSlug: string): Promise<void> {
  const modelId = await findModelId(modelSlug);
  if (modelId === null) throw new UnknownModelError(modelSlug);
  const [offered] = await db
    .select({ id: keypadModel.id })
    .from(panelModelKeypad)
    .innerJoin(keypadModel, eq(panelModelKeypad.keypadModelId, keypadModel.id))
    .where(and(eq(panelModelKeypad.panelModelId, modelId), eq(keypadModel.slug, keypadSlug)));
  if (!offered) throw new KeypadNotOfferedError(modelSlug, keypadSlug);
  await db
    .insert(userKeypadChoice)
    .values({ userId, panelModelId: modelId, keypadModelId: offered.id })
    .onConflictDoUpdate({
      target: [userKeypadChoice.userId, userKeypadChoice.panelModelId],
      set: { keypadModelId: offered.id },
    });
}

export { listPanelModels, getPanelModel, findSection, listGuides, getGuide, getKeypadChoice, saveKeypadChoice };

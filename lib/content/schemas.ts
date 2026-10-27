import { z } from "zod";

// One zod schema per jsonb column in migrations/002_catalog.sql.

export const entrySchema = z.object({
  label: z.string(),
  digits: z.number().int(),
  def: z.string().optional(),
  lookup: z.string().optional(),
  note: z.string().optional(),
  variable: z.boolean().optional(),
});
export const entriesSchema = z.array(entrySchema);

export const optionSchema = z.object({
  n: z.number().int(),
  on: z.string(),
  off: z.string(),
  def: z.boolean(),
});
export const optionsSchema = z.array(optionSchema);

export const subSchema = z.object({
  code: z.string(),
  label: z.string(),
  entries: entriesSchema.optional(),
  options: optionsSchema.optional(),
});
export const subsSchema = z.array(subSchema);

export const stringListSchema = z.array(z.string());
export const numberListSchema = z.array(z.number().int());

// Template lists generated from the rule variables; {k} runs 1..count and the
// text may use {i}, {group}, {first}, {last} and arithmetic such as {first + k - 1}.
export const entryTemplateSchema = z.object({
  count: z.number().int().positive(),
  label: z.string(),
  digits: z.number().int(),
  def: z.string().optional(),
  lookup: z.string().optional(),
  note: z.string().optional(),
});
export const optionTemplateSchema = z.object({
  count: z.number().int().positive(),
  on: z.string(),
  off: z.string(),
  def: z.boolean(),
});

const templates = {
  describe: z.string().optional(),
  labels: z.array(z.string()).optional(),
  entries: entryTemplateSchema.optional(),
  options: optionTemplateSchema.optional(),
  defaultWhen: z.object({ n: z.number().int() }).optional(),
};

// Fixed vocabulary; a new pattern means a code change. Unknown kinds are rejected.
export const ruleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("offset"), start: z.number().int(), base: z.number().int(), ...templates }),
  z.object({
    kind: z.literal("block"),
    start: z.number().int(),
    size: z.number().int(),
    base: z.number().int(),
    max: z.number().int().optional(),
    ...templates,
  }),
  z.object({
    kind: z.literal("grid"),
    start: z.number().int(),
    perGroup: z.number().int(),
    size: z.number().int(),
    ...templates,
  }),
]);

export const lookupValuesSchema = z.record(z.string(), z.unknown());

// keypad_command.payload: everything beyond the dedicated columns.
export const keypadCommandPayloadSchema = z.object({
  entries: z.array(z.object({ label: z.string(), note: z.string().optional() })).optional(),
  attributes: z.array(z.object({ n: z.number().int(), on: z.string() })).optional(),
  tips: stringListSchema.optional(),
  related: stringListSchema.optional(),
});

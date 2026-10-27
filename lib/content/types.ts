import type { z } from "zod";
import type {
  entryTemplateSchema,
  keypadCommandPayloadSchema,
  optionTemplateSchema,
} from "./schemas";

export type SectionKind = "data" | "toggle" | "sub" | "phone" | "action" | "module";

export type EntryDef = { label: string; digits: number; def?: string; lookup?: string; note?: string; variable?: boolean };
export type OptionDef = { n: number; on: string; off: string; def: boolean; future?: boolean };
export type SubDef = { code: string; label: string; entries?: EntryDef[]; options?: OptionDef[] };

export type EntryTemplate = z.infer<typeof entryTemplateSchema>;
export type OptionTemplate = z.infer<typeof optionTemplateSchema>;

export type SectionRule =
  | { kind: "offset"; start: number; base: number }
  | { kind: "block"; start: number; size: number; base: number; max?: number }
  | { kind: "grid"; start: number; perGroup: number; size: number };

export type RuleTemplates = {
  describe?: string;
  labels?: string[];
  entries?: EntryTemplate;
  options?: OptionTemplate;
  defaultWhen?: { n: number };
};

export type SectionDef = {
  slug: string;
  num: number | null;
  range: [number, number] | null;
  label: string;
  kind: SectionKind;
  description: string;
  subDigits: number | null;
  rule: (SectionRule & RuleTemplates) | null;
  entries: EntryDef[] | null;
  options: OptionDef[] | null;
  subs: SubDef[] | null;
  tips: string[];
  related: string[];
  pages: number;
  confirm: boolean;
  danger: boolean;
  verified: boolean;
};

export type KeypadCommandPayload = z.infer<typeof keypadCommandPayloadSchema>;
export type KeypadCommandDef = {
  slug: string;
  keys: string;
  label: string;
  kind: string;
  description: string;
  payload: KeypadCommandPayload;
};

export type KeypadModelDef = {
  slug: string;
  name: string;
  componentKey: string;
  displayType: "text" | "icons" | "lights";
  lightCount: number | null;
  isDefault: boolean;
};

export type PanelModelData = {
  slug: string;
  name: string;
  firmware: string;
  installerCodeDefault: string;
  masterCodeDefault: string;
  engineKey: string;
  groups: Array<{ slug: string; label: string; sections: SectionDef[] }>;
  commands: KeypadCommandDef[];
  lookups: Record<string, unknown>;
  keypads: KeypadModelDef[];
};

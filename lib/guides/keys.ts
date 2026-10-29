import type { PanelModelData } from "@/lib/content/types";
import type { Key } from "@/lib/engines/types";

import { getEngine } from "@/lib/engines";

// Guide key strings: space-separated tokens. The engine's keys (minus F, M, P) plus code placeholders.
// Maps, not object literals: `in` would also match prototype keys such as "constructor".
const PLACEHOLDER_LABELS = new Map<string, string>([["{installer}", "installer code"], ["{master}", "master code"]]);
// Extra placeholders per engine key; {installer} and {master} work for every engine.
const ENGINE_PLACEHOLDERS = new Map<string, Map<string, string>>([
  ["ids-xseries", new Map([["{user-code}", "the code to change"], ["{new-code}", "the new code"]])],
]);
// What a placeholder replays as. Engine placeholders only reach here after splitTokens accepted them for the engine.
const NEW_CODE_REPLAY = "4321";
// Keys that guides never name, because a guide can't know which programming mode they'd enter.
const FORBIDDEN_GUIDE_KEYS = new Set<string>(["f", "m", "p"]);
const KEYCAP_LABELS = new Map<string, string>([["hold*", "hold *"], ["hold9", "hold 9"], ["mode", "MODE"]]);

export type Keycap = { label: string; placeholder: boolean };

export class KeyTokenError extends Error {
  token: string;
  constructor(token: string) {
    super(`Invalid guide key token "${token}"`);
    this.name = "KeyTokenError";
    this.token = token;
  }
}

function listPlaceholders(engineKey: string): Map<string, string> {
  const result = new Map([...PLACEHOLDER_LABELS, ...(ENGINE_PLACEHOLDERS.get(engineKey) ?? [])]);
  return result;
}

function splitTokens(keys: string, engineKey: string): string[] {
  const plain = new Set<string>(getEngine(engineKey).keys.filter((k) => !FORBIDDEN_GUIDE_KEYS.has(k)));
  const placeholders = listPlaceholders(engineKey);
  const tokens = keys.split(/\s+/).filter(Boolean);
  tokens.forEach((t) => {
    if (!plain.has(t) && !placeholders.has(t)) throw new KeyTokenError(t);
  });
  const result = tokens;
  return result;
}

// "* 8 {installer}" → ["*", "8", "5", "5", "5", "5"] using the model's default codes.
export function parseKeys(keys: string, model: PanelModelData): Key[] {
  const codes = new Map<string, string>([
    ["{installer}", model.installerCodeDefault],
    ["{master}", model.masterCodeDefault],
    ["{user-code}", model.masterCodeDefault], // the code to change: the master code is the one code a fresh panel has
    ["{new-code}", NEW_CODE_REPLAY],
  ]);
  const result = splitTokens(keys, model.engineKey).flatMap((t) => codes.get(t)?.split("") ?? [t]) as Key[];
  return result;
}

// What the step card draws: one cap per token, placeholders as a single labelled cap.
export function formatKeycaps(keys: string, engineKey: string): Keycap[] {
  const placeholders = listPlaceholders(engineKey);
  const result = splitTokens(keys, engineKey).map((t) => {
    const label = placeholders.get(t);
    return label !== undefined ? { label, placeholder: true } : { label: KEYCAP_LABELS.get(t) ?? t, placeholder: false };
  });
  return result;
}

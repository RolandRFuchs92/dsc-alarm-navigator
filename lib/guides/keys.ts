import type { PanelModelData } from "@/lib/content/types";
import type { Key } from "@/lib/engines/types";

// Guide key strings: space-separated tokens. Plain keys plus two code placeholders, nothing else.
const PLAIN_KEYS = new Set<string>(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "<", ">"]);
const PLACEHOLDER_LABELS: Record<string, string> = { "{installer}": "installer code", "{master}": "master code" };

export type Keycap = { label: string; placeholder: boolean };

export class KeyTokenError extends Error {
  token: string;
  constructor(token: string) {
    super(`Invalid guide key token "${token}"`);
    this.name = "KeyTokenError";
    this.token = token;
  }
}

function splitTokens(keys: string): string[] {
  const tokens = keys.split(/\s+/).filter(Boolean);
  tokens.forEach((t) => {
    if (!PLAIN_KEYS.has(t) && !(t in PLACEHOLDER_LABELS)) throw new KeyTokenError(t);
  });
  const result = tokens;
  return result;
}

// "* 8 {installer}" → ["*", "8", "5", "5", "5", "5"] using the model's default codes.
export function parseKeys(keys: string, model: PanelModelData): Key[] {
  const codes: Record<string, string> = { "{installer}": model.installerCodeDefault, "{master}": model.masterCodeDefault };
  const result = splitTokens(keys).flatMap((t) => (t in codes ? codes[t].split("") : [t])) as Key[];
  return result;
}

// What the step card draws: one cap per token, placeholders as a single labelled cap.
export function formatKeycaps(keys: string): Keycap[] {
  const result = splitTokens(keys).map((t) =>
    t in PLACEHOLDER_LABELS ? { label: PLACEHOLDER_LABELS[t], placeholder: true } : { label: t, placeholder: false },
  );
  return result;
}

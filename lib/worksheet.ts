/* The user's own entries ("Your entry" / "Yours" columns), kept per browser in localStorage.
   Storage can be blocked or full: every access is wrapped and the page works without it. */
import type { Worksheet } from "@/lib/engines/types";

// `${slug}-menu-map-v1` is the legacy app's key for pc1864, so existing browser data carries over.
export function pickStorageKey(modelSlug: string): string {
  const result = `${modelSlug}-menu-map-v1`;
  return result;
}

function createEmptyWorksheet(): Worksheet {
  const result: Worksheet = { values: {}, toggles: {} };
  return result;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// Accept only { values: {key: string}, toggles: {key: number[]} }; anything else is treated as no data.
function parseWorksheet(raw: string | null): Worksheet {
  if (!raw) return createEmptyWorksheet();
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data)) return createEmptyWorksheet();
  const values = data.values ?? {};
  const toggles = data.toggles ?? {};
  if (!isRecord(values) || !isRecord(toggles)) return createEmptyWorksheet();
  const valuesOk = Object.values(values).every((v) => typeof v === "string");
  const togglesOk = Object.values(toggles).every((list) => Array.isArray(list) && list.every((n) => Number.isInteger(n)));
  if (!valuesOk || !togglesOk) return createEmptyWorksheet();
  const result: Worksheet = { values: values as Worksheet["values"], toggles: toggles as Worksheet["toggles"] };
  return result;
}

export function loadWorksheet(modelSlug: string): Worksheet {
  try {
    const result = parseWorksheet(window.localStorage.getItem(pickStorageKey(modelSlug)));
    return result;
  } catch {
    const result = createEmptyWorksheet();
    return result;
  }
}

// Copies first: the engine's selectWorksheet hands out references into live state.
export function copyWorksheet(ws: Worksheet): Worksheet {
  const toggles: Worksheet["toggles"] = {};
  Object.entries(ws.toggles).forEach(([k, list]) => { toggles[k] = [...list]; });
  const result: Worksheet = { values: { ...ws.values }, toggles };
  return result;
}

export function saveWorksheet(modelSlug: string, ws: Worksheet): void {
  try {
    window.localStorage.setItem(pickStorageKey(modelSlug), JSON.stringify(copyWorksheet(ws)));
  } catch { /* storage blocked: the page still works, entries just are not remembered */ }
}

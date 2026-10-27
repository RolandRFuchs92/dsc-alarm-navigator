/* Section and command search for the map's search box. Ported from src/app.js findSearchHits:
   exact number first, then a label match, then a match inside the section (entries, options, subs). */
import { describeInstance, formatNodeCode, formatSection } from "./format";
import type { PanelModelData } from "./types";

export type SearchHit = { id: string; num: number | null; code: string; label: string };
type SearchItem = SearchHit & { text: string; inner: string };

const MAX_HITS = 14;
const ITEMS_BY_MODEL = new WeakMap<PanelModelData, SearchItem[]>();

// Every [*] command, every plain section, and one item per number inside a range section.
function buildSearchItems(model: PanelModelData): SearchItem[] {
  const result: SearchItem[] = [];
  model.commands.forEach((c) => {
    const code = formatNodeCode(c);
    result.push({ id: c.slug, num: null, code, label: c.label, text: `${code} ${c.label} ${c.description}`.toLowerCase(), inner: "" });
  });
  model.groups.forEach((group) => group.sections.forEach((s) => {
    if (s.range) {
      for (let n = s.range[0]; n <= s.range[1]; n += 1) {
        const instance = describeInstance(s, n);
        const text = `${n} ${String(n).padStart(3, "0")} ${s.label} ${instance} ${group.label}`.toLowerCase();
        result.push({ id: s.slug, num: n, code: formatSection(n), label: `${s.label}: ${instance}`, text, inner: "" });
      }
      return;
    }
    const inner = [
      ...(s.subs ?? []).map((sub) => `${sub.label} ${(sub.entries ?? []).map((e) => e.label).join(" ")}`),
      ...(s.entries ?? []).map((e) => e.label),
      ...(s.options ?? []).map((o) => o.on),
    ].join(" ");
    const num = s.num ?? 0;
    const text = `${String(num).padStart(3, "0")} ${s.label} ${s.description} ${group.label} ${inner}`.toLowerCase();
    result.push({ id: s.slug, num, code: formatSection(num), label: s.label, text, inner: inner.toLowerCase() });
  }));
  return result;
}

function readSearchItems(model: PanelModelData): SearchItem[] {
  const cached = ITEMS_BY_MODEL.get(model);
  if (cached) return cached;
  const result = buildSearchItems(model);
  ITEMS_BY_MODEL.set(model, result);
  return result;
}

export function searchSections(model: PanelModelData, query: string): SearchHit[] {
  const q = query.trim().toLowerCase().replace(/[[\]]/g, "");
  if (!q) return [];
  const isNumber = /^\d+$/.test(q);
  const matches = (item: SearchItem): boolean => (isNumber
    ? item.code.includes(q.padStart(Math.min(3, q.length), "0")) || item.text.startsWith(q)
    : q.split(/\s+/).every((w) => item.text.includes(w)));
  const scoreHit = (item: SearchItem): number => {
    if (isNumber && item.num === Number(q)) return 0;
    if (item.label.toLowerCase().includes(q)) return 1;
    if (item.inner.includes(q)) return 2;
    return 3;
  };
  const result = readSearchItems(model)
    .filter(matches)
    .map((item, i) => ({ item, i, score: scoreHit(item) }))
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, MAX_HITS)
    .map(({ item }) => ({ id: item.id, num: item.num, code: item.code, label: item.label }));
  return result;
}

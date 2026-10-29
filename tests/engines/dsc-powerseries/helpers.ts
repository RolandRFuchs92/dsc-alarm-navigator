import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { convertLegacy, loadLegacyData } from "@/scripts/convert-legacy";
import { getEngine } from "@/lib/engines";
import { parseKeys as parseGuideKeys } from "@/lib/guides/keys";
import type { Key, PanelEngine } from "@/lib/engines/types";
import type { DscState } from "@/lib/engines/dsc-powerseries/state";
import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";

export const model: PanelModelData = convertLegacy(loadLegacyData());
export const engine = getEngine("dsc-powerseries") as PanelEngine<DscState>;
export const textKeypad: KeypadModelDef = model.keypads.find((k) => k.displayType === "text")!;

// Split "* 8 5 5 5 5" into keys with the guide parser, so engine tests use guide token rules.
export function parseKeys(text: string): Key[] {
  const result = parseGuideKeys(text, model);
  return result;
}

// Freeze every nested object so any mutation inside pressKey throws.
export function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((v) => freezeDeep(v));
    Object.freeze(value);
  }
  const result = value;
  return result;
}

// Press keys from a given (or fresh) state; every intermediate state is deep-frozen first.
export function pressKeys(text: string, from?: DscState): DscState {
  let state = from ?? engine.createInitialState(model);
  parseKeys(text).forEach((key) => {
    state = engine.pressKey(freezeDeep(state), key, model);
  });
  const result = freezeDeep(state);
  return result;
}

export function readLcd(state: DscState): [string, string] {
  const display = engine.selectDisplay(state, model, textKeypad);
  if (display.type !== "text") throw new Error("expected a text display");
  const result = display.lines;
  return result;
}

/* ---------- legacy oracle: the retired site's app.js (frozen in tests/fixtures/legacy) run headless in a vm ---------- */

export type LegacySnapshot = {
  lcd: [string, string];
  leds: Record<string, string>;
  crumbs: Array<{ label: string; target: string | null }>;
  waiting: string;
  isError: boolean;
};

type LegacyApi = {
  state: { flash: unknown; beep: string | null };
  pressKey: (key: string) => void;
  computeLcd: () => [string, string];
  computeLeds: () => { ready: boolean; armed: boolean; readyFlash: boolean; trouble: boolean; ac: boolean };
  describeWaiting: () => string;
  buildCrumbs: () => Array<{ label: string; action: string | null }>;
  navigateToNode: (id: string, num?: number) => void;
  navigateToEntry: (index: number) => void;
  navigateToSub: (code: string) => void;
  applyLookupValue: (code: string) => void;
};

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Keep app.js up to its DOM rendering section, stub render(), and hand the closure's functions back.
function buildLegacyScript(): vm.Script {
  const data = fs.readFileSync(path.join(root, "tests", "fixtures", "legacy", "data.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "tests", "fixtures", "legacy", "app.js"), "utf8");
  const cut = app.indexOf("/* ---------- rendering ---------- */");
  if (cut < 0) throw new Error("app.js rendering marker not found");
  const head = app.slice(0, cut);
  const tail = `
  function render() {}
  globalThis.__legacy = { state, pressKey, computeLcd, computeLeds, describeWaiting, buildCrumbs, navigateToNode, navigateToEntry, navigateToSub, applyLookupValue };
})();`;
  const result = new vm.Script(`${data}\n${head}${tail}`);
  return result;
}

const LEGACY_SCRIPT = buildLegacyScript();

function convertHtmlToText(html: string): string {
  const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
  const result = html.replace(/<\/?strong>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, (e) => entities[e]);
  return result;
}

function snapshotLegacy(api: LegacyApi): LegacySnapshot {
  const leds = api.computeLeds();
  const toLed = (on: boolean): string => (on ? "on" : "off");
  const result: LegacySnapshot = {
    lcd: api.computeLcd(),
    leds: { ready: leds.readyFlash ? "flash" : toLed(leds.ready), armed: toLed(leds.armed), trouble: toLed(leds.trouble), ac: toLed(leds.ac) },
    crumbs: api.buildCrumbs().map((c) => ({ label: c.label, target: c.action })),
    waiting: convertHtmlToText(api.describeWaiting()),
    isError: api.state.flash !== null && api.state.beep === "error",
  };
  return result;
}

// One snapshot per step (plus the starting state), from a fresh legacy simulator.
export function runLegacySteps(steps: Array<(api: LegacyApi) => void>): LegacySnapshot[] {
  const context: { __legacy?: LegacyApi } = {};
  LEGACY_SCRIPT.runInNewContext(context);
  const api = context.__legacy!;
  const result = [snapshotLegacy(api)];
  steps.forEach((step) => {
    step(api);
    result.push(snapshotLegacy(api));
  });
  return result;
}

// The legacy waiting text as the HTML it rendered (with <strong> spans), one per step.
export function runLegacyWaitingHtml(keys: Key[]): string[] {
  const context: { __legacy?: LegacyApi } = {};
  LEGACY_SCRIPT.runInNewContext(context);
  const api = context.__legacy!;
  const result = [api.describeWaiting()];
  keys.forEach((key) => {
    api.pressKey(key);
    result.push(api.describeWaiting());
  });
  return result;
}

export function runLegacy(keys: Key[]): LegacySnapshot[] {
  const result = runLegacySteps(keys.map((key) => (api: LegacyApi) => api.pressKey(key)));
  return result;
}

export function snapshotEngine(state: DscState): LegacySnapshot {
  const location = engine.selectLocation(state, model);
  const result: LegacySnapshot = {
    lcd: readLcd(state),
    leds: engine.selectLeds(state),
    crumbs: location.crumbs,
    waiting: location.waitingFor,
    isError: location.isError,
  };
  return result;
}

// Snapshots per step plus a flag per step saying whether the engine was in no-entry arming.
export function runEngineFlagged(keys: Key[]): { snaps: LegacySnapshot[]; flags: boolean[] } {
  let state = engine.createInitialState(model);
  const snaps = [snapshotEngine(state)];
  const flags = [isNoEntryArming(state)];
  keys.forEach((key) => {
    state = engine.pressKey(freezeDeep(state), key, model);
    snaps.push(snapshotEngine(state));
    flags.push(isNoEntryArming(state));
  });
  const result = { snaps, flags };
  return result;
}

export function runEngine(keys: Key[]): LegacySnapshot[] {
  const result = runEngineFlagged(keys).snaps;
  return result;
}

// True in exactly the state [*][9][code] leaves the engine in: no-entry arming.
export function isNoEntryArming(state: DscState): boolean {
  const result = state.mode === "info" && state.nodeId === "k9";
  return result;
}

// The one deliberate oracle exception: install guide p.7 — legacy showed steady. In no-entry arming the guide says the
// Armed light FLASHES; the engine does, legacy had it ON. Only steps flagged as no-entry arming (ours 'flash', legacy
// 'on') are normalised. Any other step where ours is 'flash' while legacy is 'on' fails loudly here.
export function normalizeNoEntryArmed(ours: LegacySnapshot[], legacy: LegacySnapshot[], flags: boolean[]): LegacySnapshot[] {
  const result = ours.map((snap, i) => {
    const diverges = snap.leds.armed === "flash" && legacy[i].leds.armed === "on";
    if (diverges && !flags[i]) throw new Error(`Armed flash vs on outside no-entry arming at step ${i}`);
    return diverges ? { ...snap, leds: { ...snap.leds, armed: "on" } } : snap;
  });
  return result;
}

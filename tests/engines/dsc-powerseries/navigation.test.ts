import { describe, expect, it } from "vitest";
import { applyLookupValue, navigateToEntry, navigateToNode, navigateToSub } from "@/lib/engines/dsc-powerseries";
import type { DscState } from "@/lib/engines/dsc-powerseries";
import type { Key } from "@/lib/engines/types";
import { engine, freezeDeep, isNoEntryArming, model, normalizeNoEntryArmed, runLegacySteps, snapshotEngine } from "./helpers";

type Step = { legacy: Parameters<typeof runLegacySteps>[0][number]; ours: (s: DscState) => DscState };

const key = (k: Key): Step => ({ legacy: (api) => api.pressKey(k), ours: (s) => engine.pressKey(s, k, model) });
const node = (id: string, num?: number): Step => ({ legacy: (api) => api.navigateToNode(id, num), ours: (s) => navigateToNode(s, model, id, num) });
const entry = (i: number): Step => ({ legacy: (api) => api.navigateToEntry(i), ours: (s) => navigateToEntry(s, i) });
const sub = (code: string): Step => ({ legacy: (api) => api.navigateToSub(code), ours: (s) => navigateToSub(s, model, code) });
const lookup = (code: string): Step => ({ legacy: (api) => api.applyLookupValue(code), ours: (s) => applyLookupValue(s, model, code) });

function runBoth(steps: Step[]): void {
  const legacy = runLegacySteps(steps.map((s) => s.legacy));
  let state = engine.createInitialState(model);
  const ours = [snapshotEngine(state)];
  const flags = [isNoEntryArming(state)];
  steps.forEach((s) => {
    state = s.ours(freezeDeep(state));
    ours.push(snapshotEngine(state));
    flags.push(isNoEntryArming(state));
  });
  expect(normalizeNoEntryArmed(ours, legacy, flags)).toEqual(legacy);
}

// Tree and link navigation (no key press) matches src/app.js too.
describe("dsc-powerseries navigation helpers", () => {
  it("jumps to sections, range members, sub-sections and entries", () => {
    runBoth([node("s202", 211), key("2"), node("s005"), sub("02"), entry(2), sub("05"), node("s001"), lookup("05"), entry(15), lookup("07")]);
  });

  it("jumps to [*] commands with default codes", () => {
    runBoth([node("k5"), key("0"), key("3"), node("k9"), node("k8"), node("k1"), key("0"), key("2"), node("k0"), node("k6"), key("4")]);
  });
});

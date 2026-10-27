import { describe, expect, it } from "vitest";
import { engine, freezeDeep, model, parseKeys, runLegacyWaitingHtml } from "./helpers";
import type { DscState } from "@/lib/engines/dsc-powerseries/state";

// Location.waitingParts must bold exactly what the legacy app wrapped in <strong>.
const SCRIPTS = [
  "* 8 5 5 5 5 0 0 1 0 3 * 1 * 0 4 #",
  "* 8 5 5 5 5 0 0 5 0 2 0 3 0 # #",
  "* 8 5 5 5 5 0 1 3 1 9 # 3 0 1 5 #",
  "* 8 5 5 5 5 9 9 9 5 5 5 5",
  "* 1 0 5 # * 2 1 # * 7 1 #",
  "* 5 1 2 3 4 0 5 9 9 0 7 # 9 8 0 3 # * 6 1 2 3 4 #",
];

function escapeHtml(text: string): string {
  const result = text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return result;
}

function renderParts(state: DscState): string {
  const parts = engine.selectLocation(state, model).waitingParts ?? [];
  const result = parts.map((p) => (p.strong ? `<strong>${escapeHtml(p.text)}</strong>` : escapeHtml(p.text))).join("");
  return result;
}

describe("waiting text emphasis", () => {
  it.each(SCRIPTS)("matches the legacy <strong> spans for %s", (script) => {
    const keys = parseKeys(script);
    const legacy = runLegacyWaitingHtml(keys);
    let state = engine.createInitialState(model);
    const ours = [renderParts(state)];
    keys.forEach((key) => {
      state = engine.pressKey(freezeDeep(state), key, model);
      ours.push(renderParts(state));
    });
    expect(ours).toEqual(legacy);
  });

  it("waitingFor stays plain text", () => {
    const state = engine.navigateToSection!(engine.createInitialState(model), model, 5, "02");
    const location = engine.selectLocation(state, model);
    expect(location.waitingFor).not.toMatch(/[]/);
    expect(location.waitingParts!.map((p) => p.text).join("")).toBe(location.waitingFor);
  });
});

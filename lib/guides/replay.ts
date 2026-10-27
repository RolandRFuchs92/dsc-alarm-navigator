import type { GuideStep } from "@/lib/content/repo";
import type { PanelModelData } from "@/lib/content/types";
import type { PanelEngine } from "@/lib/engines/types";
import { parseKeys } from "./keys";

// The keypad state at the start of step stepIndex (0-based): replay every earlier step's
// keys from a fresh keypad with no worksheet. Pure, so it runs on server or client.
export function buildStepState<S>(engine: PanelEngine<S>, model: PanelModelData, steps: GuideStep[], stepIndex: number): S {
  let state = engine.createInitialState(model);
  steps.slice(0, Math.max(0, stepIndex)).forEach((step) => {
    parseKeys(step.keys, model).forEach((key) => {
      state = engine.pressKey(state, key, model);
    });
  });
  const result = state;
  return result;
}

// ?step= → 1..count. Anything that isn't a whole number becomes 1.
export function clampStep(raw: string | undefined, count: number): number {
  const n = raw !== undefined && /^-?\d+$/.test(raw.trim()) ? Number(raw.trim()) : 1;
  const result = Math.min(Math.max(n, 1), Math.max(count, 1));
  return result;
}

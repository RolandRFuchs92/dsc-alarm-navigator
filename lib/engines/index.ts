import { dscPowerSeriesEngine } from "./dsc-powerseries";
import type { PanelEngine } from "./types";

// Panel family engine_key → engine. A new panel family means a new engine here.
const ENGINES: Record<string, PanelEngine<unknown>> = {
  "dsc-powerseries": dscPowerSeriesEngine as PanelEngine<unknown>,
};

export function getEngine(engineKey: string): PanelEngine<unknown> {
  const engine = ENGINES[engineKey];
  if (!engine) throw new Error(`No keypad engine for engine key "${engineKey}"`);
  const result = engine;
  return result;
}

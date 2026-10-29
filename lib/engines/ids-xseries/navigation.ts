/* Map-page navigation that is not a key press: tree and search clicks, deep links, crumbs, reset and clear.
   Each lands where the same keys on the keypad would (Installer Manual 700-398-02O §8); all pure like the reducer. */
import type { PanelModelData } from "@/lib/content/types";
import { enterLocation } from "./reducer";
import { findSection, openProgramTop, resetToIdle } from "./state";
import type { IdsState } from "./state";

export const PROGRAM_CRUMB = "program";

function clearTransient(state: IdsState): IdsState {
  const result: IdsState = { ...state, beep: null, unsimulatedOption: null };
  return result;
}

// As if the installer typed [#] [INSTALLER CODE] [*] then [LOCATION NUMBER] [*] (§8): any number inside a range works,
// a zone-type range opens on its first zone and a bitmap on page 1.
export function navigateToSection(state: IdsState, model: PanelModelData, num: number): IdsState {
  if (!findSection(model, num)) return state;
  const top = openProgramTop(resetToIdle(clearTransient(state)), model);
  const result = enterLocation(top, model, num);
  return result;
}

// A section slug opens that location (`num`, else its own number or the first of its range); a user program command
// slug shows the command with the keypad idle, since hold [*] only works from idle (user manual §9).
export function navigateToNode(state: IdsState, model: PanelModelData, id: string, num?: number): IdsState {
  if (model.commands.some((c) => c.slug === id)) return { ...resetToIdle(clearTransient(state)), nodeId: id };
  const section = model.groups.flatMap((g) => g.sections).find((s) => s.slug === id);
  const target = num ?? section?.num ?? section?.range?.[0] ?? null;
  const result = section && target !== null ? navigateToSection(state, model, target) : state;
  return result;
}

// Crumbs: "program" goes back to the top of program mode, like [#] inside a location.
export function followCrumb(state: IdsState, model: PanelModelData, target: string): IdsState {
  const inLocation = state.location !== null && ["location", "zoneList", "bitmap"].includes(state.mode);
  const result = target === PROGRAM_CRUMB && inLocation ? openProgramTop(clearTransient(state), model) : state;
  return result;
}

// Back to idle; the worksheet and the user codes stay.
export function resetKeypad(state: IdsState): IdsState {
  const result = resetToIdle(clearTransient(state));
  return result;
}

// "Clear my entries": every location back to its default, so location 23 is 4 digits and the installer code is 9999
// again. User codes are not worksheet entries and stay in memory.
export function clearWorksheet(state: IdsState): IdsState {
  const result: IdsState = { ...clearTransient(state), values: {}, toggles: {} };
  return result;
}

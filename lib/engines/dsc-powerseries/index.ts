import type { PanelEngine } from "../types";
import { pressKey } from "./reducer";
import { selectDisplay, selectLeds, selectLocation, selectWorksheet } from "./selectors";
import { createInitialState } from "./state";
import type { DscState } from "./state";

export const dscPowerSeriesEngine: PanelEngine<DscState> = {
  createInitialState,
  pressKey,
  selectDisplay,
  selectLeds,
  selectLocation,
  selectWorksheet,
};

export type { DscState };
export { navigateToNode, navigateToEntry, navigateToSub, applyLookupValue } from "./reducer";

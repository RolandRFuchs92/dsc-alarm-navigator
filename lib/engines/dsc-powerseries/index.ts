import type { PanelEngine } from "../types";
import { applyLookupValue, navigateToEntry, navigateToNode, navigateToSub, pressKey } from "./reducer";
import { clearWorksheet, flipOptionByClick, followCrumb, navigateToSection, resetKeypad, selectFocus } from "./navigation";
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
  selectFocus,
  navigateToNode,
  navigateToSection,
  navigateToSub,
  navigateToEntry,
  applyLookupValue,
  flipOption: flipOptionByClick,
  followCrumb,
  resetKeypad,
  clearWorksheet,
};

export type { DscState };
export { navigateToNode, navigateToEntry, navigateToSub, applyLookupValue } from "./reducer";

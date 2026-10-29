import type { Key, PanelEngine } from "../types";
import { applyLookupValue, navigateToEntry, navigateToNode, navigateToSub, pressKey } from "./reducer";
import { clearWorksheet, flipOptionByClick, followCrumb, navigateToSection, resetKeypad, selectFocus } from "./navigation";
import { selectDisplay, selectLeds, selectLocation, selectWorksheet } from "./selectors";
import { createInitialState } from "./state";
import type { DscState } from "./state";

const DSC_KEYS: readonly Key[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "<", ">"];

export const dscPowerSeriesEngine: PanelEngine<DscState> = {
  keys: DSC_KEYS,
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

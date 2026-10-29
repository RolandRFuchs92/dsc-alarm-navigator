import type { Key, PanelEngine } from "../types";
import { pressKey } from "./reducer";
import { selectDisplay, selectFocus, selectLeds, selectLocation, selectWorksheet } from "./selectors";
import { createInitialState } from "./state";
import type { IdsState } from "./state";

// Classic LED keypad keys (installer manual Figure 3); hold* and hold9 are the long presses.
const IDS_KEYS: readonly Key[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "mode", "f", "m", "p", "hold*", "hold9"];

export const idsXSeriesEngine: PanelEngine<IdsState> = {
  keys: IDS_KEYS,
  createInitialState,
  pressKey,
  selectDisplay,
  selectLeds,
  selectLocation,
  selectWorksheet,
  selectFocus,
};

export type { IdsState };

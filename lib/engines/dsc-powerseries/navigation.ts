/* Map-page navigation that is not a key press: section deep links, option rows, crumbs, reset and clear.
   Ported from src/app.js handleClick / followCrumb / clearWorksheet; all pure like the reducer. */
import type { PanelModelData } from "@/lib/content/types";
import type { Focus } from "../types";
import { enterSection, flipOption, navigateToNode, navigateToSub } from "./reducer";
import { findSection, openSectionPrompt, readSection, resetToReady } from "./state";
import type { DscState, Mode } from "./state";

// Modes where the digits typed so far show as a "typing" chip after the path.
const SHOWS_PENDING: Mode[] = ["section", "sub", "code", "confirm", "bypass", "userCodes"];

// Open a section by number (any number inside a range works), optionally straight into a sub-section.
export function navigateToSection(state: DscState, model: PanelModelData, num: number, subCode?: string | null): DscState {
  const section = findSection(model, num);
  if (!section) return state;
  const opened = navigateToNode(state, model, section.slug, num);
  const hasSub = subCode && section.kind === "sub" && (section.subs ?? []).some((s) => s.code === subCode);
  const result = hasSub ? navigateToSub(opened, model, subCode) : opened;
  return result;
}

// Clicking an option row flips it, re-entering the section first when the keypad is elsewhere in it.
export function flipOptionByClick(state: DscState, model: PanelModelData, n: number): DscState {
  const section = readSection(state, model);
  if (!section || section.kind !== "toggle" || state.section === null) return state;
  const cleared: DscState = { ...state, flash: null, beep: null };
  const inside = state.mode === "toggle" ? cleared : enterSection(cleared, model, state.section);
  const paged: DscState = section.pages === 2 ? { ...inside, page: n > 8 ? 2 : 1 } : inside;
  const result = flipOption(paged, model, n);
  return result;
}

// Crumb targets: ready, star, installer, node:<slug>, section:<n>, sub:<code>.
export function followCrumb(state: DscState, model: PanelModelData, target: string): DscState {
  const cleared: DscState = { ...state, flash: null, beep: null };
  if (target === "ready") return resetToReady(cleared);
  if (target === "star") return { ...resetToReady(cleared), mode: "star", path: [{ key: "*", label: "" }] };
  if (target === "installer") return openSectionPrompt(cleared);
  const [kind, value] = target.split(":");
  if (kind === "node") return navigateToNode(cleared, model, value);
  if (kind === "section" && state.nodeId) return navigateToNode(cleared, model, state.nodeId, Number(value));
  const result = kind === "sub" ? navigateToSub(cleared, model, value) : state;
  return result;
}

export function resetKeypad(state: DscState): DscState {
  const result = resetToReady({ ...state, flash: null, beep: null });
  return result;
}

// "Clear my entries": back to factory defaults everywhere, with a note on the screen.
export function clearWorksheet(state: DscState): DscState {
  const result: DscState = { ...state, values: {}, toggles: {}, bypassed: [], flash: ["Entries cleared", "Back to defaults"], beep: null };
  return result;
}

export function selectFocus(state: DscState): Focus {
  const pending = state.buffer && SHOWS_PENDING.includes(state.mode) ? [{ key: state.buffer, label: "typing" }] : [];
  const result: Focus = {
    nodeId: state.nodeId,
    mode: state.mode,
    entryIndex: state.mode === "data" ? state.entryIndex : null,
    buffer: state.buffer,
    trail: [...state.path, ...pending],
    isInstallerTop: state.mode === "section" || (state.mode === "code" && state.codeFor === "installer"),
    beep: state.beep,
  };
  return result;
}

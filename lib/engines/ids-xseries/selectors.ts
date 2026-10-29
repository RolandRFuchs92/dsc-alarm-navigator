/* Derived views for the X-Series LED keypad: status lights, the 16 zone lights, "you are here" text and the
   worksheet. Light behaviour cites Installer Manual 700-398-02O (§6 Table 1, §8, Table 26). */
import type { KeypadModelDef, PanelModelData, SectionDef } from "@/lib/content/types";
import type { Display, Focus, LedState, Leds, Location, Worksheet } from "../types";
import {
  LIGHTS_PER_PAGE,
  describeInstance,
  readEntries,
  readEntryDigits,
  readSection,
  readToggleSet,
  readValue,
  readWorksheet,
} from "./state";
import type { IdsState, Mode } from "./state";

/* ---------- status lights ---------- */

// Table 26 / Figure 3: READY, ARM, AWAY, POWER mark pages 1-4 of a multi-page bitmap.
const PAGE_MARKERS = ["ready", "armed", "away", "power"];

function buildLeds(ready: LedState, armed: LedState, away: LedState): Leds {
  const result: Leds = { ready, armed, away, power: "on" };
  return result;
}

export function selectLeds(state: IdsState): Leds {
  if (state.mode === "bitmap" && state.pageCount > 1) {
    // Ruling: the current page's marker is on and the other three are off.
    const result: Leds = {};
    PAGE_MARKERS.forEach((name, i) => { result[name] = i + 1 === state.page ? "on" : "off"; });
    return result;
  }
  const byMode: Partial<Record<Mode, Leds>> = {
    programTop: buildLeds("flash", "off", "off"), // §8: in program mode the READY LED is flashing
    location: buildLeds("on", "off", "flash"), // §8 standard location: READY solid, AWAY flashes
    zoneList: buildLeds("on", "flash", "flash"), // §8 extended location: READY solid, ARM and AWAY flash
    bitmap: buildLeds("on", "off", "flash"), // §8 bitmapped location: READY solid, AWAY flashes
  };
  // Idle and code entry: standby, READY on with no zones open (§8 "the panel is now in standby mode").
  const result = byMode[state.mode] ?? buildLeds("on", "off", "off");
  return result;
}

/* ---------- zone lights ---------- */

// Table 1: each digit is 4 lights worth 1, 2, 4, 8; lights 1-4 units, 5-8 tens, 9-12 hundreds, 13-16 thousands.
// Hex digits A-F count 10-15 (Table 3).
export function encodeBcd(value: string): number[] {
  const digits = value.slice(-4).split("").reverse();
  const result: number[] = [];
  digits.forEach((d, place) => {
    const n = parseInt(d, 16);
    [1, 2, 4, 8].forEach((weight, bit) => {
      if (!Number.isNaN(n) && n & weight) result.push(place * 4 + bit + 1);
    });
  });
  return result;
}

function buildLights(count: number, on: number[]): Record<number, LedState> {
  const result: Record<number, LedState> = {};
  for (let i = 1; i <= count; i += 1) result[i] = on.includes(i) ? "on" : "off";
  return result;
}

// Which lights are on and whether the manual describes the picture.
function computeZoneLights(state: IdsState, model: PanelModelData): { on: number[]; verified: boolean } {
  const section = readSection(state, model);
  const num = state.location ?? 0;
  if (state.mode === "location" && section) {
    const value = state.buffer || readValue(state, num, 0, readEntries(section, num)[0]);
    // §7: numeric locations such as 197 show 2 digits per [*] press, so a longer value at once is not described.
    const result = { on: encodeBcd(value), verified: !state.buffer && value.length <= 2 };
    return result;
  }
  if (state.mode === "zoneList" && section) {
    const value = state.buffer || readValue(state, num, state.entryIndex, readEntries(section, num)[state.entryIndex]);
    const result = { on: encodeBcd(value), verified: false };
    return result;
  }
  if (state.mode === "bitmap" && section) {
    const offset = (state.page - 1) * LIGHTS_PER_PAGE;
    const on = readToggleSet(state, section, num).filter((n) => n > offset && n <= offset + LIGHTS_PER_PAGE).map((n) => n - offset);
    // Table 23 zone properties are verified; 201-208 pages are not (section.verified = false).
    const result = { on, verified: section.verified && !state.buffer };
    return result;
  }
  // Idle shows zone status (no zone open); program-mode top shows nothing.
  const result = { on: [], verified: (state.mode === "idle" || state.mode === "programTop") && !state.buffer };
  return result;
}

export function selectDisplay(state: IdsState, model: PanelModelData, keypad: KeypadModelDef): Display {
  const count = keypad.lightCount ?? LIGHTS_PER_PAGE;
  const { on, verified } = computeZoneLights(state, model);
  const result: Display = { type: "lights", count, lights: buildLights(count, on), verified };
  return result;
}

/* ---------- "you are here" ---------- */

function formatLocation(section: SectionDef, num: number): string {
  const instance = describeInstance(section, num);
  const result = `[${num}] ${section.label}${instance ? ` (${instance})` : ""}`;
  return result;
}

function describeWaiting(state: IdsState, model: PanelModelData): string {
  const section = readSection(state, model);
  const num = state.location ?? 0;
  const name = section ? formatLocation(section, num) : "";
  const entries = section ? readEntries(section, num) : [];
  const zone = entries[state.entryIndex]?.label.replace(/ type$/, "") ?? "";
  const isLastZone = state.entryIndex === entries.length - 1;
  const views: Record<Mode, () => string> = {
    idle: () => "The keypad is idle. Press # then the installer code then * to enter program mode.",
    installerCode: () => `Type the installer code (default ${model.installerCodeDefault}) then *. # cancels.`,
    programTop: () => "You are in program mode (READY flashing). Type a location number then *, or # to leave program mode.",
    location: () => `You are in ${name}. Type the new value (${entries[0] ? readEntryDigits(state, num, entries[0]) : 0} digits) then *, or # to leave it unchanged.`,
    zoneList: () => `You are in ${name}, on ${zone}. Type ${zone}'s type then *, or * to skip to the next zone. # goes back to the top.${isLastZone ? ` ${zone} is the last zone here: * stays on it.` : ""}`,
    bitmap: () => `You are in ${name}${state.pageCount > 1 ? `, page ${state.page} of ${state.pageCount}` : ""}. Type a light number (1-16) then * to switch it, * alone for the next page, # when done.`,
    userCode: () => "",
    userTop: () => "",
    userOption: () => "",
    bypassCode: () => "",
    bypass: () => "",
  };
  const result = views[state.mode]();
  return result;
}

const PROGRAM_MODES: Mode[] = ["programTop", "location", "zoneList", "bitmap"];

function buildCrumbs(state: IdsState, model: PanelModelData): Location["crumbs"] {
  if (!PROGRAM_MODES.includes(state.mode)) return [{ label: "Keypad", target: null }];
  const section = readSection(state, model);
  const crumbs: Location["crumbs"] = [{ label: "Program mode", target: null }];
  if (section) crumbs.push({ label: formatLocation(section, state.location ?? 0), target: null });
  const result = crumbs;
  return result;
}

export function selectLocation(state: IdsState, model: PanelModelData): Location {
  const result: Location = {
    crumbs: buildCrumbs(state, model),
    waitingFor: describeWaiting(state, model),
    sectionNum: state.location,
    sectionSlug: state.nodeId,
    subCode: null,
    isError: state.beep === "error",
  };
  return result;
}

export function selectFocus(state: IdsState, model: PanelModelData): Focus {
  const typing = state.mode === "location" || state.mode === "zoneList";
  // Digits typed but not saved yet, except the installer code being typed.
  const pending = state.buffer && state.mode !== "installerCode" ? [{ key: state.buffer, label: "typing" }] : [];
  const result: Focus = {
    nodeId: state.nodeId,
    mode: state.mode,
    entryIndex: typing ? state.entryIndex : null,
    buffer: state.buffer,
    trail: [...state.path, ...pending],
    isInstallerTop: state.mode === "programTop" || state.mode === "installerCode",
    beep: state.beep,
  };
  return result;
}

// Installer-programming values and toggles only (user codes never reach the worksheet).
export function selectWorksheet(state: IdsState): Worksheet {
  const result = readWorksheet(state);
  return result;
}

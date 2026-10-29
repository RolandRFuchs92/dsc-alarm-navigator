/* Derived views for the X-Series LED keypad: status lights, the 16 zone lights, "you are here" text and the
   worksheet. Light behaviour cites Installer Manual 700-398-02O (§6 Table 1, §8, Table 26). */
import type { KeypadModelDef, PanelModelData, SectionDef } from "@/lib/content/types";
import type { Display, Focus, LedState, Leds, Location, Worksheet } from "../types";
import {
  INSTALLER_CODE_DEFAULTS,
  LIGHTS_PER_PAGE,
  readCodeLength,
  describeInstance,
  readEntries,
  readEntryDigits,
  readSection,
  readToggleSet,
  readValue,
  readWorksheet,
} from "./state";
import type { IdsState, Mode } from "./state";
import { PROGRAM_CRUMB } from "./navigation";
import { USER_OPTION_LABELS, isTypingCode, maskCode } from "./user-mode";

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
    userCode: buildLeds("alternate", "alternate", "off"), // user manual §9 step 3: ARM and READY alternate flashing
    userTop: buildLeds("flash", "off", "off"), // §9 step 5: the READY LED will flash
    // §9 options 0-4 step 3: READY and ARM flash; Options 1 and 3 step 5: READY and AWAY flash, ARM on.
    userOption: state.userSlot === null ? buildLeds("flash", "flash", "off") : buildLeds("flash", "on", "flash"),
    bypassCode: buildLeds("off", "off", "flash"), // user manual §5 step 2: the AWAY LED will flash
    bypass: buildLeds("on", "off", "off"), // §5 step 4: the READY LED will come on
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
  if (state.mode === "bypass") {
    // User manual §5 steps 3 and 7: the bypassed zones' lights on this page. §5 doesn't spell out paging with zone
    // numbers, so pages above 1, and a last-toggled zone off this page, are unverified (ruling).
    const offset = (state.page - 1) * LIGHTS_PER_PAGE;
    const onPage = (n: number): boolean => n > offset && n <= offset + LIGHTS_PER_PAGE;
    const on = state.bypassed.filter(onPage).map((n) => n - offset);
    const lastOffPage = state.lastBypassZone !== null && !onPage(state.lastBypassZone);
    const result = { on, verified: !state.buffer && state.page === 1 && !lastOffPage };
    return result;
  }
  // Idle shows zone status (no zone open); program-mode top shows nothing. The user manual doesn't describe the zone
  // lights in user program mode or while the bypass code is typed, so those are unverified.
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
  const codeDigits = readCodeLength(state);
  const unsimulated = state.unsimulatedOption === null ? "" : `Option ${state.unsimulatedOption}: this option isn't simulated yet. `;
  const views: Record<Mode, () => string> = {
    idle: () => "The keypad is idle. Press # then the installer code then * to enter program mode.",
    installerCode: () => `Type the installer code (default ${INSTALLER_CODE_DEFAULTS[readCodeLength(state)]}) then *. # cancels.`,
    programTop: () => "You are in program mode (READY flashing). Type a location number then *, or # to leave program mode.",
    location: () => `You are in ${name}. Type the new value (${entries[0] ? readEntryDigits(state, num, entries[0]) : 0} digits) then *, or # to leave it unchanged.`,
    zoneList: () => `You are in ${name}, on ${zone}. Type ${zone}'s type then *, or * to skip to the next zone. # goes back to the top.${isLastZone ? ` ${zone} is the last zone here: * stays on it.` : ""}`,
    bitmap: () => `You are in ${name}${state.pageCount > 1 ? `, page ${state.page} of ${state.pageCount}` : ""}. Type a light number (1-16) then * to switch it, * alone for the next page, # when done.`,
    userCode: () => `Type the master code (user code 1, ${codeDigits} digits) then *. # cancels.`,
    userTop: () => `${unsimulated}You are in user program mode (READY flashing). Type an option number (0-4) then *, or # to leave.`,
    userOption: () => describeUserOption(state, codeDigits),
    bypassCode: () => `Type any user code (${codeDigits} digits) then * to open bypass. # cancels.`,
    bypass: () => `You are in bypass, zones ${(state.page - 1) * LIGHTS_PER_PAGE + 1}-${state.page * LIGHTS_PER_PAGE}. Type a zone number (1-64) then * to bypass or un-bypass it, * alone to show the next 16 zones, # when done.`,
  };
  const result = views[state.mode]();
  return result;
}

// What each simulated option (user manual §9) waits for. Never includes a code.
function describeUserOption(state: IdsState, codeDigits: number): string {
  const name = `Option ${state.userOption} (${USER_OPTION_LABELS[state.userOption ?? -1]})`;
  const firstStep: Record<number, string> = {
    0: `type a new user code (${codeDigits} digits) then *`,
    1: `type the old code to edit (${codeDigits} digits) then *`,
    2: `type the user code to delete (${codeDigits} digits) then *`,
    3: "type the slot number (1-128) then *",
    4: "type the slot number to delete (1-128) then *",
  };
  const step = state.userSlot === null
    ? firstStep[state.userOption ?? 0]
    : `slot ${state.userSlot}: type the new code (${codeDigits} digits) then *`;
  const result = `You are in ${name}: ${step}. # exits the option.`;
  return result;
}

const PROGRAM_MODES: Mode[] = ["programTop", "location", "zoneList", "bitmap"];
const USER_MODES: Mode[] = ["userCode", "userTop", "userOption"];

function buildCrumbs(state: IdsState, model: PanelModelData): Location["crumbs"] {
  if (USER_MODES.includes(state.mode)) {
    const option = state.userOption === null ? [] : [{ label: `Option ${state.userOption}: ${USER_OPTION_LABELS[state.userOption]}`, target: null }];
    return [{ label: "User program mode", target: null }, ...option];
  }
  if (state.mode === "bypassCode" || state.mode === "bypass") return [{ label: "Bypass", target: null }];
  if (!PROGRAM_MODES.includes(state.mode)) return [{ label: "Keypad", target: null }];
  const section = readSection(state, model);
  // Inside a location the Program mode crumb goes back to the top, like [#] (§8).
  const crumbs: Location["crumbs"] = [{ label: "Program mode", target: section ? PROGRAM_CRUMB : null }];
  if (section) crumbs.push({ label: formatLocation(section, state.location ?? 0), target: null });
  const result = crumbs;
  return result;
}

export function selectLocation(state: IdsState, model: PanelModelData): Location {
  const result: Location = {
    crumbs: buildCrumbs(state, model),
    waitingFor: describeWaiting(state, model),
    sectionNum: state.location,
    sectionSlug: state.location === null ? null : state.nodeId, // in idle, nodeId may be a user program command
    subCode: null,
    isError: state.beep === "error",
  };
  return result;
}

export function selectFocus(state: IdsState, model: PanelModelData): Focus {
  const typing = state.mode === "location" || state.mode === "zoneList";
  // User codes being typed show as dots, never digits (ruling).
  const buffer = isTypingCode(state) ? maskCode(state.buffer) : state.buffer;
  // Digits typed but not saved yet, except the installer code being typed.
  const pending = buffer && state.mode !== "installerCode" ? [{ key: buffer, label: "typing" }] : [];
  const result: Focus = {
    nodeId: state.nodeId,
    mode: state.mode,
    entryIndex: typing ? state.entryIndex : null,
    buffer,
    trail: [...state.path, ...pending],
    isInstallerTop: state.mode === "programTop", // the top of program mode, waiting for a location number (§8)
    beep: state.beep,
  };
  return result;
}

// Installer-programming values and toggles only (user codes never reach the worksheet).
export function selectWorksheet(state: IdsState): Worksheet {
  const result = readWorksheet(state);
  return result;
}

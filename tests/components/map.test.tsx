// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DetailPanel } from "@/components/map/DetailPanel";
import { MenuMap } from "@/components/map/MenuMap";
import type { MapStart } from "@/components/map/MenuMap";
import { readMapCopy } from "@/components/map/copy";
import { getPanelModel } from "@/lib/content/repo";
import type { PanelModelData } from "@/lib/content/types";
import { getEngine } from "@/lib/engines";

const x64: PanelModelData = (await getPanelModel("x64"))!;
const pc1864: PanelModelData = (await getPanelModel("pc1864"))!;

const DSC_LEGEND = "Armed light on = waiting for a section number";
const DSC_HELP = "How installer programming works";
const NO_START: MapStart = { section: null, sub: null, command: null };

function renderMap(model: PanelModelData, start: MapStart = NO_START) {
  const result = render(
    <MenuMap model={model} keypad={model.keypads[0]} start={start} basePath={`/devices/${model.slug}/map`} subtitle="test" sourceText="Source." />,
  );
  return result;
}

// The DetailPanel at the top of installer programming (DSC "Enter Section", IDS READY flashing).
function renderInstallerTop(model: PanelModelData, keys: string[]) {
  const engine = getEngine(model.engineKey);
  let state = engine.createInitialState(model);
  keys.forEach((k) => { state = engine.pressKey(state, k as never, model); });
  const focus = engine.selectFocus!(state, model);
  expect(focus.isInstallerTop).toBe(true);
  const noop = () => {};
  const result = render(
    <DetailPanel
      model={model} copy={readMapCopy(model.engineKey)} focus={focus} location={engine.selectLocation(state, model)}
      worksheet={engine.selectWorksheet(state)} sourceText="Source." on={{ pickNode: noop }}
    />,
  );
  return result;
}

const readWaiting = (): string => document.querySelector(".where .waiting")?.textContent ?? "";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => cleanup());

describe("map copy per engine", () => {
  it("X64: no DSC legend, [*] labels or installer help; the §8 legend and neutral labels instead", () => {
    renderMap(x64);
    const text = document.body.textContent ?? "";
    expect(text).not.toContain(DSC_LEGEND);
    expect(text).not.toContain("Ready light on = waiting for data");
    expect(text).not.toContain("[*] commands");
    expect(text).not.toContain("Installer programming [*][8]");
    expect(text).not.toContain("[*] menu");
    expect(text).not.toContain(DSC_HELP);
    expect(text).toContain("READY flashing = program mode, waiting for a location number");
    expect(text).toContain("READY on + AWAY flashing = inside a location, waiting for data");
    expect(text).toContain("READY on + ARM + AWAY flashing = extended location");
    expect(text).toContain("User program options");
    expect(text).toContain("Installer programming (# code *)");
  });

  it("X64 at the top of program mode shows no DSC installer help", () => {
    renderInstallerTop(x64, ["#", "9", "9", "9", "9", "*"]);
    expect(document.body.textContent).not.toContain(DSC_HELP);
    expect(document.body.textContent).not.toContain("3-digit section number");
  });

  it("DSC still shows its legend, [*] labels and, at Enter Section, the installer help", () => {
    renderMap(pc1864);
    const text = document.body.textContent ?? "";
    expect(text).toContain(DSC_LEGEND);
    expect(text).toContain("Ready light on = waiting for data (flashing = HEX)");
    expect(text).toContain("[*] commands");
    expect(text).toContain("Installer programming [*][8]");
    cleanup();
    renderInstallerTop(pc1864, ["*", "8", "5", "5", "5", "5"]);
    expect(document.body.textContent).toContain(DSC_HELP);
  });

  it("X64 toggle and lookup tables drop the click hints; DSC keeps them", () => {
    renderMap(x64, { section: 2, sub: null, command: null });
    expect(document.body.textContent).toContain("Zone types: what to type");
    expect(document.body.textContent).not.toContain("Click a row");
    expect(document.querySelectorAll(".detail tr.clickable")).toHaveLength(0);
    cleanup();
    renderMap(x64, { section: 109, sub: null, command: null });
    expect(document.body.textContent).not.toContain("Click a row");
    expect(document.body.textContent).not.toContain("a dash when OFF");
    expect(document.body.textContent).toContain("Type a light number then [*] on the keypad to switch it (not confirmed on a real panel).");
    cleanup();
    renderMap(pc1864, { section: 13, sub: null, command: null });
    expect(document.body.textContent).toContain("The keypad screen shows the number when ON and a dash when OFF.");
  });

  it("X64 zone properties show no DSC [9] then [n] key hints; DSC [101] keeps them", () => {
    renderMap(x64, { section: 109, sub: null, command: null });
    expect(document.body.textContent).toContain("Buzz Profile 4");
    expect(document.body.textContent).not.toContain("[9] then [");
    cleanup();
    renderMap(pc1864, { section: 101, sub: null, command: null });
    expect(document.body.textContent).toContain("[9] then [1]");
  });
});

describe("X64 map navigation", () => {
  it("the deep link /map/201 opens in location 201 and keeps its URL", () => {
    window.history.replaceState(null, "", "/devices/x64/map/201");
    renderMap(x64, { section: 201, sub: null, command: null });
    expect(readWaiting()).toContain("You are in [201]");
    expect(window.location.pathname).toBe("/devices/x64/map/201");
  });

  it("a fresh /map opens idle", () => {
    window.history.replaceState(null, "", "/devices/x64/map");
    renderMap(x64);
    expect(readWaiting()).toContain("The keypad is idle");
    expect(window.location.pathname).toBe("/devices/x64/map");
  });

  it("tree clicks open a location or show a user program option; Reset keypad goes back to idle", () => {
    renderMap(x64);
    const tree = within(screen.getByRole("navigation", { name: "All menus" }));
    fireEvent.click(tree.getByRole("button", { name: /Code length/ }));
    expect(readWaiting()).toContain("You are in [23] Code length");
    expect(window.location.pathname).toBe("/devices/x64/map/023");
    fireEvent.click(tree.getByRole("button", { name: /Add a new user code/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Add a new user code" })).toBeTruthy();
    expect(readWaiting()).toContain("The keypad is idle");
    expect(`${window.location.pathname}${window.location.search}`).toBe("/devices/x64/map?cmd=u0");
    fireEvent.click(tree.getByRole("button", { name: /Zone properties/ }));
    fireEvent.click(screen.getByRole("button", { name: "164" }));
    expect(readWaiting()).toContain("You are in [164]");
    fireEvent.click(screen.getByRole("button", { name: "Program mode" }));
    expect(readWaiting()).toContain("You are in program mode");
    fireEvent.click(screen.getByRole("button", { name: "Reset keypad" }));
    expect(readWaiting()).toContain("The keypad is idle");
  });

  it("Clear my entries brings the installer code back to its default", () => {
    renderMap(x64, { section: 197, sub: null, command: null });
    const face = document.querySelector(".keypad-ids")!;
    const pressFace = (key: string) => {
      const button = face.querySelector(`button[data-key="${key}"]`)!;
      fireEvent.pointerDown(button);
      fireEvent.pointerUp(button);
    };
    ["1", "2", "3", "4", "*"].forEach(pressFace);
    expect(JSON.stringify(window.localStorage)).toContain("1234");
    fireEvent.click(screen.getByRole("button", { name: "Clear my entries" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset keypad" }));
    ["#", "9", "9", "9", "9", "*"].forEach(pressFace);
    expect(readWaiting()).toContain("You are in program mode");
  });
});

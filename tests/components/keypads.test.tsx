// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { IdsClassicLed } from "@/components/keypads/IdsClassicLed";
import { KeypadHost, applyEngineKey } from "@/components/keypads/KeypadHost";
import { convertLegacy, loadLegacyData } from "@/scripts/convert-legacy";
import { getEngine } from "@/lib/engines";
import { Pk5500 } from "@/components/keypads/Pk5500";
import { PkLed } from "@/components/keypads/PkLed";
import { StatusLeds } from "@/components/keypads/StatusLeds";
import { getKeypadComponent } from "@/components/keypads";
import type { Display, Key, Leds } from "@/lib/engines/types";

const LEDS: Leds = { ready: "on", armed: "off", trouble: "off", ac: "on" };

afterEach(() => cleanup());

describe("keypad faces", () => {
  it("Pk5500 renders both LCD lines", () => {
    const display: Display = { type: "text", lines: ["Enter Section", "[001]"] };
    render(<Pk5500 display={display} leds={LEDS} onKey={() => {}} name="PK5500" />);
    const lcd = screen.getByTestId("lcd");
    expect(lcd.textContent).toContain("Enter Section");
    expect(lcd.textContent).toContain("[001]");
  });

  it("Pk5500 sends key presses", () => {
    const onKey = vi.fn();
    const display: Display = { type: "text", lines: ["", ""] };
    render(<Pk5500 display={display} leds={LEDS} onKey={onKey} name="PK5500" />);
    fireEvent.click(screen.getByRole("button", { name: "*" }));
    fireEvent.click(screen.getByRole("button", { name: "Scroll left" }));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(["*", "<"]);
  });

  it("PkLed renders 16 lights with the lit ones marked", () => {
    const display: Display = { type: "lights", count: 16, lights: { 1: "on", 3: "on", 16: "flash" }, verified: true };
    render(<PkLed display={display} leds={LEDS} onKey={() => {}} name="PK5516" />);
    const lights = screen.getAllByTestId("zone-light");
    expect(lights).toHaveLength(16);
    expect(lights.filter((l) => l.dataset.state === "on").map((l) => l.textContent)).toEqual(["1", "3"]);
    expect(lights[15].dataset.state).toBe("flash");
    expect(lights[1].dataset.state).toBe("off");
    expect(screen.getByText("PK5516")).toBeTruthy();
    expect(screen.queryByText(/unverified/i)).toBeNull();
  });

  it("PkLed shows an unverified badge when display.verified is false", () => {
    const display: Display = { type: "lights", count: 8, lights: {}, verified: false };
    render(<PkLed display={display} leds={LEDS} onKey={() => {}} name="PK5508" />);
    expect(screen.getAllByTestId("zone-light")).toHaveLength(8);
    expect(screen.getByText(/unverified/i)).toBeTruthy();
  });

  it("StatusLeds draws a light the engine didn't name as off", () => {
    const { container } = render(<StatusLeds leds={{ ready: "on" }} />);
    const spans = Array.from(container.querySelectorAll(".led"));
    expect(spans.map((el) => el.getAttribute("data-state"))).toEqual(["on", "off", "off", "off"]);
    expect(spans[1].className).toBe("led armed");
  });

  it("getKeypadComponent maps component keys and rejects unknown ones", () => {
    expect(getKeypadComponent("pk5500")).toBe(Pk5500);
    expect(getKeypadComponent("pk-led")).toBe(PkLed);
    expect(() => getKeypadComponent("nope")).toThrow();
  });
});

const IDS_LEDS: Leds = { ready: "on", armed: "flash", away: "off", power: "alternate" };
const IDS_LIGHTS: Display = { type: "lights", count: 16, lights: { 1: "on", 9: "flash" }, verified: true };

describe("IdsClassicLed", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function renderIds(onKey = vi.fn(), display: Display = IDS_LIGHTS) {
    render(<IdsClassicLed display={display} leds={IDS_LEDS} onKey={onKey} name="Classic LED" />);
    return onKey;
  }
  const btn = (name: string) => screen.getByRole("button", { name });

  it("renders status lights, 16 zone lights in two columns, label and keys", () => {
    renderIds();
    expect(screen.getByTestId("status-ready").dataset.state).toBe("on");
    expect(screen.getByTestId("status-armed").dataset.state).toBe("flash");
    expect(screen.getByTestId("status-away").dataset.state).toBe("off");
    expect(screen.getByTestId("status-power").dataset.state).toBe("alternate");
    expect(screen.getByTestId("status-power").className).toContain("alternate");
    const cols = screen.getAllByRole("list");
    expect(cols).toHaveLength(2);
    expect(Array.from(cols[0].querySelectorAll("li")).map((l) => l.textContent)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(Array.from(cols[1].querySelectorAll("li")).map((l) => l.textContent)).toEqual(["9", "10", "11", "12", "13", "14", "15", "16"]);
    expect(screen.getAllByTestId("zone-light")).toHaveLength(16);
    expect(screen.getByText("X-SERIES")).toBeTruthy();
    for (const k of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "MODE", "F", "M", "P"]) expect(btn(k)).toBeTruthy();
    expect(screen.queryByText(/unverified/i)).toBeNull();
  });

  it("shows the unverified badge", () => {
    renderIds(vi.fn(), { type: "lights", count: 16, lights: {}, verified: false });
    expect(screen.getByText(/unverified/i)).toBeTruthy();
  });

  it("short press of * sends * on release", () => {
    const onKey = renderIds();
    fireEvent.pointerDown(btn("*"));
    expect(onKey).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    fireEvent.pointerUp(btn("*"));
    expect(onKey.mock.calls).toEqual([["*"]]);
  });

  it("long press sends hold* / hold9 once and nothing on release", () => {
    const onKey = renderIds();
    for (const [k, hold] of [["*", "hold*"], ["9", "hold9"]]) {
      onKey.mockClear();
      fireEvent.pointerDown(btn(k));
      act(() => { vi.advanceTimersByTime(1000); });
      expect(onKey.mock.calls).toEqual([[hold]]);
      expect(btn(k).className).toContain("held");
      fireEvent.pointerUp(btn(k));
      expect(onKey.mock.calls).toEqual([[hold]]);
      expect(btn(k).className).not.toContain("held");
    }
  });

  it("leaving a held key cancels the press", () => {
    const onKey = renderIds();
    fireEvent.pointerDown(btn("9"));
    fireEvent.pointerLeave(btn("9"));
    act(() => { vi.advanceTimersByTime(1500); });
    fireEvent.pointerUp(btn("9"));
    expect(onKey).not.toHaveBeenCalled();
  });

  it("other keys fire on pointer down", () => {
    const onKey = renderIds();
    for (const k of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "#"]) fireEvent.pointerDown(btn(k));
    fireEvent.pointerDown(btn("MODE"));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "#", "mode"]);
  });

  it("keyboard activation (click with no pointer) presses the plain key once", () => {
    const onKey = renderIds();
    fireEvent.click(btn("*"));
    fireEvent.click(btn("3"));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(["*", "3"]);
  });

  it("holdable keys suppress the long-press menu; other keys don't", () => {
    renderIds();
    expect(fireEvent.contextMenu(btn("*"))).toBe(false);
    expect(fireEvent.contextMenu(btn("9"))).toBe(false);
    expect(fireEvent.contextMenu(btn("1"))).toBe(true);
  });

  it("notes under the keys that F, M and P are real alarms the simulator ignores", () => {
    renderIds();
    expect(screen.getByText("F, M and P raise real alarms when held; the simulator ignores them.")).toBeTruthy();
  });

  it("F, M, P are disabled and send nothing", () => {
    const onKey = renderIds();
    for (const k of ["F", "M", "P"]) {
      fireEvent.pointerDown(btn(k));
      fireEvent.click(btn(k));
      expect((btn(k) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(onKey).not.toHaveBeenCalled();
  });

  it("registry maps ids-classic-led", () => {
    expect(getKeypadComponent("ids-classic-led")).toBe(IdsClassicLed);
  });
});

describe("KeypadHost key handling", () => {
  const dscModel = convertLegacy(loadLegacyData());
  const dscKeypad = dscModel.keypads.find((k) => k.displayType === "text")!;

  it("drops keys outside engine.keys (mode on a DSC host)", () => {
    const engine = getEngine("dsc-powerseries");
    const state = engine.createInitialState(dscModel);
    expect(applyEngineKey(engine, state, "mode" as Key, dscModel)).toBe(state);
    expect(applyEngineKey(engine, state, "hold*" as Key, dscModel)).toBe(state);
    expect(applyEngineKey(engine, state, "*", dscModel)).not.toBe(state);
  });

  it("DSC keyboard presses on keydown, not keyup", () => {
    render(<KeypadHost model={dscModel} engineKey="dsc-powerseries" keypad={dscKeypad} />);
    const before = screen.getByTestId("lcd").textContent;
    fireEvent.keyDown(document, { key: "*" });
    const afterDown = screen.getByTestId("lcd").textContent;
    expect(afterDown).not.toBe(before);
    fireEvent.keyUp(document, { key: "*" });
    expect(screen.getByTestId("lcd").textContent).toBe(afterDown);
  });
});

describe("KeypadHost IDS keyboard long press", () => {
  // The X64 model comes from the test DB, so load it before fake timers are installed.
  let model: Awaited<ReturnType<typeof import("@/lib/content/repo").getPanelModel>>;
  beforeAll(async () => {
    const { getPanelModel } = await import("@/lib/content/repo");
    model = await getPanelModel("x64");
  });
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function renderIdsHost() {
    const modes: string[] = [];
    render(<KeypadHost model={model!} engineKey="ids-xseries" keypad={model!.keypads[0]} onStateChange={(s) => modes.push((s as { mode: string }).mode)} />);
    return () => modes[modes.length - 1];
  }
  const press = (key: string, code: string, ms: number, upKey = key) => {
    fireEvent.keyDown(document, { key, code });
    act(() => { vi.advanceTimersByTime(ms); });
    fireEvent.keyUp(document, { key: upKey, code });
  };

  it("a short * press is the plain key; a 1 s hold of * reaches user program mode", () => {
    const mode = renderIdsHost();
    expect(mode()).toBe("idle");
    press("*", "Digit8", 200);
    expect(mode()).toBe("idle");
    press("*", "Digit8", 1000);
    expect(mode()).toBe("userCode");
  });

  it("the plain key is sent on release, not on keydown", () => {
    const mode = renderIdsHost();
    fireEvent.keyDown(document, { key: "9", code: "Digit9" });
    expect(mode()).toBe("idle");
    fireEvent.keyUp(document, { key: "9", code: "Digit9" });
    expect(mode()).toBe("idle");
  });

  it("Shift released before 8 leaves no stale entry: the next short * is not a hold", () => {
    const mode = renderIdsHost();
    press("*", "Digit8", 50, "8");
    act(() => { vi.advanceTimersByTime(2000); });
    press("*", "Digit8", 100);
    expect(mode()).toBe("idle");
  });

  it("a keydown whose keyup never arrived does not turn the next short press into a hold", () => {
    const mode = renderIdsHost();
    fireEvent.keyDown(document, { key: "*", code: "Digit8" });
    act(() => { vi.advanceTimersByTime(2000); });
    window.dispatchEvent(new Event("blur"));
    press("*", "Digit8", 100);
    expect(mode()).toBe("idle");
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pk5500 } from "@/components/keypads/Pk5500";
import { PkLed } from "@/components/keypads/PkLed";
import { getKeypadComponent } from "@/components/keypads";
import type { Display, Leds } from "@/lib/engines/types";

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

  it("getKeypadComponent maps component keys and rejects unknown ones", () => {
    expect(getKeypadComponent("pk5500")).toBe(Pk5500);
    expect(getKeypadComponent("pk-led")).toBe(PkLed);
    expect(() => getKeypadComponent("nope")).toThrow();
  });
});

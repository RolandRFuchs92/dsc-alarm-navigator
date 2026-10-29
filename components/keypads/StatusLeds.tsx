import type { LedState, Leds } from "@/lib/engines/types";

const LED_ORDER: Array<{ id: string; label: string }> = [
  { id: "ready", label: "READY" },
  { id: "armed", label: "ARMED" },
  { id: "trouble", label: "TROUBLE" },
  { id: "ac", label: "AC" },
];

export function pickLedClass(id: string, state: LedState): string {
  const result = `led ${id}${state === "off" ? "" : " on"}${state === "flash" ? " flash" : ""}${state === "alternate" ? " alternate" : ""}`;
  return result;
}

// Ready / Armed / Trouble / AC, the same four lights on every PowerSeries keypad.
export function StatusLeds({ leds }: { leds: Leds }) {
  return (
    <div className="leds">
      {LED_ORDER.map((l) => {
        const state = leds[l.id] ?? "off"; // a light the engine doesn't name is off
        return (
          <span key={l.id} className={pickLedClass(l.id, state)} data-state={state}>
            <i />
            {l.label}
          </span>
        );
      })}
    </div>
  );
}

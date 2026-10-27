import type { LedState, Leds } from "@/lib/engines/types";

const LED_ORDER: Array<{ id: keyof Leds; label: string }> = [
  { id: "ready", label: "READY" },
  { id: "armed", label: "ARMED" },
  { id: "trouble", label: "TROUBLE" },
  { id: "ac", label: "AC" },
];

function pickLedClass(id: string, state: LedState): string {
  const result = `led ${id}${state === "off" ? "" : " on"}${state === "flash" ? " flash" : ""}`;
  return result;
}

// Ready / Armed / Trouble / AC, the same four lights on every PowerSeries keypad.
export function StatusLeds({ leds }: { leds: Leds }) {
  return (
    <div className="leds">
      {LED_ORDER.map((l) => (
        <span key={l.id} className={pickLedClass(l.id, leds[l.id])} data-state={leds[l.id]}>
          <i />
          {l.label}
        </span>
      ))}
    </div>
  );
}

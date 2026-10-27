import type { LedState } from "@/lib/engines/types";
import { KeyGrid } from "./KeyGrid";
import { StatusLeds } from "./StatusLeds";
import type { KeypadProps } from "./types";

function listLights(count: number, lights: Record<number, LedState>): Array<{ n: number; state: LedState }> {
  const result = Array.from({ length: count }, (_, i) => ({ n: i + 1, state: lights[i + 1] ?? "off" }));
  return result;
}

// PK5508 / PK5516: no text screen; numbered zone lights carry section numbers, data and toggles.
export function PkLed({ display, leds, onKey, name, children }: KeypadProps) {
  const lights = display.type === "lights" ? listLights(display.count, display.lights) : [];
  const verified = display.type === "lights" ? display.verified : false;
  return (
    <div className="keypad keypad-led" aria-label={`${name} keypad simulator`}>
      <div className="keypad-head">
        <span className="keypad-brand">POWERSERIES</span>
        <StatusLeds leds={leds} />
      </div>
      <div className="zone-panel keypad-screen" aria-live="polite">
        <ol className={`zone-lights zone-lights-${lights.length}`} aria-label="Zone lights">
          {lights.map((l) => (
            <li key={l.n} data-testid="zone-light" data-state={l.state} className={`zone-light ${l.state}`}>{l.n}</li>
          ))}
        </ol>
        {verified ? null : <span className="badge unverified" title="Light pattern not yet checked on a real keypad">unverified</span>}
      </div>
      <KeyGrid onKey={onKey} withScroll={false} />
      {children ? <div className="keypad-foot">{children}</div> : null}
      <p className="keypad-name">{name}</p>
    </div>
  );
}

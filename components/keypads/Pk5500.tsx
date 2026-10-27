import { KeyGrid } from "./KeyGrid";
import { StatusLeds } from "./StatusLeds";
import type { KeypadProps } from "./types";

// PK5500: the 2x16 full-message LCD keypad, drawn as the legacy menu map did.
export function Pk5500({ display, leds, onKey, name, children }: KeypadProps) {
  const lines = display.type === "text" ? display.lines : ["", ""];
  return (
    <div className="keypad" aria-label={`${name} keypad simulator`}>
      <div className="keypad-head">
        <span className="keypad-brand">POWERSERIES</span>
        <StatusLeds leds={leds} />
      </div>
      <div className="lcd keypad-screen" data-testid="lcd" aria-live="polite">{`${lines[0] || ""}\n${lines[1] || ""}`}</div>
      <KeyGrid onKey={onKey} withScroll />
      {children ? <div className="keypad-foot">{children}</div> : null}
      <p className="keypad-name">{name}</p>
    </div>
  );
}

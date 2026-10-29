import type { Key, LedState } from "@/lib/engines/types";
import { pickLedClass } from "./StatusLeds";
import { useLongPress } from "./useLongPress";
import type { KeypadProps } from "./types";

const STATUS_LIGHTS: Array<{ id: string; label: string }> = [
  { id: "ready", label: "READY" },
  { id: "armed", label: "ARMED" },
  { id: "away", label: "AWAY" },
  { id: "power", label: "POWER" },
];
const DIGIT_KEYS: Key[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const HOLDABLE: Record<string, Key> = { "*": "hold*", "9": "hold9" };
const DISABLED_KEYS = ["F", "M", "P"];
const DISABLED_TITLE = "Holding this raises a real alarm; the simulator ignores it";

function listLights(count: number, lights: Record<number, LedState>): Array<{ n: number; state: LedState }> {
  const result = Array.from({ length: count }, (_, i) => ({ n: i + 1, state: lights[i + 1] ?? "off" }));
  return result;
}

// IDS X64 Classic LED keypad (user manual Figure 1): dark left panel with status and zone lights, 3x4 keys, MODE F M P row.
// F, M and P are the panic / medical / fire holds; they're drawn but disabled.
export function IdsClassicLed({ display, leds, onKey, name, children }: KeypadProps) {
  const { getHandlers, held } = useLongPress(onKey, HOLDABLE);
  const lights = display.type === "lights" ? listLights(display.count, display.lights) : [];
  const verified = display.type === "lights" ? display.verified : false;
  const half = Math.ceil(lights.length / 2);
  const columns = [lights.slice(0, half), lights.slice(half)];
  const renderKey = (k: Key, label: string, extra = "") => (
    <button key={k} type="button" data-key={k} className={`${extra}${held === k ? " held" : ""}`.trim() || undefined} {...getHandlers(k)}>{label}</button>
  );
  return (
    <div className="keypad keypad-ids" aria-label={`${name} keypad simulator`}>
      <div className="ids-body">
        <div className="ids-panel zone-panel" aria-live="polite">
          <div className="leds ids-status">
            {STATUS_LIGHTS.map((l) => (
              <span key={l.id} className={pickLedClass(l.id, leds[l.id] ?? "off")} data-testid={`status-${l.id}`} data-state={leds[l.id] ?? "off"}>
                <i />
                {l.label}
              </span>
            ))}
          </div>
          <p className="keypad-brand ids-label">X-SERIES</p>
          <div className="ids-zones">
            {columns.map((col, i) => (
              <ol key={i} className="zone-lights ids-zone-col" aria-label={`Zone lights ${col[0]?.n}-${col[col.length - 1]?.n}`}>
                {col.map((l) => (
                  <li key={l.n} data-testid="zone-light" data-state={l.state} className={`zone-light ${l.state}`}>{l.n}</li>
                ))}
              </ol>
            ))}
          </div>
          {verified ? null : <span className="badge unverified" title="Light pattern not yet checked on a real keypad">unverified</span>}
        </div>
        <div className="keys ids-keys">
          {DIGIT_KEYS.map((k) => renderKey(k, k))}
          <div className="ids-bottom">
            {renderKey("mode", "MODE", "ids-mode")}
            {DISABLED_KEYS.map((k) => (
              <button key={k} type="button" data-key={k.toLowerCase()} disabled title={DISABLED_TITLE}>{k}</button>
            ))}
          </div>
          <p className="ids-note">F, M and P raise real alarms when held; the simulator ignores them.</p>
        </div>
      </div>
      {children ? <div className="keypad-foot">{children}</div> : null}
      <p className="keypad-name">{name}</p>
    </div>
  );
}

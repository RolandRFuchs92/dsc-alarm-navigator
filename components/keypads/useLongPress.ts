import { useEffect, useRef, useState } from "react";
import type { PointerEvent, MouseEvent } from "react";
import type { Key } from "@/lib/engines/types";

export const HOLD_MS = 1000;

type PressHandlers = {
  onPointerDown: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerLeave: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
  onClick: (e: MouseEvent) => void;
};

// Pointer handling per key. Holdable keys (key -> its hold key) send the plain key on a short release and the hold key
// once HOLD_MS passes (nothing on release then). Other keys send on pointer down. A click with detail 0 is keyboard or
// assistive activation, which has no pointer events, so it sends the plain key.
export function useLongPress(onKey: (k: Key) => void, holdable: Record<string, Key>) {
  const [held, setHeld] = useState<string | null>(null);
  const pending = useRef<{ key: string; timer: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);

  function cancelPending() {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    setHeld(null);
  }

  useEffect(() => () => { if (pending.current) clearTimeout(pending.current.timer); }, []);

  function getHandlers(key: Key): PressHandlers {
    const holdKey = holdable[key];
    function handleDown() {
      if (!holdKey) { onKey(key); return; }
      cancelPending();
      const press = { key, fired: false, timer: setTimeout(() => {
        press.fired = true;
        setHeld(key);
        onKey(holdKey);
      }, HOLD_MS) };
      pending.current = press;
    }
    function handleUp() {
      const press = pending.current;
      if (!holdKey || !press || press.key !== key) return;
      const fired = press.fired;
      cancelPending();
      if (!fired) onKey(key);
    }
    function handleAbort() {
      if (holdKey && pending.current?.key === key) cancelPending();
    }
    const result: PressHandlers = {
      onPointerDown: handleDown,
      onPointerUp: handleUp,
      onPointerLeave: handleAbort,
      onPointerCancel: handleAbort,
      onClick: (e) => { if (e.detail === 0) onKey(key); },
    };
    return result;
  }

  const result = { getHandlers, held };
  return result;
}

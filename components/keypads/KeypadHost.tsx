"use client";

import { useEffect, useImperativeHandle, useReducer, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { getEngine } from "@/lib/engines";
import type { Key, PanelEngine } from "@/lib/engines/types";
import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";
import { getKeypadComponent } from "./index";
import { HOLD_MS } from "./useLongPress";

// Lets the map page move the keypad without a key press (tree clicks, links, crumbs).
export type KeypadHandle = { applyState: (update: (state: unknown) => unknown) => void };

type Action = { type: "key"; key: Key } | { type: "apply"; update: (state: unknown) => unknown };

type Props = {
  model: PanelModelData;
  engineKey: string;
  keypad: KeypadModelDef;
  initialState?: unknown;
  onStateChange?: (state: unknown) => void;
  ref?: Ref<KeypadHandle>;
  children?: ReactNode;
};

const KEY_ALIASES: Record<string, string> = { ArrowLeft: "<", ArrowRight: ">", Escape: "#" };

// Keys the engine doesn't have (e.g. "mode" on a DSC host) are dropped before they reach pressKey.
export function applyEngineKey(engine: PanelEngine<unknown>, state: unknown, key: Key, model: PanelModelData): unknown {
  const result = engine.keys.includes(key) ? engine.pressKey(state, key, model) : state;
  return result;
}

// Typing in a field (search box, forms) must never press keypad keys.
function checkTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const result = !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  return result;
}

// Owns the keypad state: one reducer over engine.pressKey, plus keyboard input and the beep flash.
export function KeypadHost({ model, engineKey, keypad, initialState, onStateChange, ref, children }: Props) {
  const engine = getEngine(engineKey);
  const [state, dispatch] = useReducer(
    (current: unknown, action: Action) => (action.type === "key" ? applyEngineKey(engine, current, action.key, model) : action.update(current)),
    initialState,
    (start) => start ?? engine.createInitialState(model),
  );
  const [beepTick, setBeepTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onStateChange);

  useEffect(() => { onChangeRef.current = onStateChange; }, [onStateChange]);

  useImperativeHandle(ref, () => ({ applyState: (update) => dispatch({ type: "apply", update }) }), []);

  useEffect(() => {
    onChangeRef.current?.(state);
    if (engine.selectFocus?.(state, model).beep) setBeepTick((t) => t + 1);
  }, [state, engine, model]);

  useEffect(() => {
    // Keys held on the keyboard: key -> time of keydown, for engines that have hold keys (IDS * and 9).
    const downAt = new Map<string, number>();
    function findButton(key: string): Element | null | undefined {
      const result = wrapRef.current?.querySelector(`[data-key="${CSS.escape(key)}"]`);
      return result;
    }
    function checkHoldable(key: string): boolean {
      const result = (key === "*" || key === "9") && engine.keys.includes(`hold${key}` as Key);
      return result;
    }
    function parseKey(event: KeyboardEvent): string | null {
      if (checkTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return null;
      const key = KEY_ALIASES[event.key] ?? event.key;
      const result = /^[0-9*#<>]$/.test(key) ? key : null;
      return result;
    }
    function handleKeydown(event: KeyboardEvent) {
      const key = parseKey(event);
      if (!key) return;
      event.preventDefault();
      const button = findButton(key);
      if (button) {
        button.classList.add("pressed");
        setTimeout(() => button.classList.remove("pressed"), 120);
      }
      if (checkHoldable(key)) {
        if (!event.repeat && !downAt.has(key)) downAt.set(key, Date.now());
        return;
      }
      dispatch({ type: "key", key: key as Key });
    }
    function handleKeyup(event: KeyboardEvent) {
      const key = parseKey(event);
      const start = key ? downAt.get(key) : undefined;
      if (!key || start === undefined) return;
      downAt.delete(key);
      const held = Date.now() - start >= HOLD_MS;
      dispatch({ type: "key", key: (held ? `hold${key}` : key) as Key });
    }
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keyup", handleKeyup);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keyup", handleKeyup);
    };
  }, [engine]);

  const Keypad = getKeypadComponent(keypad.componentKey);
  // Alternating a/b restarts the CSS flash animation on every beep.
  const beep = beepTick === 0 ? undefined : beepTick % 2 ? "a" : "b";
  return (
    <div ref={wrapRef} className="keypad-host" data-beep={beep}>
      <Keypad
        display={engine.selectDisplay(state, model, keypad)}
        leds={engine.selectLeds(state)}
        onKey={(key) => dispatch({ type: "key", key })}
        name={keypad.name}
      >
        {children}
      </Keypad>
    </div>
  );
}

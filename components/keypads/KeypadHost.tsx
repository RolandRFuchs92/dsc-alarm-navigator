"use client";

import { useEffect, useImperativeHandle, useReducer, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { getEngine } from "@/lib/engines";
import type { Key } from "@/lib/engines/types";
import type { KeypadModelDef, PanelModelData } from "@/lib/content/types";
import { getKeypadComponent } from "./index";

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
    (current: unknown, action: Action) => (action.type === "key" ? (engine.keys.includes(action.key) ? engine.pressKey(current, action.key, model) : current) : action.update(current)),
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
    function handleKeyboard(event: KeyboardEvent) {
      if (checkTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = KEY_ALIASES[event.key] ?? event.key;
      if (!/^[0-9*#<>]$/.test(key)) return;
      event.preventDefault();
      const button = wrapRef.current?.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (button) {
        button.classList.add("pressed");
        setTimeout(() => button.classList.remove("pressed"), 120);
      }
      dispatch({ type: "key", key: key as Key });
    }
    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, []);

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

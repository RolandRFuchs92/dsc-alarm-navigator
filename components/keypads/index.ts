import type { ComponentType } from "react";
import { Pk5500 } from "./Pk5500";
import { PkLed } from "./PkLed";
import type { KeypadProps } from "./types";

// keypad_model.component_key → face component. A new keypad look means a new entry here.
const KEYPADS: Record<string, ComponentType<KeypadProps>> = {
  pk5500: Pk5500,
  "pk-led": PkLed,
};

export function getKeypadComponent(componentKey: string): ComponentType<KeypadProps> {
  const component = KEYPADS[componentKey];
  if (!component) throw new Error(`No keypad component for key "${componentKey}"`);
  const result = component;
  return result;
}

export type { KeypadProps };

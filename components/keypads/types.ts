import type { ReactNode } from "react";
import type { Display, Key, Leds } from "@/lib/engines/types";

// Every keypad face takes the same props; the engine decides what the display shows.
// children: optional controls drawn inside the face under the keys (reset / clear on the map page).
export type KeypadProps = { display: Display; leds: Leds; onKey: (k: Key) => void; name: string; children?: ReactNode };

import type { Key } from "@/lib/engines/types";

const DIGIT_KEYS: Key[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

// The 12-key pad; the PK5500 adds the < > scroll keys above it.
export function KeyGrid({ onKey, withScroll }: { onKey: (k: Key) => void; withScroll: boolean }) {
  return (
    <div className="keys">
      {withScroll ? (
        <div className="scroll">
          <button type="button" data-key="<" aria-label="Scroll left" onClick={() => onKey("<")}>&lt;</button>
          <button type="button" data-key=">" aria-label="Scroll right" onClick={() => onKey(">")}>&gt;</button>
        </div>
      ) : null}
      {DIGIT_KEYS.map((k) => (
        <button key={k} type="button" data-key={k} onClick={() => onKey(k)}>{k}</button>
      ))}
    </div>
  );
}

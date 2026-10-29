import { formatKeycaps } from "@/lib/guides/keys";
import styles from "./guides.module.css";

// The keys for one step as keycaps; code placeholders show as one labelled cap.
export function Keycaps({ keys, engineKey }: { keys: string; engineKey: string }) {
  const caps = formatKeycaps(keys, engineKey);
  if (!caps.length) return null;
  return (
    <ol className={styles.keycaps} aria-label="Keys to press">
      {caps.map((cap, i) => (
        <li key={i}>
          <kbd className={`keycap ${styles.cap} ${cap.placeholder ? styles.placeholder : ""}`}>{cap.label}</kbd>
        </li>
      ))}
    </ol>
  );
}

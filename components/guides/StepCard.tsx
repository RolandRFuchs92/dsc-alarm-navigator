import Link from "next/link";
import type { GuideStep } from "@/lib/content/repo";
import { Keycaps } from "./Keycaps";
import styles from "./guides.module.css";

type Props = { step: GuideStep; number: number; count: number; modelSlug: string; engineKey: string };

// One guide step: what to do, the keys, the note, any warning, and a link into the map.
export function StepCard({ step, number, count, modelSlug, engineKey }: Props) {
  const ref = step.sectionRef;
  return (
    <section className={`panel ${styles.card}`} aria-labelledby="step-title">
      <p className={styles.eyebrow}>{`Step ${number} of ${count}`}</p>
      <h2 id="step-title" className={styles.title}>{step.title}</h2>
      <Keycaps keys={step.keys} engineKey={engineKey} />
      {step.note ? <p className={styles.note}>{step.note}</p> : null}
      {step.warning ? <p role="note" className={styles.warning}>{`Warning: ${step.warning}`}</p> : null}
      {ref !== null ? (
        <Link href={`/devices/${modelSlug}/map/${String(ref).padStart(3, "0")}`} className={styles.sectionLink}>
          {`View this section [${String(ref).padStart(3, "0")}]`}
        </Link>
      ) : null}
    </section>
  );
}

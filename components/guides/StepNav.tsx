import Link from "next/link";
import styles from "./guides.module.css";

type Props = { number: number; count: number; basePath: string; doneHref: string };

// Back / Next pinned to the bottom for one thumb. Plain links: a step only changes when tapped.
export function StepNav({ number, count, basePath, doneHref }: Props) {
  return (
    <nav className={styles.nav} aria-label="Guide steps">
      {number > 1 ? (
        <Link href={`${basePath}?step=${number - 1}`} className={styles.navButton}>‹ Back</Link>
      ) : <span className={styles.navGap} />}
      {number < count ? (
        <Link href={`${basePath}?step=${number + 1}`} className={`${styles.navButton} ${styles.navNext}`}>Next ›</Link>
      ) : (
        <Link href={doneHref} className={`${styles.navButton} ${styles.navNext}`}>Done</Link>
      )}
    </nav>
  );
}

import styles from "./pending.module.css";
import { LogoutButton } from "./logout-button";

export default function PendingPage() {
  return (
    <main className={styles.main}>
      <h1>Your account is waiting for approval</h1>
      <p>An admin needs to approve your account before you can use the navigator.</p>
      <LogoutButton />
    </main>
  );
}

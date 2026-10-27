import { redirect } from "next/navigation";
import styles from "./pending.module.css";
import { LogoutButton } from "@/components/LogoutButton";
import { findAppUser } from "@/lib/auth/guards";

// Public route, but an already-approved user (e.g. reloading this page) goes straight in.
export default async function PendingPage() {
  const current = await findAppUser();
  if (!current) redirect("/login");
  if (current.approved) redirect("/devices");
  return (
    <main className={styles.main}>
      <h1>Your account is waiting for approval</h1>
      <p>An admin needs to approve your account before you can use the navigator.</p>
      <LogoutButton />
    </main>
  );
}

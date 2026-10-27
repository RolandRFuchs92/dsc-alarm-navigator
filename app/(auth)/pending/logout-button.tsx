"use client";

import { useRouter } from "next/navigation";
import styles from "./pending.module.css";
import { authClient } from "@/lib/auth/auth-client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className={styles.button}>
      Log out
    </button>
  );
}

import Link from "next/link";
import styles from "./layout.module.css";
import { LogoutButton } from "@/components/LogoutButton";
import type { ReactNode } from "react";
import { requireApprovedUser } from "@/lib/auth/guards";

// Everything under (app) needs an approved session; the guard re-checks the DB each request.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const current = await requireApprovedUser();
  return (
    <>
      <header className={styles.header}>
        <Link href="/">Home</Link>
        <Link href="/devices">Panels</Link>
        {current.isAdmin ? <Link href="/admin/users">Admin</Link> : null}
        <LogoutButton />
      </header>
      {children}
    </>
  );
}

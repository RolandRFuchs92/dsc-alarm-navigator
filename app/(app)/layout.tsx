import Link from "next/link";
import type { ReactNode } from "react";
import { requireApprovedUser } from "@/lib/auth/guards";

// Everything under (app) needs an approved session; the guard re-checks the DB each request.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const current = await requireApprovedUser();
  return (
    <>
      <header style={{ display: "flex", gap: 16, padding: "12px 16px" }}>
        <Link href="/">Home</Link>
        {current.isAdmin ? <Link href="/admin/users">Admin</Link> : null}
      </header>
      {children}
    </>
  );
}

import type { ReactNode } from "react";
import { requireApprovedUser } from "@/lib/auth/guards";

// Everything under (app) needs an approved session; the guard re-checks the DB each request.
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireApprovedUser();
  return <>{children}</>;
}

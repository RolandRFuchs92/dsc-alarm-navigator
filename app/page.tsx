import { redirect } from "next/navigation";
import { requireApprovedUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

// "/" has no page of its own: approved users land on the panel list.
export default async function HomePage() {
  await requireApprovedUser();
  redirect("/devices");
}

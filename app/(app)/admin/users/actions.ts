"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { setApproved } from "@/lib/auth/users";

// Each action re-checks admin itself: the layout does not protect server actions.
async function approveUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId) await setApproved(userId, true);
  revalidatePath("/admin/users");
}

async function revokeUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId) await setApproved(userId, false);
  revalidatePath("/admin/users");
}

export { approveUser, revokeUser };

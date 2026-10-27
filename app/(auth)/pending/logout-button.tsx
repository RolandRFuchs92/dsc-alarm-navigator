"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} style={{ width: "100%", minHeight: 48, fontSize: 16, marginTop: 20 }}>
      Log out
    </button>
  );
}

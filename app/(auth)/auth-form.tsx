"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./auth.module.css";
import { authClient } from "@/lib/auth/auth-client";

type Mode = "login" | "signup";

// Plain, thumb-sized email + password form shared by login and signup.
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const res =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: String(form.get("name")) })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Something went wrong");
      return;
    }
    router.push("/devices");
    router.refresh();
  }

  return (
    <main className={styles.main}>
      <h1>{mode === "signup" ? "Create account" : "Log in"}</h1>
      <form onSubmit={submit}>
        {mode === "signup" && (
          <label>Name<input name="name" required autoComplete="name" className={styles.field} /></label>
        )}
        <label className={styles.label}>Email<input name="email" type="email" required autoComplete="email" className={styles.field} /></label>
        <label className={styles.label}>Password<input name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={styles.field} /></label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy} className={styles.button}>{mode === "signup" ? "Sign up" : "Log in"}</button>
      </form>
      <p className={styles.footer}>
        {mode === "signup" ? <Link href="/login">Already have an account? Log in</Link> : <Link href="/signup">Need an account? Sign up</Link>}
      </p>
    </main>
  );
}

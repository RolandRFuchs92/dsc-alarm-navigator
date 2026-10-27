import { LogoutButton } from "./logout-button";

export default function PendingPage() {
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "32px 16px" }}>
      <h1>Your account is waiting for approval</h1>
      <p>An admin needs to approve your account before you can use the navigator.</p>
      <LogoutButton />
    </main>
  );
}

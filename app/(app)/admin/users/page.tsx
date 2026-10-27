import { requireAdmin } from "@/lib/auth/guards";
import { listUsers } from "@/lib/auth/users";
import styles from "./page.module.css";
import { approveUser, revokeUser } from "./actions";

export const dynamic = "force-dynamic";

function pickStatus(u: { approved: boolean; isAdmin: boolean }): string {
  const result = u.isAdmin ? "Admin" : u.approved ? "Approved" : "Pending";
  return result;
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsers();
  return (
    <main className={styles.main}>
      <h1>Users</h1>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th align="left">Email</th>
              <th align="left">Signed up</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className={styles.email}>{u.email}</td>
                <td>{u.createdAt.toISOString().slice(0, 10)}</td>
                <td>{pickStatus(u)}</td>
                <td>
                  {u.isAdmin ? null : u.approved ? (
                    <form action={revokeUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className={styles.button}>Revoke</button>
                    </form>
                  ) : (
                    <form action={approveUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className={styles.button}>Approve</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

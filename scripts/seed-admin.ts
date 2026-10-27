import "dotenv/config";
import { pool } from "../lib/db/client";
import { UserNotFoundError, promoteToAdmin } from "../lib/auth/users";

// Usage: npm run seed:admin -- <email>  (the account must already exist)
async function runSeedAdmin(): Promise<number> {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run seed:admin -- <email>");
    return 2;
  }
  let code = 0;
  try {
    await promoteToAdmin(email);
    console.log(`Promoted ${email} to admin`);
  } catch (err) {
    if (!(err instanceof UserNotFoundError)) throw err;
    console.error(`No account for ${email}. Sign up first.`);
    code = 1;
  } finally {
    await pool.end();
  }
  return code;
}

process.exit(await runSeedAdmin());

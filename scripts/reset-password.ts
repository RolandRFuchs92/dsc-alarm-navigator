import "dotenv/config";
import { pool } from "../lib/db/client";
import { UserNotFoundError, resetPassword } from "../lib/auth/users";

// Read one line from the TTY without echoing it. No argv/env fallback by design.
function readHidden(prompt: string): Promise<string> {
  const result = new Promise<string>((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return reject(new Error("A terminal is required: the password is never read from a pipe, argv or env."));
    process.stdout.write(prompt);
    let buf = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(buf);
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") buf = buf.slice(0, -1);
        else buf += ch;
      }
    };
    stdin.on("data", onData);
  });
  return result;
}

// Usage: npm run user:reset-password -- <email>
async function runResetPassword(): Promise<number> {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run user:reset-password -- <email>");
    return 2;
  }
  let code = 0;
  try {
    const first = await readHidden("New password: ");
    const second = await readHidden("Repeat password: ");
    if (first !== second) {
      console.error("Passwords do not match.");
      code = 1;
    } else if (first.length < 8) {
      console.error("Password must be at least 8 characters.");
      code = 1;
    } else {
      await resetPassword(email, first);
      console.log(`Password reset for ${email}`);
    }
  } catch (err) {
    if (err instanceof UserNotFoundError) console.error(`No account for ${email}.`);
    else console.error(err instanceof Error ? err.message : err);
    code = 1;
  } finally {
    await pool.end();
  }
  return code;
}

process.exit(await runResetPassword());

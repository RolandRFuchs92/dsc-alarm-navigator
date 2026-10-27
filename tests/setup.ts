// Runs before every test module (so before lib/db/client.ts builds its Pool).
// Load .env, then point DATABASE_URL at the test database so app code under
// test can never touch dsc_dev.
import "dotenv/config";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("tests/setup.ts: TEST_DATABASE_URL is not set");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

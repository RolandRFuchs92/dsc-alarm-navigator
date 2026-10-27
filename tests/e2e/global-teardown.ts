import "dotenv/config";
import { deleteE2eUsers } from "./users";

// Leave dsc_test with no e2e accounts behind.
export default async function teardownE2e(): Promise<void> {
  const removed = await deleteE2eUsers();
  console.log(`e2e teardown: removed ${removed} test user(s)`);
}

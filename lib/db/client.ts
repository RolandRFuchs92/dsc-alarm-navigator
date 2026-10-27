import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// One shared pool for the whole process; tern owns the schema, drizzle only queries.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export { db, pool };

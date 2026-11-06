import pg from "pg";
import { readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(
    await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"),
  );
  await client.query("COMMIT");
  console.log("Database schema ready.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

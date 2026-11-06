import "server-only";
import { Pool, type PoolClient } from "pg";
let pool: Pool | undefined;
export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Die Datenbank ist noch nicht eingerichtet.");
  return (pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  }));
}
export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

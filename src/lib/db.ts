import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { hashPassword } from "@/lib/password";
import { migrations } from "@/lib/schema";

// Dev reloads re-run this module; without the global each reload would open another pool.
const shared = globalThis as { chessPool?: Pool; chessReady?: Promise<void> };

function pool() {
  shared.chessPool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return shared.chessPool;
}

async function migrate() {
  const client = await pool().connect();
  try {
    // The web app and the import worker start together and both run this.
    await client.query("select pg_advisory_lock(43117)");
    await client.query("create table if not exists schema_version (version integer not null)");
    const { rows } = await client.query<{ version: number }>(
      "select coalesce(max(version), 0)::int as version from schema_version",
    );
    for (let version = rows[0].version; version < migrations.length; version += 1) {
      await client.query("begin");
      await client.query(migrations[version]);
      await client.query("insert into schema_version (version) values ($1)", [version + 1]);
      await client.query("commit");
    }
    const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
    if (ADMIN_USERNAME && ADMIN_PASSWORD) {
      await client.query(
        "insert into users (username, password_hash, is_admin) values ($1, $2, true) on conflict (username) do nothing",
        [ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD)],
      );
    }
    await client.query("select pg_advisory_unlock(43117)");
    client.release();
  } catch (error) {
    // Destroying the connection drops the lock and any half-applied migration with it.
    client.release(true);
    throw error;
  }
}

function ready() {
  shared.chessReady ??= migrate().catch((error) => {
    shared.chessReady = undefined;
    throw error;
  });
  return shared.chessReady;
}

export async function query<Row extends QueryResultRow>(text: string, params: unknown[] = []) {
  await ready();
  return (await pool().query<Row>(text, params)).rows;
}

export async function transaction<Result>(work: (client: PoolClient) => Promise<Result>) {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

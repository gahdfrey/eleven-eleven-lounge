import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

/**
 * Singleton connection pool, reused across dev hot-reloads so we don't
 * exhaust Neon's connection limit.
 */
declare global {
  var _pgPool: postgres.Sql | undefined;
}

const client =
  globalThis._pgPool ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required for Neon's pooled (PgBouncer) endpoint
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._pgPool = client;
}

export const db = drizzle(client, { schema });

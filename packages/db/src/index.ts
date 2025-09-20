import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

// Create a lazy database instance that only initializes when accessed
let _db: Database | null = null;

function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!_db) {
    const client = postgres(process.env.DATABASE_URL);
    _db = drizzle(client, { schema });
  }

  return _db;
}

// Export a proxy that forwards all calls to the actual db instance without
// initializing the connection during module evaluation. This prevents build
// steps (which often run without DATABASE_URL) from failing while still
// throwing a helpful error when the database is accessed at runtime.
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

// Re-export schema for convenience
export * from "./schema";

// Re-export drizzle-orm functions to ensure version consistency
export {
  eq,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  exists,
  notExists,
  sql,
} from "drizzle-orm";

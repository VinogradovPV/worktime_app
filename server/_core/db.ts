import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../drizzle/schema";

let cachedDb: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

/**
 * Get database connection pool
 * Connects to the Yandex Cloud PostgreSQL database
 */
export async function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    // Create connection pool
    if (!pool) {
      pool = new Pool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "worktime",
        ssl: {
          rejectUnauthorized: false,
        },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }

    const db = drizzle(pool, { schema });
    cachedDb = db;
    return cachedDb;
  } catch (error) {
    console.error("Failed to get database connection:", error);
    return null;
  }
}

/**
 * Reset cached database connection
 */
export function resetDb() {
  cachedDb = null;
}

/**
 * Close database connection pool
 */
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    cachedDb = null;
  }
}

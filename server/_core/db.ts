import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../drizzle/schema";

let cachedDb: any = null;
let pool: mysql.Pool | null = null;

/**
 * Get database connection pool
 * Connects to the Manus-managed MySQL database
 */
export async function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    // Create connection pool
    if (!pool) {
      pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "worktime",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    }

    const db = drizzle(pool, { schema, mode: "default" });
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

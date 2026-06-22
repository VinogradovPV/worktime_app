import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getDb } from "./_core/db";
import { workDays, syncLogs, users, InsertWorkDay, InsertSyncLog, InsertUser } from "../drizzle/schema";

/**
 * Get all work days for a user within a date range
 */
export async function getUserWorkDays(
  userId: number,
  startDate: string,
  endDate: string
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workDays)
    .where(
      and(
        eq(workDays.userId, userId),
        gte(workDays.date, startDate),
        lte(workDays.date, endDate)
      )
    );
}

/**
 * Get a specific work day for a user
 */
export async function getUserWorkDay(userId: number, date: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(workDays)
    .where(and(eq(workDays.userId, userId), eq(workDays.date, date)))
    .limit(1);

  return result[0] || null;
}

/**
 * Create or update a work day
 */
export async function upsertWorkDay(data: InsertWorkDay) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserWorkDay(data.userId, data.date);

  if (existing) {
    // Update existing
    await db
      .update(workDays)
      .set({
        ...data,
        version: (existing.version || 1) + 1,
        updatedAt: new Date(),
      })
      .where(
        and(eq(workDays.userId, data.userId), eq(workDays.date, data.date))
      );

    return existing.id;
  } else {
    // Insert new — PostgreSQL supports RETURNING
    const result = await db
      .insert(workDays)
      .values(data)
      .returning({ id: workDays.id });
    return result[0]?.id || 0;
  }
}

/**
 * Batch upsert work days
 */
export async function batchUpsertWorkDays(days: InsertWorkDay[]) {
  const results: number[] = [];
  for (const day of days) {
    const id = await upsertWorkDay(day);
    results.push(id);
  }
  return results;
}

/**
 * Delete a work day
 */
export async function deleteWorkDay(userId: number, date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(workDays)
    .where(and(eq(workDays.userId, userId), eq(workDays.date, date)));
}

/**
 * Get work days that need to be synced (modified after last sync)
 */
export async function getUnsyncedWorkDays(userId: number, lastSyncTime: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(workDays)
    .where(
      and(
        eq(workDays.userId, userId),
        gte(workDays.updatedAt, lastSyncTime)
      )
    );
}

/**
 * Log a sync event
 */
export async function logSyncEvent(data: InsertSyncLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(syncLogs)
    .values(data)
    .returning({ id: syncLogs.id });
  return result[0]?.id || 0;
}

/**
 * Get sync history for a user
 */
export async function getUserSyncHistory(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.userId, userId))
    .orderBy(desc(syncLogs.createdAt))
    .limit(limit);
}

/**
 * Get user by openId
 */
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0] || null;
}

/**
 * Upsert user (for auth sync)
 */
export async function upsertUser(data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!data.openId) throw new Error("openId is required");

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.openId, data.openId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.openId, data.openId));
    return existing[0].id;
  } else {
    const result = await db
      .insert(users)
      .values(data as InsertUser)
      .returning({ id: users.id });
    return result[0]?.id || 0;
  }
}

/**
 * Get last successful sync time for a user
 */
export async function getLastSyncTime(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(syncLogs)
    .where(
      and(
        eq(syncLogs.userId, userId),
        eq(syncLogs.status, "success")
      )
    )
    .orderBy(desc(syncLogs.createdAt))
    .limit(1);

  return result[0]?.createdAt || null;
}

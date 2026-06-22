import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * WorkDays table for storing work day records synced from mobile app
 */
export const workDays = mysqlTable("workDays", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  dayType: mysqlEnum("dayType", [
    "workday",
    "weekend",
    "holiday",
    "vacation",
    "shortened_workday",
  ])
    .default("workday")
    .notNull(),
  totalWorkedMs: int("totalWorkedMs").default(0).notNull(), // Total worked time in milliseconds
  totalBreakMs: int("totalBreakMs").default(0).notNull(), // Total break time in milliseconds
  totalTemporaryExitMs: int("totalTemporaryExitMs").default(0).notNull(), // Total temporary exit time
  eventsJson: text("eventsJson").notNull(), // JSON array of WorkDayEvent objects
  syncedAt: timestamp("syncedAt").defaultNow().notNull(), // When this was last synced
  version: int("version").default(1).notNull(), // Version for conflict resolution
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkDay = typeof workDays.$inferSelect;
export type InsertWorkDay = typeof workDays.$inferInsert;

/**
 * SyncLog table for tracking synchronization history
 */
export const syncLogs = mysqlTable("syncLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: mysqlEnum("action", ["upload", "download", "conflict", "error"]).notNull(),
  workDayId: int("workDayId"),
  date: varchar("date", { length: 10 }),
  status: mysqlEnum("status", ["success", "failed", "pending"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

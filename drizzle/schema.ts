import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * WorkDays table for storing work day records synced from mobile app
 */
export const dayTypeEnum = pgEnum("day_type", [
  "workday",
  "weekend",
  "holiday",
  "vacation",
  "shortened_workday",
]);

export const workDays = pgTable("workDays", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  dayType: dayTypeEnum("dayType").default("workday").notNull(),
  totalWorkedMs: integer("totalWorkedMs").default(0).notNull(), // Total worked time in milliseconds
  totalBreakMs: integer("totalBreakMs").default(0).notNull(), // Total break time in milliseconds
  totalTemporaryExitMs: integer("totalTemporaryExitMs").default(0).notNull(), // Total temporary exit time
  eventsJson: text("eventsJson").notNull(), // JSON array of WorkDayEvent objects
  syncedAt: timestamp("syncedAt").defaultNow().notNull(), // When this was last synced
  version: integer("version").default(1).notNull(), // Version for conflict resolution
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WorkDay = typeof workDays.$inferSelect;
export type InsertWorkDay = typeof workDays.$inferInsert;

/**
 * SyncLog table for tracking synchronization history
 */
export const syncActionEnum = pgEnum("sync_action", ["upload", "download", "conflict", "error"]);
export const syncStatusEnum = pgEnum("sync_status", ["success", "failed", "pending"]);

export const syncLogs = pgTable("syncLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  action: syncActionEnum("action").notNull(),
  workDayId: integer("workDayId"),
  date: varchar("date", { length: 10 }),
  status: syncStatusEnum("status").default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

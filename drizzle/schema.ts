import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

// User roles
export const userRoleEnum = pgEnum("user_role", ["user", "unit_manager", "department_manager", "admin"]);

// User statuses
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "blocked", "rejected", "password_reset_required"]);

// Org unit types
export const orgUnitTypeEnum = pgEnum("org_unit_type", ["department", "inspection", "department_unit", "section", "other"]);

/**
 * Users table with authentication and role-based access control
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Legacy OAuth identifier for backward compatibility */
  openId: varchar("openId", { length: 64 }).unique(),
  /** Login for username/password authentication */
  login: varchar("login", { length: 32 }).notNull().unique(),
  /** Password hash (bcrypt) */
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  /** Display name / full name */
  displayName: text("displayName").notNull(),
  /** Organization unit ID */
  orgUnitId: integer("orgUnitId"),
  /** Position ID */
  positionId: integer("positionId"),
  /** User role */
  role: userRoleEnum("role").default("user").notNull(),
  /** User status */
  status: userStatusEnum("status").default("pending").notNull(),
  /** Managed org unit ID (for managers) */
  managedOrgUnitId: integer("managedOrgUnitId"),
  /** Last login timestamp */
  lastLoginAt: timestamp("lastLoginAt"),
  /** Legacy fields for backward compatibility */
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organization units (departments, inspections, etc.)
 */
export const orgUnits = pgTable("orgUnits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 50 }),
  type: orgUnitTypeEnum("type").notNull(),
  parentId: integer("parentId"), // For hierarchical structure
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OrgUnit = typeof orgUnits.$inferSelect;
export type InsertOrgUnit = typeof orgUnits.$inferInsert;

/**
 * Positions (job titles)
 */
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * Audit log for tracking administrative actions
 */
export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId").notNull(), // Admin who performed the action
  targetUserId: integer("targetUserId"), // User affected by the action
  action: varchar("action", { length: 50 }).notNull(), // e.g., 'approve', 'reject', 'block', 'assign_role'
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g., 'user', 'org_unit', 'position'
  entityId: integer("entityId"), // ID of the entity being modified
  oldValue: text("oldValue"), // JSON string of old values
  newValue: text("newValue"), // JSON string of new values
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

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

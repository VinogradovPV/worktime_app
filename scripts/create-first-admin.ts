/**
 * Seed script to create the first admin user
 * Usage: ADMIN_LOGIN="..." ADMIN_PASSWORD="..." ADMIN_NAME="..." pnpm seed:admin
 */

import * as dotenv from "dotenv";
import { getDb } from "../server/_core/db";
import { users, orgUnits, positions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
const bcryptjs = require("bcryptjs");

dotenv.config();

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrator";

async function createFirstAdmin() {
  console.log("🔐 Creating first admin user...");

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.login, ADMIN_LOGIN))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("⚠️  Admin user already exists. Skipping creation.");
      console.log(`   Login: ${ADMIN_LOGIN}`);
      console.log(`   Status: ${existingAdmin[0].status}`);
      console.log(`   Role: ${existingAdmin[0].role}`);
      return;
    }

    // Get or create root org unit
    let rootOrgUnit = await db
      .select()
      .from(orgUnits)
      .where(eq(orgUnits.name, "Organization"))
      .limit(1);

    let orgUnitId = rootOrgUnit[0]?.id;

    if (!orgUnitId) {
      console.log("📁 Creating root organization unit...");
      const result = await db
        .insert(orgUnits)
        .values({
          name: "Organization",
          shortName: "Org",
          type: "department",
          parentId: null,
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: orgUnits.id });

      orgUnitId = result[0]?.id;
      console.log(`✅ Organization unit created with ID: ${orgUnitId}`);
    }

    // Get or create admin position
    let adminPosition = await db
      .select()
      .from(positions)
      .where(eq(positions.name, "Administrator"))
      .limit(1);

    let positionId = adminPosition[0]?.id;

    if (!positionId) {
      console.log("👔 Creating administrator position...");
      const result = await db
        .insert(positions)
        .values({
          name: "Administrator",
          shortName: "Admin",
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: positions.id });

      positionId = result[0]?.id;
      console.log(`✅ Administrator position created with ID: ${positionId}`);
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    console.log("👤 Creating admin user...");
    const result = await db
      .insert(users)
      .values({
        login: ADMIN_LOGIN,
        passwordHash,
        displayName: ADMIN_NAME,
        orgUnitId,
        positionId,
        role: "admin",
        status: "active",
        managedOrgUnitId: orgUnitId,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id });

    const adminId = result[0]?.id;

    console.log("\n✅ First admin user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📋 Admin Details:`);
    console.log(`   ID: ${adminId}`);
    console.log(`   Login: ${ADMIN_LOGIN}`);
    console.log(`   Name: ${ADMIN_NAME}`);
    console.log(`   Role: admin`);
    console.log(`   Status: active`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n✨ Done!");
  } catch (error) {
    console.error("❌ Error creating first admin:", error);
    process.exit(1);
  }
}

createFirstAdmin().then(() => {
  process.exit(0);
});

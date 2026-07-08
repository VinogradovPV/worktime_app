/**
 * Seed script to create the first admin user
 * 
 * Usage:
 * ADMIN_LOGIN="admin" ADMIN_PASSWORD="SecurePass123!" ADMIN_NAME="Administrator" pnpm seed:admin
 * 
 * IMPORTANT: This is a placeholder script.
 * The actual implementation requires:
 * 1. server/db.ts - Database connection module
 * 2. drizzle/schema.ts - Database schema definitions
 * 3. DATABASE_URL environment variable
 * 
 * This script:
 * - Reads ADMIN_LOGIN, ADMIN_PASSWORD, ADMIN_NAME from environment
 * - Hashes password using bcryptjs
 * - Creates user with role=admin, status=active, managedOrgUnitId=null
 * - Is idempotent (safe to run multiple times)
 * - Does NOT log the password
 */

import * as dotenv from "dotenv";
import * as bcryptjs from "bcryptjs";

// Load environment variables
dotenv.config();

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrator";

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length === 0) {
  console.error("❌ Error: ADMIN_PASSWORD environment variable is required");
  process.exit(1);
}

async function createFirstAdmin() {
  console.log("🔐 Creating first admin user...");
  console.log(`   Login: ${ADMIN_LOGIN}`);
  console.log(`   Name: ${ADMIN_NAME}`);

  try {
    // Hash password
    console.log("🔒 Hashing password...");
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(ADMIN_PASSWORD, salt);

    // TODO: Implement actual database operations
    // This requires:
    // 1. Import database connection from server/db.ts
    // 2. Import schema from drizzle/schema.ts
    // 3. Check if admin already exists
    // 4. Create admin user with:
    //    - login: ADMIN_LOGIN
    //    - passwordHash: passwordHash
    //    - displayName: ADMIN_NAME
    //    - role: "admin"
    //    - status: "active"
    //    - managedOrgUnitId: null
    //    - orgUnitId: null
    //    - positionId: null

    console.log(`✅ Password hash generated successfully!`);
    console.log(`   Hash: ${passwordHash.substring(0, 20)}...`);
    console.log("\n⚠️  NOTE: Database implementation not yet available.");
    console.log("   Waiting for server/db.ts and drizzle/schema.ts to be implemented.");
    console.log("\n📝 To create admin manually:");
    console.log(`   1. Use POST /api/v1/auth/register endpoint`);
    console.log(`   2. Then use admin panel to approve and assign admin role`);
    console.log(`   3. Or wait for database module implementation`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error("   Unknown error");
    }
    process.exit(1);
  }
}

// Run the script
createFirstAdmin();

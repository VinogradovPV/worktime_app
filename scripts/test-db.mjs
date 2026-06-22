import pg from "pg";
const { Client } = pg;

const configs = [
  {
    label: "connectionString with sslmode=require",
    config: {
      connectionString: "postgresql://sync_user:8wBuj1H_o2@152.160.165.2:5432/sync_database?sslmode=require",
      connectionTimeoutMillis: 8000,
    }
  },
  {
    label: "connectionString with sslmode=disable",
    config: {
      connectionString: "postgresql://sync_user:8wBuj1H_o2@152.160.165.2:5432/sync_database?sslmode=disable",
      connectionTimeoutMillis: 8000,
    }
  },
  {
    label: "host/port with ssl: {rejectUnauthorized: false}",
    config: {
      host: "152.160.165.2",
      port: 5432,
      database: "sync_database",
      user: "sync_user",
      password: "8wBuj1H_o2",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    }
  },
  {
    label: "host/port with ssl: true",
    config: {
      host: "152.160.165.2",
      port: 5432,
      database: "sync_database",
      user: "sync_user",
      password: "8wBuj1H_o2",
      ssl: true,
      connectionTimeoutMillis: 8000,
    }
  },
];

for (const { label, config } of configs) {
  console.log(`\nTrying: ${label}`);
  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query("SELECT version(), current_database(), current_user");
    console.log(`✅ SUCCESS with: ${label}`);
    console.log("  Version:", res.rows[0].version.split(",")[0]);
    console.log("  Database:", res.rows[0].current_database);
    console.log("  User:", res.rows[0].current_user);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Failed: ${err.message}`);
    try { await client.end(); } catch {}
  }
}

console.log("\n❌ All connection attempts failed");
process.exit(1);

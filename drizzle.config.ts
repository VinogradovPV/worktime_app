import { defineConfig } from "drizzle-kit";

const host = process.env.DB_HOST || "localhost";
const port = process.env.DB_PORT || "5432";
const user = process.env.DB_USER || "postgres";
const password = process.env.DB_PASSWORD || "";
const database = process.env.DB_NAME || "worktime";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }, // Required for self-signed certificate on Yandex Cloud
  },
});

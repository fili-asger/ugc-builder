import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env*.local files
dotenv.config({ path: ".env.local" });

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

export default defineConfig({
  dialect: "postgresql", // Specify PostgreSQL dialect
  schema: "./src/db/schema.ts", // Path to your schema file
  out: "./drizzle", // Directory to store migration files (though push doesn't use it directly)
  dbCredentials: {
    url: process.env.POSTGRES_URL, // Use the pooled URL from .env.local
  },
  // Optional: Specify the table name for migration tracking
  // tablesFilter: ["!drizzle__*"], // Exclude Drizzle's internal tables if needed
  verbose: true, // Enable verbose logging
  strict: true, // Enable strict mode
});

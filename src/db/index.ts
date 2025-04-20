// File: src/db/index.ts
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema"; // Import all exports from schema.ts

// Use Vercel Postgres SDK integration
export const db = drizzle(sql, { schema });

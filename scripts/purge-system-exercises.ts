import { loadEnvFile } from "node:process"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq } from "drizzle-orm"

import * as schema from "../lib/db/schema"

loadEnvFile(".env.local")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const db = drizzle(pool, { schema })

async function main() {
  console.log("Purging all 'system' generated exercises from Neon DB...")
  const result = await db.delete(schema.exercises).where(eq(schema.exercises.createdBy, "system"))
  console.log("Successfully purged system exercises.")
  await pool.end()
}

main().catch((err) => {
  console.error("Error purging exercises:", err)
  process.exit(1)
})

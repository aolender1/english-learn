import { loadEnvFile } from "node:process"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"

import { topicCatalog } from "../lib/topics"
import * as schema from "../lib/db/schema"

loadEnvFile(".env.local")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const db = drizzle(pool, { schema })

async function main() {
  console.log(`Syncing ${topicCatalog.length} topics into Neon DB...`)
  for (let idx = 0; idx < topicCatalog.length; idx++) {
    const t = topicCatalog[idx]
    await db
      .insert(schema.topics)
      .values({
        slug: t.slug,
        level: t.level,
        title: t.title,
        description: t.description,
        focus: t.focus,
        enabled: true,
        sortOrder: idx,
      })
      .onConflictDoUpdate({
        target: [schema.topics.slug, schema.topics.level],
        set: {
          title: t.title,
          description: t.description,
          focus: t.focus,
          updatedAt: new Date(),
        },
      })
  }
  console.log("Topics sync complete.")
  await pool.end()
}

main().catch((err) => {
  console.error("Error syncing topics:", err)
  process.exit(1)
})

import { loadEnvFile } from "node:process"
import { Pool } from "pg"
loadEnvFile(".env.local")

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function check() {
  const res = await pool.query(`
    SELECT t.level, count(DISTINCT t.slug) as total_topics,
           count(DISTINCT e.topic_slug) as completed_topics,
           count(e.id) as total_exercises
    FROM topics t
    LEFT JOIN exercises e ON e.topic_slug = t.slug AND e.level = t.level
    GROUP BY t.level
    ORDER BY t.level
  `)
  console.table(res.rows)

  const missingRes = await pool.query(`
    SELECT t.slug, t.level, t.title, count(e.id) as exercise_count
    FROM topics t
    LEFT JOIN exercises e ON e.topic_slug = t.slug AND e.level = t.level
    GROUP BY t.slug, t.level, t.title, t.sort_order
    HAVING count(e.id) < 20
    ORDER BY t.sort_order ASC
  `)
  console.log(`\nTopics needing exercises: ${missingRes.rows.length}`)
  if (missingRes.rows.length > 0) {
    console.log("First 5 pending topics:", missingRes.rows.slice(0, 5))
  }
  await pool.end()
}

check()

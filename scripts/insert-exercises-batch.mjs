import { loadEnvFile } from "node:process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Pool } from "pg"

loadEnvFile(".env.local")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function insertTopicExercises(topicSlug, level, exercisesList) {
  console.log(`Inserting ${exercisesList.length} exercises for [${level}] ${topicSlug}...`)
  // Delete previous if any
  await pool.query(`DELETE FROM exercises WHERE topic_slug = $1 AND level = $2`, [topicSlug, level])

  for (const ex of exercisesList) {
    const correctIdx = Math.max(0, Math.min(ex.options.length - 1, ex.correctAnswerIndex ?? ex.correct_answer_index ?? 0))
    let prompt = (ex.prompt || "").replace(/_{2,}/g, "______")

    await pool.query(
      `INSERT INTO exercises (
        topic_slug, level, prompt, options, correct_answer_index,
        explanation, word, phonetic, spanish_translation, difficulty, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ai')`,
      [
        topicSlug,
        level,
        prompt,
        JSON.stringify(ex.options),
        correctIdx,
        ex.explanation || "Correct usage based on Cambridge English rules.",
        ex.word || "",
        ex.phonetic || "",
        ex.spanishTranslation || ex.spanish_translation || "",
        ex.difficulty || "medium",
      ]
    )
  }

  // Update backup file
  const allRes = await pool.query(`
    SELECT id, topic_slug as "topicSlug", level, prompt, options, 
           correct_answer_index as "correctAnswerIndex", explanation, 
           word, phonetic, spanish_translation as "spanishTranslation", 
           difficulty, created_by as "createdBy"
    FROM exercises
    ORDER BY level, topic_slug, id
  `)
  writeFileSync(
    join(process.cwd(), "data", "seed-exercises.json"),
    JSON.stringify(allRes.rows, null, 2),
    "utf-8"
  )
  console.log(`✓ Inserted successfully. Total exercises in DB: ${allRes.rows.length}`)
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error("Usage: node scripts/insert-exercises-batch.mjs <path-to-json>")
    process.exit(1)
  }

  const raw = readFileSync(filePath, "utf-8")
  const data = JSON.parse(raw)

  if (Array.isArray(data)) {
    // Group by topicSlug & level
    const groups = new Map()
    for (const item of data) {
      const key = `${item.level}:${item.topicSlug}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }

    for (const [key, items] of groups.entries()) {
      const [level, topicSlug] = key.split(":")
      await insertTopicExercises(topicSlug, level, items)
    }
  } else if (data.topicSlug && data.level && Array.isArray(data.exercises)) {
    await insertTopicExercises(data.topicSlug, data.level, data.exercises)
  }

  await pool.end()
}

if (process.argv[1].endsWith("insert-exercises-batch.mjs")) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}

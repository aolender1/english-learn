import { loadEnvFile } from "node:process"
import { Pool } from "pg"

loadEnvFile(".env.local")

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured in .env.local")
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  console.log("Running idempotent migration for open-ended exercises and Decision-1 evaluation metadata...")

  await pool.query(`
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_type text NOT NULL DEFAULT 'multiple_choice';
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS expected_answer text;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS acceptable_answers jsonb;
    ALTER TABLE exercises ADD COLUMN IF NOT EXISTS hint text;
    ALTER TABLE exercises ALTER COLUMN options SET DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises (exercise_type);
    ALTER TABLE practice_attempts ADD COLUMN IF NOT EXISTS evaluation jsonb;
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'exercises_exercise_type_check'
      ) THEN
        ALTER TABLE exercises
          ADD CONSTRAINT exercises_exercise_type_check
          CHECK (exercise_type in ('multiple_choice', 'open_response'));
      END IF;
    END $$;
  `)

  const counts = await pool.query(
    `SELECT exercise_type, count(*)::int AS total FROM exercises GROUP BY exercise_type ORDER BY exercise_type`,
  )
  const exCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'exercises' ORDER BY ordinal_position`,
  )
  const attemptCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'practice_attempts' ORDER BY ordinal_position`,
  )

  console.log("Exercises breakdown:", counts.rows)
  console.log("Exercises columns:", exCols.rows.map((r) => r.column_name).join(", "))
  console.log("Practice attempts columns:", attemptCols.rows.map((r) => r.column_name).join(", "))

  await pool.end()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})

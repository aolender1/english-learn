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
  console.log("Running idempotent migration for speaking_sessions...")

  await pool.query(`
    CREATE TABLE IF NOT EXISTS speaking_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      level text NOT NULL,
      topic_slug text NOT NULL,
      mission_title text NOT NULL,
      mission_goal text NOT NULL,
      voice_name text NOT NULL DEFAULT 'Aoede',
      status text NOT NULL DEFAULT 'active',
      duration_sec integer NOT NULL DEFAULT 0,
      turn_count integer NOT NULL DEFAULT 0,
      transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
      checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
      evaluation jsonb,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    );

    CREATE INDEX IF NOT EXISTS idx_speaking_sessions_user ON speaking_sessions (user_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_speaking_sessions_topic ON speaking_sessions (topic_slug, level);
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'speaking_sessions_status_check'
      ) THEN
        ALTER TABLE speaking_sessions
          ADD CONSTRAINT speaking_sessions_status_check
          CHECK (status in ('active', 'completed', 'abandoned'));
      END IF;
    END $$;
  `)

  const counts = await pool.query(`SELECT count(*)::int AS total FROM exercises`)
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'speaking_sessions' ORDER BY ordinal_position`,
  )

  console.log("Total exercises intact:", counts.rows[0].total)
  console.log("speaking_sessions columns:", cols.rows.map((r) => r.column_name).join(", "))

  await pool.end()
}

main().catch((err) => {
  console.error("Speaking sessions migration failed:", err)
  process.exit(1)
})

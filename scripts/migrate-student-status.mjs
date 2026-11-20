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
  console.log("Running idempotent migration for user_profiles.status...")

  await pool.query(`
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_status_check'
      ) THEN
        ALTER TABLE user_profiles
          ADD CONSTRAINT user_profiles_status_check
          CHECK (status in ('active', 'paused'));
      END IF;
    END $$;
  `)

  const users = await pool.query(
    `SELECT email, role, status FROM user_profiles ORDER BY created_at ASC`,
  )
  console.log("user_profiles:", users.rows)

  await pool.end()
}

main().catch((err) => {
  console.error("Student status migration failed:", err)
  process.exit(1)
})

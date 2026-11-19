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
  console.log("Running idempotent migration for media_assets and exercises.media_asset_id...")

  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      concept_key text NOT NULL UNIQUE,
      provider text NOT NULL,
      media_type text NOT NULL,
      external_id text,
      url text NOT NULL,
      preview_url text,
      mp4_url text,
      title text,
      alt_text text,
      width integer,
      height integer,
      decision_score integer,
      decision_meta jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_media_assets_provider ON media_assets (provider);
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_provider_check'
      ) THEN
        ALTER TABLE media_assets
          ADD CONSTRAINT media_assets_provider_check
          CHECK (provider in ('klipy', 'noto_emoji', 'custom'));
      END IF;
    END $$;
  `)

  await pool.query(`
    ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS media_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_exercises_media_asset ON exercises (media_asset_id);
  `)

  const counts = await pool.query(`SELECT count(*)::int AS total FROM exercises`)
  const mediaCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'media_assets' ORDER BY ordinal_position`,
  )
  const exMediaCol = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'media_asset_id'`,
  )

  console.log("Total exercises intact:", counts.rows[0].total)
  console.log("media_assets columns:", mediaCols.rows.map((r) => r.column_name).join(", "))
  console.log("exercises.media_asset_id:", exMediaCol.rows[0])

  await pool.end()
}

main().catch((err) => {
  console.error("Media migration failed:", err)
  process.exit(1)
})

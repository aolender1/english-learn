import fs from "node:fs"
import path from "node:path"
import { and, eq } from "drizzle-orm"

import type { CefrLevel, Difficulty, Question } from "./question-bank"
import type { TopicDef } from "./topics"
import { db } from "@/lib/db"
import { exercises } from "@/lib/db/schema"

export const SESSION_SIZE = 10

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function difficultyForLevel(level: CefrLevel): Difficulty {
  switch (level) {
    case "pre-a1-starters":
    case "a1-movers":
      return "easy"
    case "a2-flyers":
    case "a2-key":
      return "medium"
    case "b1-preliminary":
    case "b1-plus":
      return "hard"
    default:
      return "master"
  }
}

type ExerciseRow = typeof exercises.$inferSelect

function mapRowToQuestion(row: ExerciseRow, fallbackLevel: CefrLevel): Question {
  const options = Array.isArray(row.options) ? (row.options as string[]).map(String) : []
  let answerIndex = typeof row.correctAnswerIndex === "number" ? row.correctAnswerIndex : 0
  if (answerIndex < 0 || answerIndex >= options.length) answerIndex = 0

  return {
    id: row.id,
    difficulty: (row.difficulty as Difficulty) || difficultyForLevel(fallbackLevel),
    prompt: row.prompt,
    options,
    answer: answerIndex,
    explanation: row.explanation,
    word: row.word ?? undefined,
  }
}

let seedBackupCache: ExerciseRow[] | null = null

function loadBackupSeed(): ExerciseRow[] {
  if (seedBackupCache) return seedBackupCache
  try {
    const filePath = path.join(process.cwd(), "data", "seed-exercises.json")
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ExerciseRow[]
      seedBackupCache = data
      return data
    }
  } catch (e) {
    console.warn("Could not load seed-exercises backup:", e)
  }
  return []
}

/**
 * Returns a 10-question session for the given level+topic from the exercise bank.
 * Only exercises present in the database / bank are served to students.
 */
export async function getOrCreateSessionQuestions(
  level: CefrLevel,
  topic: TopicDef,
): Promise<Question[]> {
  try {
    const rows = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.topicSlug, topic.slug), eq(exercises.level, level)))

    if (rows.length > 0) {
      const picked = shuffle(rows).slice(0, SESSION_SIZE)
      return picked.map((row) => mapRowToQuestion(row, level))
    }
  } catch (error) {
    console.error("[practice-server] DB query failed, checking seed backup:", error)
  }

  // Fallback to local seed file if DB is unavailable or empty
  const backup = loadBackupSeed()
  const matching = backup.filter((item) => item.topicSlug === topic.slug && item.level === level)
  if (matching.length > 0) {
    const picked = shuffle(matching).slice(0, SESSION_SIZE)
    return picked.map((row) => mapRowToQuestion(row, level))
  }

  return []
}


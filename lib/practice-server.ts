import fs from "node:fs"
import path from "node:path"
import { and, eq } from "drizzle-orm"

import type { CefrLevel, Difficulty, ExerciseType, Question } from "./question-bank"
import type { TopicDef } from "./topics"
import { db } from "@/lib/db"
import { exercises } from "@/lib/db/schema"

export const SESSION_SIZE = 10
export type PracticeMode = "mixed" | "open_response" | "multiple_choice"

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
  const exerciseType: ExerciseType =
    row.exerciseType === "open_response" || options.length === 0 ? "open_response" : "multiple_choice"
  let answerIndex = typeof row.correctAnswerIndex === "number" ? row.correctAnswerIndex : 0
  if (options.length > 0 && (answerIndex < 0 || answerIndex >= options.length)) answerIndex = 0
  if (options.length === 0) answerIndex = 0

  const acceptableAnswers = Array.isArray(row.acceptableAnswers)
    ? (row.acceptableAnswers as unknown[]).map((v) => String(v ?? "").trim()).filter(Boolean)
    : undefined

  return {
    id: row.id,
    difficulty: (row.difficulty as Difficulty) || difficultyForLevel(fallbackLevel),
    exerciseType,
    prompt: row.prompt,
    options,
    answer: answerIndex,
    expectedAnswer: row.expectedAnswer?.trim() || options[answerIndex] || undefined,
    acceptableAnswers,
    hint: row.hint?.trim() || undefined,
    explanation: row.explanation,
    word: row.word ?? undefined,
  }
}

function selectSessionRows(rows: ExerciseRow[], mode: PracticeMode): ExerciseRow[] {
  const openRows = rows.filter(
    (r) => r.exerciseType === "open_response" || !Array.isArray(r.options) || r.options.length === 0,
  )
  const mcRows = rows.filter(
    (r) => r.exerciseType !== "open_response" && Array.isArray(r.options) && r.options.length > 0,
  )

  if (mode === "open_response") {
    if (openRows.length > 0) return shuffle(openRows).slice(0, SESSION_SIZE)
    return shuffle(rows).slice(0, SESSION_SIZE)
  }

  if (mode === "multiple_choice") {
    if (mcRows.length > 0) return shuffle(mcRows).slice(0, SESSION_SIZE)
    return shuffle(rows).slice(0, SESSION_SIZE)
  }

  // "mixed": guarantee a balanced mix when both open and MC exercises exist
  if (openRows.length > 0 && mcRows.length > 0) {
    const pickedOpen = shuffle(openRows).slice(0, Math.min(openRows.length, Math.floor(SESSION_SIZE / 2)))
    const remaining = SESSION_SIZE - pickedOpen.length
    const pickedMc = shuffle(mcRows).slice(0, remaining)
    const extraOpen =
      pickedOpen.length + pickedMc.length < SESSION_SIZE
        ? shuffle(openRows.slice(pickedOpen.length)).slice(0, SESSION_SIZE - pickedOpen.length - pickedMc.length)
        : []
    return shuffle([...pickedOpen, ...pickedMc, ...extraOpen])
  }

  return shuffle(rows).slice(0, SESSION_SIZE)
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
  practiceMode: PracticeMode = "mixed",
): Promise<Question[]> {
  try {
    const rows = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.topicSlug, topic.slug), eq(exercises.level, level)))

    if (rows.length > 0) {
      const picked = selectSessionRows(rows, practiceMode)
      return picked.map((row) => mapRowToQuestion(row, level))
    }
  } catch (error) {
    console.error("[practice-server] DB query failed, checking seed backup:", error)
  }

  // Fallback to local seed file if DB is unavailable or empty
  const backup = loadBackupSeed()
  const matching = backup.filter((item) => item.topicSlug === topic.slug && item.level === level)
  if (matching.length > 0) {
    const picked = selectSessionRows(matching, practiceMode)
    return picked.map((row) => mapRowToQuestion(row, level))
  }

  return []
}


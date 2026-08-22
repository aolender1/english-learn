import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import { inArray } from "drizzle-orm"

import type { CefrLevel, Difficulty, Question } from "./question-bank"
import { cefrLevels } from "./question-bank"
import { EXERCISE_MODEL, PROMPT_VERSION, generateExercises, type GeneratedExercise } from "./gemini"
import type { TopicDef } from "./topics"
import { cumulativeVocabulary, parseVocabularyCsv, vocabularyFileNames, type VocabularyEntry } from "./vocabulary"
import { db } from "@/lib/db"
import { exerciseCache } from "@/lib/db/schema"

export const SESSION_SIZE = 10
/** Words per Gemini call — keeps responses small and reliable. */
const BATCH_SIZE = 5

let vocabularyCache: Partial<Record<CefrLevel, VocabularyEntry[]>> | null = null

function loadVocabulary(): Partial<Record<CefrLevel, VocabularyEntry[]>> {
  if (vocabularyCache) return vocabularyCache
  const dir = path.join(process.cwd(), "data", "vocabulary")
  const lists: Partial<Record<CefrLevel, VocabularyEntry[]>> = {}
  for (const [level, fileName] of Object.entries(vocabularyFileNames) as Array<[CefrLevel, string]>) {
    try {
      const content = fs.readFileSync(path.join(dir, fileName), "utf-8")
      lists[level] = parseVocabularyCsv(content, level)
    } catch {
      lists[level] = []
    }
  }
  vocabularyCache = lists
  return lists
}

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
    case "b1-preliminary":
      return "medium"
    case "b2-first":
      return "hard"
    case "c1-advanced":
    case "c2-proficiency":
      return "master"
    default:
      return "easy"
  }
}

function cacheKey(level: CefrLevel, topicSlug: string, word: string): string {
  return createHash("sha256")
    .update(`${level}|${topicSlug}|${word.toLowerCase()}|${PROMPT_VERSION}|${EXERCISE_MODEL}`)
    .digest("hex")
}

type CacheRow = typeof exerciseCache.$inferSelect

function mapToQuestion(row: CacheRow, level: CefrLevel): Question | null {
  const data = row.exercise as Partial<GeneratedExercise> | null
  const exercise = data?.exercise
  if (!exercise || typeof exercise.question !== "string" || !Array.isArray(exercise.options)) return null
  const options = exercise.options.map(String)
  let answerIndex = options.findIndex((option) => option === String(exercise.answer))
  if (answerIndex < 0) answerIndex = 0
  const summary = [row.word, data.phonetic ?? "", `— ${data.spanish_translation ?? ""}`].join(" ").trim()
  return {
    id: row.id,
    difficulty: difficultyForLevel(level),
    prompt: exercise.question,
    options,
    answer: answerIndex,
    explanation: data.example_sentence ? `${summary}\nExample: “${data.example_sentence}”` : summary,
    word: row.word,
  }
}

/**
 * Returns a 10-question session for the given level+topic.
 * Cached exercises are served from Neon; only missing words hit Gemini
 * (batched by 5), and every generated result is persisted for reuse.
 */
export async function getOrCreateSessionQuestions(
  level: CefrLevel,
  topic: TopicDef,
): Promise<Question[]> {
  const vocabulary = cumulativeVocabulary(level, loadVocabulary())
  if (vocabulary.length === 0) throw new Error(`No vocabulary available for level ${level}`)

  const picked = shuffle(vocabulary).slice(0, SESSION_SIZE)
  const keyByWord = new Map(picked.map((entry) => [entry.english.toLowerCase(), cacheKey(level, topic.slug, entry.english)]))
  const keys = [...keyByWord.values()]

  const existingRows = await db.select().from(exerciseCache).where(inArray(exerciseCache.cacheKey, keys))
  const rowsByKey = new Map(existingRows.map((row) => [row.cacheKey, row]))

  const missing = picked.filter((entry) => !rowsByKey.has(keyByWord.get(entry.english.toLowerCase())!))

  for (let index = 0; index < missing.length; index += BATCH_SIZE) {
    const batch = missing.slice(index, index + BATCH_SIZE)
    const generated = await generateExercises(
      batch.map(({ english, spanish }) => ({ english, spanish })),
      level,
      cefrLevels.find((item) => item.id === level)?.code ?? level,
      topic,
    )
    if (generated.length === 0) continue
    const values = generated.map((item) => ({
      cacheKey: cacheKey(level, topic.slug, item.word),
      level,
      topicSlug: topic.slug,
      word: item.word,
      exercise: item,
      promptVersion: PROMPT_VERSION,
      model: EXERCISE_MODEL,
    }))
    await db.insert(exerciseCache).values(values).onConflictDoNothing({ target: exerciseCache.cacheKey })
  }

  // Re-read once so races/conflicts resolve into a complete set.
  const finalRows = await db.select().from(exerciseCache).where(inArray(exerciseCache.cacheKey, keys))
  const questions: Question[] = []
  const seenWords = new Set<string>()
  for (const entry of picked) {
    const row = finalRows.find((candidate) => candidate.cacheKey === keyByWord.get(entry.english.toLowerCase()))
    if (!row) continue
    const question = mapToQuestion(row, level)
    if (!question || seenWords.has(row.word.toLowerCase())) continue
    seenWords.add(row.word.toLowerCase())
    questions.push(question)
  }

  // Top up from any other cached rows of the same topic/level if generation gaps remain.
  if (questions.length < SESSION_SIZE) {
    const filler = await db.select().from(exerciseCache)
      .where(inArray(exerciseCache.topicSlug, [topic.slug]))
    for (const row of filler) {
      if (questions.length >= SESSION_SIZE) break
      if (row.level !== level || seenWords.has(row.word.toLowerCase())) continue
      const question = mapToQuestion(row, level)
      if (!question) continue
      seenWords.add(row.word.toLowerCase())
      questions.push(question)
    }
  }

  return questions.slice(0, SESSION_SIZE)
}

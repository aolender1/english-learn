import fs from "node:fs"
import path from "node:path"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { exercises, topics as topicsTable } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"
import { cefrLevels, type CefrLevel } from "@/lib/question-bank"
import { findTopic } from "@/lib/topics"
import { generateTopicExercises } from "@/lib/gemini"
import { cumulativeVocabulary, parseVocabularyCsv, vocabularyFileNames, type VocabularyEntry } from "@/lib/vocabulary"
import { difficultyForLevel } from "@/lib/practice-server"

let vocabCache: Partial<Record<CefrLevel, VocabularyEntry[]>> | null = null

function getLoadedVocab(): Partial<Record<CefrLevel, VocabularyEntry[]>> {
  if (vocabCache) return vocabCache
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
  vocabCache = lists
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

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  let body: {
    topicSlug?: string
    level?: string
    count?: number
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const level = cefrLevels.find((item) => item.id === body.level)?.id
  if (!level) return jsonError("Unknown CEFR level.", 400)

  let topic = findTopic(body.topicSlug ?? "", level)
  if (!topic) {
    const [dbTopic] = await db
      .select()
      .from(topicsTable)
      .where(and(eq(topicsTable.slug, body.topicSlug ?? ""), eq(topicsTable.level, level)))
      .limit(1)
    if (dbTopic) {
      topic = {
        slug: dbTopic.slug,
        level: dbTopic.level as CefrLevel,
        title: dbTopic.title,
        description: dbTopic.description ?? "",
        focus: dbTopic.focus ?? "",
      }
    }
  }
  if (!topic) return jsonError("Topic not found for this level.", 404)

  const count = Math.min(20, Math.max(1, body.count || 5))

  try {
    const vocabList = cumulativeVocabulary(level, getLoadedVocab())
    const pickedWords = shuffle(vocabList).slice(0, 20)
    const levelCode = cefrLevels.find((item) => item.id === level)?.code ?? level

    const generated = await generateTopicExercises(
      count,
      level,
      levelCode,
      topic,
      pickedWords.map((w) => ({ english: w.english, spanish: w.spanish }))
    )

    if (generated.length === 0) {
      return jsonError("AI generation failed to produce valid exercises.", 502)
    }

    const newExercises = generated.map((item) => {
      return {
        topicSlug: topic.slug,
        level,
        prompt: item.prompt,
        options: item.options,
        correctAnswerIndex: item.correct_answer_index,
        explanation: item.explanation,
        word: item.word,
        phonetic: item.phonetic,
        spanishTranslation: item.spanish_translation,
        difficulty: item.difficulty || difficultyForLevel(level),
        createdBy: "ai",
      }
    })

    const inserted = await db.insert(exercises).values(newExercises).returning()

    return Response.json({
      success: true,
      count: inserted.length,
      exercises: inserted,
    })
  } catch (error) {
    console.error("[api/teacher/exercises/generate POST]", error)
    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "GEMINI_API_KEY is not configured on the server."
        : error instanceof Error
        ? error.message
        : "AI Generation failed."
    return jsonError(message, 500)
  }
}

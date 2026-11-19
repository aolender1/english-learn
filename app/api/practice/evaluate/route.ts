import { and, eq } from "drizzle-orm"

import { getSessionUser, jsonError } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { exercises, practiceAttempts, practiceRounds, topics as topicsTable } from "@/lib/db/schema"
import { evaluateOpenAnswer } from "@/lib/gemini-decisions"
import { cefrLevels, type CefrLevel } from "@/lib/question-bank"
import { findTopic } from "@/lib/topics"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const user = await getSessionUser().catch(() => null)

  let body: {
    roundId?: string | null
    exerciseId?: string
    prompt?: string
    expectedAnswer?: string
    acceptableAnswers?: string[]
    studentAnswer?: string
    level?: string
    topicSlug?: string
    responseTimeMs?: number
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const studentAnswer = typeof body.studentAnswer === "string" ? body.studentAnswer.trim() : ""
  if (!studentAnswer) {
    return jsonError("Please enter an answer before evaluating.", 400)
  }
  if (studentAnswer.length > 500) {
    return jsonError("Answer is too long (maximum 500 characters).", 400)
  }

  const level = cefrLevels.find((item) => item.id === body.level)?.id
  if (!level) return jsonError("Unknown CEFR level.", 400)

  const topicSlug = typeof body.topicSlug === "string" ? body.topicSlug.trim() : ""
  if (!topicSlug) return jsonError("Topic slug is required.", 400)

  let prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""
  let expectedAnswer = typeof body.expectedAnswer === "string" ? body.expectedAnswer.trim() : ""
  let acceptableAnswers = Array.isArray(body.acceptableAnswers)
    ? body.acceptableAnswers.map((v) => String(v ?? "").trim()).filter(Boolean)
    : []

  // Prefer authoritative exercise record from DB when exerciseId is a UUID
  if (typeof body.exerciseId === "string" && UUID_REGEX.test(body.exerciseId)) {
    const [exRow] = await db
      .select({
        prompt: exercises.prompt,
        options: exercises.options,
        correctAnswerIndex: exercises.correctAnswerIndex,
        expectedAnswer: exercises.expectedAnswer,
        acceptableAnswers: exercises.acceptableAnswers,
      })
      .from(exercises)
      .where(eq(exercises.id, body.exerciseId))
      .limit(1)

    if (exRow) {
      prompt = exRow.prompt
      const opts = Array.isArray(exRow.options) ? (exRow.options as string[]).map(String) : []
      expectedAnswer =
        exRow.expectedAnswer?.trim() ||
        opts[exRow.correctAnswerIndex] ||
        expectedAnswer
      if (Array.isArray(exRow.acceptableAnswers)) {
        acceptableAnswers = (exRow.acceptableAnswers as unknown[])
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
      }
    }
  }

  if (!prompt || !expectedAnswer) {
    return jsonError("Prompt and expected answer are required for evaluation.", 400)
  }

  let topicTitle = topicSlug
  let topicFocus = ""
  const catalogTopic = findTopic(topicSlug, level)
  if (catalogTopic) {
    topicTitle = catalogTopic.title
    topicFocus = catalogTopic.focus
  } else {
    const [dbTopic] = await db
      .select({ title: topicsTable.title, focus: topicsTable.focus })
      .from(topicsTable)
      .where(and(eq(topicsTable.slug, topicSlug), eq(topicsTable.level, level as CefrLevel)))
      .limit(1)
    if (dbTopic) {
      topicTitle = dbTopic.title
      topicFocus = dbTopic.focus ?? ""
    }
  }

  try {
    const evaluation = await evaluateOpenAnswer({
      prompt,
      expectedAnswer,
      acceptableAnswers,
      studentAnswer,
      level,
      topicTitle,
      topicFocus,
    })

    let recorded = false
    if (
      user?.id &&
      typeof body.roundId === "string" &&
      UUID_REGEX.test(body.roundId) &&
      typeof body.exerciseId === "string" &&
      UUID_REGEX.test(body.exerciseId)
    ) {
      const [round] = await db
        .select({ id: practiceRounds.id })
        .from(practiceRounds)
        .where(
          and(
            eq(practiceRounds.id, body.roundId),
            eq(practiceRounds.userId, user.id),
            eq(practiceRounds.status, "active"),
          ),
        )
        .limit(1)

      if (round) {
        await db
          .insert(practiceAttempts)
          .values({
            userId: user.id,
            roundId: body.roundId,
            exerciseId: body.exerciseId,
            selectedAnswer: studentAnswer,
            correctAnswer: expectedAnswer,
            isCorrect: evaluation.isCorrect,
            evaluation,
            responseTimeMs:
              typeof body.responseTimeMs === "number" && Number.isFinite(body.responseTimeMs)
                ? Math.max(0, Math.round(body.responseTimeMs))
                : null,
          })
          .onConflictDoNothing()
        recorded = true
      }
    }

    return Response.json({
      evaluation,
      expectedAnswer,
      recorded,
    })
  } catch (error) {
    console.error("[api/practice/evaluate POST]", error)
    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "GEMINI_API_KEY is not configured on the server."
        : error instanceof Error
        ? error.message
        : "Failed to evaluate answer."
    return jsonError(message, 500)
  }
}

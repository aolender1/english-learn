import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { practiceRounds, topics as topicsTable } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"
import { SESSION_SIZE, getOrCreateSessionQuestions } from "@/lib/practice-server"
import { cefrLevels, type CefrLevel } from "@/lib/question-bank"
import { findTopic } from "@/lib/topics"

export async function POST(request: Request) {
  const user = await getSessionUser().catch(() => null)

  let body: { level?: string; topicSlug?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const level = cefrLevels.find((item) => item.id === body.level)?.id
  if (!level) return jsonError("Unknown CEFR level.", 400)

  let topic = findTopic(body.topicSlug ?? "", level)
  if (!topic) {
    // Check DB for teacher-created topic
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
  if (!topic) return jsonError(`No practice topic is available for ${level} yet.`, 404)

  try {
    const exercises = await getOrCreateSessionQuestions(level, topic)
    if (exercises.length === 0) {
      return jsonError("Could not prepare exercises for this topic. Try again.", 502)
    }

    let roundId: string | null = null

    // Track round in DB if user is logged in
    if (user?.id) {
      const [round] = await db
        .insert(practiceRounds)
        .values({
          userId: user.id,
          topicSlug: topic.slug,
          level,
          status: "active",
          exerciseIds: exercises.map((exercise) => exercise.id),
          total: exercises.length,
        })
        .returning()
      roundId = round.id
    }

    return Response.json({
      roundId,
      exercises,
      requestedSize: SESSION_SIZE,
      topic: { slug: topic.slug, title: topic.title },
    })
  } catch (error) {
    console.error("[practice/session]", error)
    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "AI generation is not configured. Contact your teacher."
        : "Failed to prepare the session. Try again."
    return jsonError(message, 500)
  }
}

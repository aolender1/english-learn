import { db } from "@/lib/db"
import { practiceRounds } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"
import { SESSION_SIZE, getOrCreateSessionQuestions } from "@/lib/practice-server"
import { cefrLevels } from "@/lib/question-bank"
import { findTopic } from "@/lib/topics"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return jsonError("Sign in to start a practice session.", 401)

  let body: { level?: string; topicSlug?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const level = cefrLevels.find((item) => item.id === body.level)?.id
  if (!level) return jsonError("Unknown CEFR level.", 400)

  const topic = findTopic(body.topicSlug ?? "", level)
  if (!topic) return jsonError(`No practice topic is available for ${level} yet.`, 404)

  try {
    const exercises = await getOrCreateSessionQuestions(level, topic)
    if (exercises.length === 0) {
      return jsonError("Could not prepare exercises for this topic. Try again.", 502)
    }
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

    return Response.json({
      roundId: round.id,
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

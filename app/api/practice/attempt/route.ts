import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { practiceAttempts, practiceRounds } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const user = await getSessionUser().catch(() => null)
  if (!user) return Response.json({ ok: true, guest: true })

  let body: {
    roundId?: string
    exerciseId?: string
    selectedAnswer?: string
    correctAnswer?: string
    isCorrect?: boolean
    evaluation?: Record<string, unknown> | null
    responseTimeMs?: number
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  if (
    typeof body.roundId !== "string" ||
    typeof body.exerciseId !== "string" ||
    typeof body.selectedAnswer !== "string" ||
    typeof body.correctAnswer !== "string" ||
    typeof body.isCorrect !== "boolean"
  ) {
    return jsonError("Missing or invalid fields.", 400)
  }

  if (!UUID_REGEX.test(body.roundId) || !UUID_REGEX.test(body.exerciseId)) {
    return Response.json({ ok: true, skipped: true })
  }

  // The attempt only counts if the round is active and belongs to the user.
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
  if (!round) return jsonError("Round not found or already finished.", 404)

  await db
    .insert(practiceAttempts)
    .values({
      userId: user.id,
      roundId: body.roundId,
      exerciseId: body.exerciseId,
      selectedAnswer: body.selectedAnswer,
      correctAnswer: body.correctAnswer,
      isCorrect: body.isCorrect,
      evaluation:
        body.evaluation && typeof body.evaluation === "object" && !Array.isArray(body.evaluation)
          ? body.evaluation
          : null,
      responseTimeMs:
        typeof body.responseTimeMs === "number" && Number.isFinite(body.responseTimeMs)
          ? Math.max(0, Math.round(body.responseTimeMs))
          : null,
    })
    .onConflictDoNothing()

  return Response.json({ ok: true })
}

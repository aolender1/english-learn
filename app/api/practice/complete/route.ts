import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { practiceRounds } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return jsonError("Sign in required.", 401)

  let body: { roundId?: string; score?: number; abandoned?: boolean }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  if (typeof body.roundId !== "string" || typeof body.score !== "number") {
    return jsonError("Missing or invalid fields.", 400)
  }
  const score = Math.max(0, Math.min(10, Math.round(body.score)))

  await db
    .update(practiceRounds)
    .set({
      status: body.abandoned ? "abandoned" : "completed",
      score,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(practiceRounds.id, body.roundId),
        eq(practiceRounds.userId, user.id),
        eq(practiceRounds.status, "active"),
      ),
    )

  return Response.json({ ok: true })
}

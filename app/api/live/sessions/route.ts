import { and, desc, eq } from "drizzle-orm"

import { requireAuthorizedAiUser } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { speakingSessions } from "@/lib/db/schema"

export async function GET(request: Request) {
  const auth = await requireAuthorizedAiUser()
  if (auth.errorResponse) return auth.errorResponse
  const user = auth.user

  const url = new URL(request.url)
  const level = url.searchParams.get("level")?.trim() ?? ""
  const topicSlug = url.searchParams.get("topicSlug")?.trim() ?? ""

  const filters = [
    eq(speakingSessions.userId, user.id),
    eq(speakingSessions.status, "completed"),
  ]
  if (level) filters.push(eq(speakingSessions.level, level))
  if (topicSlug) filters.push(eq(speakingSessions.topicSlug, topicSlug))

  const rows = await db
    .select({
      id: speakingSessions.id,
      level: speakingSessions.level,
      topicSlug: speakingSessions.topicSlug,
      missionTitle: speakingSessions.missionTitle,
      voiceName: speakingSessions.voiceName,
      durationSec: speakingSessions.durationSec,
      turnCount: speakingSessions.turnCount,
      checklist: speakingSessions.checklist,
      evaluation: speakingSessions.evaluation,
      completedAt: speakingSessions.completedAt,
    })
    .from(speakingSessions)
    .where(and(...filters))
    .orderBy(desc(speakingSessions.completedAt))
    .limit(5)

  return Response.json({ sessions: rows })
}

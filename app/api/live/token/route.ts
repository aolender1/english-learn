import { jsonError, requireAuthorizedAiUser } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { speakingSessions } from "@/lib/db/schema"
import {
  buildSpeakingMission,
  createInitialChecklist,
  DEFAULT_LIVE_VOICE,
  isValidLiveVoice,
  toPublicMission,
} from "@/lib/live-missions"
import { createLiveEphemeralToken, resolveTopicForLive } from "@/lib/live-server"

export async function POST(request: Request) {
  const auth = await requireAuthorizedAiUser()
  if (auth.errorResponse) return auth.errorResponse
  const user = auth.user

  let body: {
    level?: string
    topicSlug?: string
    voiceName?: string
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const levelInput = typeof body.level === "string" ? body.level.trim() : ""
  const topicSlugInput = typeof body.topicSlug === "string" ? body.topicSlug.trim() : ""
  if (!levelInput || !topicSlugInput) {
    return jsonError("Level and topicSlug are required.", 400)
  }

  const resolved = await resolveTopicForLive(levelInput, topicSlugInput)
  if (!resolved) {
    return jsonError("Unknown CEFR level or topic.", 404)
  }

  const requestedVoice = typeof body.voiceName === "string" ? body.voiceName.trim() : ""
  const voiceName = requestedVoice && isValidLiveVoice(requestedVoice) ? requestedVoice : DEFAULT_LIVE_VOICE

  const mission = buildSpeakingMission({
    level: resolved.level,
    topic: resolved.topic,
    studentName: user.name,
  })
  const initialChecklist = createInitialChecklist(mission)

  try {
    const ephemeral = await createLiveEphemeralToken({ mission, voiceName })

    const [createdSession] = await db
      .insert(speakingSessions)
      .values({
        userId: user.id,
        level: resolved.level,
        topicSlug: resolved.topic.slug,
        missionTitle: mission.missionTitle,
        missionGoal: mission.missionGoal,
        voiceName: ephemeral.voiceName,
        status: "active",
        checklist: initialChecklist,
      })
      .returning({ id: speakingSessions.id })

    return Response.json({
      sessionId: createdSession.id,
      token: ephemeral.token,
      model: ephemeral.model,
      wsBaseUrl: ephemeral.wsBaseUrl,
      voiceName: ephemeral.voiceName,
      expiresAt: ephemeral.expiresAt,
      mission: toPublicMission(mission),
      checklist: initialChecklist,
    })
  } catch (error) {
    console.error("[api/live/token POST]", error)
    const rawMsg = error instanceof Error ? error.message : "Failed to initialize live voice session."
    const message = rawMsg.includes("GEMINI_API_KEY")
      ? "GEMINI_API_KEY is not configured on the server."
      : rawMsg
    return jsonError(message, 502)
  }
}

import { and, eq } from "drizzle-orm"

import { jsonError, requireAuthorizedAiUser } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { speakingSessions } from "@/lib/db/schema"
import { evaluateLiveSession, evaluateLiveTurn } from "@/lib/gemini-decisions"
import { createInitialChecklist, type ChecklistItemState, type TranscriptTurn } from "@/lib/live-missions"
import { resolveMissionFromStoredSession } from "@/lib/live-server"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sanitizeTranscript(input: unknown): TranscriptTurn[] {
  if (!Array.isArray(input)) return []
  const cleaned: TranscriptTurn[] = []
  for (const item of input.slice(-120)) {
    if (!item || typeof item !== "object") continue
    const raw = item as { role?: unknown; text?: unknown; ts?: unknown }
    const role = raw.role === "user" ? "user" : raw.role === "model" ? "model" : null
    const text = typeof raw.text === "string" ? raw.text.trim().slice(0, 1000) : ""
    if (!role || !text) continue
    cleaned.push({
      role,
      text,
      ts: typeof raw.ts === "number" && Number.isFinite(raw.ts) ? raw.ts : Date.now(),
    })
  }
  return cleaned
}

export async function POST(request: Request) {
  const auth = await requireAuthorizedAiUser()
  if (auth.errorResponse) return auth.errorResponse
  const user = auth.user

  let body: {
    sessionId?: string
    mode?: string
    transcript?: unknown
    durationSec?: number
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
  if (!UUID_REGEX.test(sessionId)) {
    return jsonError("Valid sessionId is required.", 400)
  }

  const mode = body.mode === "turn" || body.mode === "final" ? body.mode : null
  if (!mode) {
    return jsonError("Evaluation mode must be 'turn' or 'final'.", 400)
  }

  const transcript = sanitizeTranscript(body.transcript)
  const durationSec =
    typeof body.durationSec === "number" && Number.isFinite(body.durationSec)
      ? Math.max(0, Math.min(3600, Math.round(body.durationSec)))
      : 0

  const [sessionRow] = await db
    .select()
    .from(speakingSessions)
    .where(and(eq(speakingSessions.id, sessionId), eq(speakingSessions.userId, user.id)))
    .limit(1)

  if (!sessionRow) {
    return jsonError("Speaking session not found.", 404)
  }

  const mission = await resolveMissionFromStoredSession({
    level: sessionRow.level,
    topicSlug: sessionRow.topicSlug,
    missionTitle: sessionRow.missionTitle,
    missionGoal: sessionRow.missionGoal,
    studentName: user.name,
  })

  const existingChecklist: ChecklistItemState[] =
    Array.isArray(sessionRow.checklist) && sessionRow.checklist.length > 0
      ? (sessionRow.checklist as ChecklistItemState[])
      : createInitialChecklist(mission)

  const userTurns = transcript.filter((t) => t.role === "user")

  try {
    if (mode === "turn") {
      if (userTurns.length === 0) {
        return Response.json({
          checklist: existingChecklist,
          usedTargetGrammarProb: 0,
          needsHint: false,
          latencyMs: 0,
        })
      }

      const result = await evaluateLiveTurn({
        mission,
        transcript,
        existingChecklist,
      })

      await db
        .update(speakingSessions)
        .set({
          transcript,
          checklist: result.checklist,
          durationSec,
          turnCount: userTurns.length,
        })
        .where(eq(speakingSessions.id, sessionId))

      return Response.json(result)
    }

    // mode === "final"
    if (userTurns.length === 0) {
      await db
        .update(speakingSessions)
        .set({
          status: "abandoned",
          durationSec,
          turnCount: 0,
          transcript,
          checklist: existingChecklist,
          completedAt: new Date(),
        })
        .where(eq(speakingSessions.id, sessionId))

      return Response.json({
        status: "abandoned",
        checklist: existingChecklist,
        evaluation: null,
      })
    }

    const { evaluation, checklist } = await evaluateLiveSession({
      mission,
      transcript,
      existingChecklist,
    })

    await db
      .update(speakingSessions)
      .set({
        status: "completed",
        durationSec,
        turnCount: userTurns.length,
        transcript,
        checklist,
        evaluation,
        completedAt: new Date(),
      })
      .where(eq(speakingSessions.id, sessionId))

    return Response.json({
      status: "completed",
      checklist,
      evaluation,
    })
  } catch (error) {
    console.error("[api/live/evaluate POST]", error)
    const rawMsg = error instanceof Error ? error.message : "Failed to evaluate speaking session."
    return jsonError(rawMsg, 502)
  }
}

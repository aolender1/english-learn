import { and, asc, eq, isNull } from "drizzle-orm"

import { getSessionUser, jsonError } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { exercises } from "@/lib/db/schema"
import {
  curateMediaForConcept,
  mapMediaRow,
  normalizeConceptKey,
} from "@/lib/media-service"
import { extractVisualConcept } from "@/lib/noto-emoji"
import type { CefrLevel } from "@/lib/question-bank"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const maxDuration = 60

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  let body: {
    exerciseId?: string
    concept?: string
    topicSlug?: string
    level?: string
    limit?: number
    preferProvider?: string
    forceRefresh?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const preferProvider =
    body.preferProvider === "klipy" || body.preferProvider === "noto_emoji"
      ? body.preferProvider
      : "auto"

  try {
    // 1. Single exercise curation
    if (body.exerciseId) {
      if (!UUID_REGEX.test(body.exerciseId)) {
        return jsonError("Invalid exercise ID.", 400)
      }

      const [ex] = await db
        .select()
        .from(exercises)
        .where(eq(exercises.id, body.exerciseId))
        .limit(1)
      if (!ex) return jsonError("Exercise not found.", 404)

      const opts = Array.isArray(ex.options) ? (ex.options as string[]).map(String) : []
      const expected = ex.expectedAnswer?.trim() || opts[ex.correctAnswerIndex] || ""
      const rawConcept =
        body.concept?.trim() ||
        extractVisualConcept(ex.prompt, ex.word, expected) ||
        ex.word ||
        ""
      const conceptKey = normalizeConceptKey(rawConcept)
      if (!conceptKey) {
        return jsonError("Could not extract a visual concept. Type a keyword manually.", 400)
      }

      const result = await curateMediaForConcept({
        concept: conceptKey,
        promptContext: ex.prompt,
        preferProvider,
        forceRefresh: body.forceRefresh === true,
      })

      if (result.asset) {
        await db
          .update(exercises)
          .set({ mediaAssetId: result.asset.id, updatedAt: new Date() })
          .where(eq(exercises.id, ex.id))
      }

      return Response.json({
        asset: result.asset ? mapMediaRow(result.asset) : null,
        decision: result.decision,
        fromCache: result.fromCache,
        klipyCallsUsed: result.klipyCallsUsed,
        conceptKey,
      })
    }

    // 2. Batch topic curation (capped at 10 exercises per click to protect KLIPY dev quota)
    if (!body.topicSlug || !body.level) {
      return jsonError("Provide either exerciseId or topicSlug + level.", 400)
    }

    const limit = Math.max(1, Math.min(10, Number(body.limit) || 8))
    const pending = await db
      .select()
      .from(exercises)
      .where(
        and(
          eq(exercises.topicSlug, body.topicSlug),
          eq(exercises.level, body.level as CefrLevel),
          isNull(exercises.mediaAssetId),
        ),
      )
      .orderBy(asc(exercises.createdAt))
      .limit(limit)

    let linkedCount = 0
    let skippedCount = 0
    let klipyCallsUsed = 0
    const seenConcepts = new Set<string>()
    const results: Array<{
      exerciseId: string
      conceptKey: string | null
      provider: string | null
      fromCache: boolean
    }> = []

    for (const ex of pending) {
      const opts = Array.isArray(ex.options) ? (ex.options as string[]).map(String) : []
      const expected = ex.expectedAnswer?.trim() || opts[ex.correctAnswerIndex] || ""
      const extracted = extractVisualConcept(ex.prompt, ex.word, expected)
      const conceptKey = extracted ? normalizeConceptKey(extracted) : ""

      if (!conceptKey) {
        skippedCount++
        results.push({
          exerciseId: ex.id,
          conceptKey: null,
          provider: null,
          fromCache: false,
        })
        continue
      }

      seenConcepts.add(conceptKey)
      const curated = await curateMediaForConcept({
        concept: conceptKey,
        promptContext: ex.prompt,
        preferProvider,
        forceRefresh: false,
      })
      klipyCallsUsed += curated.klipyCallsUsed

      if (curated.asset) {
        await db
          .update(exercises)
          .set({ mediaAssetId: curated.asset.id, updatedAt: new Date() })
          .where(eq(exercises.id, ex.id))
        linkedCount++
        results.push({
          exerciseId: ex.id,
          conceptKey,
          provider: curated.asset.provider,
          fromCache: curated.fromCache,
        })
      } else {
        skippedCount++
        results.push({
          exerciseId: ex.id,
          conceptKey,
          provider: null,
          fromCache: false,
        })
      }
    }

    return Response.json({
      linkedCount,
      skippedCount,
      uniqueConcepts: seenConcepts.size,
      klipyCallsUsed,
      results,
    })
  } catch (error) {
    console.error("[api/teacher/media/curate POST]", error)
    const message =
      error instanceof Error ? error.message : "Failed to curate visual media."
    return jsonError(message, 500)
  }
}

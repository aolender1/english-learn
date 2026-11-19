import { eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { mediaAssets } from "@/lib/db/schema"
import {
  selectBestVisualWithDecision,
  type VisualSelectionResult,
} from "@/lib/gemini-decisions"
import { searchKlipyGifs } from "@/lib/media-klipy"
import { findNotoMatchForConcept } from "@/lib/noto-emoji"
import type { QuestionMedia } from "@/lib/question-bank"

export type MediaAssetRow = typeof mediaAssets.$inferSelect

export function normalizeConceptKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
}

export function mapMediaRow(row: MediaAssetRow): QuestionMedia {
  const provider: QuestionMedia["provider"] =
    row.provider === "klipy" || row.provider === "noto_emoji" ? row.provider : "custom"
  return {
    id: row.id,
    conceptKey: row.conceptKey,
    provider,
    mediaType: row.mediaType,
    url: row.url,
    previewUrl: row.previewUrl,
    mp4Url: row.mp4Url,
    title: row.title,
    altText: row.altText,
  }
}

export async function findCachedMediaByConcept(
  conceptKey: string,
): Promise<MediaAssetRow | null> {
  const normalized = normalizeConceptKey(conceptKey)
  if (!normalized) return null

  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.conceptKey, normalized))
    .limit(1)

  return row ?? null
}

export async function findCachedMediaMap(
  conceptKeys: string[],
): Promise<Map<string, MediaAssetRow>> {
  const unique = Array.from(
    new Set(conceptKeys.map(normalizeConceptKey).filter(Boolean)),
  )
  if (unique.length === 0) return new Map()

  const rows = await db
    .select()
    .from(mediaAssets)
    .where(inArray(mediaAssets.conceptKey, unique))

  return new Map(rows.map((row) => [row.conceptKey, row]))
}

export async function upsertMediaAsset(data: {
  conceptKey: string
  provider: "klipy" | "noto_emoji" | "custom"
  mediaType: string
  externalId?: string | null
  url: string
  previewUrl?: string | null
  mp4Url?: string | null
  title?: string | null
  altText?: string | null
  width?: number | null
  height?: number | null
  decisionScore?: number | null
  decisionMeta?: Record<string, unknown> | null
}): Promise<MediaAssetRow> {
  const normalizedKey =
    normalizeConceptKey(data.conceptKey) || `custom-${Date.now()}`

  const [row] = await db
    .insert(mediaAssets)
    .values({
      conceptKey: normalizedKey,
      provider: data.provider,
      mediaType: data.mediaType,
      externalId: data.externalId ?? null,
      url: data.url,
      previewUrl: data.previewUrl ?? null,
      mp4Url: data.mp4Url ?? null,
      title: data.title ?? null,
      altText: data.altText ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      decisionScore: data.decisionScore ?? null,
      decisionMeta: data.decisionMeta ?? null,
    })
    .onConflictDoUpdate({
      target: mediaAssets.conceptKey,
      set: {
        provider: data.provider,
        mediaType: data.mediaType,
        externalId: data.externalId ?? null,
        url: data.url,
        previewUrl: data.previewUrl ?? null,
        mp4Url: data.mp4Url ?? null,
        title: data.title ?? null,
        altText: data.altText ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        decisionScore: data.decisionScore ?? null,
        decisionMeta: data.decisionMeta ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()

  return row
}

export async function curateMediaForConcept(params: {
  concept: string
  promptContext?: string
  preferProvider?: "klipy" | "noto_emoji" | "auto"
  forceRefresh?: boolean
}): Promise<{
  asset: MediaAssetRow | null
  fromCache: boolean
  klipyCallsUsed: number
  decision: VisualSelectionResult | null
}> {
  const conceptKey = normalizeConceptKey(params.concept)
  if (!conceptKey) {
    return { asset: null, fromCache: false, klipyCallsUsed: 0, decision: null }
  }

  const prefer = params.preferProvider ?? "auto"

  // 1. Check DB cache first (unless forcing refresh or explicitly upgrading noto -> klipy)
  if (!params.forceRefresh) {
    const cached = await findCachedMediaByConcept(conceptKey)
    if (cached) {
      const shouldUpgradeToKlipy =
        prefer === "klipy" && cached.provider === "noto_emoji"
      if (!shouldUpgradeToKlipy) {
        return {
          asset: cached,
          fromCache: true,
          klipyCallsUsed: 0,
          decision: null,
        }
      }
    }
  }

  // 2. Zero-quota Google Noto Animated Emoji path
  if (prefer === "noto_emoji" || prefer === "auto") {
    const noto = findNotoMatchForConcept(conceptKey)
    if (noto) {
      const saved = await upsertMediaAsset({
        conceptKey,
        provider: "noto_emoji",
        mediaType: "webp",
        externalId: noto.codepoint,
        url: noto.url,
        previewUrl: noto.previewUrl,
        title: noto.title,
        altText: `Visual illustration: ${noto.title}`,
        width: 512,
        height: 512,
        decisionScore: 300,
        decisionMeta: { source: "verified_noto_catalog", category: noto.category },
      })
      return { asset: saved, fromCache: false, klipyCallsUsed: 0, decision: null }
    }
    if (prefer === "noto_emoji") {
      return { asset: null, fromCache: false, klipyCallsUsed: 0, decision: null }
    }
  }

  // 3. KLIPY search + Multimodal Gemini Decision-1 selector
  let klipyCallsUsed = 0
  let decision: VisualSelectionResult | null = null

  try {
    klipyCallsUsed = 1
    const candidates = await searchKlipyGifs(conceptKey, { perPage: 4 })

    if (candidates.length > 0) {
      decision = await selectBestVisualWithDecision({
        concept: conceptKey,
        promptContext: params.promptContext,
        candidates: candidates.map((c) => ({
          id: c.id,
          title: c.title,
          thumbnailUrl: c.previewUrl,
        })),
      })

      if (
        decision.selectedIndex !== null &&
        decision.classroomSafeProb >= 0.7 &&
        decision.isRelevantProb >= 0.52
      ) {
        const chosen = candidates[decision.selectedIndex]
        if (chosen) {
          const saved = await upsertMediaAsset({
            conceptKey,
            provider: "klipy",
            mediaType: chosen.mediaType,
            externalId: chosen.id,
            url: chosen.url,
            previewUrl: chosen.previewUrl,
            mp4Url: chosen.mp4Url,
            title: chosen.title,
            altText: `GIF illustrating ${conceptKey}: ${chosen.title}`,
            width: chosen.width,
            height: chosen.height,
            decisionScore: Math.round(decision.clarityScore * 100),
            decisionMeta: {
              isRelevantProb: decision.isRelevantProb,
              classroomSafeProb: decision.classroomSafeProb,
              clarityScore: decision.clarityScore,
              confidence: decision.confidence,
              latencyMs: decision.latencyMs,
            },
          })
          return { asset: saved, fromCache: false, klipyCallsUsed, decision }
        }
      }
    }
  } catch (error) {
    console.warn(`[media-service] KLIPY curation failed for "${conceptKey}":`, error)
  }

  // 4. Fallback to Noto if KLIPY returned nothing suitable
  const notoFallback = findNotoMatchForConcept(conceptKey)
  if (notoFallback) {
    const saved = await upsertMediaAsset({
      conceptKey,
      provider: "noto_emoji",
      mediaType: "webp",
      externalId: notoFallback.codepoint,
      url: notoFallback.url,
      previewUrl: notoFallback.previewUrl,
      title: notoFallback.title,
      altText: `Visual illustration: ${notoFallback.title}`,
      width: 512,
      height: 512,
      decisionScore: 250,
      decisionMeta: { source: "noto_fallback" },
    })
    return { asset: saved, fromCache: false, klipyCallsUsed, decision }
  }

  return { asset: null, fromCache: false, klipyCallsUsed, decision }
}

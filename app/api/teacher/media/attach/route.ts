import { eq } from "drizzle-orm"

import { getSessionUser, jsonError } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { exercises, mediaAssets } from "@/lib/db/schema"
import { mapMediaRow, normalizeConceptKey, upsertMediaAsset } from "@/lib/media-service"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  let body: {
    exerciseId?: string
    clear?: boolean
    assetId?: string
    provider?: string
    conceptKey?: string
    externalId?: string
    mediaType?: string
    url?: string
    previewUrl?: string | null
    mp4Url?: string | null
    title?: string | null
    altText?: string | null
    width?: number | null
    height?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  if (!body.exerciseId || !UUID_REGEX.test(body.exerciseId)) {
    return jsonError("Valid exerciseId is required.", 400)
  }

  try {
    if (body.clear) {
      await db
        .update(exercises)
        .set({ mediaAssetId: null, updatedAt: new Date() })
        .where(eq(exercises.id, body.exerciseId))

      return Response.json({ ok: true, media: null })
    }

    if (body.assetId) {
      if (!UUID_REGEX.test(body.assetId)) {
        return jsonError("Invalid assetId.", 400)
      }
      const [asset] = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, body.assetId))
        .limit(1)
      if (!asset) return jsonError("Media asset not found.", 404)

      await db
        .update(exercises)
        .set({ mediaAssetId: asset.id, updatedAt: new Date() })
        .where(eq(exercises.id, body.exerciseId))

      return Response.json({ ok: true, media: mapMediaRow(asset) })
    }

    const url = body.url?.trim() || ""
    if (!url || !/^https?:\/\//i.test(url)) {
      return jsonError("A valid http/https media URL is required.", 400)
    }

    const provider: "klipy" | "noto_emoji" | "custom" =
      body.provider === "klipy" || body.provider === "noto_emoji"
        ? body.provider
        : "custom"

    const conceptKey =
      normalizeConceptKey(
        body.conceptKey || body.title || body.externalId || `custom-${Date.now()}`,
      ) || `custom-${Date.now()}`

    const saved = await upsertMediaAsset({
      conceptKey,
      provider,
      mediaType: body.mediaType?.trim() || "webp",
      externalId: body.externalId ?? null,
      url,
      previewUrl: body.previewUrl ?? null,
      mp4Url: body.mp4Url ?? null,
      title: body.title ?? null,
      altText: body.altText ?? (body.title ? `Visual: ${body.title}` : null),
      width: typeof body.width === "number" ? body.width : null,
      height: typeof body.height === "number" ? body.height : null,
    })

    await db
      .update(exercises)
      .set({ mediaAssetId: saved.id, updatedAt: new Date() })
      .where(eq(exercises.id, body.exerciseId))

    return Response.json({ ok: true, media: mapMediaRow(saved) })
  } catch (error) {
    console.error("[api/teacher/media/attach POST]", error)
    return jsonError("Failed to attach media.", 500)
  }
}

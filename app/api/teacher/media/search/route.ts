import { desc, ilike } from "drizzle-orm"

import { getSessionUser, jsonError } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { mediaAssets } from "@/lib/db/schema"
import { searchKlipyGifs } from "@/lib/media-klipy"
import { mapMediaRow } from "@/lib/media-service"
import { NOTO_CATEGORIES, searchNotoEmojis } from "@/lib/noto-emoji"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "klipy"
  const q = (searchParams.get("q") || "").trim()
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1)
  const category = searchParams.get("category") || "all"

  try {
    if (provider === "noto") {
      const items = searchNotoEmojis(q, category, 36)
      return Response.json({
        provider: "noto",
        items,
        categories: NOTO_CATEGORIES,
      })
    }

    if (provider === "cached") {
      const rows = q
        ? await db
            .select()
            .from(mediaAssets)
            .where(ilike(mediaAssets.conceptKey, `%${q.toLowerCase()}%`))
            .orderBy(desc(mediaAssets.updatedAt))
            .limit(30)
        : await db
            .select()
            .from(mediaAssets)
            .orderBy(desc(mediaAssets.updatedAt))
            .limit(30)

      return Response.json({
        provider: "cached",
        items: rows.map(mapMediaRow),
      })
    }

    // Default: KLIPY search
    if (!q) {
      return Response.json({ provider: "klipy", items: [] })
    }
    const items = await searchKlipyGifs(q, {
      perPage: 8,
      page,
      customerId: user.id,
    })
    return Response.json({ provider: "klipy", items })
  } catch (error) {
    console.error("[api/teacher/media/search GET]", error)
    const message =
      error instanceof Error ? error.message : "Failed to search visual media."
    return jsonError(message, 500)
  }
}

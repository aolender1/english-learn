import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { topics } from "@/lib/db/schema"
import { topicsForLevel, type TopicDef } from "@/lib/topics"
import type { CefrLevel } from "@/lib/question-bank"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const level = searchParams.get("level") as CefrLevel | null

  if (!level) {
    return Response.json({ error: "Level parameter is required" }, { status: 400 })
  }

  try {
    const dbTopics = await db
      .select()
      .from(topics)
      .where(eq(topics.level, level))
      .orderBy(asc(topics.sortOrder), asc(topics.createdAt))

    if (dbTopics.length > 0) {
      return Response.json({
        topics: dbTopics
          .filter((t) => t.enabled)
          .map((t) => ({
            slug: t.slug,
            level: t.level as CefrLevel,
            title: t.title,
            description: t.description ?? "",
            focus: t.focus ?? "",
            theory: t.theory ?? null,
          })),
      })
    }
  } catch (error) {
    console.error("[api/topics] DB fetch failed, using fallback:", error)
  }

  // Fallback to static catalog
  const catalogTopics = topicsForLevel(level)
  return Response.json({
    topics: catalogTopics,
  })
}

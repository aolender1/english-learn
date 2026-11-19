import { asc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { exercises, topics } from "@/lib/db/schema"
import { topicsForLevel, type TopicDef } from "@/lib/topics"
import type { CefrLevel } from "@/lib/question-bank"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const level = searchParams.get("level") as CefrLevel | null

  if (!level) {
    return Response.json({ error: "Level parameter is required" }, { status: 400 })
  }

  try {
    const [dbTopics, countRows] = await Promise.all([
      db
        .select()
        .from(topics)
        .where(eq(topics.level, level))
        .orderBy(asc(topics.sortOrder), asc(topics.createdAt)),
      db
        .select({
          topicSlug: exercises.topicSlug,
          count: sql<number>`count(*)::int`,
        })
        .from(exercises)
        .where(eq(exercises.level, level))
        .groupBy(exercises.topicSlug),
    ])

    const countMap = new Map(countRows.map((row) => [row.topicSlug, Number(row.count) || 0]))

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
            exerciseCount: countMap.get(t.slug) ?? 0,
          })),
      })
    }

    const catalogTopics: TopicDef[] = topicsForLevel(level).map((t) => ({
      ...t,
      exerciseCount: countMap.get(t.slug) ?? 0,
    }))
    return Response.json({ topics: catalogTopics })
  } catch (error) {
    console.error("[api/topics] DB fetch failed, using fallback:", error)
  }

  // Fallback to static catalog
  const catalogTopics = topicsForLevel(level)
  return Response.json({
    topics: catalogTopics,
  })
}

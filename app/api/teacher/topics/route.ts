import { and, asc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { exercises, topics } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"
import type { CefrLevel } from "@/lib/question-bank"

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  try {
    const allTopics = await db
      .select({
        id: topics.id,
        slug: topics.slug,
        level: topics.level,
        title: topics.title,
        description: topics.description,
        focus: topics.focus,
        enabled: topics.enabled,
        sortOrder: topics.sortOrder,
        createdAt: topics.createdAt,
      })
      .from(topics)
      .orderBy(asc(topics.sortOrder), asc(topics.createdAt))

    // Count exercises per topic & level
    const counts = await db
      .select({
        topicSlug: exercises.topicSlug,
        level: exercises.level,
        count: sql<number>`count(*)::int`,
      })
      .from(exercises)
      .groupBy(exercises.topicSlug, exercises.level)

    const countMap = new Map<string, number>()
    for (const c of counts) {
      countMap.set(`${c.topicSlug}|${c.level}`, c.count)
    }

    const result = allTopics.map((t) => ({
      ...t,
      exerciseCount: countMap.get(`${t.slug}|${t.level}`) ?? 0,
    }))

    return Response.json({ topics: result })
  } catch (error) {
    console.error("[api/teacher/topics GET]", error)
    return jsonError("Failed to fetch topics.", 500)
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  let body: {
    slug?: string
    level?: string
    title?: string
    description?: string
    focus?: string
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  if (!body.title || !body.level) {
    return jsonError("Title and Level are required.", 400)
  }

  const slug =
    body.slug?.trim() ||
    body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

  try {
    const [newTopic] = await db
      .insert(topics)
      .values({
        slug,
        level: body.level as CefrLevel,
        title: body.title.trim(),
        description: body.description?.trim() ?? "",
        focus: body.focus?.trim() ?? "",
        enabled: true,
        sortOrder: 999,
      })
      .returning()

    return Response.json({ topic: newTopic })
  } catch (error) {
    console.error("[api/teacher/topics POST]", error)
    return jsonError("Topic with this slug and level already exists.", 409)
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  let body: {
    id?: string
    slug?: string
    level?: string
    title?: string
    description?: string
    focus?: string
    enabled?: boolean
    sortOrder?: number
    newLevel?: string // for moving topic to another level
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  if (!body.id) {
    return jsonError("Topic ID is required.", 400)
  }

  try {
    // Find current topic
    const [current] = await db.select().from(topics).where(eq(topics.id, body.id)).limit(1)
    if (!current) return jsonError("Topic not found.", 404)

    const targetLevel = (body.newLevel || body.level || current.level) as CefrLevel

    const [updated] = await db
      .update(topics)
      .set({
        level: targetLevel,
        title: body.title !== undefined ? body.title.trim() : current.title,
        description: body.description !== undefined ? body.description.trim() : current.description,
        focus: body.focus !== undefined ? body.focus.trim() : current.focus,
        enabled: body.enabled !== undefined ? body.enabled : current.enabled,
        sortOrder: body.sortOrder !== undefined ? body.sortOrder : current.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(topics.id, body.id))
      .returning()

    // If level changed, also update all associated exercises
    if (targetLevel !== current.level) {
      await db
        .update(exercises)
        .set({ level: targetLevel, updatedAt: new Date() })
        .where(and(eq(exercises.topicSlug, current.slug), eq(exercises.level, current.level)))
    }

    return Response.json({ topic: updated })
  } catch (error) {
    console.error("[api/teacher/topics PATCH]", error)
    return jsonError("Failed to update topic.", 500)
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return jsonError("Topic ID is required.", 400)

  try {
    const [current] = await db.select().from(topics).where(eq(topics.id, id)).limit(1)
    if (!current) return jsonError("Topic not found.", 404)

    // Delete associated exercises
    await db
      .delete(exercises)
      .where(and(eq(exercises.topicSlug, current.slug), eq(exercises.level, current.level)))

    // Delete topic
    await db.delete(topics).where(eq(topics.id, id))

    return Response.json({ ok: true })
  } catch (error) {
    console.error("[api/teacher/topics DELETE]", error)
    return jsonError("Failed to delete topic.", 500)
  }
}

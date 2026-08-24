import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { exercises } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"
import type { CefrLevel, Difficulty } from "@/lib/question-bank"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  const { searchParams } = new URL(request.url)
  const topicSlug = searchParams.get("topicSlug")
  const level = searchParams.get("level") as CefrLevel | null

  if (!topicSlug || !level) {
    return jsonError("topicSlug and level parameters are required.", 400)
  }

  try {
    const list = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.topicSlug, topicSlug), eq(exercises.level, level)))
      .orderBy(desc(exercises.createdAt))

    return Response.json({ exercises: list })
  } catch (error) {
    console.error("[api/teacher/exercises GET]", error)
    return jsonError("Failed to fetch exercises.", 500)
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  let body: {
    topicSlug?: string
    level?: string
    prompt?: string
    options?: string[]
    correctAnswerIndex?: number
    explanation?: string
    word?: string
    phonetic?: string
    spanishTranslation?: string
    difficulty?: string
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  if (
    !body.topicSlug ||
    !body.level ||
    !body.prompt ||
    !Array.isArray(body.options) ||
    body.options.length < 2 ||
    typeof body.correctAnswerIndex !== "number" ||
    body.correctAnswerIndex < 0 ||
    body.correctAnswerIndex >= body.options.length
  ) {
    return jsonError("Missing required fields or invalid options/answer index.", 400)
  }

  try {
    const [inserted] = await db
      .insert(exercises)
      .values({
        topicSlug: body.topicSlug,
        level: body.level as CefrLevel,
        prompt: body.prompt.trim(),
        options: body.options.map(String),
        correctAnswerIndex: body.correctAnswerIndex,
        explanation: body.explanation?.trim() ?? "",
        word: body.word?.trim() ?? null,
        phonetic: body.phonetic?.trim() ?? null,
        spanishTranslation: body.spanishTranslation?.trim() ?? null,
        difficulty: (body.difficulty as Difficulty) || "medium",
        createdBy: "teacher",
      })
      .returning()

    return Response.json({ exercise: inserted })
  } catch (error) {
    console.error("[api/teacher/exercises POST]", error)
    return jsonError("Failed to create exercise.", 500)
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  let body: {
    id?: string
    prompt?: string
    options?: string[]
    correctAnswerIndex?: number
    explanation?: string
    word?: string
    phonetic?: string
    spanishTranslation?: string
    difficulty?: string
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  if (!body.id) {
    return jsonError("Exercise ID is required.", 400)
  }

  try {
    const updateData: Partial<typeof exercises.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (body.prompt !== undefined) updateData.prompt = body.prompt.trim()
    if (Array.isArray(body.options)) updateData.options = body.options.map(String)
    if (typeof body.correctAnswerIndex === "number") updateData.correctAnswerIndex = body.correctAnswerIndex
    if (body.explanation !== undefined) updateData.explanation = body.explanation.trim()
    if (body.word !== undefined) updateData.word = body.word.trim()
    if (body.phonetic !== undefined) updateData.phonetic = body.phonetic.trim()
    if (body.spanishTranslation !== undefined) updateData.spanishTranslation = body.spanishTranslation.trim()
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty

    const [updated] = await db
      .update(exercises)
      .set(updateData)
      .where(eq(exercises.id, body.id))
      .returning()

    if (!updated) return jsonError("Exercise not found.", 404)
    return Response.json({ exercise: updated })
  } catch (error) {
    console.error("[api/teacher/exercises PUT]", error)
    return jsonError("Failed to update exercise.", 500)
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return jsonError("Exercise ID is required.", 400)

  try {
    await db.delete(exercises).where(eq(exercises.id, id))
    return Response.json({ ok: true })
  } catch (error) {
    console.error("[api/teacher/exercises DELETE]", error)
    return jsonError("Failed to delete exercise.", 500)
  }
}

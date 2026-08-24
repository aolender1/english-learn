import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { exercises, practiceAttempts, practiceRounds, teacherStudents, userProfiles } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"
import { topicCatalog } from "@/lib/topics"

export async function GET(
  request: Request,
  props: { params: Promise<{ studentId: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  const { studentId } = await props.params
  if (!studentId) {
    return jsonError("Student ID is required.", 400)
  }

  try {
    // Verify that this teacher has access to this student
    const [relation] = await db
      .select()
      .from(teacherStudents)
      .where(and(eq(teacherStudents.teacherUserId, user.id), eq(teacherStudents.studentUserId, studentId)))
      .limit(1)

    if (!relation) {
      return jsonError("Student not found or not in your roster.", 404)
    }

    // Get student profile
    const [profile] = await db
      .select({
        userId: userProfiles.userId,
        email: userProfiles.email,
        name: userProfiles.name,
        joined: teacherStudents.createdAt,
      })
      .from(teacherStudents)
      .innerJoin(userProfiles, eq(userProfiles.userId, teacherStudents.studentUserId))
      .where(and(eq(teacherStudents.teacherUserId, user.id), eq(teacherStudents.studentUserId, studentId)))
      .limit(1)

    // Get all practice sessions/rounds
    const rounds = await db
      .select({
        id: practiceRounds.id,
        level: practiceRounds.level,
        topicSlug: practiceRounds.topicSlug,
        status: practiceRounds.status,
        score: practiceRounds.score,
        total: practiceRounds.total,
        startedAt: practiceRounds.startedAt,
        completedAt: practiceRounds.completedAt,
      })
      .from(practiceRounds)
      .where(eq(practiceRounds.userId, studentId))
      .orderBy(desc(practiceRounds.startedAt))

    // Get all attempts (answers)
    const attempts = await db
      .select({
        id: practiceAttempts.id,
        roundId: practiceAttempts.roundId,
        exerciseId: practiceAttempts.exerciseId,
        selectedAnswer: practiceAttempts.selectedAnswer,
        correctAnswer: practiceAttempts.correctAnswer,
        isCorrect: practiceAttempts.isCorrect,
        responseTimeMs: practiceAttempts.responseTimeMs,
        answeredAt: practiceAttempts.answeredAt,
      })
      .from(practiceAttempts)
      .where(eq(practiceAttempts.userId, studentId))
      .orderBy(desc(practiceAttempts.answeredAt))

    // Map exercise IDs to prompts if available
    const exerciseIds = [...new Set(attempts.map((a) => a.exerciseId))]
    const exerciseDetails = exerciseIds.length > 0
      ? await db
          .select({
            id: exercises.id,
            prompt: exercises.prompt,
            topicSlug: exercises.topicSlug,
            level: exercises.level,
            word: exercises.word,
            explanation: exercises.explanation,
          })
          .from(exercises)
          .where(inArray(exercises.id, exerciseIds))
      : []

    const exerciseMap = new Map(exerciseDetails.map((e) => [e.id, e]))
    const topicMap = new Map(topicCatalog.map((t) => [t.slug, t.title]))

    // Mistakes breakdown
    const mistakes = attempts
      .filter((a) => !a.isCorrect)
      .map((a) => {
        const ex = exerciseMap.get(a.exerciseId)
        return {
          id: a.id,
          roundId: a.roundId,
          prompt: ex?.prompt ?? "Multiple choice question",
          word: ex?.word,
          explanation: ex?.explanation,
          topicSlug: ex?.topicSlug,
          topicTitle: ex?.topicSlug ? (topicMap.get(ex.topicSlug) ?? ex.topicSlug) : "Practice Topic",
          level: ex?.level,
          selectedAnswer: a.selectedAnswer,
          correctAnswer: a.correctAnswer,
          answeredAt: a.answeredAt,
          responseTimeMs: a.responseTimeMs,
        }
      })

    // Accuracy per topic
    const topicStatsMap = new Map<
      string,
      { topicSlug: string; topicTitle: string; level: string; total: number; correct: number }
    >()

    for (const a of attempts) {
      const ex = exerciseMap.get(a.exerciseId)
      const topicSlug = ex?.topicSlug || "general"
      const level = ex?.level || "b1-preliminary"
      const key = `${topicSlug}|${level}`

      const current = topicStatsMap.get(key) ?? {
        topicSlug,
        topicTitle: topicMap.get(topicSlug) ?? topicSlug,
        level,
        total: 0,
        correct: 0,
      }
      current.total++
      if (a.isCorrect) current.correct++
      topicStatsMap.set(key, current)
    }

    const topicStats = [...topicStatsMap.values()].map((t) => ({
      ...t,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
    }))

    return Response.json({
      student: profile,
      totalSessions: rounds.filter((r) => r.status === "completed").length,
      totalAnswers: attempts.length,
      correctAnswers: attempts.filter((a) => a.isCorrect).length,
      accuracy: attempts.length > 0 ? Math.round((attempts.filter((a) => a.isCorrect).length / attempts.length) * 100) : 0,
      rounds: rounds.map((r) => ({
        ...r,
        topicTitle: topicMap.get(r.topicSlug) ?? r.topicSlug,
      })),
      mistakes,
      topicStats,
    })
  } catch (error) {
    console.error("[api/teacher/students/[studentId] GET]", error)
    return jsonError("Failed to fetch student details.", 500)
  }
}

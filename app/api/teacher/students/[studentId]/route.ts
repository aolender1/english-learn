import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  exercises,
  practiceAttempts,
  practiceRounds,
  speakingSessions,
  studentInvitations,
  teacherStudents,
  userProfiles,
} from "@/lib/db/schema"
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
        status: userProfiles.status,
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
        evaluation: practiceAttempts.evaluation,
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
            exerciseType: exercises.exerciseType,
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
          prompt: ex?.prompt ?? "Practice question",
          exerciseType: ex?.exerciseType ?? "multiple_choice",
          word: ex?.word,
          explanation: ex?.explanation,
          topicSlug: ex?.topicSlug,
          topicTitle: ex?.topicSlug ? (topicMap.get(ex.topicSlug) ?? ex.topicSlug) : "Practice Topic",
          level: ex?.level,
          selectedAnswer: a.selectedAnswer,
          correctAnswer: a.correctAnswer,
          evaluation: a.evaluation,
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

    // Live Speaking Sessions (Gemini 3.8 Live + Decision 1)
    const spokenRows = await db
      .select({
        id: speakingSessions.id,
        level: speakingSessions.level,
        topicSlug: speakingSessions.topicSlug,
        missionTitle: speakingSessions.missionTitle,
        voiceName: speakingSessions.voiceName,
        status: speakingSessions.status,
        durationSec: speakingSessions.durationSec,
        turnCount: speakingSessions.turnCount,
        transcript: speakingSessions.transcript,
        checklist: speakingSessions.checklist,
        evaluation: speakingSessions.evaluation,
        startedAt: speakingSessions.startedAt,
        completedAt: speakingSessions.completedAt,
      })
      .from(speakingSessions)
      .where(eq(speakingSessions.userId, studentId))
      .orderBy(desc(speakingSessions.startedAt))
      .limit(20)

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
      speakingSessions: spokenRows.map((s) => ({
        ...s,
        topicTitle: topicMap.get(s.topicSlug) ?? s.topicSlug,
      })),
    })
  } catch (error) {
    console.error("[api/teacher/students/[studentId] GET]", error)
    return jsonError("Failed to fetch student details.", 500)
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ studentId: string }> },
) {
  const user = await getSessionUser()
  if (!user || user.role !== "teacher") {
    return jsonError("Teacher access required.", 403)
  }

  const { studentId } = await props.params
  if (!studentId) {
    return jsonError("Student ID is required.", 400)
  }

  let body: { status?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const nextStatus = body.status === "paused" ? "paused" : body.status === "active" ? "active" : null
  if (!nextStatus) {
    return jsonError("Status must be 'active' or 'paused'.", 400)
  }

  try {
    const [relation] = await db
      .select()
      .from(teacherStudents)
      .where(and(eq(teacherStudents.teacherUserId, user.id), eq(teacherStudents.studentUserId, studentId)))
      .limit(1)

    if (!relation) {
      return jsonError("Student not found or not in your roster.", 404)
    }

    const [updated] = await db
      .update(userProfiles)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(eq(userProfiles.userId, studentId), eq(userProfiles.role, "student")))
      .returning({ userId: userProfiles.userId, status: userProfiles.status })

    if (!updated) {
      return jsonError("Student profile not found.", 404)
    }

    return Response.json({ ok: true, status: updated.status })
  } catch (error) {
    console.error("[api/teacher/students/[studentId] PATCH]", error)
    return jsonError("Failed to update student status.", 500)
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ studentId: string }> },
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
    const [relation] = await db
      .select()
      .from(teacherStudents)
      .where(and(eq(teacherStudents.teacherUserId, user.id), eq(teacherStudents.studentUserId, studentId)))
      .limit(1)

    if (!relation) {
      return jsonError("Student not found or not in your roster.", 404)
    }

    const [profile] = await db
      .select({ email: userProfiles.email, role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.userId, studentId))
      .limit(1)

    if (profile?.role === "teacher") {
      return jsonError("Teacher accounts cannot be deleted here.", 400)
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(teacherStudents)
        .where(and(eq(teacherStudents.teacherUserId, user.id), eq(teacherStudents.studentUserId, studentId)))

      if (profile?.email) {
        await tx
          .update(studentInvitations)
          .set({ status: "revoked", acceptedByUserId: null, acceptedAt: null })
          .where(
            and(
              eq(studentInvitations.teacherUserId, user.id),
              eq(studentInvitations.email, profile.email.toLowerCase()),
            ),
          )
      }

      const remainingLinks = await tx
        .select({ studentUserId: teacherStudents.studentUserId })
        .from(teacherStudents)
        .where(eq(teacherStudents.studentUserId, studentId))
        .limit(1)

      if (remainingLinks.length === 0) {
        await tx.delete(speakingSessions).where(eq(speakingSessions.userId, studentId))
        await tx.delete(practiceAttempts).where(eq(practiceAttempts.userId, studentId))
        await tx.delete(practiceRounds).where(eq(practiceRounds.userId, studentId))
        await tx.delete(userProfiles).where(eq(userProfiles.userId, studentId))
      }
    })

    return Response.json({ ok: true, email: profile?.email ?? null })
  } catch (error) {
    console.error("[api/teacher/students/[studentId] DELETE]", error)
    return jsonError("Failed to delete student.", 500)
  }
}

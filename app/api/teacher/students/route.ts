import { desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { practiceAttempts, practiceRounds, studentInvitations, teacherStudents, userProfiles } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return jsonError("Sign in required.", 401)
  if (user.role !== "teacher") return jsonError("Only teachers can view this data.", 403)

  const invitations = await db
    .select({
      id: studentInvitations.id,
      email: studentInvitations.email,
      status: studentInvitations.status,
      createdAt: studentInvitations.createdAt,
      acceptedAt: studentInvitations.acceptedAt,
    })
    .from(studentInvitations)
    .where(eq(studentInvitations.teacherUserId, user.id))
    .orderBy(desc(studentInvitations.createdAt))

  const students = await db
    .select({
      userId: userProfiles.userId,
      email: userProfiles.email,
      name: userProfiles.name,
      joined: teacherStudents.createdAt,
    })
    .from(teacherStudents)
    .innerJoin(userProfiles, eq(userProfiles.userId, teacherStudents.studentUserId))
    .where(eq(teacherStudents.teacherUserId, user.id))
    .orderBy(desc(teacherStudents.createdAt))

  const ids = students.map((student) => student.userId)

  type Stats = {
    sessions: number
    totalAnswers: number
    correctAnswers: number
    lastActivity: string | null
  }
  const stats = new Map<string, Stats>()
  for (const id of ids) stats.set(id, { sessions: 0, totalAnswers: 0, correctAnswers: 0, lastActivity: null })

  if (ids.length > 0) {
    const roundStats = await db
      .select({
        userId: practiceRounds.userId,
        completed: sql<number>`count(*) filter (where ${practiceRounds.status} = 'completed')`,
        lastRound: sql<string | null>`max(${practiceRounds.completedAt})`,
      })
      .from(practiceRounds)
      .where(inArray(practiceRounds.userId, ids))
      .groupBy(practiceRounds.userId)

    for (const row of roundStats) {
      const entry = stats.get(row.userId)
      if (!entry) continue
      entry.sessions = Number(row.completed ?? 0)
      if (row.lastRound && (!entry.lastActivity || new Date(row.lastRound) > new Date(entry.lastActivity))) {
        entry.lastActivity = row.lastRound
      }
    }

    const attemptStats = await db
      .select({
        userId: practiceAttempts.userId,
        answered: sql<number>`count(*)`,
        correct: sql<number>`sum(case when ${practiceAttempts.isCorrect} then 1 else 0 end)`,
        lastAttempt: sql<string | null>`max(${practiceAttempts.answeredAt})`,
      })
      .from(practiceAttempts)
      .where(inArray(practiceAttempts.userId, ids))
      .groupBy(practiceAttempts.userId)

    for (const row of attemptStats) {
      const entry = stats.get(row.userId)
      if (!entry) continue
      entry.totalAnswers = Number(row.answered ?? 0)
      entry.correctAnswers = Number(row.correct ?? 0)
      if (row.lastAttempt && (!entry.lastActivity || new Date(row.lastAttempt) > new Date(entry.lastActivity))) {
        entry.lastActivity = row.lastAttempt
      }
    }
  }

  return Response.json({
    invitations,
    students: students.map((student) => ({
      ...student,
      ...stats.get(student.userId)!,
    })),
  })
}

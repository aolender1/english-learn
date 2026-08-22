import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { studentInvitations } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return jsonError("Sign in required.", 401)
  if (user.role !== "teacher") return jsonError("Only teachers can invite students.", 403)

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_PATTERN.test(email)) return jsonError("Enter a valid email address.", 400)

  const [existing] = await db
    .select({
      id: studentInvitations.id,
      status: studentInvitations.status,
    })
    .from(studentInvitations)
    .where(and(eq(studentInvitations.email, email), eq(studentInvitations.teacherUserId, user.id)))
    .limit(1)

  if (existing?.status === "accepted") {
    return jsonError(`${email} already accepted an invitation.`, 409)
  }

  if (existing?.status === "revoked" || existing?.status === "pending") {
    await db
      .update(studentInvitations)
      .set({ status: "pending", acceptedByUserId: null, acceptedAt: null })
      .where(eq(studentInvitations.id, existing.id))
    return Response.json({ ok: true, email, reinvited: true })
  }

  await db.insert(studentInvitations).values({ email, teacherUserId: user.id })
  return Response.json({ ok: true, email, reinvited: false })
}

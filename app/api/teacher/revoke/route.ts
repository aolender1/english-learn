import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { studentInvitations } from "@/lib/db/schema"
import { getSessionUser, jsonError } from "@/lib/api-auth"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return jsonError("Sign in required.", 401)
  if (user.role !== "teacher") return jsonError("Only teachers can revoke invitations.", 403)

  let body: { invitationId?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }
  if (typeof body.invitationId !== "string") return jsonError("Missing invitationId.", 400)

  const [invitation] = await db
    .select({ id: studentInvitations.id, status: studentInvitations.status })
    .from(studentInvitations)
    .where(and(eq(studentInvitations.id, body.invitationId), eq(studentInvitations.teacherUserId, user.id)))
    .limit(1)

  if (!invitation) return jsonError("Invitation not found.", 404)
  if (invitation.status === "accepted") {
    return jsonError("This invitation was already accepted — the student is enrolled.", 409)
  }

  await db
    .update(studentInvitations)
    .set({ status: "revoked" })
    .where(eq(studentInvitations.id, invitation.id))

  return Response.json({ ok: true })
}

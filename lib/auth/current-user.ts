import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { studentInvitations, teacherStudents, userProfiles } from "@/lib/db/schema"

const DEFAULT_TEACHER_EMAILS = ["albertolender@gmail.com", "marisol91088@gmail.com"]

/**
 * Emails allowed to sign up as teachers. Configurable via the
 * TEACHER_EMAILS env var (comma-separated) so new teachers can be added
 * without a code change; falls back to the defaults above.
 */
export const TEACHER_EMAILS: ReadonlySet<string> = new Set(
  (process.env.TEACHER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .concat(DEFAULT_TEACHER_EMAILS),
)

export type AppRole = "teacher" | "student"
export type AppUser = {
  id: string
  email: string
  name: string | null
  role: AppRole
  onboardingComplete: boolean
}

export class UnauthorizedSignupError extends Error {
  constructor(message = "This email has not been invited by a teacher.") {
    super(message)
    this.name = "UnauthorizedSignupError"
  }
}

function toAppUser(row: typeof userProfiles.$inferSelect): AppUser {
  return {
    id: row.userId,
    email: row.email,
    name: row.name,
    role: row.role as AppRole,
    onboardingComplete: row.onboardingComplete,
  }
}

/**
 * Returns the authenticated app user, provisioning the user_profiles row on
 * first sign-in. Teachers are bootstrapped from a fixed allowlist; every
 * other email must match a pending student invitation, otherwise the
 * freshly created Neon Auth account is deleted and rejected.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: session } = await auth.getSession()
  if (!session?.user) return null

  const userId = session.user.id
  const email = session.user.email.toLowerCase()

  const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
  if (existing) return toAppUser(existing)

  if (TEACHER_EMAILS.has(email)) {
    await db
      .insert(userProfiles)
      .values({ userId, email, name: session.user.name ?? null, role: "teacher", onboardingComplete: true })
      .onConflictDoNothing()
  } else {
    const [invitation] = await db
      .select()
      .from(studentInvitations)
      .where(and(eq(studentInvitations.email, email), eq(studentInvitations.status, "pending")))
      .limit(1)

    if (!invitation) {
      await auth.deleteUser()
      throw new UnauthorizedSignupError()
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(userProfiles)
        .values({ userId, email, name: session.user.name ?? null, role: "student", onboardingComplete: false })
        .onConflictDoNothing()
      await tx
        .update(studentInvitations)
        .set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date() })
        .where(eq(studentInvitations.id, invitation.id))
      await tx
        .insert(teacherStudents)
        .values({ teacherUserId: invitation.teacherUserId, studentUserId: userId })
        .onConflictDoNothing()
    })
  }

  const [created] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
  if (!created) throw new Error("Failed to provision user profile")
  return toAppUser(created)
}

/** Checks whether an email is eligible to sign up: a bootstrapped teacher or an actively invited student. */
export async function isEmailAuthorized(email: string): Promise<boolean> {
  const normalized = email.toLowerCase()
  if (TEACHER_EMAILS.has(normalized)) return true
  const [invitation] = await db
    .select()
    .from(studentInvitations)
    .where(and(eq(studentInvitations.email, normalized), eq(studentInvitations.status, "pending")))
    .limit(1)
  return Boolean(invitation)
}

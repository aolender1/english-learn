import { getCurrentUser, UnauthorizedSignupError, type AppUser } from "./auth/current-user"

/**
 * Returns the signed-in app user, or null for anonymous visitors and
 * rejected (uninvited) signups — never throws.
 */
export async function getSessionUser(): Promise<AppUser | null> {
  try {
    return await getCurrentUser()
  } catch (error) {
    if (error instanceof UnauthorizedSignupError) return null
    throw error
  }
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

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
    console.error("[getSessionUser] Unexpected auth error:", error)
    throw error
  }
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export async function requireAuthorizedAiUser(): Promise<
  | { user: AppUser; errorResponse: null }
  | { user: null; errorResponse: Response }
> {
  const user = await getSessionUser().catch(() => null)
  if (!user) {
    return {
      user: null,
      errorResponse: jsonError(
        "Iniciá sesión como alumno invitado o profesor autorizado para usar funciones de IA.",
        401,
      ),
    }
  }
  if (user.role !== "teacher" && user.role !== "student") {
    return {
      user: null,
      errorResponse: jsonError(
        "Tu cuenta no tiene permisos para usar funciones de IA.",
        403,
      ),
    }
  }
  if (user.role === "student" && user.status === "paused") {
    return {
      user: null,
      errorResponse: jsonError(
        "Tu cuenta fue pausada por tu profesor. Pedile que la reactive para usar las funciones de IA.",
        403,
      ),
    }
  }
  return { user, errorResponse: null }
}

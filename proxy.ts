import { NextResponse, type NextRequest } from "next/server"
import { DEFAULT_AUTH_SKIP_ROUTES, processAuthMiddleware } from "@neondatabase/auth/server"

/**
 * Public pages that must never redirect anonymous visitors to login.
 * The Neon Auth OAuth verifier exchange still runs for them, which is
 * what converts ?neon_auth_session_verifier=... into session cookies
 * right after a Google sign-in.
 */
const PUBLIC_ROUTES = ["/"]
const LOGIN_URL = "/auth/sign-in"

export default async function proxy(request: NextRequest) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET

  if (!baseUrl || !cookieSecret) return NextResponse.next()

  const result = await processAuthMiddleware({
    request,
    pathname: request.nextUrl.pathname,
    skipRoutes: [...DEFAULT_AUTH_SKIP_ROUTES, ...PUBLIC_ROUTES],
    loginUrl: LOGIN_URL,
    baseUrl,
    cookieSecret,
  })

  switch (result.action) {
    case "allow": {
      const headers = new Headers(request.headers)
      if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) headers.set(key, value)
      }
      const response = NextResponse.next({ request: { headers } })
      if (result.cookies) {
        for (const cookie of result.cookies) response.headers.append("Set-Cookie", cookie)
      }
      return response
    }
    case "redirect_oauth": {
      const oauthHeaders = new Headers()
      for (const cookie of result.cookies) oauthHeaders.append("Set-Cookie", cookie)
      return NextResponse.redirect(result.redirectUrl, { headers: oauthHeaders })
    }
    case "redirect_login": {
      const loginHeaders = new Headers()
      if (result.cookies) {
        for (const cookie of result.cookies) loginHeaders.append("Set-Cookie", cookie)
      }
      return NextResponse.redirect(result.redirectUrl, { headers: loginHeaders })
    }
    default:
      return NextResponse.next()
  }
}

// Home page (OAuth verifier landing) and the protected teacher panel.
// Auth API origin checks live in app/api/auth/[...path]/route.ts.
export const config = {
  matcher: ["/", "/teacher", "/teacher/:path*"],
}

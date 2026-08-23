import { NextResponse } from "next/server"

import { auth } from "@/lib/auth/server"

const neonHandlers = auth.handler()

/**
 * Wraps the Neon Auth proxy handler with a same-origin CSRF guard.
 *
 * Cross-site requests are rejected here. For legitimate same-origin
 * requests we override the forwarded Origin header with the Neon Auth
 * base URL origin — better-auth always trusts its own base URL, which
 * sidesteps its domain matching rejecting valid deployments even when
 * their domains are configured in the console.
 */
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const origin = request.headers.get("origin")
  if (origin) {
    let originHost: string | null = null
    try {
      originHost = new URL(origin).host
    } catch {
      originHost = null
    }
    if (!originHost || originHost !== request.headers.get("host")) {
      return NextResponse.json({ message: "Invalid origin", code: "INVALID_ORIGIN" }, { status: 403 })
    }
  }

  const headers = new Headers(request.headers)
  headers.delete("referer")

  const baseUrl = process.env.NEON_AUTH_BASE_URL
  if (baseUrl) {
    try {
      headers.set("origin", new URL(baseUrl).origin)
    } catch {
      // keep the original origin if the base URL is malformed
    }
  }

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()
  const method = request.method as keyof typeof neonHandlers
  return neonHandlers[method](new Request(request.url, { method: request.method, headers, body }), context)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle

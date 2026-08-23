import { NextResponse } from "next/server"

import { auth } from "@/lib/auth/server"

const neonHandlers = auth.handler()

/**
 * Wraps the Neon Auth proxy handler with a same-origin CSRF guard.
 *
 * For legitimate same-origin requests we strip Origin/Referer before
 * forwarding, so Neon's managed Better Auth treats the call as
 * server-to-server and skips its own domain matching (which rejects
 * valid deployments even when their domains are configured).
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
  headers.delete("origin")
  headers.delete("referer")

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()
  const method = request.method as keyof typeof neonHandlers
  return neonHandlers[method](new Request(request.url, { method: request.method, headers, body }), context)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
export const PATCH = handle

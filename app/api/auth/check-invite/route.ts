import { isEmailAuthorized } from "@/lib/auth/current-user"

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ authorized: false })
  }
  try {
    const authorized = await isEmailAuthorized(email)
    return Response.json({ authorized })
  } catch {
    return Response.json({ authorized: false, unavailable: true })
  }
}

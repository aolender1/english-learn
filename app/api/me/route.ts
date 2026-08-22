import { getSessionUser } from "@/lib/api-auth"

export async function GET() {
  const user = await getSessionUser()
  return Response.json({ user })
}

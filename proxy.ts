import { auth } from "@/lib/auth/server"

export default auth.middleware({
  loginUrl: "/auth/sign-in",
})

// Only the teacher panel requires an authenticated session at the edge.
// The rest of the app stays publicly browsable; API routes enforce auth
// individually via getCurrentUser().
export const config = {
  matcher: ["/teacher", "/teacher/:path*"],
}

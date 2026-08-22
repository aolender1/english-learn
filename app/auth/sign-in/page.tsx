import type { Metadata } from "next"
import { BookOpen } from "lucide-react"

import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = {
  title: "Sign in — Wordshift",
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <a href="/" className="flex items-center gap-3" aria-label="Go to home">
        <span className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
          <BookOpen aria-hidden="true" />
        </span>
        <span className="text-xl font-semibold tracking-tight">Wordshift</span>
      </a>
      <AuthForm mode="sign-in" />
    </main>
  )
}

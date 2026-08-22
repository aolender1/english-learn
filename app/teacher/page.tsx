import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"

import { TeacherDashboard } from "@/components/teacher-dashboard"
import { getCurrentUser } from "@/lib/auth/current-user"

export const metadata: Metadata = {
  title: "Teacher panel — Wordshift",
}

export default async function TeacherPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }
  if (!user || user.role !== "teacher") redirect("/auth/sign-in")

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <a href="/" className="flex items-center gap-2" aria-label="Back to home">
            <span className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
              <BookOpen size={16} aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">Wordshift</span>
          </a>
          <a href="/" className="button-back">
            <ArrowLeft aria-hidden="true" />
            Back to app
          </a>
        </div>
      </header>
      <TeacherDashboard teacherEmail={user.email} />
    </main>
  )
}

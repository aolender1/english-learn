"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BookOpen } from "lucide-react"

function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const urlError = searchParams.get("error")

  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(
    urlError ? "The password reset link is invalid or has expired." : null,
  )
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError("Missing reset token. Request a new password reset link from Sign in.")
      return
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setBusy(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, token }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        setError(data.message ?? "Could not reset your password. Request a new link.")
        return
      }
      setDone(true)
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-sm flex-col gap-5 border border-border bg-card p-7 shadow-sm md:p-9"
    >
      <div className="flex flex-col gap-2 text-center">
        <p className="eyebrow">Account recovery</p>
        <h1 className="font-serif text-3xl leading-none">Set a new password</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Choose a strong password of at least 8 characters.
        </p>
      </div>

      {done ? (
        <div className="flex flex-col gap-4">
          <p className="border-l-2 border-primary bg-secondary p-3 text-sm leading-relaxed">
            Your password was updated successfully. You can now sign in.
          </p>
          <a href="/auth/sign-in" className="button-primary w-full">
            Go to Sign in
          </a>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input-field"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Confirm new password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              className="input-field"
            />
          </label>

          {error && (
            <p role="alert" className="border-l-2 border-destructive bg-secondary p-3 text-sm leading-relaxed">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !token} className="button-primary w-full">
            {busy ? "Updating…" : "Update password"}
          </button>

          <a href="/auth/sign-in" className="text-center text-sm link">
            Back to Sign in
          </a>
        </>
      )}
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <a href="/" className="flex items-center gap-3" aria-label="Go to home">
        <span className="flex size-10 items-center justify-center bg-primary text-primary-foreground">
          <BookOpen aria-hidden="true" />
        </span>
        <span className="text-xl font-semibold tracking-tight">Wordshift</span>
      </a>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ResetPasswordInner />
      </Suspense>
    </main>
  )
}

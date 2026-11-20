"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth/client"

type Mode = "sign-in" | "sign-up"

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [forgotMode, setForgotMode] = useState(false)
  const [busy, setBusy] = useState(false)

  const isSignUp = mode === "sign-up"

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (forgotMode) {
      const cleanedEmail = email.trim().toLowerCase()
      if (!cleanedEmail) {
        setError("Enter your email address.")
        return
      }
      setBusy(true)
      try {
        const redirectTo = `${window.location.origin}/auth/reset-password`
        const res = await fetch("/api/auth/request-password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanedEmail, redirectTo }),
        })
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        if (!res.ok) {
          setError(data.message ?? "Could not send password reset email.")
          return
        }
        setNotice(
          "If that email is registered, we sent a password reset link. Check your inbox and spam folder.",
        )
      } catch {
        setError("Could not send password reset email. Try again.")
      } finally {
        setBusy(false)
      }
      return
    }

    if (isSignUp && password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setBusy(true)
    try {
      if (isSignUp) {
        const check = await fetch(`/api/auth/check-invite?email=${encodeURIComponent(email.trim())}`)
          .then((response) => response.json())
          .catch(() => ({ authorized: false }))
        if (check.authorized === false) {
          setError("This email has not been invited by a teacher. Ask your teacher to invite you first.")
          return
        }
        const name = email.split("@")[0]?.replace(/[._-]+/g, " ") || email
        const result = await authClient.signUp.email({
          email: email.trim().toLowerCase(),
          password,
          name,
        })
        if (result.error) {
          setError(result.error.message ?? "Could not create the account.")
          return
        }
      } else {
        const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
        if (result.error) {
          setError(result.error.message ?? "Invalid email or password.")
          return
        }
      }
      window.location.assign("/")
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    setError(null)
    setBusy(true)
    try {
      const callbackURL = typeof window !== "undefined" ? `${window.location.origin}/` : "/"
      await authClient.signIn.social({ provider: "google", callbackURL })
    } catch {
      setError("Google sign-in is not available right now.")
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5 border border-border bg-card p-7 shadow-sm md:p-9">
      <div className="flex flex-col gap-2 text-center">
        <p className="eyebrow">
          {forgotMode ? "Password recovery" : isSignUp ? "Student sign up" : "Welcome back"}
        </p>
        <h1 className="font-serif text-3xl leading-none">
          {forgotMode
            ? "Reset your password"
            : isSignUp
            ? "Create your account"
            : "Sign in to Wordshift"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {forgotMode
            ? "Enter your email and we will send you a link to set a new password."
            : isSignUp
            ? "Only emails invited by a teacher can create an account."
            : "Sign in to keep your progress in sync across devices."}
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="input-field"
        />
      </label>

      {!forgotMode && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{isSignUp ? "Create a password" : "Password"}</span>
            {!isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true)
                  setError(null)
                  setNotice(null)
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isSignUp ? "At least 8 characters" : "Your password"}
            className="input-field"
          />
        </div>
      )}

      {!forgotMode && isSignUp && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Confirm password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repeat your password"
            className="input-field"
          />
        </label>
      )}

      {notice && (
        <p role="status" className="border-l-2 border-primary bg-secondary p-3 text-sm leading-relaxed">
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" className="border-l-2 border-destructive bg-secondary p-3 text-sm leading-relaxed">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="button-primary w-full">
        {busy
          ? "Please wait…"
          : forgotMode
          ? "Send reset link"
          : isSignUp
          ? "Create account"
          : "Sign in"}
      </button>

      {forgotMode ? (
        <button
          type="button"
          onClick={() => {
            setForgotMode(false)
            setError(null)
            setNotice(null)
          }}
          className="button-ghost text-sm"
        >
          Back to sign in
        </button>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
          </div>

          <button type="button" onClick={signInWithGoogle} disabled={busy} className="button-secondary w-full">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <a href="/auth/sign-in" className="link">Sign in</a>
              </>
            ) : (
              <>
                Invited by a teacher?{" "}
                <a href="/auth/sign-up" className="link">Create your account</a>
              </>
            )}
          </p>
        </>
      )}
    </form>
  )
}

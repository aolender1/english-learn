"use client"

import { useCallback, useEffect, useState } from "react"
import { Mail, Send, UserRound, X } from "lucide-react"

type Invitation = {
  id: string
  email: string
  status: string
  createdAt: string
  acceptedAt: string | null
}

type Student = {
  userId: string
  email: string
  name: string | null
  joined: string
  sessions: number
  totalAnswers: number
  correctAnswers: number
  lastActivity: string | null
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

function statusTag(status: string) {
  if (status === "pending") return <span className="tag">Pending</span>
  if (status === "accepted") return <span className="tag" style={{ color: "var(--primary)", borderColor: "var(--primary)" }}>Accepted</span>
  return <span className="tag" style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}>Revoked</span>
}

export function TeacherDashboard({ teacherEmail }: { teacherEmail: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/teacher/students")
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations ?? [])
        setStudents(data.students ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function invite(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      const response = await fetch("/api/teacher/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage({ text: data.error ?? "Could not send the invitation.", error: true })
        return
      }
      setMessage({
        text: data.reinvited
          ? `${email} was invited again. Share the sign-up link with them.`
          : `${email} is now on the list. Share the sign-up link with them.`,
      })
      setEmail("")
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(invitationId: string) {
    setBusy(true)
    try {
      const response = await fetch("/api/teacher/revoke", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invitationId }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setMessage({ text: data.error ?? "Could not revoke.", error: true })
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-12 md:px-8 md:py-16">
      <section className="flex max-w-2xl flex-col gap-3">
        <p className="eyebrow">Teacher panel</p>
        <h1 className="font-serif text-4xl leading-none tracking-tight md:text-5xl">Your students</h1>
        <p className="leading-relaxed text-muted-foreground">
          Signed in as <strong>{teacherEmail}</strong>. Invite a student&apos;s email below — they will be able to create an account with that email and start practising.
        </p>
      </section>

      <section aria-labelledby="invite-title" className="flex flex-col gap-4">
        <h2 id="invite-title" className="text-xl font-semibold tracking-tight">Invite a student</h2>
        <form onSubmit={invite} className="flex flex-wrap items-start gap-3">
          <label className="flex min-w-64 flex-1 flex-col gap-1.5">
            <span className="sr-only">Student email</span>
            <div className="relative">
              <Mail size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@email.com"
                className="input-field pl-9"
              />
            </div>
          </label>
          <button type="submit" disabled={busy || !email} className="button-primary">
            <Send size={15} aria-hidden="true" />
            Add to list
          </button>
        </form>
        {message && (
          <p role="status" className={`max-w-xl border-l-2 p-3 text-sm leading-relaxed ${message.error ? "border-destructive bg-secondary" : "border-primary bg-secondary"}`}>
            {message.text}
          </p>
        )}
      </section>

      <section aria-labelledby="invitations-title" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="invitations-title" className="text-xl font-semibold tracking-tight">Invitations</h2>
          <span className="font-mono text-sm text-muted-foreground">{invitations.length}</span>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : invitations.length === 0 ? (
          <p className="border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
            No invitations yet. Invite your first student above.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border border-border bg-card">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{invitation.email}</span>
                  <span className="text-xs text-muted-foreground">
                    Sent {formatDate(invitation.createdAt)}
                    {invitation.acceptedAt ? ` · accepted ${formatDate(invitation.acceptedAt)}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {statusTag(invitation.status)}
                  {invitation.status === "pending" && (
                    <button type="button" onClick={() => revoke(invitation.id)} disabled={busy} className="icon-button size-9" aria-label={`Revoke invitation for ${invitation.email}`}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="students-title" className="flex flex-col gap-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 id="students-title" className="text-xl font-semibold tracking-tight">Enrolled students</h2>
          <span className="font-mono text-sm text-muted-foreground">{students.length}</span>
        </div>
        {!loading && students.length === 0 ? (
          <p className="border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
            No students have signed up yet.
          </p>
        ) : students.length > 0 && (
          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th scope="col" className="px-5 py-3 font-medium">Student</th>
                  <th scope="col" className="px-5 py-3 font-medium">Sessions</th>
                  <th scope="col" className="px-5 py-3 font-medium">Accuracy</th>
                  <th scope="col" className="px-5 py-3 font-medium">Joined</th>
                  <th scope="col" className="px-5 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => {
                  const accuracy = student.totalAnswers > 0 ? Math.round((student.correctAnswers / student.totalAnswers) * 100) : null
                  return (
                    <tr key={student.userId}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-secondary">
                            <UserRound size={14} aria-hidden="true" />
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{student.name || student.email.split("@")[0]}</span>
                            <span className="truncate text-xs text-muted-foreground">{student.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono">{student.sessions}</td>
                      <td className="px-5 py-4 font-mono">{accuracy === null ? "—" : `${accuracy}%`}<span className="ml-2 text-xs text-muted-foreground">{student.correctAnswers}/{student.totalAnswers}</span></td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDate(student.joined)}</td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDate(student.lastActivity)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

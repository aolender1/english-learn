"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Filter,
  ImageIcon,
  Layers,
  Lightbulb,
  ListOrdered,
  Mail,
  MoveRight,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  Volume2,
  X,
} from "lucide-react"
import { cefrLevels, levelLabel, type CefrLevel } from "@/lib/question-bank"
import { AudioWordBadge } from "@/components/audio-word-badge"
import { getDefaultTopicTheoryData, type TopicTheoryData } from "@/lib/topics"

type Tab = "tracking" | "topics" | "exercises" | "invitations"

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

type StudentDetail = {
  student: Student
  totalSessions: number
  totalAnswers: number
  correctAnswers: number
  accuracy: number
  rounds: Array<{
    id: string
    level: string
    topicSlug: string
    topicTitle: string
    status: string
    score: number | null
    total: number
    startedAt: string
    completedAt: string | null
  }>
  mistakes: Array<{
    id: string
    roundId: string
    prompt: string
    word?: string
    explanation?: string
    topicSlug?: string
    topicTitle?: string
    level?: string
    selectedAnswer: string
    correctAnswer: string
    answeredAt: string
    responseTimeMs?: number
  }>
  topicStats: Array<{
    topicSlug: string
    topicTitle: string
    level: string
    total: number
    correct: number
    accuracy: number
  }>
}

type TopicItem = {
  id: string
  slug: string
  level: CefrLevel
  title: string
  description: string | null
  focus: string | null
  theory?: TopicTheoryData | null
  enabled: boolean
  sortOrder: number
  exerciseCount: number
}

type ExerciseItem = {
  id: string
  topicSlug: string
  level: string
  prompt: string
  options: string[]
  correctAnswerIndex: number
  explanation: string
  word: string | null
  phonetic: string | null
  spanishTranslation: string | null
  difficulty: string
  createdBy: string
  createdAt: string
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

function formatTime(value: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

function statusTag(status: string) {
  if (status === "pending") return <span className="tag">Pending</span>
  if (status === "accepted")
    return (
      <span className="tag" style={{ color: "var(--primary)", borderColor: "var(--primary)" }}>
        Accepted
      </span>
    )
  return (
    <span className="tag" style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}>
      Revoked
    </span>
  )
}

export function TeacherDashboard({ teacherEmail }: { teacherEmail: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("tracking")

  // Tracking tab state
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false)
  
  // Topics tab state
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [topicLevelFilter, setTopicLevelFilter] = useState<CefrLevel | "all">("all")
  const [topicSearch, setTopicSearch] = useState("")
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null)
  const [creatingTopic, setCreatingTopic] = useState(false)
  const [movingTopic, setMovingTopic] = useState<TopicItem | null>(null)
  const [moveTargetLevel, setMoveTargetLevel] = useState<CefrLevel>("a1-movers")
  const [topicFormTab, setTopicFormTab] = useState<"general" | "theory">("general")
  const [topicForm, setTopicForm] = useState({
    title: "",
    slug: "",
    level: "pre-a1-starters" as CefrLevel,
    description: "",
    focus: "",
    concept: "",
    imageUrl: "",
    imageCaption: "",
    formula: [] as Array<{ label: string; text: string }>,
    examples: [] as Array<{ en: string; es: string; tip?: string }>,
    tips: [] as string[],
    keyWords: "",
  })

  // Theory Form Helpers
  function addTopicFormula() {
    setTopicForm((prev) => ({
      ...prev,
      formula: [...prev.formula, { label: "RULE", text: "" }],
    }))
  }
  function updateTopicFormula(index: number, field: "label" | "text", val: string) {
    setTopicForm((prev) => {
      const updated = [...prev.formula]
      updated[index] = { ...updated[index], [field]: val }
      return { ...prev, formula: updated }
    })
  }
  function removeTopicFormula(index: number) {
    setTopicForm((prev) => ({
      ...prev,
      formula: prev.formula.filter((_, i) => i !== index),
    }))
  }

  function addTopicExample() {
    setTopicForm((prev) => ({
      ...prev,
      examples: [...prev.examples, { en: "", es: "", tip: "" }],
    }))
  }
  function updateTopicExample(index: number, field: "en" | "es" | "tip", val: string) {
    setTopicForm((prev) => {
      const updated = [...prev.examples]
      updated[index] = { ...updated[index], [field]: val }
      return { ...prev, examples: updated }
    })
  }
  function removeTopicExample(index: number) {
    setTopicForm((prev) => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index),
    }))
  }

  function addTopicTip() {
    setTopicForm((prev) => ({
      ...prev,
      tips: [...prev.tips, ""],
    }))
  }
  function updateTopicTip(index: number, val: string) {
    setTopicForm((prev) => {
      const updated = [...prev.tips]
      updated[index] = val
      return { ...prev, tips: updated }
    })
  }
  function removeTopicTip(index: number) {
    setTopicForm((prev) => ({
      ...prev,
      tips: prev.tips.filter((_, i) => i !== index),
    }))
  }

  function openCreateTopic() {
    const defaultLvl: CefrLevel = "pre-a1-starters"
    setEditingTopic(null)
    setTopicFormTab("general")
    setTopicForm({
      title: "",
      slug: "",
      level: defaultLvl,
      description: "",
      focus: "",
      concept: "",
      imageUrl: "",
      imageCaption: "",
      formula: [{ label: "AFIRMATIVO / AFFIRMATIVE", text: "" }],
      examples: [{ en: "", es: "", tip: "" }],
      tips: [""],
      keyWords: "",
    })
    setCreatingTopic(true)
  }

  function openEditTopic(t: TopicItem) {
    const topicDef: import("@/lib/topics").TopicDef = {
      slug: t.slug,
      level: t.level,
      title: t.title,
      description: t.description ?? "",
      focus: t.focus ?? "",
      theory: t.theory,
      enabled: t.enabled,
    }
    const currentTheory = t.theory || getDefaultTopicTheoryData(topicDef, t.level)
    setEditingTopic(t)
    setTopicFormTab("general")
    setTopicForm({
      title: t.title,
      slug: t.slug,
      level: t.level,
      description: t.description ?? "",
      focus: t.focus ?? "",
      concept: currentTheory.concept || "",
      imageUrl: currentTheory.imageUrl || "",
      imageCaption: currentTheory.imageCaption || "",
      formula: currentTheory.formula ? [...currentTheory.formula] : [{ label: "AFIRMATIVO", text: "" }],
      examples: currentTheory.examples ? [...currentTheory.examples] : [{ en: "", es: "", tip: "" }],
      tips: currentTheory.tips ? [...currentTheory.tips] : [""],
      keyWords: (currentTheory.keyWords || []).join(", "),
    })
  }

  // Exercises tab state
  const [exerciseLevel, setExerciseLevel] = useState<CefrLevel>("pre-a1-starters")
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string>("")
  const [exercisesList, setExercisesList] = useState<ExerciseItem[]>([])
  const [loadingExercises, setLoadingExercises] = useState(false)
  const [creatingExercise, setCreatingExercise] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseItem | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiCount, setAiCount] = useState(5)
  const [exerciseForm, setExerciseForm] = useState({
    prompt: "",
    option0: "",
    option1: "",
    option2: "",
    option3: "",
    correctAnswerIndex: 0,
    explanation: "",
    word: "",
    difficulty: "medium",
  })

  // Invitations tab state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState("")

  // Common UI state
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  // Fetch initial data
  const refreshStudentsAndInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/students")
      if (res.ok) {
        const data = await res.json()
        setInvitations(data.invitations ?? [])
        setStudents(data.students ?? [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const refreshTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/topics")
      if (res.ok) {
        const data = await res.json()
        setTopics(data.topics ?? [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([refreshStudentsAndInvites(), refreshTopics()])
      setLoading(false)
    }
    void init()
  }, [refreshStudentsAndInvites, refreshTopics])

  // Fetch exercises when topic changes
  const fetchExercisesForTopic = useCallback(async (slug: string, lvl: CefrLevel) => {
    if (!slug) return
    setLoadingExercises(true)
    try {
      const res = await fetch(`/api/teacher/exercises?topicSlug=${slug}&level=${lvl}`)
      if (res.ok) {
        const data = await res.json()
        setExercisesList(data.exercises ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingExercises(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTopicSlug) {
      void fetchExercisesForTopic(selectedTopicSlug, exerciseLevel)
    } else {
      setExercisesList([])
    }
  }, [selectedTopicSlug, exerciseLevel, fetchExercisesForTopic])

  // Student details fetcher
  async function inspectStudent(studentId: string) {
    setSelectedStudentId(studentId)
    setLoadingStudentDetail(true)
    try {
      const res = await fetch(`/api/teacher/students/${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setStudentDetail(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStudentDetail(false)
    }
  }

  // Invitation actions
  async function invite(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)
    setBusy(true)
    try {
      const response = await fetch("/api/teacher/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage({ text: data.error ?? "Could not send the invitation.", error: true })
        return
      }
      setMessage({
        text: data.reinvited
          ? `${inviteEmail} was invited again. Share the sign-up link.`
          : `${inviteEmail} was invited successfully.`,
      })
      setInviteEmail("")
      await refreshStudentsAndInvites()
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
      if (response.ok) await refreshStudentsAndInvites()
    } finally {
      setBusy(false)
    }
  }

  // Topic actions
  async function saveTopic(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)

    const cleanedKeywords = topicForm.keyWords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0)

    const theoryPayload: TopicTheoryData = {
      concept: topicForm.concept.trim(),
      imageUrl: topicForm.imageUrl.trim() || undefined,
      imageCaption: topicForm.imageCaption.trim() || undefined,
      formula: topicForm.formula.filter((f) => f.label.trim() && f.text.trim()),
      examples: topicForm.examples.filter((e) => e.en.trim()),
      tips: topicForm.tips.filter((t) => t.trim()),
      keyWords: cleanedKeywords,
    }

    try {
      if (editingTopic) {
        const res = await fetch("/api/teacher/topics", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: editingTopic.id,
            slug: editingTopic.slug,
            level: editingTopic.level,
            title: topicForm.title.trim(),
            description: topicForm.description.trim(),
            focus: topicForm.focus.trim(),
            newLevel: topicForm.level !== editingTopic.level ? topicForm.level : undefined,
            theory: theoryPayload,
          }),
        })
        if (!res.ok) throw new Error("Failed to update topic")
        setMessage({ text: "Tema y su teoría actualizados exitosamente." })
      } else {
        const res = await fetch("/api/teacher/topics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: topicForm.title.trim(),
            slug: topicForm.slug.trim(),
            level: topicForm.level,
            description: topicForm.description.trim(),
            focus: topicForm.focus.trim(),
            theory: theoryPayload,
          }),
        })
        if (!res.ok) throw new Error("Failed to create topic")
        setMessage({ text: "Nuevo tema creado exitosamente con su teoría." })
      }
      setEditingTopic(null)
      setCreatingTopic(false)
      await refreshTopics()
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Error al guardar el tema", error: true })
    } finally {
      setBusy(false)
    }
  }

  async function deleteTopic(id: string) {
    if (!confirm("Are you sure you want to delete this topic and all its exercises?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/teacher/topics?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setMessage({ text: "Topic deleted." })
        await refreshTopics()
      }
    } finally {
      setBusy(false)
    }
  }

  async function submitMoveTopic() {
    if (!movingTopic) return
    setBusy(true)
    try {
      const res = await fetch("/api/teacher/topics", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: movingTopic.id, newLevel: moveTargetLevel }),
      })
      if (res.ok) {
        setMessage({ text: `Topic moved to ${levelLabel(moveTargetLevel)}.` })
        setMovingTopic(null)
        await refreshTopics()
      }
    } finally {
      setBusy(false)
    }
  }

  // Exercise actions
  async function saveExercise(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const options = [exerciseForm.option0, exerciseForm.option1, exerciseForm.option2, exerciseForm.option3].filter(
      (o) => o.trim().length > 0
    )
    if (options.length < 2) {
      setMessage({ text: "Please provide at least 2 options.", error: true })
      setBusy(false)
      return
    }

    try {
      if (editingExercise) {
        const res = await fetch("/api/teacher/exercises", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: editingExercise.id,
            prompt: exerciseForm.prompt,
            options,
            correctAnswerIndex: Math.min(exerciseForm.correctAnswerIndex, options.length - 1),
            explanation: exerciseForm.explanation,
            word: exerciseForm.word,
            difficulty: exerciseForm.difficulty,
          }),
        })
        if (!res.ok) throw new Error("Failed to update exercise")
        setMessage({ text: "Exercise updated." })
      } else {
        const res = await fetch("/api/teacher/exercises", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            topicSlug: selectedTopicSlug,
            level: exerciseLevel,
            prompt: exerciseForm.prompt,
            options,
            correctAnswerIndex: Math.min(exerciseForm.correctAnswerIndex, options.length - 1),
            explanation: exerciseForm.explanation,
            word: exerciseForm.word,
            difficulty: exerciseForm.difficulty,
          }),
        })
        if (!res.ok) throw new Error("Failed to create exercise")
        setMessage({ text: "Exercise added to bank." })
      }
      setCreatingExercise(false)
      setEditingExercise(null)
      await fetchExercisesForTopic(selectedTopicSlug, exerciseLevel)
      await refreshTopics()
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Error saving exercise", error: true })
    } finally {
      setBusy(false)
    }
  }

  async function deleteExercise(id: string) {
    if (!confirm("Are you sure you want to delete this exercise?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/teacher/exercises?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setMessage({ text: "Exercise removed from bank." })
        await fetchExercisesForTopic(selectedTopicSlug, exerciseLevel)
        await refreshTopics()
      }
    } finally {
      setBusy(false)
    }
  }

  async function generateWithAi() {
    if (!selectedTopicSlug) return
    setGeneratingAi(true)
    setMessage(null)
    try {
      const res = await fetch("/api/teacher/exercises/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topicSlug: selectedTopicSlug,
          level: exerciseLevel,
          count: aiCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "AI Generation failed")
      setMessage({ text: `✓ Successfully generated and added ${data.count} exercises with Gemini AI!` })
      await fetchExercisesForTopic(selectedTopicSlug, exerciseLevel)
      await refreshTopics()
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "AI generation failed", error: true })
    } finally {
      setGeneratingAi(false)
    }
  }

  const filteredTopicsList = topics.filter((t) => {
    const matchesLevel = topicLevelFilter === "all" || t.level === topicLevelFilter
    const matchesSearch =
      t.title.toLowerCase().includes(topicSearch.toLowerCase()) ||
      t.slug.toLowerCase().includes(topicSearch.toLowerCase())
    return matchesLevel && matchesSearch
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 md:px-8 md:py-14">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="tag font-mono uppercase tracking-wider text-xs">Teacher Dashboard</span>
            <span className="text-xs text-muted-foreground">{teacherEmail}</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl mt-1 tracking-tight">Course & Student Management</h1>
        </div>

        {/* Tab switcher */}
        <nav className="flex flex-wrap items-center gap-1 bg-secondary/80 p-1 border border-border rounded">
          <button
            onClick={() => setActiveTab("tracking")}
            className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "tracking" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users size={14} /> Student Tracking
          </button>
          <button
            onClick={() => setActiveTab("topics")}
            className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "topics" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers size={14} /> Topics ({topics.length})
          </button>
          <button
            onClick={() => setActiveTab("exercises")}
            className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "exercises" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen size={14} /> Exercise Bank
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              activeTab === "invitations" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail size={14} /> Invitations
          </button>
        </nav>
      </section>

      {/* Global alert message */}
      {message && (
        <div
          role="status"
          className={`flex items-center justify-between p-3.5 border text-sm ${
            message.error ? "border-destructive bg-destructive/10 text-destructive" : "border-primary bg-primary/10 text-primary"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: STUDENT TRACKING & MONITORING */}
      {/* ========================================================================= */}
      {activeTab === "tracking" && (
        <div className="flex flex-col gap-6">
          {selectedStudentId && studentDetail ? (
            /* Student Inspection View */
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedStudentId(null)
                    setStudentDetail(null)
                  }}
                  className="button-back"
                >
                  <ArrowLeft size={16} /> Back to all students
                </button>
                <span className="tag font-mono text-xs">Joined {formatDate(studentDetail.student.joined)}</span>
              </div>

              <div className="border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-serif font-semibold">{studentDetail.student.name || studentDetail.student.email}</h2>
                  <p className="text-sm text-muted-foreground">{studentDetail.student.email}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Sessions</span>
                    <p className="font-mono text-2xl font-bold">{studentDetail.totalSessions}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Accuracy</span>
                    <p className="font-mono text-2xl font-bold">{studentDetail.accuracy}%</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Mistakes</span>
                    <p className="font-mono text-2xl font-bold text-destructive">{studentDetail.mistakes.length}</p>
                  </div>
                </div>
              </div>

              {/* Performance by Topic */}
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold tracking-tight">Performance by Topic</h3>
                {studentDetail.topicStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground border border-dashed border-border p-4">
                    No topic attempts recorded yet.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {studentDetail.topicStats.map((stat) => (
                      <div key={`${stat.topicSlug}-${stat.level}`} className="border border-border bg-card p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="tag text-[10px] font-mono">{stat.level}</span>
                          <span className={`font-mono text-sm font-bold ${stat.accuracy >= 70 ? "text-primary" : "text-destructive"}`}>
                            {stat.accuracy}%
                          </span>
                        </div>
                        <h4 className="font-medium text-sm truncate">{stat.topicTitle}</h4>
                        <div className="h-1.5 bg-secondary overflow-hidden">
                          <div
                            className={`h-full ${stat.accuracy >= 70 ? "bg-primary" : "bg-destructive"}`}
                            style={{ width: `${stat.accuracy}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono text-right">
                          {stat.correct}/{stat.total} answers
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mistake analysis breakdown */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">
                    Where the student struggles ({studentDetail.mistakes.length} mistakes)
                  </h3>
                </div>
                {studentDetail.mistakes.length === 0 ? (
                  <div className="border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
                    ✓ Great job! No recorded mistakes for this student.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border border border-border bg-card">
                    {studentDetail.mistakes.map((m, i) => (
                      <div key={m.id || i} className="p-5 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="tag font-mono text-[10px]">{m.topicTitle}</span>
                          <span className="text-muted-foreground">{formatDate(m.answeredAt)} {formatTime(m.answeredAt)}</span>
                        </div>
                        <p className="font-serif text-base font-medium">{m.prompt}</p>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded">
                            <span className="font-semibold text-destructive">Student answered:</span>
                            <p className="mt-0.5 text-foreground">{m.selectedAnswer}</p>
                          </div>
                          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded">
                            <span className="font-semibold text-primary">Correct answer:</span>
                            <p className="mt-0.5 text-foreground">{m.correctAnswer}</p>
                          </div>
                        </div>
                        {m.explanation && (
                          <p className="text-xs text-muted-foreground bg-secondary/50 p-2.5 rounded border border-border/50">
                            <strong>Note:</strong> {m.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Practice Session History */}
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold tracking-tight">Recent Sessions History</h3>
                <div className="overflow-x-auto border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        <th className="px-5 py-3">Topic</th>
                        <th className="px-5 py-3">Level</th>
                        <th className="px-5 py-3">Score</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentDetail.rounds.map((r) => (
                        <tr key={r.id}>
                          <td className="px-5 py-3 font-medium">{r.topicTitle}</td>
                          <td className="px-5 py-3 font-mono text-xs">{r.level}</td>
                          <td className="px-5 py-3 font-mono">
                            {r.score !== null ? `${r.score}/${r.total}` : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`tag text-xs ${r.status === "completed" ? "text-primary" : "text-muted-foreground"}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(r.startedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Student List View */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Enrolled Students</h2>
                  <p className="text-sm text-muted-foreground">Click any student to view detailed sessions and mistake breakdowns.</p>
                </div>
                <span className="font-mono text-sm text-muted-foreground">{students.length} students</span>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading students…</p>
              ) : students.length === 0 ? (
                <div className="border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
                  <p>No students enrolled yet. Send an invitation to your students in the Invitations tab.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        <th className="px-5 py-3 font-medium">Student</th>
                        <th className="px-5 py-3 font-medium">Sessions</th>
                        <th className="px-5 py-3 font-medium">Accuracy</th>
                        <th className="px-5 py-3 font-medium">Last Activity</th>
                        <th className="px-5 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {students.map((student) => {
                        const acc = student.totalAnswers > 0 ? Math.round((student.correctAnswers / student.totalAnswers) * 100) : null
                        return (
                          <tr key={student.userId} className="hover:bg-secondary/40 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-secondary font-bold">
                                  <UserRound size={16} />
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{student.name || student.email.split("@")[0]}</span>
                                  <span className="text-xs text-muted-foreground">{student.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-mono">{student.sessions}</td>
                            <td className="px-5 py-4 font-mono">
                              {acc === null ? "—" : `${acc}%`}
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({student.correctAnswers}/{student.totalAnswers})
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(student.lastActivity)}</td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => inspectStudent(student.userId)}
                                className="button-secondary text-xs py-1 px-3"
                              >
                                View Details <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TOPICS & LEVELS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "topics" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Topic Catalog ({topics.length})</h2>
              <p className="text-sm text-muted-foreground">Create, edit, delete, or move topics between CEFR levels.</p>
            </div>
            <button
              onClick={openCreateTopic}
              className="button-primary py-1.5 text-xs self-start flex items-center gap-1"
            >
              <Plus size={14} /> Create Topic
            </button>
          </div>

          {/* Level Filter and Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-mono text-muted-foreground mr-1">Level:</span>
              <button
                onClick={() => setTopicLevelFilter("all")}
                className={`px-2.5 py-1 text-xs font-medium rounded ${
                  topicLevelFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                All
              </button>
              {cefrLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setTopicLevelFilter(lvl.id)}
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    topicLevelFilter === lvl.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {lvl.code}
                </button>
              ))}
            </div>

            <div className="relative min-w-56">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                placeholder="Search topics..."
                className="input-field pl-8 py-1 text-xs w-full"
              />
            </div>
          </div>

          {/* Topic Create / Edit Modal (Full Theory & Overview Editor) */}
          {(creatingTopic || editingTopic) && (
            <div className="modal-backdrop" role="presentation">
              <div className="modal-panel max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-border p-5 bg-card">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {editingTopic ? `Editar Tema: ${editingTopic.title}` : "Crear Nuevo Tema"}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setCreatingTopic(false)
                      setEditingTopic(null)
                    }}
                    className="icon-button"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs for General vs Theory */}
                <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-5 pt-3">
                  <button
                    type="button"
                    onClick={() => setTopicFormTab("general")}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      topicFormTab === "general"
                        ? "border-primary text-primary font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    1. Información General
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopicFormTab("theory")}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                      topicFormTab === "theory"
                        ? "border-primary text-primary font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles size={13} /> 2. Topic Overview & Theory (Estructura, Imagen, Ejemplos)
                  </button>
                </div>

                <form onSubmit={saveTopic} className="flex flex-col flex-1 overflow-y-auto p-6 gap-5">
                  {topicFormTab === "general" ? (
                    <div className="flex flex-col gap-4 animate-in fade-in">
                      <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
                        Título del Tema (Topic Title)
                        <input
                          type="text"
                          required
                          value={topicForm.title}
                          onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                          placeholder="e.g. Present simple forms of 'to be': am/is/are"
                          className="input-field text-sm"
                        />
                      </label>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
                          Nivel CEFR (CEFR Level)
                          <select
                            value={topicForm.level}
                            onChange={(e) => setTopicForm({ ...topicForm, level: e.target.value as CefrLevel })}
                            className="input-field text-sm"
                          >
                            {cefrLevels.map((lvl) => (
                              <option key={lvl.id} value={lvl.id}>
                                {lvl.code} {lvl.exam} ({lvl.band})
                              </option>
                            ))}
                          </select>
                        </label>

                        {!editingTopic && (
                          <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
                            Slug identificador (URL)
                            <input
                              type="text"
                              value={topicForm.slug}
                              onChange={(e) => setTopicForm({ ...topicForm, slug: e.target.value })}
                              placeholder="present-simple-to-be"
                              className="input-field text-sm font-mono"
                            />
                          </label>
                        )}
                      </div>

                      <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
                        Descripción Resumida (Description)
                        <textarea
                          rows={2}
                          value={topicForm.description}
                          onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                          placeholder="Breve resumen del contenido para los estudiantes..."
                          className="input-field text-sm"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
                        Enfoque Gramatical (Grammar Focus & Context para IA)
                        <textarea
                          rows={3}
                          value={topicForm.focus}
                          onChange={(e) => setTopicForm({ ...topicForm, focus: e.target.value })}
                          placeholder="Instrucciones lingüísticas y patrones gramaticales que la IA y el generador usarán..."
                          className="input-field text-sm"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 animate-in fade-in">
                      {/* Subtitle / Concept */}
                      <div className="flex flex-col gap-1.5 border border-border p-4 rounded-lg bg-secondary/20">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          Subtítulo / Concepto Explicativo del Tema
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Para Young Learners (Starters, Movers, Flyers), incluye explicaciones en español fáciles de entender para niños.
                        </span>
                        <textarea
                          rows={3}
                          value={topicForm.concept}
                          onChange={(e) => setTopicForm({ ...topicForm, concept: e.target.value })}
                          className="input-field text-xs leading-relaxed"
                          placeholder="The verb 'to be' has three forms: am, is, are. 🇪🇸 En español: El verbo 'to be' significa 'ser' o 'estar'..."
                        />
                      </div>

                      {/* Key Grammar Formulas */}
                      <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Sparkles size={14} /> Key Grammar Structures (Reglas y Fórmulas)
                          </span>
                          <button
                            type="button"
                            onClick={addTopicFormula}
                            className="button-secondary py-1 px-2 text-xs flex items-center gap-1 font-semibold"
                          >
                            <Plus size={13} /> Añadir Regla
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          {topicForm.formula.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-card p-2 rounded border border-border">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => updateTopicFormula(idx, "label", e.target.value)}
                                className="input-field w-32 shrink-0 text-xs font-mono uppercase font-bold"
                                placeholder="AFIRMATIVO..."
                              />
                              <input
                                type="text"
                                value={item.text}
                                onChange={(e) => updateTopicFormula(idx, "text", e.target.value)}
                                className="input-field flex-1 text-xs"
                                placeholder="I + am | He/She/It + is | You/We/They + are"
                              />
                              <button
                                type="button"
                                onClick={() => removeTopicFormula(idx)}
                                className="p-1.5 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Optional Structure Diagram / Image */}
                      <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <ImageIcon size={14} /> Imagen o Diagrama Explicativo de la Estructura (Opcional)
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Se mostrará directamente debajo de Key Grammar Structures, antes de los Natural Examples.
                        </span>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-muted-foreground font-semibold">URL de la imagen</label>
                            <input
                              type="url"
                              value={topicForm.imageUrl}
                              onChange={(e) => setTopicForm({ ...topicForm, imageUrl: e.target.value })}
                              className="input-field text-xs"
                              placeholder="https://ejemplo.com/diagrama-estructura.png"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-muted-foreground font-semibold">Pie de foto / Descripción</label>
                            <input
                              type="text"
                              value={topicForm.imageCaption}
                              onChange={(e) => setTopicForm({ ...topicForm, imageCaption: e.target.value })}
                              className="input-field text-xs"
                              placeholder="Diagrama de uso de los tiempos verbales..."
                            />
                          </div>
                        </div>

                        {topicForm.imageUrl.trim() && (
                          <div className="mt-2 p-3 bg-card border border-border rounded flex flex-col items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Vista previa de la imagen:</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={topicForm.imageUrl.trim()}
                              alt={topicForm.imageCaption || "Structure Diagram Preview"}
                              className="max-h-44 rounded object-contain border border-border shadow-sm"
                              onError={(e) => {
                                ;(e.target as HTMLElement).style.display = "none"
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Natural Examples */}
                      <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Natural Examples (Ejemplos con Traducción y Tip)
                          </span>
                          <button
                            type="button"
                            onClick={addTopicExample}
                            className="button-secondary py-1 px-2 text-xs flex items-center gap-1 font-semibold"
                          >
                            <Plus size={13} /> Añadir Ejemplo
                          </button>
                        </div>

                        <div className="flex flex-col gap-3">
                          {topicForm.examples.map((ex, idx) => (
                            <div key={idx} className="flex flex-col gap-2 bg-card p-3 rounded border border-border">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-primary">Ejemplo #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeTopicExample(idx)}
                                  className="p-1 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  type="text"
                                  value={ex.en}
                                  onChange={(e) => updateTopicExample(idx, "en", e.target.value)}
                                  className="input-field text-xs font-serif font-medium"
                                  placeholder="Oración en inglés (e.g. I am a student.)..."
                                />
                                <input
                                  type="text"
                                  value={ex.es}
                                  onChange={(e) => updateTopicExample(idx, "es", e.target.value)}
                                  className="input-field text-xs italic"
                                  placeholder="Traducción al español (e.g. Yo soy estudiante.)..."
                                />
                              </div>
                              <input
                                type="text"
                                value={ex.tip || ""}
                                onChange={(e) => updateTopicExample(idx, "tip", e.target.value)}
                                className="input-field text-xs bg-secondary/40"
                                placeholder="Tip pedagógico (e.g. Usar 'am' solo con el pronombre 'I')..."
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips & Common Mistakes */}
                      <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                            <Lightbulb size={14} /> Tips & Errores Comunes a Evitar
                          </span>
                          <button
                            type="button"
                            onClick={addTopicTip}
                            className="button-secondary py-1 px-2 text-xs flex items-center gap-1 font-semibold"
                          >
                            <Plus size={13} /> Añadir Tip
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          {topicForm.tips.map((tip, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-card p-2 rounded border border-border">
                              <input
                                type="text"
                                value={tip}
                                onChange={(e) => updateTopicTip(idx, e.target.value)}
                                className="input-field flex-1 text-xs"
                                placeholder="Consejo pedagógico o error común a evitar..."
                              />
                              <button
                                type="button"
                                onClick={() => removeTopicTip(idx)}
                                className="p-1 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Topic Words & Phonetics */}
                      <div className="flex flex-col gap-1.5 border border-border p-4 rounded-lg bg-secondary/20">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Volume2 size={14} /> Palabras Clave del Tema (Audio y Fonética)
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Palabras separadas por comas. El sistema genera los botones interactivos con audio y fonética.
                        </span>
                        <input
                          type="text"
                          value={topicForm.keyWords}
                          onChange={(e) => setTopicForm({ ...topicForm, keyWords: e.target.value })}
                          className="input-field text-xs font-mono"
                          placeholder="am, is, are, student, teacher, school, happy"
                        />
                      </div>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                      {topicFormTab === "general" ? (
                        <button
                          type="button"
                          onClick={() => setTopicFormTab("theory")}
                          className="button-secondary text-xs flex items-center gap-1"
                        >
                          Siguiente: Editar Teoría <ChevronRight size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTopicFormTab("general")}
                          className="button-secondary text-xs flex items-center gap-1"
                        >
                          <ArrowLeft size={13} /> Volver a General
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingTopic(false)
                          setEditingTopic(null)
                        }}
                        className="button-secondary text-xs"
                      >
                        Cancelar
                      </button>
                      <button type="submit" disabled={busy} className="button-primary text-xs flex items-center gap-1">
                        {busy ? "Guardando..." : "Guardar Tema"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Move Level Modal */}
          {movingTopic && (
            <div className="modal-backdrop" role="presentation">
              <div className="modal-panel max-w-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Move Topic Level</h3>
                  <button onClick={() => setMovingTopic(null)} className="icon-button">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex flex-col gap-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Move <strong>&quot;{movingTopic.title}&quot;</strong> from <strong>{movingTopic.level}</strong> to another level. All its exercises will also be updated.
                  </p>
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    Destination Level
                    <select
                      value={moveTargetLevel}
                      onChange={(e) => setMoveTargetLevel(e.target.value as CefrLevel)}
                      className="input-field text-sm"
                    >
                      {cefrLevels.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.code} {lvl.exam}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setMovingTopic(null)} className="button-secondary text-xs">
                      Cancel
                    </button>
                    <button onClick={submitMoveTopic} disabled={busy} className="button-primary text-xs">
                      Confirm Move
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Topics Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopicsList.map((t) => (
              <div key={`${t.slug}-${t.level}`} className="border border-border bg-card p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="tag text-[10px] font-mono">{t.level}</span>
                    <span className="text-xs font-mono text-muted-foreground">{t.exerciseCount} exercises</span>
                  </div>
                  <h3 className="font-semibold text-base leading-tight">{t.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description || t.focus}</p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditTopic(t)}
                      className="icon-button size-8"
                      title="Edit topic & theory"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setMovingTopic(t)
                        setMoveTargetLevel(t.level)
                      }}
                      className="icon-button size-8 text-primary"
                      title="Move to another level"
                    >
                      <MoveRight size={13} />
                    </button>
                    <button
                      onClick={() => deleteTopic(t.id)}
                      className="icon-button size-8 text-destructive"
                      title="Delete topic"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setExerciseLevel(t.level)
                      setSelectedTopicSlug(t.slug)
                      setActiveTab("exercises")
                    }}
                    className="button-secondary text-[11px] py-1 px-2.5"
                  >
                    View Exercises <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXERCISE BANK (CRUD + AI GENERATION) */}
      {/* ========================================================================= */}
      {activeTab === "exercises" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Exercise Bank Management</h2>
              <p className="text-sm text-muted-foreground">
                View, manually add, edit, delete, or generate new questions with Gemini AI for any topic.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingExercise(null)
                  setExerciseForm({
                    prompt: "",
                    option0: "",
                    option1: "",
                    option2: "",
                    option3: "",
                    correctAnswerIndex: 0,
                    explanation: "",
                    word: "",
                    difficulty: "medium",
                  })
                  setCreatingExercise(true)
                }}
                className="button-secondary py-1.5 text-xs"
              >
                <Plus size={14} /> Add Manual Question
              </button>
              <button
                onClick={generateWithAi}
                disabled={generatingAi || !selectedTopicSlug}
                className="button-primary py-1.5 text-xs bg-primary text-primary-foreground flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                {generatingAi ? "Generating with Gemini…" : `Generate ${aiCount} with AI`}
              </button>
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="input-field py-1 text-xs w-20"
                disabled={generatingAi}
              >
                <option value={5}>5 Qs</option>
                <option value={10}>10 Qs</option>
                <option value={20}>20 Qs</option>
              </select>
            </div>
          </div>

          {/* Level & Topic Selector */}
          <div className="grid gap-4 md:grid-cols-2 bg-card border border-border p-4">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Filter Level:
              <select
                value={exerciseLevel}
                onChange={(e) => setExerciseLevel(e.target.value as CefrLevel)}
                className="input-field text-sm"
              >
                {cefrLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.code} {lvl.exam} ({topics.filter((t) => t.level === lvl.id).length} topics)
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium">
              Select Topic:
              <select
                value={selectedTopicSlug}
                onChange={(e) => {
                  setSelectedTopicSlug(e.target.value)
                  void fetchExercisesForTopic(e.target.value, exerciseLevel)
                }}
                className="input-field text-sm"
              >
                {topics
                  .filter((t) => t.level === exerciseLevel)
                  .map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.title} ({t.exerciseCount} qs)
                    </option>
                  ))}
              </select>
            </label>
          </div>

          {/* Exercise Form Modal */}
          {(creatingExercise || editingExercise) && (
            <div className="modal-backdrop" role="presentation">
              <div className="modal-panel max-w-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{editingExercise ? "Edit Exercise" : "Add Exercise"}</h3>
                  <button
                    onClick={() => {
                      setCreatingExercise(false)
                      setEditingExercise(null)
                    }}
                    className="icon-button"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={saveExercise} className="flex flex-col gap-4 mt-4">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    Question Prompt (use ______ for blanks)
                    <input
                      type="text"
                      required
                      value={exerciseForm.prompt}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, prompt: e.target.value })}
                      placeholder="e.g. She told me that she ______ the report earlier."
                      className="input-field text-sm"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-xs font-medium">
                      Target Vocabulary Word
                      <input
                        type="text"
                        value={exerciseForm.word}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, word: e.target.value })}
                        placeholder="e.g. report"
                        className="input-field text-sm"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-medium">
                      Correct Answer Option
                      <select
                        value={exerciseForm.correctAnswerIndex}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, correctAnswerIndex: Number(e.target.value) })}
                        className="input-field text-sm font-semibold text-primary"
                      >
                        <option value={0}>Option A</option>
                        <option value={1}>Option B</option>
                        <option value={2}>Option C</option>
                        <option value={3}>Option D</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-xs">
                      Option A {exerciseForm.correctAnswerIndex === 0 && "(Correct)"}
                      <input
                        type="text"
                        required
                        value={exerciseForm.option0}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, option0: e.target.value })}
                        className={`input-field text-sm ${exerciseForm.correctAnswerIndex === 0 ? "border-primary font-medium" : ""}`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Option B {exerciseForm.correctAnswerIndex === 1 && "(Correct)"}
                      <input
                        type="text"
                        required
                        value={exerciseForm.option1}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, option1: e.target.value })}
                        className={`input-field text-sm ${exerciseForm.correctAnswerIndex === 1 ? "border-primary font-medium" : ""}`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Option C {exerciseForm.correctAnswerIndex === 2 && "(Correct)"}
                      <input
                        type="text"
                        value={exerciseForm.option2}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, option2: e.target.value })}
                        className={`input-field text-sm ${exerciseForm.correctAnswerIndex === 2 ? "border-primary font-medium" : ""}`}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      Option D {exerciseForm.correctAnswerIndex === 3 && "(Correct)"}
                      <input
                        type="text"
                        value={exerciseForm.option3}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, option3: e.target.value })}
                        className={`input-field text-sm ${exerciseForm.correctAnswerIndex === 3 ? "border-primary font-medium" : ""}`}
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1 text-xs font-medium">
                    Explanation
                    <textarea
                      rows={3}
                      value={exerciseForm.explanation}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, explanation: e.target.value })}
                      placeholder="Explain why the answer is correct and how the rule applies..."
                      className="input-field text-sm"
                    />
                  </label>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingExercise(false)
                        setEditingExercise(null)
                      }}
                      className="button-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={busy} className="button-primary text-xs">
                      Save Exercise
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Exercise Items List */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                Exercises in Bank ({exercisesList.length})
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                Topic: {selectedTopicSlug}
              </span>
            </div>

            {loadingExercises ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Loading exercises…</p>
            ) : exercisesList.length === 0 ? (
              <div className="border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
                <p>No exercises found for this topic yet.</p>
                <button
                  onClick={generateWithAi}
                  disabled={generatingAi}
                  className="button-primary text-xs flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Generate 5 with Gemini AI
                </button>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border border border-border bg-card">
                {exercisesList.map((ex, i) => (
                  <div key={ex.id} className="p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          #{String(i + 1).padStart(2, "0")}
                        </span>
                        {ex.word && <AudioWordBadge word={ex.word} />}
                        <span className="tag text-[10px] uppercase font-mono">{ex.createdBy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingExercise(ex)
                            setExerciseForm({
                              prompt: ex.prompt,
                              option0: ex.options[0] ?? "",
                              option1: ex.options[1] ?? "",
                              option2: ex.options[2] ?? "",
                              option3: ex.options[3] ?? "",
                              correctAnswerIndex: ex.correctAnswerIndex ?? 0,
                              explanation: ex.explanation ?? "",
                              word: ex.word ?? "",
                              difficulty: ex.difficulty ?? "medium",
                            })
                          }}
                          className="icon-button size-8"
                          title="Edit exercise"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => deleteExercise(ex.id)}
                          className="icon-button size-8 text-destructive"
                          title="Delete exercise"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="font-serif text-lg font-medium">{ex.prompt}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ex.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-2 text-xs border rounded flex items-center justify-between ${
                            optIdx === ex.correctAnswerIndex
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border bg-secondary/40 text-muted-foreground"
                          }`}
                        >
                          <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                          {optIdx === ex.correctAnswerIndex && <Check size={13} />}
                        </div>
                      ))}
                    </div>

                    {ex.explanation && (
                      <p className="text-xs text-muted-foreground bg-secondary/40 p-2.5 border border-border/60 rounded">
                        <strong>Explanation:</strong> {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENT INVITATIONS */}
      {/* ========================================================================= */}
      {activeTab === "invitations" && (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold tracking-tight">Invite a Student</h2>
            <form onSubmit={invite} className="flex flex-wrap items-start gap-3">
              <label className="flex min-w-64 flex-1 flex-col gap-1.5">
                <span className="sr-only">Student email</span>
                <div className="relative">
                  <Mail
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="student@email.com"
                    className="input-field pl-9"
                  />
                </div>
              </label>
              <button type="submit" disabled={busy || !inviteEmail} className="button-primary">
                <Send size={15} aria-hidden="true" />
                Add to list
              </button>
            </form>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">Invitations List</h2>
              <span className="font-mono text-sm text-muted-foreground">{invitations.length}</span>
            </div>
            {invitations.length === 0 ? (
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
                        <button
                          type="button"
                          onClick={() => revoke(invitation.id)}
                          disabled={busy}
                          className="icon-button size-9"
                          aria-label={`Revoke invitation for ${invitation.email}`}
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

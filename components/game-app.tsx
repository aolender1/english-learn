"use client"

import { useEffect, useState } from "react"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookA,
  BookOpen,
  Check,
  Home,
  Lock,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Volume2,
  X,
} from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { authClient } from "@/lib/auth/client"
import { cefrLevels, hasTopics, levelLabel, levelToSlug, questionsForLevel, resolveLevelSlug, type CefrLevel, type LevelBand, type Question } from "@/lib/question-bank"
import { resolveTopicSlug, topicCatalog, topicsForLevel, type TopicDef } from "@/lib/topics"
import {
  accuracy,
  clearActiveSession,
  initialProgress,
  loadActiveSession,
  loadProgress,
  recordGame,
  resetProgress,
  saveActiveSession,
  type Progress,
} from "@/lib/progress"
import { TopicTheory } from "@/components/topic-theory"
import { AudioWordBadge } from "@/components/audio-word-badge"
import { DictionaryDialog } from "@/components/dictionary-dialog"

type View = "home" | "level" | "theory" | "quiz" | "results"
type AnswerRecord = { question: Question; selected: number; correct: boolean }
type SessionUser = { id: string; email: string; name: string | null; role: "teacher" | "student" }

const ROUND_KEY = "wordshift-active-round-id"
const TOPIC_KEY = "wordshift-active-topic-slug"

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function prepare(question: Question): Question {
  const options = shuffle(question.options.map((text, index) => ({ text, correct: index === question.answer })))
  return { ...question, options: options.map((item) => item.text), answer: options.findIndex((item) => item.correct) }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l border-border pl-4">
      <strong className="font-mono text-2xl font-medium tracking-tight">{value}</strong>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  )
}

const bands: Array<{ id: LevelBand; label: string }> = [
  { id: "Young learners", label: "Young learners" },
  { id: "Basic", label: "Basic" },
  { id: "Independent", label: "Independent" },
  { id: "Proficient", label: "Proficient" },
]

export function GameApp({
  initialLevel,
  initialTopicSlug,
  initialView = "home",
}: {
  initialLevel?: CefrLevel
  initialTopicSlug?: string
  initialView?: View
}) {
  const [view, setView] = useState<View>(initialView)
  const [level, setLevel] = useState<CefrLevel>(initialLevel ?? "pre-a1-starters")
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [progress, setProgress] = useState<Progress>(initialProgress)
  const [statsOpen, setStatsOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [roundId, setRoundId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [currentTopic, setCurrentTopic] = useState<TopicDef | null>(null)
  const [levelTopics, setLevelTopics] = useState<TopicDef[]>([])
  const [topicSearch, setTopicSearch] = useState("")
  const [loadingTopics, setLoadingTopics] = useState(false)

  // Dictionary dialog state
  const [dictOpen, setDictOpen] = useState(false)
  const [dictQuery, setDictQuery] = useState("")

  useEffect(() => {
    setProgress(loadProgress())

    // Handle Ctrl+K shortcut for dictionary
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setDictOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    // If direct topic or level was specified via URL props:
    if (initialTopicSlug && initialLevel) {
      const matched = resolveTopicSlug(initialTopicSlug, initialLevel)
      if (matched) {
        setCurrentTopic(matched)
        if (initialView === "quiz") {
          void start(initialLevel, matched, false)
        } else {
          setView("theory")
        }
      } else {
        void fetchLevelTopics(initialLevel)
        setView("level")
      }
    } else if (initialLevel) {
      void fetchLevelTopics(initialLevel)
      setView("level")
    } else {
      const saved = loadActiveSession()
      if (saved) {
        setLevel(saved.level)
        setSession(saved.questions)
        setIndex(saved.index)
        setSelected(saved.selected)
        setAnswers(saved.answers)
        const matching = topicCatalog.find((t) => t.slug === saved.topicId && t.level === saved.level)
        if (matching) setCurrentTopic(matching)
        setView("quiz")
      }
    }

    try {
      const storedRound = window.sessionStorage.getItem(ROUND_KEY)
      if (storedRound) setRoundId(storedRound)
    } catch {
      /* ignore */
    }
    fetch("/api/me")
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data: { user: SessionUser | null }) => {
        if (data.user?.id) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setUserLoaded(true))

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [initialLevel, initialTopicSlug, initialView])

  const current = session[index]
  const score = answers.filter((answer) => answer.correct).length
  const levelInfo = cefrLevels.find((item) => item.id === level) || cefrLevels[0]
  const totalBest = Math.max(...Object.values(progress.bestScores))
  const mastered = Object.values(progress.bestScores).filter((value) => value >= 8).length

  async function fetchLevelTopics(targetLevel: CefrLevel) {
    setLoadingTopics(true)
    try {
      const res = await fetch(`/api/topics?level=${targetLevel}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.topics) && data.topics.length > 0) {
          setLevelTopics(data.topics)
          return
        }
      }
    } catch (e) {
      console.warn("Failed to fetch topics from API, using catalog:", e)
    } finally {
      setLoadingTopics(false)
    }
    setLevelTopics(topicsForLevel(targetLevel))
  }

  function openLevel(next: CefrLevel, updateUrl = true) {
    setLevel(next)
    setTopicSearch("")
    void fetchLevelTopics(next)
    setView("level")
    setMenuOpen(false)
    if (updateUrl && typeof window !== "undefined") {
      window.history.pushState(null, "", `/${levelToSlug(next)}`)
    }
  }

  function openTopicTheory(topic: TopicDef, updateUrl = true) {
    setCurrentTopic(topic)
    setView("theory")
    if (updateUrl && typeof window !== "undefined") {
      window.history.pushState(null, "", `/${levelToSlug(level)}/${topic.slug}`)
    }
  }

  function openProgress() {
    setMenuOpen(false)
    setStatsOpen(true)
  }

  async function start(levelId: CefrLevel, chosenTopic?: TopicDef, updateUrl = true) {
    setStarting(true)
    const activeTopic = chosenTopic || currentTopic || levelTopics[0] || topicCatalog.find((t) => t.level === levelId) || {
      slug: "general-practice",
      level: levelId,
      title: "General Practice",
      description: "Comprehensive exercises",
      focus: "General grammar",
    }
    setCurrentTopic(activeTopic)

    if (updateUrl && typeof window !== "undefined") {
      window.history.pushState(null, "", `/${levelToSlug(levelId)}/${activeTopic.slug}`)
    }

    try {
      // 1. Try fetching from server practice session
      const response = await fetch("/api/practice/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ level: levelId, topicSlug: activeTopic.slug }),
      })

      if (response.ok) {
        const data: { roundId?: string; exercises?: Question[] } = await response.json()
        if (data.exercises?.length) {
          const questions = shuffle(data.exercises).map(prepare)
          setLevel(levelId)
          setSession(questions)
          setIndex(0)
          setSelected(null)
          setAnswers([])
          setRoundId(data.roundId ?? null)
          try {
            if (data.roundId) window.sessionStorage.setItem(ROUND_KEY, data.roundId)
            else window.sessionStorage.removeItem(ROUND_KEY)
            window.sessionStorage.setItem(TOPIC_KEY, activeTopic.slug)
          } catch {
            /* ignore */
          }
          saveActiveSession({
            level: levelId,
            topicId: activeTopic.slug,
            questions,
            index: 0,
            selected: null,
            answers: [],
          })
          setView("quiz")
          return
        }
      }
    } catch (error) {
      console.warn("Practice session API fallback:", error)
    } finally {
      setStarting(false)
    }

    // 2. Fallback to questions generator
    const questions = shuffle(questionsForLevel(levelId)).slice(0, 10).map(prepare)
    setLevel(levelId)
    setSession(questions.length > 0 ? questions : [])
    setIndex(0)
    setSelected(null)
    setAnswers([])
    setRoundId(null)
    try {
      window.sessionStorage.removeItem(ROUND_KEY)
      window.sessionStorage.setItem(TOPIC_KEY, activeTopic.slug)
    } catch {
      /* ignore */
    }
    saveActiveSession({
      level: levelId,
      topicId: activeTopic.slug,
      questions,
      index: 0,
      selected: null,
      answers: [],
    })
    setView("quiz")
  }

  function choose(option: number) {
    if (selected !== null || !current) return
    const correct = option === current.answer
    const nextAnswers = [...answers, { question: current, selected: option, correct }]
    setSelected(option)
    setAnswers(nextAnswers)
    saveActiveSession({
      level,
      topicId: currentTopic?.slug ?? "general",
      questions: session,
      index,
      selected: option,
      answers: nextAnswers,
    })
    if (roundId && current.id) {
      void fetch("/api/practice/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roundId,
          exerciseId: current.id,
          selectedAnswer: current.options[option],
          correctAnswer: current.options[current.answer],
          isCorrect: correct,
        }),
      }).catch(() => {})
    }
  }

  function next() {
    if (index < session.length - 1) {
      const nextIndex = index + 1
      setIndex(nextIndex)
      setSelected(null)
      saveActiveSession({
        level,
        topicId: currentTopic?.slug ?? "general",
        questions: session,
        index: nextIndex,
        selected: null,
        answers,
      })
      return
    }
    const finalScore = answers.filter((answer) => answer.correct).length
    let trailingStreak = 0
    for (let i = answers.length - 1; i >= 0 && answers[i].correct; i--) trailingStreak++
    setProgress((value) => recordGame(value, level, finalScore, trailingStreak))
    clearActiveSession()
    if (roundId) {
      void fetch("/api/practice/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roundId, score: finalScore }),
      }).catch(() => {})
      try {
        window.sessionStorage.removeItem(ROUND_KEY)
      } catch {
        /* ignore */
      }
      setRoundId(null)
    }
    if (finalScore === session.length && session.length > 0) {
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.65 },
        colors: ["#1f4d3e", "#d6a84b", "#f7f4ec"],
      })
      window.setTimeout(
        () =>
          confetti({
            particleCount: 70,
            spread: 100,
            origin: { y: 0.45 },
            colors: ["#1f4d3e", "#d6a84b"],
          }),
        250
      )
    }
    setView("results")
  }

  function goHome() {
    clearActiveSession()
    try {
      window.sessionStorage.removeItem(ROUND_KEY)
      window.sessionStorage.removeItem(TOPIC_KEY)
    } catch {
      /* ignore */
    }
    setRoundId(null)
    setView("home")
    setSelected(null)
    setAnswers([])
    setMenuOpen(false)
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/")
    }
  }

  async function signOut() {
    try {
      await authClient.signOut()
    } catch {
      /* ignore */
    }
    window.location.assign("/")
  }

  const filteredTopics = levelTopics.filter(
    (t) =>
      t.title.toLowerCase().includes(topicSearch.toLowerCase()) ||
      t.description?.toLowerCase().includes(topicSearch.toLowerCase()) ||
      t.focus?.toLowerCase().includes(topicSearch.toLowerCase())
  )

  return (
    <main className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 md:px-8 gap-4">
          <div className="flex items-center gap-2">
            <button className="icon-button border-0" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">
              <Menu aria-hidden="true" />
            </button>
            <button className="flex items-center gap-3 text-left" onClick={goHome} aria-label="Go to level selection">
              <span className="flex size-8 items-center justify-center bg-primary text-primary-foreground font-bold">
                <BookOpen size={16} aria-hidden="true" />
              </span>
              <span className="font-semibold tracking-tight">Wordshift</span>
            </button>
          </div>

          {/* Dictionary Search Trigger */}
          <div className="flex-1 max-w-md hidden sm:flex justify-center">
            <button
              onClick={() => setDictOpen(true)}
              className="flex items-center justify-between w-full max-w-xs px-3 py-1.5 rounded-full border border-border bg-secondary/60 hover:bg-secondary text-xs text-muted-foreground transition-all group"
            >
              <div className="flex items-center gap-2">
                <BookA size={14} className="text-primary group-hover:scale-110 transition-transform" />
                <span>Dictionary & Pronunciation</span>
              </div>
              <kbd className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="sm:hidden icon-button size-9"
              onClick={() => setDictOpen(true)}
              title="Dictionary search"
              aria-label="Open dictionary search"
            >
              <BookA size={17} />
            </button>
            <button className="button-ghost" onClick={openProgress}>
              <BarChart3 size={17} aria-hidden="true" />
              Progress
            </button>
            {user?.role === "teacher" && (
              <a href="/teacher" className="button-ghost border border-primary/30 text-primary font-medium">
                <ShieldCheck size={17} aria-hidden="true" />
                Teacher Panel
              </a>
            )}
            {user ? (
              <>
                <span className="tag max-w-44 truncate">{user.name || user.email}</span>
                <button className="icon-button size-9" onClick={signOut} aria-label="Sign out">
                  <LogOut size={15} aria-hidden="true" />
                </button>
              </>
            ) : userLoaded ? (
              <a href="/auth/sign-in" className="button-primary ml-1 min-h-9 px-3.5 py-1.5">
                Sign in
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* Dictionary Modal Dialog */}
      <DictionaryDialog
        isOpen={dictOpen}
        onClose={() => setDictOpen(false)}
        initialQuery={dictQuery}
      />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(22rem,88vw)] gap-0 p-0">
          <SheetHeader className="border-b border-border px-6 py-6 text-left">
            <SheetTitle className="flex items-center gap-3 text-lg">
              <span className="flex size-9 items-center justify-center bg-primary text-primary-foreground">
                <BookOpen aria-hidden="true" />
              </span>
              Wordshift
            </SheetTitle>
            <SheetDescription>Navigate the Cambridge English learning path.</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4" aria-label="Main navigation">
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Explore</p>
            <button
              className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={goHome}
            >
              <Home aria-hidden="true" />
              <span>Home</span>
            </button>
            <button
              className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => {
                setMenuOpen(false)
                setDictOpen(true)
              }}
            >
              <BookA aria-hidden="true" className="text-primary" />
              <span>Dictionary & Audio</span>
            </button>
            <div className="my-4 border-t border-border" />
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Cambridge levels</p>
            {cefrLevels.map((item, position) => {
              const count = topicsForLevel(item.id).length
              return (
                <button
                  key={item.id}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground"
                  onClick={() => openLevel(item.id)}
                  aria-current={view === "level" && level === item.id ? "page" : undefined}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-secondary font-mono text-[10px] font-semibold">
                    {item.code}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col text-left">
                    <strong className="truncate text-sm font-medium">{item.exam}</strong>
                    <span className="text-xs text-muted-foreground">{count > 0 ? `${count} topics` : `Stage ${position + 1}`}</span>
                  </span>
                  {count > 0 && <span className="size-1.5 rounded-full bg-primary" aria-label="Topics available" />}
                </button>
              )
            })}
            <div className="my-4 border-t border-border" />
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Extras</p>
            <button
              className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={openProgress}
            >
              <BarChart3 aria-hidden="true" />
              <span>Progress</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      {view === "home" && (
        <div className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-12 md:px-8 md:py-20">
          <section className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div className="flex flex-col gap-5">
              <p className="eyebrow">English practice by CEFR level & topic</p>
              <h1 className="max-w-3xl text-balance font-serif text-5xl leading-none tracking-tight md:text-7xl">
                Master English.<br />Topic by topic.
              </h1>
              <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                Explore grammar & phonetics topics with clear explanations, native audio pronunciation, and interactive exercises.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-5 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <Stat label="Sessions" value={`${progress.gamesPlayed}`} />
              <Stat label="Accuracy" value={`${accuracy(progress)}%`} />
              <Stat label="Levels" value={`${mastered}/${cefrLevels.length}`} />
            </div>
          </section>

          <section className="flex flex-col gap-8" aria-labelledby="levels-title">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="eyebrow">Cambridge English pathway</p>
                <h2 id="levels-title" className="mt-2 text-2xl font-semibold tracking-tight">
                  Select a level to explore topics
                </h2>
              </div>
              <span className="font-mono text-sm text-muted-foreground">Pre A1 – C2</span>
            </div>
            {bands.map((band) => (
              <div key={band.id} className="flex flex-col gap-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{band.label}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
                  {cefrLevels
                    .filter((item) => item.band === band.id)
                    .map((item) => {
                      const topicCount = topicsForLevel(item.id).length
                      const bestScore = progress.bestScores[item.id] ?? 0
                      return (
                        <button
                          key={item.id}
                          onClick={() => openLevel(item.id)}
                          className="level-card group text-left cursor-pointer"
                          aria-label={`Open ${item.code} ${item.exam}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-mono text-3xl font-semibold tracking-tight">{item.code}</span>
                            <span className="tag">
                              {topicCount > 0 ? `${topicCount} topics` : "Coming soon"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-semibold tracking-tight">{item.exam}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-mono">
                              {bestScore > 0 ? `Best score: ${bestScore}/10` : "No sessions yet"}
                            </span>
                            <span className="level-card-action">
                              Explore topics <ArrowRight aria-hidden="true" />
                            </span>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </section>

          <footer className="flex flex-col justify-between gap-3 border-t border-border pt-5 text-sm text-muted-foreground md:flex-row">
            <p>Integrated with Oxford/Cambridge Dictionary API & Native Audio</p>
            <p>Progress saved automatically in Neon DB and local device.</p>
          </footer>
        </div>
      )}

      {view === "level" && (
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-10 md:px-8 md:py-16">
          <button className="button-back self-start" onClick={goHome}>
            <ArrowLeft aria-hidden="true" />
            All levels
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex max-w-2xl flex-col gap-4">
              <p className="eyebrow">{levelInfo.band} · Cambridge English</p>
              <h1 className="text-balance font-serif text-5xl leading-none md:text-6xl">
                {levelInfo.code} {levelInfo.exam}
              </h1>
              <p className="leading-relaxed text-muted-foreground">{levelInfo.description}</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-80">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Filter topics..."
                  className="input-field pl-9 w-full"
                />
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-5" aria-labelledby="topic-list-title">
            <div className="flex items-end justify-between gap-5 border-b border-border pb-3">
              <h2 id="topic-list-title" className="text-2xl font-semibold tracking-tight">
                Topics ({filteredTopics.length})
              </h2>
              <span className="font-mono text-sm text-muted-foreground">
                Level {levelInfo.code}
              </span>
            </div>

            {loadingTopics ? (
              <div className="p-8 text-center text-muted-foreground font-mono text-sm">Loading topics…</div>
            ) : filteredTopics.length === 0 ? (
              <div className="border border-dashed border-border bg-card/60 p-12 text-center text-muted-foreground">
                No topics found matching &quot;{topicSearch}&quot;.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTopics.map((item, idx) => {
                  const isPhonetics = item.slug.includes("phonetics")
                  return (
                    <article
                      key={item.slug}
                      onClick={() => openTopicTheory(item)}
                      className={`group flex flex-col justify-between gap-4 border bg-card p-6 transition-all hover:border-primary hover:shadow-md cursor-pointer rounded-md ${
                        isPhonetics ? "border-primary/50 bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-secondary font-mono text-xs font-bold text-muted-foreground group-hover:text-primary group-hover:border-primary transition-colors">
                          {isPhonetics ? <Volume2 size={16} /> : String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                            {item.description || item.focus}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-4">
                        <span className="tag text-xs">Ver teoría y práctica</span>
                        <span className="button-primary py-1 px-3 text-xs font-semibold flex items-center gap-1 group-hover:bg-primary/90">
                          Acceder <ArrowRight size={13} />
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TOPIC THEORY & EXPLANATION SCREEN */}
      {view === "theory" && currentTopic && (
        <TopicTheory
          level={level}
          topic={currentTopic}
          onStartPractice={() => void start(level, currentTopic)}
          onBack={() => {
            setView("level")
            if (typeof window !== "undefined") {
              window.history.pushState(null, "", `/${levelToSlug(level)}`)
            }
          }}
          starting={starting}
        />
      )}

      {view === "quiz" && current && (
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
          <div className="flex items-center justify-between gap-4">
            <button
              className="button-back"
              onClick={() => {
                if (roundId) {
                  void fetch("/api/practice/complete", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ roundId, score, abandoned: true }),
                  }).catch(() => {})
                }
                try {
                  window.sessionStorage.removeItem(ROUND_KEY)
                } catch {
                  /* ignore */
                }
                setRoundId(null)
                clearActiveSession()
                setView("theory")
              }}
            >
              <ArrowLeft aria-hidden="true" />
              Exit session
            </button>
            <div className="flex items-center gap-2">
              <span className="tag">{levelLabel(level)}</span>
              <span className="tag font-semibold">{currentTopic?.title || "Practice Topic"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span>Question {index + 1} of {session.length}</span>
              <span>{score} correct</span>
            </div>
            <div className="h-1.5 bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((index + 1) / Math.max(session.length, 1)) * 100}%` }}
              />
            </div>
          </div>

          <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-12">
            <div className="flex flex-col gap-5 border-t border-border pt-6">
              <p className="eyebrow">Complete the sentence</p>
              <h1 className="text-pretty font-serif text-3xl leading-snug md:text-4xl">
                {current.prompt}
              </h1>
            </div>

            <div className="flex flex-col gap-3" role="group" aria-label="Answer choices">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Select the correct option:</p>
              {current.options.map((option, optionIndex) => {
                const state =
                  selected === null
                    ? "idle"
                    : optionIndex === current.answer
                    ? "correct"
                    : optionIndex === selected
                    ? "wrong"
                    : "muted"
                return (
                  <button
                    key={`${optionIndex}-${option}`}
                    onClick={() => choose(optionIndex)}
                    disabled={selected !== null}
                    className={`answer answer-${state} group`}
                    aria-label={`Option ${String.fromCharCode(65 + optionIndex)}: ${option}`}
                  >
                    <span className="answer-key" aria-hidden="true">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="flex-1 text-left">{option}</span>
                    {state === "idle" && <ArrowRight className="shrink-0 text-muted-foreground" size={18} aria-hidden="true" />}
                    {state === "correct" && <Check className="shrink-0 text-primary" size={18} aria-hidden="true" />}
                    {state === "wrong" && <X className="shrink-0 text-destructive" size={18} aria-hidden="true" />}
                  </button>
                )
              })}

              {selected !== null && (
                <div className="mt-4 flex flex-col gap-4 border-l-2 border-primary bg-secondary/80 p-5 rounded-r">
                  <div>
                    <p className={`font-semibold ${selected === current.answer ? "text-primary" : "text-destructive"}`}>
                      {selected === current.answer ? "✓ Correct!" : "✗ Not quite."}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-line">
                      {current.explanation}
                    </p>
                    {current.word && (
                      <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Pronunciation:</span>
                        <AudioWordBadge word={current.word} />
                      </div>
                    )}
                  </div>
                  <button className="button-primary self-start mt-1" onClick={next}>
                    {index === session.length - 1 ? "See results" : "Next question"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {view === "results" && (
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-10 md:px-8 md:py-16">
          <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1fr_auto] md:items-end">
            <div className="flex flex-col gap-4">
              <p className="eyebrow">Session complete · {levelLabel(level)}</p>
              <h1 className="font-serif text-5xl leading-none md:text-7xl">
                {score}
                <span className="text-muted-foreground">/{session.length}</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                {score >= session.length * 0.9
                  ? "Outstanding control of this topic!"
                  : score >= session.length * 0.7
                  ? "Strong result. Review the details below."
                  : "Keep practising—reviewing mistakes is key to improvement."}
              </p>
            </div>
            <Trophy className="text-primary" size={48} strokeWidth={1.25} aria-hidden="true" />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Stat label="Score" value={`${score}/${session.length}`} />
            <Stat label="Accuracy" value={`${session.length > 0 ? Math.round((score / session.length) * 100) : 0}%`} />
            <Stat label="Level Personal Best" value={`${progress.bestScores[level] ?? score}/10`} />
          </div>

          {answers.some((item) => !item.correct) && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Mistakes & Explanations</h2>
              {answers
                .filter((item) => !item.correct)
                .map((item, i) => (
                  <div key={item.question.id || i} className="grid gap-2 border-t border-border py-4 md:grid-cols-[2rem_1fr_1fr]">
                    <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <p className="font-serif text-lg">{item.question.prompt}</p>
                    <div className="text-sm leading-relaxed text-muted-foreground">
                      <p className="text-destructive">
                        <strong>Your answer:</strong> {item.question.options[item.selected]}
                      </p>
                      <p className="text-foreground mt-1">
                        <strong>Correct:</strong> {item.question.options[item.question.answer]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{item.question.explanation}</p>
                      {item.question.word && (
                        <div className="mt-2">
                          <AudioWordBadge word={item.question.word} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <button className="button-primary" onClick={() => start(level, currentTopic ?? undefined)}>
              <RotateCcw aria-hidden="true" />
              Try this topic again
            </button>
            <button className="button-secondary" onClick={() => setView("theory")}>
              Review {currentTopic?.title} Theory
            </button>
            <button className="button-secondary" onClick={() => setView("level")}>
              Back to {levelLabel(level)} topics
            </button>
            <button className="button-secondary" onClick={goHome}>
              All levels
            </button>
          </div>
        </div>
      )}

      {statsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setStatsOpen(false)}
        >
          <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="progress-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Your learning record</p>
                <h2 id="progress-title" className="mt-2 text-3xl font-semibold tracking-tight">
                  Progress
                </h2>
              </div>
              <button className="icon-button" onClick={() => setStatsOpen(false)} aria-label="Close progress">
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 border-y border-border py-6">
              <Stat label="Completed sessions" value={`${progress.gamesPlayed}`} />
              <Stat label="All-time accuracy" value={`${accuracy(progress)}%`} />
              <Stat label="Best streak" value={`${progress.bestStreak}`} />
              <Stat label="Best score" value={`${totalBest}/10`} />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider">Level bests</h3>
              {cefrLevels.map((item) => (
                <div className="flex items-center gap-3" key={item.id}>
                  <span className="w-28 font-mono text-xs truncate">
                    {item.code} {item.exam}
                  </span>
                  <div className="h-2 flex-1 bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${(progress.bestScores[item.id] ?? 0) * 10}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-sm">{progress.bestScores[item.id] ?? 0}/10</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6">
              {confirmReset ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">This permanently clears all saved progress on this device.</p>
                  <div className="flex gap-3">
                    <button
                      className="button-danger"
                      onClick={() => {
                        resetProgress()
                        setProgress(initialProgress)
                        setConfirmReset(false)
                        setStatsOpen(false)
                        goHome()
                      }}
                    >
                      Delete everything
                    </button>
                    <button className="button-secondary" onClick={() => setConfirmReset(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button className="button-ghost self-start" onClick={() => setConfirmReset(true)}>
                  Reset progress
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

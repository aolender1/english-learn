"use client"

import { useEffect, useState } from "react"
import confetti from "canvas-confetti"
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, Check, Home, Lock, Menu, RotateCcw, Trophy, X } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cefrLevels, hasTopics, levelLabel, questionsForLevel, topic, type CefrLevel, type LevelBand, type Question } from "@/lib/question-bank"
import { accuracy, clearActiveSession, initialProgress, loadActiveSession, loadProgress, recordGame, resetProgress, saveActiveSession, type Progress } from "@/lib/progress"

type View = "home" | "level" | "quiz" | "results"
type AnswerRecord = { question: Question; selected: number; correct: boolean }

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
  return <div className="flex flex-col gap-1 border-l border-border pl-4"><strong className="font-mono text-2xl font-medium tracking-tight">{value}</strong><span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span></div>
}

const bands: Array<{ id: LevelBand; label: string }> = [
  { id: "Young learners", label: "Young learners" },
  { id: "Basic", label: "Basic" },
  { id: "Independent", label: "Independent" },
  { id: "Proficient", label: "Proficient" },
]

export function GameApp() {
  const [view, setView] = useState<View>("home")
  const [level, setLevel] = useState<CefrLevel>("b1-preliminary")
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [progress, setProgress] = useState<Progress>(initialProgress)
  const [statsOpen, setStatsOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setProgress(loadProgress())
    const saved = loadActiveSession()
    if (saved) {
      setLevel(saved.level)
      setSession(saved.questions)
      setIndex(saved.index)
      setSelected(saved.selected)
      setAnswers(saved.answers)
      setView("quiz")
    }
  }, [])

  const current = session[index]
  const score = answers.filter((answer) => answer.correct).length
  const levelInfo = cefrLevels.find((item) => item.id === level)!
  const totalBest = Math.max(...Object.values(progress.bestScores))
  const mastered = Object.values(progress.bestScores).filter((value) => value >= 8).length
  const nextLevel: CefrLevel | null = level === "b1-preliminary" ? "b2-first" : null

  function openLevel(next: CefrLevel) {
    setLevel(next)
    setView("level")
    setMenuOpen(false)
  }

  function openProgress() {
    setMenuOpen(false)
    setStatsOpen(true)
  }

  function start(levelId: CefrLevel) {
    const questions = shuffle(questionsForLevel(levelId)).slice(0, 10).map(prepare)
    setLevel(levelId)
    setSession(questions)
    setIndex(0)
    setSelected(null)
    setAnswers([])
    saveActiveSession({ level: levelId, topicId: topic.id, questions, index: 0, selected: null, answers: [] })
    setView("quiz")
  }

  function choose(option: number) {
    if (selected !== null || !current) return
    const nextAnswers = [...answers, { question: current, selected: option, correct: option === current.answer }]
    setSelected(option)
    setAnswers(nextAnswers)
    saveActiveSession({ level, topicId: topic.id, questions: session, index, selected: option, answers: nextAnswers })
  }

  function next() {
    if (index < 9) {
      const nextIndex = index + 1
      setIndex(nextIndex)
      setSelected(null)
      saveActiveSession({ level, topicId: topic.id, questions: session, index: nextIndex, selected: null, answers })
      return
    }
    const finalScore = answers.filter((answer) => answer.correct).length
    let trailingStreak = 0
    for (let i = answers.length - 1; i >= 0 && answers[i].correct; i--) trailingStreak++
    setProgress((value) => recordGame(value, level, finalScore, trailingStreak))
    clearActiveSession()
    if (finalScore === 10) {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.65 }, colors: ["#1f4d3e", "#d6a84b", "#f7f4ec"] })
      window.setTimeout(() => confetti({ particleCount: 70, spread: 100, origin: { y: 0.45 }, colors: ["#1f4d3e", "#d6a84b"] }), 250)
    }
    setView("results")
  }

  function goHome() {
    clearActiveSession()
    setView("home")
    setSelected(null)
    setAnswers([])
    setMenuOpen(false)
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-2">
            <button className="icon-button border-0" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu"><Menu aria-hidden="true" /></button>
            <button className="flex items-center gap-3 text-left" onClick={goHome} aria-label="Go to level selection">
              <span className="flex size-8 items-center justify-center bg-primary text-primary-foreground"><BookOpen size={16} aria-hidden="true" /></span>
              <span className="font-semibold tracking-tight">Wordshift</span>
            </button>
          </div>
          <button className="button-ghost" onClick={openProgress}><BarChart3 size={17} aria-hidden="true" />Progress</button>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(22rem,88vw)] gap-0 p-0">
          <SheetHeader className="border-b border-border px-6 py-6 text-left">
            <SheetTitle className="flex items-center gap-3 text-lg"><span className="flex size-9 items-center justify-center bg-primary text-primary-foreground"><BookOpen aria-hidden="true" /></span>Wordshift</SheetTitle>
            <SheetDescription>Navigate the Cambridge English learning path.</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4" aria-label="Main navigation">
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Explore</p>
            <button className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] aria-[current=page]:bg-secondary aria-[current=page]:text-foreground" onClick={goHome}><Home aria-hidden="true" /><span>Home</span></button>
            <div className="my-4 border-t border-border" />
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Cambridge levels</p>
            {cefrLevels.map((item, position) => (
              <button key={item.id} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] aria-[current=page]:bg-secondary aria-[current=page]:text-foreground" onClick={() => openLevel(item.id)} aria-current={view === "level" && level === item.id ? "page" : undefined}>
                <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-secondary font-mono text-[10px] font-semibold">{item.code}</span>
                <span className="flex min-w-0 flex-1 flex-col text-left"><strong className="truncate text-sm font-medium">{item.exam}</strong><span className="text-xs text-muted-foreground">Stage {String(position + 1).padStart(2, "0")}</span></span>
                {hasTopics(item.id) && <span className="size-1.5 rounded-full bg-primary" aria-label="Topic available" />}
              </button>
            ))}
            <div className="my-4 border-t border-border" />
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Extras</p>
            <button className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] aria-[current=page]:bg-secondary aria-[current=page]:text-foreground" onClick={openProgress}><BarChart3 aria-hidden="true" /><span>Progress</span></button>
          </nav>
        </SheetContent>
      </Sheet>

      {view === "home" && (
        <div className="mx-auto flex max-w-6xl flex-col gap-14 px-5 py-12 md:px-8 md:py-20">
          <section className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div className="flex flex-col gap-5">
              <p className="eyebrow">English practice by CEFR level</p>
              <h1 className="max-w-3xl text-balance font-serif text-5xl leading-none tracking-tight md:text-7xl">Choose your level.<br />Practise with purpose.</h1>
              <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">Follow the eight-stage Cambridge English path, from Pre A1 Starters to C2 Proficiency. Each topic is tuned to its exam level.</p>
            </div>
            <div className="grid grid-cols-3 gap-5 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <Stat label="Sessions" value={`${progress.gamesPlayed}`} />
              <Stat label="Accuracy" value={`${accuracy(progress)}%`} />
              <Stat label="Levels" value={`${mastered}/8`} />
            </div>
          </section>

          <section className="flex flex-col gap-8" aria-labelledby="levels-title">
            <div className="flex items-end justify-between gap-5"><div><p className="eyebrow">Cambridge English pathway</p><h2 id="levels-title" className="mt-2 text-2xl font-semibold tracking-tight">Select a level</h2></div><span className="font-mono text-sm text-muted-foreground">Pre A1 – C2</span></div>
            {bands.map((band) => (
              <div key={band.id} className="flex flex-col gap-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{band.label}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
                  {cefrLevels.filter((item) => item.band === band.id).map((item) => {
                    const ready = hasTopics(item.id)
                    return (
                      <button key={item.id} onClick={() => openLevel(item.id)} className="level-card group" aria-label={`Open ${item.code} ${item.exam}`}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-mono text-3xl font-semibold tracking-tight">{item.code}</span>
                          <span className="tag">{ready ? "1 topic" : "Coming soon"}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-semibold tracking-tight">{item.exam}</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                        </div>
                        <span className="level-card-action">{ready ? "Enter level" : "Preview"} <ArrowRight aria-hidden="true" /></span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>

          <footer className="flex flex-col justify-between gap-3 border-t border-border pt-5 text-sm text-muted-foreground md:flex-row"><p>Curated questions. Clear explanations. No account required.</p><p>Progress is saved on this device.</p></footer>
        </div>
      )}

      {view === "level" && (
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-10 md:px-8 md:py-16">
          <button className="button-back self-start" onClick={goHome}><ArrowLeft aria-hidden="true" />All levels</button>
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="eyebrow">{levelInfo.band} · Cambridge English</p>
            <h1 className="text-balance font-serif text-5xl leading-none md:text-7xl">{levelInfo.code} {levelInfo.exam}</h1>
            <p className="leading-relaxed text-muted-foreground">{levelInfo.description}</p>
          </div>

          {hasTopics(level) ? (
            <section className="flex flex-col gap-5" aria-labelledby="topic-list-title">
              <div className="flex items-end justify-between gap-5"><h2 id="topic-list-title" className="text-2xl font-semibold tracking-tight">Topics</h2><span className="font-mono text-sm text-muted-foreground">01 topic</span></div>
              <article className="group grid gap-6 border border-border bg-card p-6 transition-colors hover:border-foreground/40 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
                <span className="flex size-14 items-center justify-center border border-border bg-secondary font-mono text-sm">01</span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3"><h3 className="text-2xl font-semibold tracking-tight">{topic.title}</h3><span className="tag">Best {progress.bestScores[level]}/10</span></div>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{level === "b1-preliminary" ? "Backshift basics: tense changes, pronouns, time and place words, statements, negatives and simple questions." : "Advanced control: reporting verbs, gerunds and infinitives, and exceptions where tenses stay unchanged."}</p>
                </div>
                <button className="button-primary" onClick={() => start(level)}>Practice <ArrowRight aria-hidden="true" /></button>
              </article>
            </section>
          ) : (
            <section className="flex flex-col items-start gap-5 border border-dashed border-border bg-card/60 p-8 md:p-12" aria-labelledby="coming-soon-title">
              <span className="flex size-14 items-center justify-center border border-border bg-secondary"><Lock size={20} aria-hidden="true" /></span>
              <div className="flex flex-col gap-2">
                <h2 id="coming-soon-title" className="text-2xl font-semibold tracking-tight">Topics coming soon</h2>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">We&apos;re building practice topics for {levelInfo.code} {levelInfo.exam}, aligned to its cumulative vocabulary. Check back soon or start with an available level.</p>
              </div>
              <button className="button-secondary" onClick={goHome}><ArrowLeft aria-hidden="true" />Back to levels</button>
            </section>
          )}
        </div>
      )}

      {view === "quiz" && current && (
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
          <div className="flex items-center justify-between gap-4"><button className="button-back" onClick={() => { clearActiveSession(); setView("level") }}><ArrowLeft aria-hidden="true" />Exit session</button><span className="tag">{levelLabel(level)} · {topic.title}</span></div>
          <div className="flex flex-col gap-3"><div className="flex justify-between font-mono text-xs uppercase tracking-widest text-muted-foreground"><span>Question {index + 1} of 10</span><span>{score} correct</span></div><div className="h-1 bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / 10) * 100}%` }} /></div></div>
          <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-12">
            <div className="flex flex-col gap-5 border-t border-border pt-6"><p className="eyebrow">Choose the best report</p><h1 className="text-pretty font-serif text-3xl leading-snug md:text-4xl">{current.prompt}</h1></div>
            <div className="flex flex-col gap-3" role="group" aria-label="Answer choices">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Select one answer:</p>
              {current.options.map((option, optionIndex) => {
                const state = selected === null ? "idle" : optionIndex === current.answer ? "correct" : optionIndex === selected ? "wrong" : "muted"
                return (
                  <button
                    key={option}
                    onClick={() => choose(optionIndex)}
                    disabled={selected !== null}
                    className={`answer answer-${state} group`}
                    aria-label={`Option ${String.fromCharCode(65 + optionIndex)}: ${option}`}
                  >
                    <span className="answer-key" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                    <span className="flex-1">{option}</span>
                    {state === "idle" && <ArrowRight className="shrink-0 text-muted-foreground" size={18} aria-hidden="true" />}
                    {state === "correct" && <Check className="shrink-0" size={18} aria-hidden="true" />}
                    {state === "wrong" && <X className="shrink-0" size={18} aria-hidden="true" />}
                  </button>
                )
              })}
              {selected !== null && <div className="mt-2 flex flex-col gap-4 border-l-2 border-primary bg-secondary p-5"><div><p className="font-semibold">{selected === current.answer ? "Correct." : "Not quite."}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{current.explanation}</p></div><button className="button-primary self-start" onClick={next}>{index === 9 ? "See results" : "Next question"}<ArrowRight aria-hidden="true" /></button></div>}
            </div>
          </section>
        </div>
      )}

      {view === "results" && (
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-5 py-10 md:px-8 md:py-16">
          <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1fr_auto] md:items-end"><div className="flex flex-col gap-4"><p className="eyebrow">Session complete · {levelLabel(level)}</p><h1 className="font-serif text-5xl leading-none md:text-7xl">{score}<span className="text-muted-foreground">/10</span></h1><p className="text-lg text-muted-foreground">{score >= 9 ? "Excellent control of this level." : score >= 7 ? "A strong result. Review the details below." : "Keep practising—the explanations are your roadmap."}</p></div><Trophy className="text-primary" size={48} strokeWidth={1.25} aria-hidden="true" /></div>
          <div className="grid gap-5 sm:grid-cols-3"><Stat label="Score" value={`${score}/10`} /><Stat label="Accuracy" value={`${score * 10}%`} /><Stat label="Personal best" value={`${Math.max(score, progress.bestScores[level])}/10`} /></div>
          {answers.some((item) => !item.correct) && <section className="flex flex-col gap-4"><h2 className="text-xl font-semibold">Worth another look</h2>{answers.filter((item) => !item.correct).map((item, i) => <div key={item.question.id} className="grid gap-2 border-t border-border py-4 md:grid-cols-[2rem_1fr_1fr]"><span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2,"0")}</span><p className="font-serif text-lg">{item.question.prompt}</p><p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Correct:</strong> {item.question.options[item.question.answer]}<br />{item.question.explanation}</p></div>)}</section>}
          {score === 10 && <div className="flex flex-col gap-2 border-l-2 border-primary bg-secondary p-5"><p className="font-semibold">Perfect score. You have mastered this topic.</p><p className="text-sm text-muted-foreground">{nextLevel ? `Ready for a harder challenge? Continue with ${levelLabel(nextLevel)}.` : "Keep the momentum going or return to level selection."}</p></div>}
          <div className="flex flex-wrap gap-3">
            {score === 10 && nextLevel && <button className="button-primary" onClick={() => start(nextLevel)}>Practice {levelLabel(nextLevel)} <ArrowRight aria-hidden="true" /></button>}
            <button className={score === 10 && nextLevel ? "button-secondary" : "button-primary"} onClick={() => start(level)}><RotateCcw aria-hidden="true" />Try again</button>
            <button className="button-secondary" onClick={() => setView("level")}>Back to {levelLabel(level)}</button>
            <button className="button-secondary" onClick={goHome}>All levels</button>
          </div>
        </div>
      )}

      {statsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setStatsOpen(false)}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="progress-title"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Your learning record</p><h2 id="progress-title" className="mt-2 text-3xl font-semibold tracking-tight">Progress</h2></div><button className="icon-button" onClick={() => setStatsOpen(false)} aria-label="Close progress"><X aria-hidden="true" /></button></div>{view === "quiz" && <div className="flex items-center justify-between gap-5 border-l-2 border-primary bg-secondary p-4"><div><p className="text-sm font-semibold">Session in progress · {levelLabel(level)}</p><p className="mt-1 text-xs text-muted-foreground">Saved automatically on this device</p></div><strong className="font-mono text-lg">{answers.length}/10</strong></div>}<div className="grid grid-cols-2 gap-6 border-y border-border py-6"><Stat label="Completed sessions" value={`${progress.gamesPlayed}`} /><Stat label="All-time accuracy" value={`${accuracy(progress)}%`} /><Stat label="Best streak" value={`${progress.bestStreak}`} /><Stat label="Best score" value={`${totalBest}/10`} /></div><div className="flex flex-col gap-3"><h3 className="text-sm font-semibold uppercase tracking-wider">Level bests</h3>{cefrLevels.map((item) => <div className="flex items-center gap-3" key={item.id}><span className="w-24 font-mono text-xs">{item.code} {item.exam}</span><div className="h-2 flex-1 bg-secondary"><div className="h-full bg-primary" style={{ width: `${progress.bestScores[item.id] * 10}%` }} /></div><span className="w-10 text-right font-mono text-sm">{progress.bestScores[item.id]}/10</span></div>)}</div>{progress.history.length > 0 && <div className="flex flex-col gap-3"><h3 className="text-sm font-semibold uppercase tracking-wider">Recent sessions</h3>{progress.history.slice(0,4).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm"><span className="font-mono">Level {levelLabel(entry.level)}</span><span className="text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</span><strong className="font-mono">{entry.score}/{entry.total}</strong></div>)}</div>}<div className="mt-auto flex flex-col gap-3 border-t border-border pt-6">{confirmReset ? <div className="flex flex-col gap-3"><p className="text-sm text-muted-foreground">This permanently clears all saved progress on this device.</p><div className="flex gap-3"><button className="button-danger" onClick={() => { resetProgress(); setProgress(initialProgress); setConfirmReset(false); setStatsOpen(false); goHome() }}>Delete everything</button><button className="button-secondary" onClick={() => setConfirmReset(false)}>Cancel</button></div></div> : <button className="button-ghost self-start" onClick={() => setConfirmReset(true)}>Reset progress</button>}</div></section></div>}
    </main>
  )
}

import type { CefrLevel, Difficulty, Question } from "./question-bank"

export type HistoryEntry = { id: string; level: CefrLevel; topicId: string; score: number; total: number; date: string }
export type Progress = {
  gamesPlayed: number
  correctAnswers: number
  totalAnswers: number
  currentStreak: number
  bestStreak: number
  bestScores: Record<CefrLevel, number>
  history: HistoryEntry[]
}
export type SavedAnswer = { question: Question; selected: number; correct: boolean }
export type ActiveSession = { level: CefrLevel; topicId: string; questions: Question[]; index: number; selected: number | null; answers: SavedAnswer[] }

type OldLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
type V2Progress = Omit<Progress, "bestScores" | "history"> & {
  bestScores: Record<OldLevel, number>
  history: Array<Omit<HistoryEntry, "level"> & { level: OldLevel }>
}
type V2Session = Omit<ActiveSession, "level"> & { level: OldLevel }
type LegacyProgress = Omit<Progress, "bestScores" | "history"> & {
  bestScores: Record<Difficulty, number>
  history: Array<{ id: string; difficulty: Difficulty; score: number; total: number; date: string }>
}
type LegacySession = Omit<ActiveSession, "level" | "topicId"> & { difficulty: Difficulty }

export const STORAGE_KEY = "wordshift-progress-v3"
export const SESSION_KEY = "wordshift-active-session-v3"
const V2_STORAGE_KEY = "wordshift-progress-v2"
const V2_SESSION_KEY = "wordshift-active-session-v2"
const LEGACY_STORAGE_KEY = "wordshift-progress-v1"
const LEGACY_SESSION_KEY = "wordshift-active-session-v1"

const emptyScores: Record<CefrLevel, number> = {
  "pre-a1-starters": 0,
  "a1-movers": 0,
  "a2-flyers": 0,
  "a2-key": 0,
  "b1-preliminary": 0,
  "b1-plus": 0,
  "b2-first": 0,
  "c1-advanced": 0,
  "c2-proficiency": 0,
}

export const initialProgress: Progress = {
  gamesPlayed: 0, correctAnswers: 0, totalAnswers: 0, currentStreak: 0, bestStreak: 0,
  bestScores: emptyScores, history: [],
}

function oldLevel(level: OldLevel): CefrLevel {
  return ({ A1: "a1-movers", A2: "a2-key", B1: "b1-preliminary", B2: "b2-first", C1: "c1-advanced", C2: "c2-proficiency" } as const)[level]
}
function legacyLevel(difficulty: Difficulty): CefrLevel {
  return difficulty === "easy" || difficulty === "medium" ? "b1-preliminary" : "b2-first"
}
function saveProgress(progress: Progress) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) }

export function loadProgress(): Progress {
  if (typeof window === "undefined") return initialProgress
  try {
    const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Progress | null
    if (current?.bestScores) return { ...initialProgress, ...current, bestScores: { ...emptyScores, ...current.bestScores }, history: current.history?.slice(0, 8) ?? [] }

    const v2 = JSON.parse(window.localStorage.getItem(V2_STORAGE_KEY) ?? "null") as V2Progress | null
    if (v2?.bestScores) {
      const migrated: Progress = {
        ...initialProgress, ...v2,
        bestScores: { ...emptyScores, "a1-movers": v2.bestScores.A1 ?? 0, "a2-key": v2.bestScores.A2 ?? 0, "b1-preliminary": v2.bestScores.B1 ?? 0, "b2-first": v2.bestScores.B2 ?? 0, "c1-advanced": v2.bestScores.C1 ?? 0, "c2-proficiency": v2.bestScores.C2 ?? 0 },
        history: (v2.history ?? []).map((entry) => ({ ...entry, level: oldLevel(entry.level) })).slice(0, 8),
      }
      saveProgress(migrated)
      return migrated
    }

    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? "null") as LegacyProgress | null
    if (!legacy?.bestScores) return initialProgress
    const migrated: Progress = {
      ...initialProgress, ...legacy,
      bestScores: { ...emptyScores, "b1-preliminary": Math.max(legacy.bestScores.easy ?? 0, legacy.bestScores.medium ?? 0), "b2-first": Math.max(legacy.bestScores.hard ?? 0, legacy.bestScores.master ?? 0) },
      history: (legacy.history ?? []).map((entry) => ({ ...entry, level: legacyLevel(entry.difficulty), topicId: "reported-speech" })).slice(0, 8),
    }
    saveProgress(migrated)
    return migrated
  } catch { return initialProgress }
}

export function loadActiveSession(): ActiveSession | null {
  if (typeof window === "undefined") return null
  try {
    const current = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as ActiveSession | null
    if (current?.level && Array.isArray(current.questions)) return current
    const v2 = JSON.parse(window.localStorage.getItem(V2_SESSION_KEY) ?? "null") as V2Session | null
    if (v2?.level && Array.isArray(v2.questions)) {
      const migrated = { ...v2, level: oldLevel(v2.level) }
      saveActiveSession(migrated)
      return migrated
    }
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_SESSION_KEY) ?? "null") as LegacySession | null
    if (!legacy?.difficulty || !Array.isArray(legacy.questions)) return null
    const migrated = { ...legacy, level: legacyLevel(legacy.difficulty), topicId: "reported-speech" }
    saveActiveSession(migrated)
    return migrated
  } catch { return null }
}

export function saveActiveSession(session: ActiveSession) { window.localStorage.setItem(SESSION_KEY, JSON.stringify(session)) }
export function clearActiveSession() { window.localStorage.removeItem(SESSION_KEY) }

export function recordGame(progress: Progress, level: CefrLevel, score: number, answerStreak: number): Progress {
  const next: Progress = {
    ...progress, gamesPlayed: progress.gamesPlayed + 1, correctAnswers: progress.correctAnswers + score,
    totalAnswers: progress.totalAnswers + 10, currentStreak: answerStreak, bestStreak: Math.max(progress.bestStreak, answerStreak),
    bestScores: { ...progress.bestScores, [level]: Math.max(progress.bestScores[level], score) },
    history: [{ id: `${Date.now()}`, level, topicId: "reported-speech", score, total: 10, date: new Date().toISOString() }, ...progress.history].slice(0, 8),
  }
  saveProgress(next)
  return next
}

export function resetProgress() {
  for (const key of [STORAGE_KEY, SESSION_KEY, V2_STORAGE_KEY, V2_SESSION_KEY, LEGACY_STORAGE_KEY, LEGACY_SESSION_KEY]) window.localStorage.removeItem(key)
}
export function accuracy(progress: Progress) { return progress.totalAnswers ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100) : 0 }

"use client"

import { useEffect, useState } from "react"
import { Check, ImageIcon, Loader2, Search, Sparkles, Trash2, X } from "lucide-react"
import type { QuestionMedia } from "@/lib/question-bank"

type PickerTab = "auto" | "klipy" | "noto" | "custom"

type KlipyItem = {
  id: string
  slug: string
  title: string
  url: string
  previewUrl: string
  mp4Url: string | null
  width: number | null
  height: number | null
  mediaType: "webp" | "gif"
}

type NotoItem = {
  codepoint: string
  url: string
  gifUrl: string
  title: string
  category: string
  tags: string[]
}

type CurateResponse = {
  asset: QuestionMedia | null
  fromCache: boolean
  klipyCallsUsed: number
  conceptKey: string
  decision: {
    selectedIndex: number | null
    isRelevantProb: number
    classroomSafeProb: number
    clarityScore: number
    confidence: number
    latencyMs: number
  } | null
}

const SIMPLE_STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "can", "was", "were", "has", "have", "had",
  "got", "this", "that", "these", "those", "with", "from", "she", "they", "his", "her", "there",
  "what", "when", "where", "which", "who", "how", "will", "would", "shall", "should", "could",
  "rewrite", "complete", "choose", "translate", "traducí", "inglés", "using", "present", "simple",
  "perfect", "past", "use", "yesterday", "today", "tomorrow", "now",
])

function guessInitialConcept(prompt: string, word?: string | null): string {
  const cleaned = prompt
    .replace(/_{2,}/g, " ")
    .replace(/^(traduc[ií]\s+al\s+ingl[eé]s|rewrite[^:]*|complete[^:]*)\s*:\s*/i, "")
    .toLowerCase()
  const tokens = cleaned
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3 && !SIMPLE_STOPWORDS.has(t))

  if (tokens.length > 0) return tokens[0]
  if (word && !SIMPLE_STOPWORDS.has(word.trim().toLowerCase())) return word.trim().toLowerCase()
  return ""
}

export function TeacherMediaPicker({
  exercise,
  onClose,
  onAttached,
}: {
  exercise: {
    id: string
    prompt: string
    word?: string | null
    media?: QuestionMedia | null
  }
  onClose: () => void
  onAttached: (media: QuestionMedia | null) => void
}) {
  const initialConcept = exercise.media?.conceptKey || guessInitialConcept(exercise.prompt, exercise.word)
  const [tab, setTab] = useState<PickerTab>("auto")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto IA tab
  const [autoConcept, setAutoConcept] = useState(initialConcept)
  const [preferProvider, setPreferProvider] = useState<"klipy" | "auto">("klipy")
  const [curateResult, setCurateResult] = useState<CurateResponse | null>(null)

  // KLIPY tab
  const [klipyQuery, setKlipyQuery] = useState(initialConcept)
  const [klipyResults, setKlipyResults] = useState<KlipyItem[]>([])
  const [loadingKlipy, setLoadingKlipy] = useState(false)

  // Noto tab
  const [notoQuery, setNotoQuery] = useState(initialConcept)
  const [notoCategory, setNotoCategory] = useState("all")
  const [notoCategories, setNotoCategories] = useState<string[]>([])
  const [notoResults, setNotoResults] = useState<NotoItem[]>([])
  const [loadingNoto, setLoadingNoto] = useState(false)

  // Custom URL tab
  const [customUrl, setCustomUrl] = useState(
    exercise.media?.provider === "custom" ? exercise.media.url : "",
  )
  const [customAlt, setCustomAlt] = useState(exercise.media?.altText ?? "")

  useEffect(() => {
    if (tab !== "noto") return
    let active = true
    setLoadingNoto(true)
    const params = new URLSearchParams({
      provider: "noto",
      q: notoQuery,
      category: notoCategory,
    })
    fetch(`/api/teacher/media/search?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        setNotoResults(data.items ?? [])
        if (Array.isArray(data.categories)) setNotoCategories(data.categories)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingNoto(false)
      })
    return () => {
      active = false
    }
  }, [tab, notoQuery, notoCategory])

  async function runAutoCurate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/teacher/media/curate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.id,
          concept: autoConcept.trim() || undefined,
          preferProvider,
          forceRefresh: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "No se pudo curar el visual.")
      setCurateResult(data as CurateResponse)
      if (data.asset) {
        onAttached(data.asset as QuestionMedia)
      } else {
        setError("Ningún candidato de KLIPY superó el filtro de claridad/seguridad. Probá otra palabra clave.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en curación IA.")
    } finally {
      setBusy(false)
    }
  }

  async function searchKlipy(e: React.FormEvent) {
    e.preventDefault()
    if (!klipyQuery.trim()) return
    setLoadingKlipy(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        provider: "klipy",
        q: klipyQuery.trim(),
      })
      const res = await fetch(`/api/teacher/media/search?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "No se pudo buscar en KLIPY.")
      setKlipyResults(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error buscando en KLIPY.")
    } finally {
      setLoadingKlipy(false)
    }
  }

  async function attachAsset(payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/teacher/media/attach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.id,
          ...payload,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "No se pudo adjuntar el visual.")
      onAttached((data.media as QuestionMedia | null) ?? null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adjuntando visual.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop z-50"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="modal-panel max-w-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-picker-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <p className="eyebrow">Visual Media Picker</p>
            <h3 id="media-picker-title" className="text-lg font-semibold mt-1 flex items-center gap-2">
              <ImageIcon size={17} className="text-primary" />
              Adjuntar GIF o Animación
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-serif">
              {exercise.prompt}
            </p>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close visual picker">
            <X size={16} />
          </button>
        </div>

        {/* Current Media Preview */}
        {exercise.media && (
          <div className="flex items-center justify-between gap-4 rounded border border-border bg-secondary/40 p-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exercise.media.url}
                alt={exercise.media.altText || exercise.media.title || "Current media"}
                className="size-14 rounded object-contain bg-card border border-border shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="tag text-[10px] font-mono uppercase">{exercise.media.provider}</span>
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {exercise.media.conceptKey}
                  </span>
                </div>
                <p className="text-xs text-foreground truncate mt-1">
                  {exercise.media.title || exercise.media.url}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => attachAsset({ clear: true })}
              className="button-secondary text-xs py-1.5 px-3 text-destructive border-destructive/30"
            >
              <Trash2 size={13} /> Quitar
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-1 border border-border bg-secondary/60 p-1 rounded">
          {[
            { id: "auto", label: "Auto IA (KLIPY + Decision 1)" },
            { id: "klipy", label: "Buscar KLIPY" },
            { id: "noto", label: "Noto Animados (Gratis)" },
            { id: "custom", label: "URL externa" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id as PickerTab)
                setError(null)
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                tab === item.id
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive rounded">
            {error}
          </div>
        )}

        {/* TAB 1: AUTO IA */}
        {tab === "auto" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Busca hasta 4 candidatos en KLIPY y usa <strong>gemini-decision-1</strong> (multimodal, 0 tokens de salida) para elegir el más claro y seguro para clase, guardándolo en caché por concepto.
            </p>
            <form onSubmit={runAutoCurate} className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Concepto visual en inglés
                  <input
                    type="text"
                    value={autoConcept}
                    onChange={(e) => setAutoConcept(e.target.value)}
                    placeholder="e.g. cooking, train station, running"
                    className="input-field text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  Estrategia
                  <select
                    value={preferProvider}
                    onChange={(e) => setPreferProvider(e.target.value as "klipy" | "auto")}
                    className="input-field text-sm"
                  >
                    <option value="klipy">KLIPY GIF + Decision 1</option>
                    <option value="auto">Auto (Noto gratis o KLIPY)</option>
                  </select>
                </label>
              </div>
              <button type="submit" disabled={busy} className="button-primary self-start text-xs">
                {busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Evaluando candidatos…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Buscar y validar con Decision 1
                  </>
                )}
              </button>
            </form>

            {curateResult?.asset && (
              <div className="rounded border border-primary/40 bg-primary/5 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Check size={14} /> Visual adjuntado ({curateResult.conceptKey})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="tag text-[10px] font-mono">
                      {curateResult.fromCache ? "Desde caché (0 req)" : `${curateResult.klipyCallsUsed} req KLIPY`}
                    </span>
                    {curateResult.decision && (
                      <>
                        <span className="tag text-[10px] font-mono">
                          Relevancia {Math.round(curateResult.decision.isRelevantProb * 100)}%
                        </span>
                        <span className="tag text-[10px] font-mono">
                          Seguridad {Math.round(curateResult.decision.classroomSafeProb * 100)}%
                        </span>
                        <span className="tag text-[10px] font-mono">
                          Claridad {curateResult.decision.clarityScore.toFixed(1)}/3
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={curateResult.asset.url}
                  alt={curateResult.asset.title || curateResult.conceptKey}
                  className="max-h-48 w-auto mx-auto rounded border border-border bg-card object-contain"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SEARCH KLIPY */}
        {tab === "klipy" && (
          <div className="flex flex-col gap-4">
            <form onSubmit={searchKlipy} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={klipyQuery}
                  onChange={(e) => setKlipyQuery(e.target.value)}
                  placeholder="Search KLIPY GIFs in English..."
                  className="input-field pl-9 text-sm"
                />
              </div>
              <button type="submit" disabled={loadingKlipy || !klipyQuery.trim()} className="button-primary text-xs">
                {loadingKlipy ? <Loader2 size={14} className="animate-spin" /> : "Buscar"}
              </button>
            </form>

            {klipyResults.length === 0 ? (
              <p className="text-xs text-muted-foreground border border-dashed border-border p-6 text-center">
                Escribí una palabra en inglés y tocá Buscar (dev quota: 100 req/h).
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
                {klipyResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      attachAsset({
                        provider: "klipy",
                        conceptKey: klipyQuery.trim() || item.title,
                        externalId: item.id,
                        mediaType: item.mediaType,
                        url: item.url,
                        previewUrl: item.previewUrl,
                        mp4Url: item.mp4Url,
                        title: item.title,
                        width: item.width,
                        height: item.height,
                      })
                    }
                    className="group flex flex-col gap-1.5 rounded border border-border bg-card p-1.5 text-left hover:border-primary transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.title}
                      className="h-24 w-full rounded object-cover bg-secondary/40"
                      loading="lazy"
                    />
                    <span className="text-[11px] truncate text-foreground group-hover:text-primary font-medium px-1">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NOTO ANIMATED EMOJIS */}
        {tab === "noto" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={notoQuery}
                  onChange={(e) => setNotoQuery(e.target.value)}
                  placeholder="cat, dog, rain, pizza, sleep..."
                  className="input-field pl-9 text-sm"
                />
              </div>
              <select
                value={notoCategory}
                onChange={(e) => setNotoCategory(e.target.value)}
                className="input-field text-xs"
              >
                <option value="all">Todas las categorías</option>
                {notoCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {loadingNoto ? (
              <p className="text-xs text-muted-foreground p-6 text-center">Cargando catálogo Noto…</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {notoResults.map((item) => (
                  <button
                    key={item.codepoint}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      attachAsset({
                        provider: "noto_emoji",
                        conceptKey: notoQuery.trim() || item.title,
                        externalId: item.codepoint,
                        mediaType: "webp",
                        url: item.url,
                        previewUrl: item.gifUrl,
                        title: item.title,
                        altText: `Visual: ${item.title}`,
                        width: 512,
                        height: 512,
                      })
                    }
                    className="flex flex-col items-center gap-1 rounded border border-border bg-card p-2 hover:border-primary hover:bg-secondary/40 transition-colors"
                    title={item.tags.join(", ")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.title}
                      className="size-12 object-contain"
                      loading="lazy"
                    />
                    <span className="text-[10px] truncate w-full text-center text-muted-foreground">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CUSTOM URL / CLEAR */}
        {tab === "custom" && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void attachAsset({
                provider: "custom",
                conceptKey: autoConcept.trim() || customAlt.trim() || "custom",
                mediaType: customUrl.toLowerCase().endsWith(".gif") ? "gif" : "webp",
                url: customUrl.trim(),
                title: customAlt.trim() || "Custom visual",
                altText: customAlt.trim() || "Exercise visual",
              })
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1 text-xs font-medium">
              URL de imagen o GIF (https://)
              <input
                type="url"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://..."
                className="input-field text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Descripción / Alt text
              <input
                type="text"
                value={customAlt}
                onChange={(e) => setCustomAlt(e.target.value)}
                placeholder="Descripción breve para accesibilidad"
                className="input-field text-sm"
              />
            </label>
            <div className="flex items-center gap-2 pt-2">
              <button type="submit" disabled={busy || !customUrl.trim()} className="button-primary text-xs">
                Guardar URL
              </button>
              {exercise.media && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => attachAsset({ clear: true })}
                  className="button-secondary text-xs text-destructive"
                >
                  Quitar visual actual
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

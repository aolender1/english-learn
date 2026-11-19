"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react"
import type { SpeakingSessionEvaluation } from "@/lib/gemini-decisions"
import { LiveAudioCapture, LiveAudioPlayer } from "@/lib/live-audio"
import {
  buildSpeakingMission,
  createInitialChecklist,
  DEFAULT_LIVE_VOICE,
  LIVE_VOICES,
  type ChecklistItemState,
  type TranscriptTurn,
} from "@/lib/live-missions"
import type { CefrLevel } from "@/lib/question-bank"
import type { TopicDef } from "@/lib/topics"

type LiveVoicePracticeProps = {
  level: CefrLevel
  topic: TopicDef
  userName?: string | null
  onBack: () => void
  onStartWrittenPractice?: () => void
}

type Phase = "ready" | "connecting" | "live" | "evaluating" | "summary"

type PastSessionItem = {
  id: string
  missionTitle: string
  voiceName: string
  durationSec: number
  turnCount: number
  checklist: ChecklistItemState[] | null
  evaluation: SpeakingSessionEvaluation | null
  completedAt: string | null
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function LiveVoicePractice({
  level,
  topic,
  userName,
  onBack,
  onStartWrittenPractice,
}: LiveVoicePracticeProps) {
  const missionPreview = useMemo(
    () => buildSpeakingMission({ level, topic, studentName: userName }),
    [level, topic, userName],
  )

  const [phase, setPhase] = useState<Phase>("ready")
  const [voiceName, setVoiceName] = useState<string>(DEFAULT_LIVE_VOICE)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItemState[]>(() =>
    createInitialChecklist(missionPreview),
  )
  const [needsHint, setNeedsHint] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([])
  const [liveUserDraft, setLiveUserDraft] = useState("")
  const [liveModelDraft, setLiveModelDraft] = useState("")
  const [textMessage, setTextMessage] = useState("")

  const [finalEvaluation, setFinalEvaluation] = useState<SpeakingSessionEvaluation | null>(null)
  const [pastSessions, setPastSessions] = useState<PastSessionItem[]>([])

  // Runtime refs for clean teardown & real-time WebSocket handlers
  const wsRef = useRef<WebSocket | null>(null)
  const captureRef = useRef<LiveAudioCapture | null>(null)
  const playerRef = useRef<LiveAudioPlayer | null>(null)
  const timerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const elapsedRef = useRef<number>(0)
  const transcriptRef = useRef<TranscriptTurn[]>([])
  const userDraftRef = useRef<string>("")
  const modelDraftRef = useRef<string>("")
  const turnEvalBusyRef = useRef<boolean>(false)
  const lastEvaluatedTurnCountRef = useRef<number>(0)
  const endingRef = useRef<boolean>(false)
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setChecklist(createInitialChecklist(missionPreview))
    setTranscript([])
    transcriptRef.current = []
    setFinalEvaluation(null)
    setErrorMsg(null)
    setNoticeMsg(null)
    setPhase("ready")

    fetch(`/api/live/sessions?level=${encodeURIComponent(level)}&topicSlug=${encodeURIComponent(topic.slug)}`)
      .then((res) => (res.ok ? res.json() : { sessions: [] }))
      .then((data: { sessions?: PastSessionItem[] }) => {
        setPastSessions(Array.isArray(data.sessions) ? data.sessions : [])
      })
      .catch(() => {})
  }, [level, topic.slug, missionPreview])

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight
    }
  }, [transcript, liveUserDraft, liveModelDraft])

  async function cleanupAudioAndSocket() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    const ws = wsRef.current
    wsRef.current = null
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close(1000, "Session finished")
      } catch {
        /* ignore */
      }
    }
    if (captureRef.current) {
      await captureRef.current.stop().catch(() => {})
      captureRef.current = null
    }
    if (playerRef.current) {
      await playerRef.current.close().catch(() => {})
      playerRef.current = null
    }
    setAiSpeaking(false)
    setMicLevel(0)
  }

  useEffect(() => {
    return () => {
      void cleanupAudioAndSocket()
    }
  }, [])

  function flushDraft(role: "user" | "model") {
    const raw = role === "user" ? userDraftRef.current : modelDraftRef.current
    const clean = raw.trim()
    if (role === "user") {
      userDraftRef.current = ""
      setLiveUserDraft("")
    } else {
      modelDraftRef.current = ""
      setLiveModelDraft("")
    }
    if (!clean) return

    const nextTurn: TranscriptTurn = { role, text: clean, ts: Date.now() }
    const updated = [...transcriptRef.current, nextTurn]
    transcriptRef.current = updated
    setTranscript(updated)
  }

  async function evaluateTurnProgress() {
    const sid = sessionIdRef.current
    if (!sid || turnEvalBusyRef.current) return
    const userCount = transcriptRef.current.filter((t) => t.role === "user").length
    if (userCount === 0 || userCount === lastEvaluatedTurnCountRef.current) return

    turnEvalBusyRef.current = true
    lastEvaluatedTurnCountRef.current = userCount
    try {
      const res = await fetch("/api/live/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          mode: "turn",
          transcript: transcriptRef.current,
          durationSec: elapsedRef.current,
        }),
      })
      if (!res.ok) return
      const data = (await res.json()) as {
        checklist?: ChecklistItemState[]
        needsHint?: boolean
      }
      if (Array.isArray(data.checklist)) {
        setChecklist(data.checklist)
      }
      if (typeof data.needsHint === "boolean") {
        setNeedsHint(data.needsHint)
      }
    } catch {
      /* background turn evaluation should never interrupt audio */
    } finally {
      turnEvalBusyRef.current = false
    }
  }

  async function startSession() {
    setErrorMsg(null)
    setNoticeMsg(null)
    setFinalEvaluation(null)
    setChecklist(createInitialChecklist(missionPreview))
    setTranscript([])
    transcriptRef.current = []
    userDraftRef.current = ""
    modelDraftRef.current = ""
    setLiveUserDraft("")
    setLiveModelDraft("")
    setNeedsHint(false)
    setMuted(false)
    setElapsedSec(0)
    elapsedRef.current = 0
    lastEvaluatedTurnCountRef.current = 0
    endingRef.current = false
    setPhase("connecting")

    try {
      // Prepare playback AudioContext directly within the click handler for browser autoplay rules
      const player = new LiveAudioPlayer((playing) => setAiSpeaking(playing))
      playerRef.current = player
      await player.prepare()

      // Provision single-use server-locked Ephemeral Token
      const tokenRes = await fetch("/api/live/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          topicSlug: topic.slug,
          voiceName,
        }),
      })
      const tokenData = (await tokenRes.json().catch(() => ({}))) as {
        error?: string
        sessionId?: string
        token?: string
        model?: string
        wsBaseUrl?: string
      }

      if (!tokenRes.ok || !tokenData.token || !tokenData.sessionId || !tokenData.wsBaseUrl) {
        throw new Error(tokenData.error || "No se pudo iniciar la sesión de voz en vivo.")
      }

      sessionIdRef.current = tokenData.sessionId
      setSessionId(tokenData.sessionId)

      // Capture microphone before connecting stream
      const capture = new LiveAudioCapture()
      captureRef.current = capture

      const wsUrl = `${tokenData.wsBaseUrl}?access_token=${encodeURIComponent(tokenData.token)}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${tokenData.model || "gemini-3.8-live"}`,
            },
          }),
        )
      }

      ws.onmessage = async (event: MessageEvent) => {
        const raw = typeof event.data === "string" ? event.data : await (event.data as Blob).text()
        let msg: Record<string, unknown>
        try {
          msg = JSON.parse(raw)
        } catch {
          return
        }

        if (msg.setupComplete) {
          try {
            await capture.start(
              (base64Pcm) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      realtimeInput: {
                        audio: {
                          data: base64Pcm,
                          mimeType: "audio/pcm;rate=16000",
                        },
                      },
                    }),
                  )
                }
              },
              (rms) => setMicLevel(rms),
            )
          } catch (micErr) {
            setErrorMsg(
              micErr instanceof Error
                ? micErr.message
                : "No pudimos acceder al micrófono. Verificá los permisos del navegador.",
            )
            await cleanupAudioAndSocket()
            setPhase("ready")
            return
          }

          setPhase("live")
          timerRef.current = window.setInterval(() => {
            elapsedRef.current += 1
            setElapsedSec(elapsedRef.current)
          }, 1000)

          // Prompt the AI tutor to open the conversation warmly
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: `Start the spoken practice mission now for "${topic.title}". Greet me briefly in English and ask an easy opening question.`,
                      },
                    ],
                  },
                ],
                turnComplete: true,
              },
            }),
          )
          return
        }

        if (msg.goAway) {
          setNoticeMsg("La conexión en vivo está por alcanzar el límite de tiempo. Podés finalizar cuando quieras.")
        }

        const sc = msg.serverContent as
          | {
              interrupted?: boolean
              turnComplete?: boolean
              modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> }
              inputTranscription?: { text?: string }
              outputTranscription?: { text?: string }
            }
          | undefined

        if (!sc) return

        if (sc.interrupted) {
          player.interrupt()
          flushDraft("model")
        }

        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              player.enqueuePcm24k(part.inlineData.data)
            }
          }
        }

        if (sc.inputTranscription?.text) {
          userDraftRef.current += sc.inputTranscription.text
          setLiveUserDraft(userDraftRef.current)
        }

        if (sc.outputTranscription?.text) {
          if (userDraftRef.current.trim()) {
            flushDraft("user")
          }
          modelDraftRef.current += sc.outputTranscription.text
          setLiveModelDraft(modelDraftRef.current)
        }

        if (sc.turnComplete) {
          flushDraft("user")
          flushDraft("model")
          void evaluateTurnProgress()
        }
      }

      ws.onerror = () => {
        if (!endingRef.current) {
          setErrorMsg("Se perdió la conexión de audio en tiempo real.")
        }
      }

      ws.onclose = (ev) => {
        if (!endingRef.current && ev.code !== 1000) {
          setNoticeMsg(
            ev.reason
              ? `Conexión cerrada: ${ev.reason}`
              : "La sesión en vivo se desconectó. Podés evaluar lo conversado hasta aquí.",
          )
        }
      }
    } catch (err) {
      await cleanupAudioAndSocket()
      setErrorMsg(err instanceof Error ? err.message : "Error al iniciar la práctica oral.")
      setPhase("ready")
    }
  }

  function toggleMute() {
    const nextMuted = !muted
    setMuted(nextMuted)
    captureRef.current?.setMuted(nextMuted)
    if (nextMuted && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    }
  }

  function sendQuickClientPrompt(promptText: string, displayText?: string) {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    flushDraft("user")
    wsRef.current.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: promptText }] }],
          turnComplete: true,
        },
      }),
    )
    if (displayText) {
      const updated = [...transcriptRef.current, { role: "user" as const, text: displayText, ts: Date.now() }]
      transcriptRef.current = updated
      setTranscript(updated)
    }
  }

  function handleAskSpanishHint() {
    setNeedsHint(false)
    sendQuickClientPrompt(
      "Could you give me a quick 1-sentence hint in Spanish about how to answer using this topic's grammar, and then invite me to try in English?",
      "(Pedí una pista en español)",
    )
  }

  function handleSendTypedFallback(e: React.FormEvent) {
    e.preventDefault()
    const clean = textMessage.trim()
    if (!clean || wsRef.current?.readyState !== WebSocket.OPEN) return
    setTextMessage("")
    sendQuickClientPrompt(clean, clean)
  }

  async function finishAndEvaluate() {
    endingRef.current = true
    flushDraft("user")
    flushDraft("model")
    const capturedDuration = elapsedRef.current
    const capturedTranscript = [...transcriptRef.current]
    const sid = sessionIdRef.current

    await cleanupAudioAndSocket()
    setPhase("evaluating")

    if (!sid) {
      setPhase("summary")
      return
    }

    try {
      const res = await fetch("/api/live/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          mode: "final",
          transcript: capturedTranscript,
          durationSec: capturedDuration,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        checklist?: ChecklistItemState[]
        evaluation?: SpeakingSessionEvaluation | null
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || "No se pudo evaluar la sesión oral.")
      }
      if (Array.isArray(data.checklist)) {
        setChecklist(data.checklist)
      }
      setFinalEvaluation(data.evaluation ?? null)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar la evaluación.")
    } finally {
      setPhase("summary")
    }
  }

  const completedGoals = checklist.filter((item) => item.completed).length

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7 px-5 py-8 md:px-8 md:py-12">
      {/* Top navigation & context */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={async () => {
            endingRef.current = true
            await cleanupAudioAndSocket()
            onBack()
          }}
          className="button-back"
        >
          <ArrowLeft size={16} /> Volver a la teoría
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="tag">{missionPreview.levelDisplay}</span>
          <span className="tag text-primary border-primary/40">Gemini 3.8 Live · Decision 1</span>
        </div>
      </div>

      {/* Mission Banner */}
      <section className="flex flex-col gap-3 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <Mic size={15} /> Práctica Oral en Tiempo Real
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          {missionPreview.missionTitle}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
          {missionPreview.scenarioEs}
        </p>
      </section>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {noticeMsg && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-50 p-3.5 text-xs text-amber-950">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-700" />
          <span>{noticeMsg}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PHASE 1: READY / PRE-FLIGHT MISSION BRIEFING                          */}
      {/* ===================================================================== */}
      {phase === "ready" && (
        <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles size={17} className="text-primary" /> Tu misión guiada (~3 minutos)
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vas a conversar por voz en tiempo real con tu tutor bilingüe de inglés. Mientras hablás,{" "}
                <strong>Gemini Decision 1</strong> verifica silenciosamente tus objetivos sin gastar tokens extra.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Objetivos a completar en esta charla:
              </p>
              {checklist.map((obj, idx) => (
                <div
                  key={obj.id}
                  className="flex items-start gap-3 rounded border border-border bg-secondary/40 p-3 text-sm"
                >
                  <span className="font-mono text-xs font-bold text-primary mt-0.5">0{idx + 1}</span>
                  <div>
                    <p className="font-medium text-foreground">{obj.labelEs}</p>
                    <p className="text-xs text-muted-foreground">{obj.labelEn}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="live-voice-select"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Voz del tutor IA
              </label>
              <select
                id="live-voice-select"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="input-field max-w-xs"
              >
                {LIVE_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label} — {voice.style}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              <button type="button" onClick={() => void startSession()} className="button-primary px-6 py-3">
                <Mic size={17} /> Iniciar práctica oral
              </button>
              {onStartWrittenPractice && (
                <button type="button" onClick={onStartWrittenPractice} className="button-secondary">
                  Prefiero ejercicios escritos
                </button>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle size={15} className="text-primary" /> Consejos rápidos
              </h3>
              <ul className="flex flex-col gap-2 text-xs text-muted-foreground list-disc pl-4 leading-relaxed">
                {missionPreview.starterPromptsEs.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
                <li>Usá auriculares si podés para evitar eco. Podés silenciar o pedir una pista en español en cualquier momento.</li>
              </ul>
            </div>

            {pastSessions.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Tus últimas sesiones en este tema
                </h3>
                <div className="flex flex-col gap-2.5">
                  {pastSessions.map((item) => (
                    <div key={item.id} className="rounded border border-border/80 bg-secondary/30 p-3 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-primary">
                          {item.evaluation ? `${item.evaluation.overallScore.toFixed(1)} / 3.0` : "Completada"}
                        </span>
                        <span className="text-muted-foreground">{formatDuration(item.durationSec)}</span>
                      </div>
                      {item.evaluation && (
                        <p className="text-muted-foreground">
                          {item.evaluation.missionCompleted ? "✓ Misión lograda" : "En progreso"} ·{" "}
                          {item.evaluation.errorLabelEs}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PHASE 2: CONNECTING OR LIVE CALL                                      */}
      {/* ===================================================================== */}
      {(phase === "connecting" || phase === "live") && (
        <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
          {/* Left Column: Audio status bar + live transcript + controls */}
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
            {/* Voice Visualizer Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`relative flex size-12 items-center justify-center rounded-full border-2 transition-all ${
                    phase === "connecting"
                      ? "border-muted-foreground/40 bg-secondary text-muted-foreground"
                      : aiSpeaking
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : muted
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-primary bg-primary/10 text-primary"
                  }`}
                  style={
                    phase === "live" && !muted && !aiSpeaking
                      ? { transform: `scale(${1 + Math.min(0.18, micLevel * 0.2)})` }
                      : undefined
                  }
                >
                  {phase === "connecting" ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : aiSpeaking ? (
                    <Volume2 size={20} className="animate-pulse" />
                  ) : muted ? (
                    <MicOff size={20} />
                  ) : (
                    <Mic size={20} />
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {phase === "connecting"
                      ? "Conectando con Gemini 3.8 Live…"
                      : aiSpeaking
                      ? "Tutor hablando en inglés…"
                      : muted
                      ? "Micrófono silenciado"
                      : "Escuchando — hablá en inglés cuando quieras"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Voz: {voiceName} · Sesión {sessionId ? sessionId.slice(0, 8) : "…"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground bg-secondary px-3 py-1.5 rounded border border-border">
                <Clock size={14} className="text-primary" />
                {formatDuration(elapsedSec)}
              </div>
            </div>

            {/* Live Transcript Window */}
            <div
              ref={transcriptScrollRef}
              className="flex flex-col gap-3 h-80 overflow-y-auto rounded border border-border bg-secondary/25 p-4"
              aria-live="polite"
            >
              {transcript.length === 0 && !liveUserDraft && !liveModelDraft && (
                <p className="text-xs text-muted-foreground italic m-auto text-center max-w-sm">
                  {phase === "connecting"
                    ? "Estableciendo enlace WebSocket seguro con token efímero…"
                    : "El tutor está por saludarte. Respondé naturalmente con tu micrófono."}
                </p>
              )}

              {transcript.map((turn, idx) => (
                <div
                  key={`${turn.ts}-${idx}`}
                  className={`flex flex-col max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                    turn.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-card border border-border text-foreground"
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider opacity-75 mb-0.5">
                    {turn.role === "user" ? "Vos" : "Tutor IA"}
                  </span>
                  <span>{turn.text}</span>
                </div>
              ))}

              {liveUserDraft.trim() && (
                <div className="self-end max-w-[85%] rounded-lg bg-primary/80 text-primary-foreground px-3.5 py-2 text-sm opacity-90">
                  <span className="text-[10px] font-mono uppercase tracking-wider opacity-75 block mb-0.5">
                    Vos (hablando…)
                  </span>
                  <span>{liveUserDraft}</span>
                </div>
              )}

              {liveModelDraft.trim() && (
                <div className="self-start max-w-[85%] rounded-lg bg-card border border-primary/30 text-foreground px-3.5 py-2 text-sm">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-primary block mb-0.5">
                    Tutor IA (hablando…)
                  </span>
                  <span>{liveModelDraft}</span>
                </div>
              )}
            </div>

            {/* Optional quick text input when mic is muted or noisy */}
            <form onSubmit={handleSendTypedFallback} className="flex gap-2">
              <input
                type="text"
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                disabled={phase !== "live"}
                placeholder="También podés escribirle acá al tutor si tenés ruido ambiente…"
                className="input-field text-xs flex-1"
              />
              <button
                type="submit"
                disabled={phase !== "live" || !textMessage.trim()}
                className="button-secondary px-3"
                aria-label="Enviar texto al tutor"
              >
                <Send size={15} />
              </button>
            </form>

            {/* Primary Call Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={phase !== "live"}
                  className={muted ? "button-primary" : "button-secondary"}
                >
                  {muted ? <Mic size={16} /> : <MicOff size={16} />}
                  {muted ? "Activar micrófono" : "Silenciar"}
                </button>

                <button
                  type="button"
                  onClick={handleAskSpanishHint}
                  disabled={phase !== "live"}
                  className="button-secondary"
                >
                  <HelpCircle size={16} className="text-primary" /> Pedir pista en español
                </button>
              </div>

              <button
                type="button"
                onClick={() => void finishAndEvaluate()}
                className="button-danger px-4 min-h-11 gap-2"
              >
                <PhoneOff size={16} /> Finalizar y evaluar
              </button>
            </div>
          </div>

          {/* Right Column: Decision-1 Live Checklist Referee */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Objetivos en vivo</h2>
                <span className="tag text-[10px] font-mono">
                  {completedGoals}/{checklist.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Verificados automáticamente por <strong>Decision 1</strong> turno a turno.
              </p>

              <div className="flex flex-col gap-2.5 mt-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 rounded border p-3 text-xs transition-colors ${
                      item.completed
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border bg-secondary/30 text-muted-foreground"
                    }`}
                  >
                    {item.completed ? (
                      <CheckCircle2 size={16} className="shrink-0 text-primary mt-0.5" />
                    ) : (
                      <Circle size={16} className="shrink-0 opacity-60 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{item.labelEs}</p>
                      <p className="text-[11px] opacity-80 mt-0.5">{item.labelEn}</p>
                    </div>
                  </div>
                ))}
              </div>

              {needsHint && (
                <div className="mt-2 rounded border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-950 flex flex-col gap-2">
                  <p className="font-medium">¿Te trabaste o querés una ayuda rápida?</p>
                  <button
                    type="button"
                    onClick={handleAskSpanishHint}
                    className="button-secondary py-1.5 px-3 text-xs min-h-8 self-start"
                  >
                    Pedir pista en español
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PHASE 3: EVALUATING                                                   */}
      {/* ===================================================================== */}
      {phase === "evaluating" && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-12 text-center">
          <Loader2 size={32} className="animate-spin text-primary" />
          <h2 className="font-serif text-2xl font-semibold">Generando Boletín Oral…</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            <strong>Gemini Decision 1</strong> está evaluando tu gramática, fluidez y vocabulario de la sesión.
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PHASE 4: FINAL DECISION-1 REPORT CARD                                 */}
      {/* ===================================================================== */}
      {phase === "summary" && (
        <div className="flex flex-col gap-6">
          {finalEvaluation ? (
            <div className="rounded-lg border border-border bg-card p-6 md:p-8 flex flex-col gap-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <span className="eyebrow">Boletín Oral · Gemini Decision 1</span>
                  <h2 className="font-serif text-3xl font-bold mt-1">
                    {finalEvaluation.overallScore.toFixed(1)}{" "}
                    <span className="text-muted-foreground text-xl">/ 3.0</span>
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    Duración {formatDuration(elapsedSec)} · Confianza{" "}
                    {Math.round(finalEvaluation.confidence * 100)}% · {finalEvaluation.latencyMs} ms · 0 tokens de salida
                  </p>
                </div>

                <span
                  className={`tag font-mono text-xs ${
                    finalEvaluation.missionCompleted
                      ? "text-primary border-primary"
                      : "text-amber-700 border-amber-500/50"
                  }`}
                >
                  {finalEvaluation.missionCompleted ? "✓ Misión Completada" : "Práctica Registrada"}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Gramática", value: finalEvaluation.grammarScore },
                  { label: "Comunicación y Fluidez", value: finalEvaluation.communicationScore },
                  { label: "Vocabulario del Tema", value: finalEvaluation.vocabularyScore },
                ].map((metric) => (
                  <div key={metric.label} className="rounded border border-border bg-secondary/30 p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className="font-mono font-bold text-foreground">
                        {metric.value.toFixed(1)} / 3.0
                      </span>
                    </div>
                    <div className="h-2 bg-secondary overflow-hidden rounded-full">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.round((metric.value / 3) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded border-l-2 border-primary bg-secondary/50 p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="tag text-[10px] font-mono">{finalEvaluation.errorLabelEs}</span>
                </div>
                <p className="text-sm text-foreground font-medium">{finalEvaluation.errorTipEs}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No se detectaron turnos hablados suficientes para calificar esta sesión. Podés iniciar una nueva práctica cuando estés listo.
            </div>
          )}

          {/* Final Checklist & Transcript Review */}
          <div className="grid gap-6 md:grid-cols-[20rem_1fr]">
            <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">
                Objetivos logrados ({completedGoals}/{checklist.length})
              </h3>
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-xs py-1">
                  {item.completed ? (
                    <CheckCircle2 size={15} className="shrink-0 text-primary mt-0.5" />
                  ) : (
                    <Circle size={15} className="shrink-0 text-muted-foreground mt-0.5" />
                  )}
                  <span className={item.completed ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {item.labelEs}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Transcripción de la conversación</h3>
              {transcript.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin mensajes registrados.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {transcript.map((turn, idx) => (
                    <div
                      key={`${turn.ts}-${idx}`}
                      className="rounded border border-border/70 bg-secondary/25 px-3 py-2 text-xs leading-relaxed"
                    >
                      <strong className={turn.role === "user" ? "text-primary" : "text-foreground"}>
                        {turn.role === "user" ? "Vos: " : "Tutor IA: "}
                      </strong>
                      <span className="text-foreground">{turn.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setPhase("ready")} className="button-primary">
              <RotateCcw size={16} /> Practicar otra vez
            </button>
            <button type="button" onClick={onBack} className="button-secondary">
              <ArrowLeft size={16} /> Volver a la teoría
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

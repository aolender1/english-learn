"use client"

import { useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import type { QuestionMedia } from "@/lib/question-bank"

export function ExerciseMediaCard({ media }: { media?: QuestionMedia | null }) {
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setPaused(false)
    setFailed(false)
  }, [media?.url])

  if (!media || !media.url || failed) return null

  const isNoto = media.provider === "noto_emoji"
  const canPause = !isNoto && Boolean(media.previewUrl && media.previewUrl !== media.url)
  const activeSrc = paused && media.previewUrl ? media.previewUrl : media.url

  if (isNoto) {
    return (
      <figure className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 p-4 max-w-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt={media.altText || media.title || "Visual illustration"}
          className="size-24 sm:size-28 object-contain"
          loading="eager"
          onError={() => setFailed(true)}
        />
        {media.conceptKey && (
          <figcaption className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {media.conceptKey}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5 max-w-md shadow-xs">
      <div className="flex items-center justify-center overflow-hidden rounded bg-secondary/25">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeSrc}
          alt={media.altText || media.title || "Exercise visual"}
          className="max-h-52 w-full object-contain"
          loading="eager"
          onError={() => setFailed(true)}
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
        <span className="font-mono uppercase tracking-wider">
          {media.provider === "klipy" ? "GIF · KLIPY" : "Visual"}
        </span>
        {canPause && (
          <button
            type="button"
            onClick={() => setPaused((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-secondary"
          >
            {paused ? (
              <>
                <Play size={10} aria-hidden="true" /> Animar
              </>
            ) : (
              <>
                <Pause size={10} aria-hidden="true" /> Pausar
              </>
            )}
          </button>
        )}
      </div>
    </figure>
  )
}

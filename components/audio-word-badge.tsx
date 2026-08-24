"use client"

import { useEffect, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { fetchDictionaryWord, playPronunciation, type DictionaryResult } from "@/lib/dictionary"

type AudioWordBadgeProps = {
  word: string
  phonetic?: string | null
  audioUrl?: string | null
  showDefinition?: boolean
}

export function AudioWordBadge({
  word,
  phonetic: initialPhonetic,
  audioUrl: initialAudioUrl,
  showDefinition = false,
}: AudioWordBadgeProps) {
  const [data, setData] = useState<DictionaryResult | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!word) return

    if (!initialAudioUrl || !initialPhonetic) {
      setLoading(true)
      fetchDictionaryWord(word)
        .then((res) => {
          if (active && res) setData(res)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    return () => {
      active = false
    }
  }, [word, initialAudioUrl, initialPhonetic])

  const effectivePhonetic = initialPhonetic || data?.phonetic || ""
  const effectiveAudioUrl = initialAudioUrl || data?.audioUrl || null

  async function handlePlay(e: React.MouseEvent) {
    e.stopPropagation()
    if (playing) return
    setPlaying(true)
    await playPronunciation(word, effectiveAudioUrl)
    setPlaying(false)
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary/80 border border-border text-xs font-medium text-foreground group">
      <span className="font-semibold text-primary">{word}</span>
      {effectivePhonetic && (
        <span className="font-mono text-muted-foreground text-[11px] tracking-tight">
          /{effectivePhonetic.replace(/^\/|\/$/g, "")}/
        </span>
      )}
      <button
        type="button"
        onClick={handlePlay}
        className={`p-0.5 rounded hover:bg-primary/20 text-primary transition-all cursor-pointer ${
          playing ? "scale-110 text-primary animate-pulse" : "opacity-80 group-hover:opacity-100"
        }`}
        title={`Listen to pronunciation of "${word}"`}
        aria-label={`Pronounce ${word}`}
      >
        <Volume2 size={13} />
      </button>
    </span>
  )
}

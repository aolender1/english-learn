"use client"

import { useEffect, useRef, useState } from "react"
import { BookA, Loader2, Search, Volume2, VolumeX, X } from "lucide-react"
import { fetchDictionaryWord, playPronunciation, type DictionaryResult } from "@/lib/dictionary"

type DictionaryDialogProps = {
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
}

export function DictionaryDialog({ isOpen, onClose, initialQuery = "" }: DictionaryDialogProps) {
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<DictionaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [playing, setPlaying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setQuery(initialQuery)
        void performSearch(initialQuery)
      }
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setResult(null)
      setSearched(false)
    }
  }, [isOpen, initialQuery])

  async function performSearch(term: string) {
    const clean = term.trim()
    if (!clean) return
    setLoading(true)
    setSearched(true)
    try {
      const data = await fetchDictionaryWord(clean)
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      void performSearch(query)
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  async function handlePlay() {
    if (!result || playing) return
    setPlaying(true)
    await playPronunciation(result.word, result.audioUrl)
    setPlaying(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-panel max-w-2xl w-full flex flex-col gap-5 max-h-[85vh] overflow-hidden bg-card border border-border shadow-2xl rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dict-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded bg-primary/10 text-primary">
              <BookA size={16} />
            </span>
            <h2 id="dict-title" className="text-base font-semibold tracking-tight">
              English Dictionary & Pronunciation
            </h2>
          </div>
          <button onClick={onClose} className="icon-button size-7" aria-label="Close dictionary">
            <X size={15} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type an English word (e.g. challenge, through, beautiful)..."
            className="input-field pl-9 pr-24 py-2.5 text-sm w-full font-medium"
          />
          <button
            type="button"
            onClick={() => void performSearch(query)}
            disabled={loading || !query.trim()}
            className="button-primary absolute right-1.5 top-1/2 -translate-y-1/2 py-1 px-3 text-xs"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : "Look up"}
          </button>
        </div>

        {/* Search Content */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs font-mono">Searching Oxford / Cambridge dictionary...</span>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-5">
              {/* Word Title & Audio */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4 bg-secondary/30 p-4 rounded-md">
                <div className="flex flex-col gap-1">
                  <span className="text-3xl font-serif font-bold text-foreground capitalize">
                    {result.word}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {result.phonetic && (
                      <span className="font-mono text-sm text-primary">
                        /{result.phonetic.replace(/^\/|\/$/g, "")}/
                      </span>
                    )}
                    {result.spanishTranslation && (
                      <span className="tag text-xs font-sans font-medium bg-primary/10 text-primary border-primary/20">
                        {result.spanishTranslation}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePlay}
                  disabled={playing}
                  className="button-primary flex items-center gap-2 py-2 px-4 shadow-sm cursor-pointer"
                >
                  <Volume2 size={16} className={playing ? "animate-pulse text-amber-300" : ""} />
                  <span>{playing ? "Playing..." : "Listen Pronunciation"}</span>
                </button>
              </div>

              {/* Meanings */}
              <div className="flex flex-col gap-4">
                {result.meanings.map((meaning, mIdx) => (
                  <div key={mIdx} className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="tag font-mono text-[11px] uppercase tracking-wider font-semibold">
                        {meaning.partOfSpeech}
                      </span>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>

                    <ol className="flex flex-col gap-3 pl-4 list-decimal text-sm">
                      {meaning.definitions.slice(0, 3).map((def, dIdx) => (
                        <li key={dIdx} className="space-y-1">
                          <p className="text-foreground leading-relaxed">{def.definition}</p>
                          {def.example && (
                            <p className="text-xs text-muted-foreground italic pl-2 border-l-2 border-primary/40">
                              &ldquo;{def.example}&rdquo;
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>

                    {meaning.synonyms && meaning.synonyms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">Synonyms:</span>
                        {meaning.synonyms.slice(0, 5).map((syn) => (
                          <button
                            key={syn}
                            type="button"
                            onClick={() => {
                              setQuery(syn)
                              void performSearch(syn)
                            }}
                            className="tag text-[10px] hover:border-primary cursor-pointer"
                          >
                            {syn}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : searched ? (
            <div className="py-12 text-center text-muted-foreground text-sm border border-dashed border-border p-6 rounded">
              <p>Word &ldquo;{query}&rdquo; not found in dictionary.</p>
              <p className="text-xs mt-1 text-muted-foreground/80">
                Try checking the spelling or searching another English word.
              </p>
            </div>
          ) : (
            <div className="py-8 flex flex-col gap-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Popular words to explore:</p>
              <div className="flex flex-wrap gap-2">
                {["pronunciation", "vocabulary", "fluency", "grammar", "opportunity", "knowledge", "comprehension"].map(
                  (w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        setQuery(w)
                        void performSearch(w)
                      }}
                      className="tag hover:border-primary cursor-pointer py-1 px-2.5 text-xs"
                    >
                      {w}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

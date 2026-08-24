export type DictionaryPhonetic = {
  text?: string
  audio?: string
}

export type DictionaryDefinition = {
  definition: string
  example?: string
  synonyms?: string[]
  antonyms?: string[]
}

export type DictionaryMeaning = {
  partOfSpeech: string
  definitions: DictionaryDefinition[]
  synonyms?: string[]
  antonyms?: string[]
}

export type DictionaryRawEntry = {
  word: string
  phonetic?: string
  phonetics?: DictionaryPhonetic[]
  origin?: string
  meanings?: DictionaryMeaning[]
}

export type DictionaryResult = {
  word: string
  phonetic: string
  audioUrl: string | null
  meanings: DictionaryMeaning[]
}

const memoryCache = new Map<string, DictionaryResult | null>()

/**
 * Fetch word details, phonetics and audio via our internal server proxy endpoint.
 * This avoids browser extensions/CORS interceptors blocking direct external requests.
 */
export async function fetchDictionaryWord(rawWord: string): Promise<DictionaryResult | null> {
  const word = rawWord.toLowerCase().trim().replace(/[^a-z'-]/g, "")
  if (!word || word.length < 1) return null

  if (memoryCache.has(word)) {
    return memoryCache.get(word) ?? null
  }

  try {
    const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`)
    if (!res.ok) {
      memoryCache.set(word, null)
      return null
    }

    const data = (await res.json()) as DictionaryResult
    if (!data || !data.word) {
      memoryCache.set(word, null)
      return null
    }

    memoryCache.set(word, data)
    return data
  } catch (error) {
    console.warn(`[Dictionary] Fetch error for "${word}":`, error)
    memoryCache.set(word, null)
    return null
  }
}

/**
 * Speaks a word using the browser's native Web Speech API Synthesis.
 */
function speakNative(word: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve()
      return
    }
    try {
      window.speechSynthesis.cancel() // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = "en-US"
      utterance.rate = 0.9

      // Find an English voice if available
      const voices = window.speechSynthesis.getVoices()
      const enVoice = voices.find((v) => v.lang.startsWith("en-") || v.lang === "en")
      if (enVoice) utterance.voice = enVoice

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      window.speechSynthesis.speak(utterance)

      // Safety timeout in case onend never fires
      setTimeout(resolve, 2500)
    } catch {
      resolve()
    }
  })
}

/**
 * Plays the pronunciation audio for a given word.
 * 1. Tries the MP3 audioUrl from the dictionary if available.
 * 2. If missing or playback fails, falls back to native Web Speech API.
 */
export async function playPronunciation(word: string, audioUrl?: string | null): Promise<void> {
  if (typeof window === "undefined") return

  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl)
      const played = await new Promise<boolean>((resolve) => {
        audio.onended = () => resolve(true)
        audio.onerror = () => resolve(false)
        audio.play().catch(() => resolve(false))
      })
      if (played) return
    } catch {
      // Fall through to native synthesis
    }
  }

  // Fallback to Web Speech API
  await speakNative(word)
}

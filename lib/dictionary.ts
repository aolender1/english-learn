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
  spanishTranslation?: string
}

const memoryCache = new Map<string, DictionaryResult | null>()

// Cache and warm up browser speech synthesis voices
let cachedEnVoice: SpeechSynthesisVoice | null = null

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const updateVoice = () => {
    const voices = window.speechSynthesis.getVoices()
    if (!voices || voices.length === 0) return
    // Prefer natural / high-quality English voices
    const preferred =
      voices.find((v) => v.lang.startsWith("en-US") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))) ||
      voices.find((v) => v.lang.startsWith("en-GB") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Daniel"))) ||
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices.find((v) => v.lang.startsWith("en-")) ||
      voices.find((v) => v.lang === "en")
    if (preferred) cachedEnVoice = preferred
  }

  updateVoice()
  window.speechSynthesis.onvoiceschanged = updateVoice
}

/**
 * Fetch word details, phonetics and audio via our internal server proxy endpoint.
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
    memoryCache.set(word, null)
    return null
  }
}

/**
 * Speaks a word immediately using the browser's native Web Speech API Synthesis.
 * This runs with 0ms network latency and is 100% free, reliable, and unlimited.
 */
export function speakNative(word: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve()
      return
    }
    try {
      window.speechSynthesis.cancel() // Stop any previous speech immediately

      const cleanWord = word.trim()
      if (!cleanWord) {
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(cleanWord)
      utterance.lang = "en-US"
      utterance.rate = 0.9
      utterance.pitch = 1.0

      if (cachedEnVoice) {
        utterance.voice = cachedEnVoice
      } else {
        const voices = window.speechSynthesis.getVoices()
        const enVoice = voices.find((v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-") || v.lang === "en")
        if (enVoice) {
          cachedEnVoice = enVoice
          utterance.voice = enVoice
        }
      }

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      window.speechSynthesis.speak(utterance)

      // Safety timeout: resolve quickly if the browser doesn't fire onend
      setTimeout(resolve, 1800)
    } catch {
      resolve()
    }
  })
}

/**
 * Plays the pronunciation audio for a given word.
 * - Always uses instant native Web Speech API or very fast audio fallback.
 * - Enforces a strict 600ms timeout on any remote MP3 so it NEVER hangs or waits 20-30s.
 */
export async function playPronunciation(word: string, audioUrl?: string | null): Promise<void> {
  if (typeof window === "undefined") return

  // If no external URL or if URL is from notoriously blocked domain, use native speech directly for instant 0ms playback
  if (!audioUrl || audioUrl.includes("api.dictionaryapi.dev") || audioUrl.includes("gstatic.com")) {
    await speakNative(word)
    return
  }

  // If a valid custom audio URL is given, try playing it with a strict 600ms timeout
  try {
    const audio = new Audio(audioUrl)
    const played = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        audio.src = ""
        resolve(false)
      }, 600)

      audio.onplay = () => {
        clearTimeout(timer)
      }
      audio.onended = () => {
        clearTimeout(timer)
        resolve(true)
      }
      audio.onerror = () => {
        clearTimeout(timer)
        resolve(false)
      }

      audio.play().catch(() => {
        clearTimeout(timer)
        resolve(false)
      })
    })

    if (played) return
  } catch {
    // Fall through
  }

  // Instant fallback to Web Speech API
  await speakNative(word)
}

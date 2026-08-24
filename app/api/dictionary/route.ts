import type { DictionaryMeaning, DictionaryRawEntry, DictionaryResult } from "@/lib/dictionary"

const serverCache = new Map<string, DictionaryResult | null>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawWord = searchParams.get("word") ?? ""
  const word = rawWord.toLowerCase().trim().replace(/[^a-z'-]/g, "")

  if (!word || word.length < 1) {
    return Response.json({ error: "Invalid word" }, { status: 400 })
  }

  if (serverCache.has(word)) {
    const cached = serverCache.get(word)
    if (cached) return Response.json(cached)
    return Response.json({ error: "Word not found" }, { status: 404 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EnglishLearn/1.0)",
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      serverCache.set(word, null)
      return Response.json({ error: "Word not found in dictionary" }, { status: 404 })
    }

    const data = (await res.json()) as DictionaryRawEntry[]
    if (!Array.isArray(data) || data.length === 0) {
      serverCache.set(word, null)
      return Response.json({ error: "Word not found" }, { status: 404 })
    }

    const entry = data[0]

    // Find best phonetic transcription
    let phonetic = entry.phonetic ?? ""
    if (!phonetic && entry.phonetics) {
      const pWithText = entry.phonetics.find((p) => p.text && p.text.trim().length > 0)
      if (pWithText?.text) phonetic = pWithText.text
    }

    // Find best audio URL (.mp3)
    let audioUrl: string | null = null
    if (entry.phonetics) {
      const pWithAudio = entry.phonetics.find((p) => p.audio && p.audio.trim().length > 0)
      if (pWithAudio?.audio) {
        let raw = pWithAudio.audio.trim()
        if (raw.startsWith("//")) raw = `https:${raw}`
        audioUrl = raw
      }
    }

    const result: DictionaryResult = {
      word: entry.word || word,
      phonetic,
      audioUrl,
      meanings: entry.meanings ?? [],
    }

    serverCache.set(word, result)
    return Response.json(result)
  } catch (error) {
    console.warn(`[api/dictionary] Upstream fetch error for "${word}":`, error)
    return Response.json({ error: "Failed to fetch dictionary data" }, { status: 502 })
  }
}

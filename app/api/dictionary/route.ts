import fs from "node:fs"
import path from "node:path"
import type { DictionaryMeaning, DictionaryResult } from "@/lib/dictionary"

const serverCache = new Map<string, DictionaryResult | null>()

// In-memory local Cambridge vocabulary translation map
let localTranslations: Map<string, string> | null = null

function getLocalTranslations(): Map<string, string> {
  if (localTranslations) return localTranslations

  const map = new Map<string, string>()
  const dir = path.join(process.cwd(), "data", "vocabulary")

  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        if (!file.endsWith(".csv")) continue
        try {
          const content = fs.readFileSync(path.join(dir, file), "utf-8")
          const lines = content.split(/\r?\n/)
          for (const line of lines) {
            if (!line.trim()) continue
            const parts = line.split(";")
            if (parts.length >= 2) {
              const eng = parts[0].replace(/^"|"$/g, "").trim().toLowerCase()
              const esp = parts[1].replace(/^"|"$/g, "").trim()
              if (eng && esp && !map.has(eng)) {
                map.set(eng, esp)
              }
            }
          }
        } catch {
          // ignore single file parse errors
        }
      }
    }
  } catch {
    // ignore directory read errors
  }

  localTranslations = map
  return map
}

// Convert Datamuse part-of-speech codes to full words
const POS_MAP: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  u: "unknown",
}

async function fetchFromWiktionary(word: string): Promise<DictionaryMeaning[] | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, {
      headers: {
        "User-Agent": "EnglishLearnApp/1.0 (educational app)",
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return null

    const data = await res.json()
    if (!data || !data.en || !Array.isArray(data.en)) return null

    const meanings: DictionaryMeaning[] = []
    for (const section of data.en) {
      if (!section.definitions || !Array.isArray(section.definitions)) continue
      const validDefs = section.definitions
        .slice(0, 3)
        .map((d: { definition?: string; parsedExamples?: Array<{ example?: string }> }) => {
          const rawDef = (d.definition || "").replace(/<[^>]*>?/gm, "").trim()
          const example = d.parsedExamples?.[0]?.example
            ? (d.parsedExamples[0].example || "").replace(/<[^>]*>?/gm, "").trim()
            : undefined
          return { definition: rawDef, example }
        })
        .filter((d: { definition: string }) => d.definition.length > 0)

      if (validDefs.length > 0) {
        meanings.push({
          partOfSpeech: (section.partOfSpeech || "word").toLowerCase(),
          definitions: validDefs,
          synonyms: [],
        })
      }
    }

    return meanings.length > 0 ? meanings : null
  } catch {
    return null
  }
}

async function fetchFromDatamuse(word: string): Promise<{ meanings: DictionaryMeaning[]; synonyms: string[] } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dpr&max=1`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0 || !data[0].defs) return null

    const item = data[0]
    const grouped = new Map<string, Array<{ definition: string }>>()

    for (const defStr of item.defs) {
      const parts = defStr.split("\t")
      const rawPos = parts[0] || "n"
      const defText = (parts[1] || "").trim()
      if (!defText) continue
      const posName = POS_MAP[rawPos] || "definition"
      if (!grouped.has(posName)) grouped.set(posName, [])
      grouped.get(posName)!.push({ definition: defText })
    }

    const meanings: DictionaryMeaning[] = []
    for (const [pos, defs] of grouped.entries()) {
      meanings.push({
        partOfSpeech: pos,
        definitions: defs.slice(0, 3),
        synonyms: [],
      })
    }

    return meanings.length > 0 ? { meanings, synonyms: [] } : null
  } catch {
    return null
  }
}

async function fetchSpanishTranslation(word: string): Promise<string> {
  // 1. Check local Cambridge CSVs first (0ms, curated)
  const localMap = getLocalTranslations()
  const found = localMap.get(word)
  if (found) return found

  // 2. Fallback to free MyMemory API
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)

    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|es`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      const trans = data.responseData?.translatedText
      if (trans && typeof trans === "string" && !trans.toLowerCase().includes("mymemory")) {
        return trans.trim().toLowerCase()
      }
    }
  } catch {
    // ignore
  }

  return ""
}

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

  // 1. Fetch definitions and meanings from Wiktionary & Datamuse (100% Free, NO Gemini API usage)
  let meanings = await fetchFromWiktionary(word)

  if (!meanings || meanings.length === 0) {
    const datamuseData = await fetchFromDatamuse(word)
    if (datamuseData) {
      meanings = datamuseData.meanings
    }
  }

  // If no dictionary data found
  if (!meanings || meanings.length === 0) {
    serverCache.set(word, null)
    return Response.json({ error: `Word "${word}" not found in dictionary` }, { status: 404 })
  }

  // 2. Fetch Spanish translation (Local CSV -> MyMemory)
  const spanishTranslation = await fetchSpanishTranslation(word)

  const result: DictionaryResult = {
    word,
    phonetic: "",
    audioUrl: null,
    spanishTranslation: spanishTranslation || undefined,
    meanings,
  }

  serverCache.set(word, result)
  return Response.json(result)
}

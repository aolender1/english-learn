import notoCatalogData from "@/data/noto-animated-emoji.json"
import type { QuestionMedia } from "./question-bank"

export type NotoCatalogEntry = {
  cp: string
  cat: string
  tags: string[]
}

export type NotoEmojiSearchResult = {
  codepoint: string
  url: string
  gifUrl: string
  title: string
  category: string
  tags: string[]
}

const NOTO_ENTRIES = notoCatalogData as NotoCatalogEntry[]

export const NOTO_CATEGORIES: string[] = Array.from(
  new Set(NOTO_ENTRIES.map((item) => item.cat)),
)

const byCodepoint = new Map<string, NotoCatalogEntry>()
const byExactTag = new Map<string, NotoCatalogEntry[]>()
const byToken = new Map<string, NotoCatalogEntry[]>()

for (const entry of NOTO_ENTRIES) {
  byCodepoint.set(entry.cp, entry)
  for (const tag of entry.tags) {
    const existing = byExactTag.get(tag) ?? []
    existing.push(entry)
    byExactTag.set(tag, existing)

    for (const part of tag.split(/[-_\s]+/)) {
      if (part.length < 2) continue
      const list = byToken.get(part) ?? []
      list.push(entry)
      byToken.set(part, list)
    }
  }
}

export function notoWebpUrl(codepoint: string): string {
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/512.webp`
}

export function notoGifUrl(codepoint: string): string {
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/512.gif`
}

/**
 * Curated English learner word -> verified Noto codepoint aliases.
 * Every entry is checked against `byCodepoint` at module init so no invalid URL can ever be emitted.
 */
const RAW_CONCEPT_CODEPOINTS: Record<string, string> = {
  // Animals
  cat: "1f63a",
  cats: "1f63a",
  kitten: "1f63a",
  dog: "1f415",
  dogs: "1f415",
  puppy: "1f415",
  bird: "1f426",
  birds: "1f426",
  fish: "1f41f",
  horse: "1f3a0",
  horses: "1f3a0",
  monkey: "1f648",
  frog: "1f438",
  lion: "1f981",
  tiger: "1f405",
  bear: "1f43b",
  cow: "1f42e",
  pig: "1f416",
  rabbit: "1f407",
  bunny: "1f407",
  chicken: "1f357",
  panda: "1f43c",
  wolf: "1f43a",

  // Sports & Activities
  football: "26bd",
  soccer: "26bd",
  ball: "26bd",
  baseball: "26be",
  basketball: "1f3c0",
  tennis: "1f3be",
  run: "1f45f",
  running: "1f45f",
  jogging: "1f45f",
  shoe: "1f45f",
  shoes: "1f45f",
  bike: "1f6b2",
  bicycle: "1f6b2",
  cycling: "1f6b2",
  ride: "1f6b2",
  riding: "1f6b2",
  swim: "1f30a",
  swimming: "1f30a",
  ocean: "1f30a",
  sea: "1f30a",
  beach: "1f30a",
  cook: "1f373",
  cooking: "1f373",
  breakfast: "1f373",
  egg: "1f373",
  eggs: "1f373",
  music: "1f3b6",
  sing: "1f3b6",
  singing: "1f3b6",
  song: "1f3b6",
  guitar: "1f3b8",
  dance: "1faa9",
  dancing: "1faa9",
  party: "1f388",
  balloon: "1f388",
  birthday: "1f382",
  gift: "1f381",
  present: "1f381",
  camera: "1f4f7",
  photo: "1f4f7",
  photograph: "1f4f7",
  camp: "1f3d5_fe0f",
  camping: "1f3d5_fe0f",

  // Food & Drink
  apple: "1f34e",
  apples: "1f34e",
  orange: "1f34a",
  oranges: "1f34a",
  juice: "1f34a",
  strawberry: "1f353",
  watermelon: "1f349",
  carrot: "1f955",
  banana: "1f34a",
  pizza: "1f355",
  burger: "1f354",
  hamburger: "1f354",
  bread: "1f35e",
  cake: "1f382",
  salad: "1f957",
  meat: "1f357",
  soup: "1f35c",
  tea: "1f9cb",
  drink: "1f9cb",
  drinking: "1f9cb",
  tomato: "1f345",
  potato: "1f954",
  cheese: "1f9c0",
  lemon: "1f34b",
  pancakes: "1f95e",
  taco: "1f32e",
  spaghetti: "1f35d",

  // Transport & Places
  car: "1f697",
  cars: "1f697",
  drive: "1f697",
  driving: "1f697",
  taxi: "1f695",
  bus: "1f68c",
  train: "1f682",
  trains: "1f682",
  station: "1f682",
  plane: "2708_fe0f",
  airplane: "2708_fe0f",
  airport: "1f6eb",
  flight: "1f6eb",
  fly: "2708_fe0f",
  flying: "2708_fe0f",
  travel: "2708_fe0f",
  boat: "26f5",
  ship: "26f5",
  sailboat: "26f5",
  house: "1f3e0",
  home: "1f3e0",
  school: "1f393",
  university: "1f393",
  student: "1f393",
  study: "1f4da",
  studying: "1f4da",
  book: "1f4da",
  books: "1f4da",
  read: "1f4da",
  reading: "1f4da",
  library: "1f4da",
  hospital: "1fa7a",
  doctor: "1fa7a",
  shop: "1f6d2",
  shopping: "1f6d2",
  supermarket: "1f6d2",
  buy: "1f6d2",
  park: "1f332",
  tree: "1f332",
  trees: "1f332",
  forest: "1f332",
  flower: "1f339",
  flowers: "1f490",
  rose: "1f339",

  // Weather & Nature
  sun: "1f31e",
  sunny: "1f31e",
  rain: "1f327_fe0f",
  raining: "1f327_fe0f",
  rainy: "1f327_fe0f",
  umbrella: "2602_fe0f",
  cloud: "2601_fe0f",
  cloudy: "2601_fe0f",
  snow: "2744_fe0f",
  snowing: "2744_fe0f",
  cold: "2744_fe0f",
  winter: "2744_fe0f",
  wind: "1f32c_fe0f",
  windy: "1f32c_fe0f",
  storm: "1f329_fe0f",
  lightning: "26a1",
  rainbow: "1f308",
  moon: "1f31d",
  night: "1f31d",
  star: "2b50",
  stars: "2b50",
  fire: "1f525",
  hot: "1f525",
  sunset: "1f307",

  // Objects & Everyday
  computer: "1f4bb",
  laptop: "1f4bb",
  work: "1f4bb",
  pencil: "270f_fe0f",
  write: "270f_fe0f",
  writing: "270f_fe0f",
  clock: "23f0",
  alarm: "23f0",
  money: "1f4b8",
  pay: "1f4b8",
  idea: "1f4a1",
  phone: "1f4f4",
  bell: "1f514",
  crown: "1f451",
  ring: "1f48d",

  // Emotions & States
  happy: "1f642",
  smile: "1f600",
  laugh: "1f606",
  laughing: "1f606",
  sad: "1f61e",
  cry: "1f622",
  crying: "1f622",
  angry: "1f620",
  mad: "1f620",
  sleep: "1f634",
  sleeping: "1f634",
  tired: "1fae9",
  sleepy: "1f62a",
  love: "1f970",
  married: "1f48d",
  marriage: "1f48d",
  scared: "1f628",
  nervous: "1f628",
  excited: "1f929",
  cool: "1f60e",
  glasses: "1f60e",
  sunglasses: "1f60e",
}

const VERIFIED_CONCEPT_MAP = new Map<string, NotoCatalogEntry>()
for (const [concept, cp] of Object.entries(RAW_CONCEPT_CODEPOINTS)) {
  const entry = byCodepoint.get(cp)
  if (entry) VERIFIED_CONCEPT_MAP.set(concept, entry)
}

const STOPWORDS = new Set([
  // Grammar / meta-instruction words
  "rewrite",
  "complete",
  "choose",
  "select",
  "translate",
  "traducí",
  "traduci",
  "inglés",
  "ingles",
  "español",
  "espanol",
  "using",
  "correct",
  "form",
  "sentence",
  "sentences",
  "present",
  "simple",
  "perfect",
  "past",
  "future",
  "continuous",
  "tense",
  "verb",
  "verbs",
  "noun",
  "nouns",
  "adjective",
  "adjectives",
  "adverb",
  "pronoun",
  "question",
  "negative",
  "affirmative",
  "reported",
  "speech",
  "conditional",
  "passive",
  "active",
  "modal",
  "article",
  "articles",
  "preposition",
  "word",
  "words",
  "option",
  "blank",
  "use",
  "fact",
  "current",
  "example",
  // Common function words & auxiliaries
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "day",
  "get",
  "has",
  "him",
  "his",
  "how",
  "its",
  "may",
  "new",
  "now",
  "old",
  "see",
  "two",
  "way",
  "who",
  "did",
  "let",
  "put",
  "say",
  "she",
  "too",
  "got",
  "have",
  "has",
  "with",
  "they",
  "this",
  "that",
  "these",
  "those",
  "from",
  "what",
  "when",
  "where",
  "which",
  "whose",
  "while",
  "will",
  "would",
  "shall",
  "should",
  "could",
  "might",
  "must",
  "there",
  "their",
  "them",
  "then",
  "than",
  "been",
  "being",
  "were",
  "does",
  "doing",
  "done",
  "said",
  "told",
  "asked",
  "look",
  "looking",
  "make",
  "made",
  "take",
  "took",
  "give",
  "gave",
  "went",
  "come",
  "came",
  "going",
  "about",
  "into",
  "over",
  "under",
  "between",
  "next",
  "after",
  "before",
  "during",
  "since",
  "ever",
  "never",
  "always",
  "usually",
  "often",
  "sometimes",
  "normally",
  "generally",
  "right",
  "today",
  "yesterday",
  "tomorrow",
  "years",
  "year",
  "months",
  "month",
  "weeks",
  "week",
  "days",
  "hours",
  "hour",
  "time",
  "here",
  "very",
  "really",
  "much",
  "many",
  "more",
  "most",
  "some",
  "any",
  "everyone",
  "someone",
  "anyone",
  "everything",
  "something",
  "anything",
  "nothing",
  "people",
  "person",
  "thing",
  "things",
  "started",
  "stopped",
  "feeling",
  "live",
  "living",
  "also",
  "just",
  "only",
  "even",
  "well",
  "good",
  "badly",
  "bad",
  "big",
  "small",
  "long",
  "short",
  "don't",
  "doesn't",
  "didn't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "can't",
  "won't",
  "wouldn't",
  // Spanish common words (so translation prompts don't leak Spanish stopwords)
  "que",
  "para",
  "con",
  "por",
  "una",
  "uno",
  "unos",
  "unas",
  "los",
  "las",
  "del",
  "esta",
  "está",
  "están",
  "son",
  "soy",
  "eres",
  "fue",
  "era",
  "muy",
  "ayer",
  "hoy",
  "mañana",
  "ahora",
  "siempre",
  "nunca",
  "todos",
  "todas",
  "todo",
  "sobre",
  "entre",
  "hace",
  "desde",
  "como",
  "pero",
  "porque",
  "cuando",
  "donde",
  "centro",
  "ciudad",
  "situada",
  "situado",
])

function formatTitleFromEntry(entry: NotoCatalogEntry): string {
  const first = entry.tags[0] ?? entry.cp
  return first.replace(/[-_]+/g, " ")
}

function toSearchResult(entry: NotoCatalogEntry): NotoEmojiSearchResult {
  return {
    codepoint: entry.cp,
    url: notoWebpUrl(entry.cp),
    gifUrl: notoGifUrl(entry.cp),
    title: formatTitleFromEntry(entry),
    category: entry.cat,
    tags: entry.tags,
  }
}

export function searchNotoEmojis(
  query: string,
  category?: string,
  limit = 36,
): NotoEmojiSearchResult[] {
  const cleanQuery = query.trim().toLowerCase()
  const cleanCategory = category?.trim()
  const results: NotoCatalogEntry[] = []
  const seen = new Set<string>()

  const pushUnique = (entry: NotoCatalogEntry | undefined) => {
    if (!entry || seen.has(entry.cp)) return
    if (cleanCategory && cleanCategory !== "all" && entry.cat !== cleanCategory) return
    seen.add(entry.cp)
    results.push(entry)
  }

  if (cleanQuery) {
    // 1. Curated concept alias match
    pushUnique(VERIFIED_CONCEPT_MAP.get(cleanQuery))

    // 2. Exact tag match
    for (const item of byExactTag.get(cleanQuery) ?? []) {
      pushUnique(item)
    }

    // 3. Exact tag token match
    for (const part of cleanQuery.split(/[\s_-]+/)) {
      if (part.length < 2) continue
      pushUnique(VERIFIED_CONCEPT_MAP.get(part))
      for (const item of byToken.get(part) ?? []) {
        pushUnique(item)
      }
    }

    // 4. Substring tag fallback
    if (results.length < limit) {
      for (const entry of NOTO_ENTRIES) {
        if (results.length >= limit) break
        if (entry.tags.some((t) => t.includes(cleanQuery))) {
          pushUnique(entry)
        }
      }
    }
  } else {
    for (const entry of NOTO_ENTRIES) {
      if (results.length >= limit) break
      pushUnique(entry)
    }
  }

  return results.slice(0, limit).map(toSearchResult)
}

function cleanPromptText(prompt: string): string {
  return prompt
    .replace(/_{2,}/g, " ")
    .replace(/^(traduc[ií]\s+al\s+ingl[eé]s|rewrite[^:]*|complete[^:]*|report\s+this|choose[^:]*)\s*:\s*/i, "")
    .replace(/\(use:[^)]*\)/gi, " ")
    .replace(/->/g, " ")
}

function tokenizeEnglishWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .split(/[^a-z']+/)
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

/**
 * Extracts the clearest concrete visual concept from an exercise prompt (or word fallback).
 * Avoids grammar stopwords like "is", "it", "this" and avoids leaking exact blank answers.
 */
export function extractVisualConcept(
  prompt: string,
  word?: string | null,
  expectedAnswer?: string | null,
): string | null {
  const cleanedPrompt = cleanPromptText(prompt)
  const expectedLower = (expectedAnswer ?? "").trim().toLowerCase()
  const isSpanishPrompt = /\b(traduc[ií]|el|la|los|las|está|están|ciudad)\b/i.test(prompt)

  const promptTokens = tokenizeEnglishWords(cleanedPrompt).filter(
    (t) => t !== expectedLower,
  )

  // 1. Prefer a token that directly matches our verified concrete concept map
  for (const token of promptTokens) {
    if (VERIFIED_CONCEPT_MAP.has(token)) {
      return token
    }
  }

  // 2. Check target word if it's a concrete non-stopword (great for Spanish translation prompts!)
  if (word) {
    const wordTokens = tokenizeEnglishWords(word)
    for (const wt of wordTokens) {
      if (VERIFIED_CONCEPT_MAP.has(wt)) return wt
    }
    if (
      wordTokens.length > 0 &&
      (isSpanishPrompt || !prompt.includes("______") || word.trim().toLowerCase() !== expectedLower)
    ) {
      return wordTokens.join(" ")
    }
  }

  // 3. Prefer a token present in Noto exact tags or tokens
  for (const token of promptTokens) {
    if (byExactTag.has(token) || byToken.has(token)) {
      return token
    }
  }

  // 4. Fallback to first concrete English noun/verb token in the prompt
  return promptTokens[0] ?? null
}

export function findNotoMatchForConcept(concept: string): {
  codepoint: string
  conceptKey: string
  url: string
  previewUrl: string
  title: string
  category: string
} | null {
  const clean = concept.trim().toLowerCase()
  if (!clean) return null

  const direct = VERIFIED_CONCEPT_MAP.get(clean)
  if (direct) {
    return {
      codepoint: direct.cp,
      conceptKey: clean,
      url: notoWebpUrl(direct.cp),
      previewUrl: notoGifUrl(direct.cp),
      title: formatTitleFromEntry(direct),
      category: direct.cat,
    }
  }

  const exactTag = byExactTag.get(clean)?.[0]
  if (exactTag) {
    return {
      codepoint: exactTag.cp,
      conceptKey: clean,
      url: notoWebpUrl(exactTag.cp),
      previewUrl: notoGifUrl(exactTag.cp),
      title: formatTitleFromEntry(exactTag),
      category: exactTag.cat,
    }
  }

  for (const part of clean.split(/\s+/)) {
    if (part.length < 3 || STOPWORDS.has(part)) continue
    const aliased = VERIFIED_CONCEPT_MAP.get(part)
    if (aliased) {
      return {
        codepoint: aliased.cp,
        conceptKey: part,
        url: notoWebpUrl(aliased.cp),
        previewUrl: notoGifUrl(aliased.cp),
        title: formatTitleFromEntry(aliased),
        category: aliased.cat,
      }
    }
    const tokenHit = byExactTag.get(part)?.[0]
    if (tokenHit) {
      return {
        codepoint: tokenHit.cp,
        conceptKey: part,
        url: notoWebpUrl(tokenHit.cp),
        previewUrl: notoGifUrl(tokenHit.cp),
        title: formatTitleFromEntry(tokenHit),
        category: tokenHit.cat,
      }
    }
  }

  return null
}

/**
 * Synchronous, zero-network fallback returning a verified Noto Animated WebP
 * for concrete visual concepts found in an exercise prompt/word.
 */
export function findNotoMatchForExercise(
  prompt: string,
  word?: string | null,
  expectedAnswer?: string | null,
): QuestionMedia | null {
  const concept = extractVisualConcept(prompt, word, expectedAnswer)
  if (!concept) return null

  const match = findNotoMatchForConcept(concept)
  if (!match) return null

  return {
    conceptKey: match.conceptKey,
    provider: "noto_emoji",
    mediaType: "webp",
    url: match.url,
    previewUrl: match.previewUrl,
    title: match.title,
    altText: `Visual hint: ${match.title}`,
  }
}

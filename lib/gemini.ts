import aiModelsConfig from "@/config/ai-models.json"
import { auditGeneratedExercises } from "./gemini-decisions"
import type { CefrLevel } from "./question-bank"
import type { TopicDef } from "./topics"

const API_BASE = "https://generativelanguage.googleapis.com/v1beta"

export const AI_MODELS_CONFIG = aiModelsConfig

/** Primary model for lightweight/interactive exercise generation and brief explanations */
export const EXERCISE_MODEL =
  process.env.GEMINI_EXERCISE_MODEL ?? aiModelsConfig.tasks.lightweight.primaryModel
export const FALLBACK_MODELS =
  aiModelsConfig.tasks.lightweight.fallbackModels

/** Primary model for heavy/bulk exercise generation and calibration */
export const HEAVY_MODEL =
  process.env.GEMINI_HEAVY_MODEL ?? aiModelsConfig.tasks.heavy.primaryModel
export const HEAVY_FALLBACK_MODELS =
  aiModelsConfig.tasks.heavy.fallbackModels

export const PROMPT_VERSION = "v4"

export type ExerciseGenMode = "multiple_choice" | "open_response" | "mixed"
export type ExerciseGenTier = "lightweight" | "heavy"
export type ThinkingLevel = "LOW" | "MEDIUM" | "HIGH" | "XHIGH"

export type GeneratedExerciseItem = {
  exercise_type: "multiple_choice" | "open_response"
  prompt: string
  options: string[]
  correct_answer_index: number
  expected_answer?: string
  acceptable_answers?: string[]
  hint?: string
  explanation: string
  word: string
  phonetic: string
  spanish_translation: string
  difficulty: "easy" | "medium" | "hard"
}

export type ExerciseGenerationResult = {
  items: GeneratedExerciseItem[]
  modelUsed: string
  qa: {
    checked: number
    passed: number
    rejected: number
    skipped: boolean
  }
}

class TransientGeminiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "TransientGeminiError"
    this.status = status
  }
}

function requireApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY is not configured")
  return key
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { code?: number; message?: string; status?: string }
}

const LEVEL_PROFILES: Record<
  CefrLevel,
  {
    name: string
    ageGroup: string
    sentenceLength: string
    maxWords: number
    syntaxRules: string
    sampleSentences: string[]
  }
> = {
  "pre-a1-starters": {
    name: "Pre A1 Starters",
    ageGroup: "Young children (ages 6-8), absolute beginners",
    sentenceLength: "VERY SHORT (4 to 7 words maximum per sentence)",
    maxWords: 7,
    syntaxRules:
      "CRITICAL: Keep sentences extremely short (4 to 7 words max). Use only basic concrete words (cat, dog, ball, apple, red, big, car, book, boy, girl, table). NEVER use complex clauses, subclauses with 'because/although', or advanced adjectives. The blank must test the exact grammar focus in a crystal-clear, child-friendly way.",
    sampleSentences: [
      "The cat ______ on the chair. (is / are / am / be)",
      "This is ______ orange apple. (an / a / the / two)",
      "I have got three ______ today. (pencils / pencil / a pencil / penciled)",
      "Look! ______ is my red ball. (That / These / Those / They)",
      "She ______ ride a big bike. (can / cans / is / has)",
    ],
  },
  "a1-movers": {
    name: "A1 Movers",
    ageGroup: "Primary students (ages 8-10), elementary",
    sentenceLength: "SHORT (6 to 10 words)",
    maxWords: 10,
    syntaxRules:
      "Keep sentences concise (6 to 10 words). Use simple daily activities (school, sports, hobbies, home). Simple time markers (yesterday, now, on Sundays). Only simple connectors like 'and' or 'but'.",
    sampleSentences: [
      "Yesterday, Tom ______ football in the park. (played / play / plays / playing)",
      "She usually ______ orange juice for breakfast. (drinks / is drinking / drink / drinking)",
      "Look! The baby ______ right now. (is sleeping / sleeps / sleep / slept)",
    ],
  },
  "a2-flyers": {
    name: "A2 Flyers",
    ageGroup: "Upper primary (ages 10-12)",
    sentenceLength: "CLEAR & MODERATE (8 to 13 words)",
    maxWords: 13,
    syntaxRules:
      "Sentences of 8 to 13 words. Regular past events, comparisons, past continuous, going to, simple relative pronouns.",
    sampleSentences: [
      "While we were walking home, it ______ to rain heavily. (started / starts / starting / start)",
    ],
  },
  "a2-key": {
    name: "A2 Key for Schools",
    ageGroup: "Teens and young adults, basic practical English",
    sentenceLength: "PRACTICAL & DIRECT (8 to 14 words)",
    maxWords: 14,
    syntaxRules:
      "Practical daily contexts (shopping, directions, travel, routines). Modals (must, should, can), basic conjunctions.",
    sampleSentences: [
      "You ______ wear a helmet when you ride your bike. (must / mustn't / don't have to / might)",
    ],
  },
  "b1-preliminary": {
    name: "B1 Preliminary",
    ageGroup: "Intermediate learners",
    sentenceLength: "NATURAL INTERMEDIATE (10 to 16 words)",
    maxWords: 16,
    syntaxRules:
      "Present perfect, past continuous, 1st & 2nd conditionals, passive voice, relative clauses.",
    sampleSentences: [
      "If I ______ more free time, I would learn how to play the violin. (had / have / will have / would have)",
    ],
  },
  "b1-plus": {
    name: "B1+ Intermediate Plus",
    ageGroup: "Upper intermediate threshold",
    sentenceLength: "RICH INTERMEDIATE (12 to 18 words)",
    maxWords: 18,
    syntaxRules:
      "Modal deduction, passive voice, contrasting connectors (although, however, despite), complex verb patterns.",
    sampleSentences: [],
  },
  "b2-first": {
    name: "B2 First (FCE)",
    ageGroup: "Upper intermediate",
    sentenceLength: "UPPER INTERMEDIATE (14 to 22 words)",
    maxWords: 22,
    syntaxRules:
      "Inversions, cleft sentences, participle clauses, 3rd conditionals, sophisticated collocations.",
    sampleSentences: [],
  },
  "c1-advanced": {
    name: "C1 Advanced (CAE)",
    ageGroup: "Advanced academic & professional",
    sentenceLength: "ADVANCED (16 to 26 words)",
    maxWords: 26,
    syntaxRules: "Subjunctive, inversion, subtle nuances, idiomatic expressions, academic discourse.",
    sampleSentences: [],
  },
  "c2-proficiency": {
    name: "C2 Proficiency (CPE)",
    ageGroup: "Mastery level",
    sentenceLength: "MASTERY COMPLEXITY (18 to 30 words)",
    maxWords: 30,
    syntaxRules: "Stylistic perfection, subtle irony, rare collocations, native-level precision.",
    sampleSentences: [],
  },
}

function buildMultipleChoicePrompt(
  count: number,
  levelId: CefrLevel,
  levelCode: string,
  topic: TopicDef,
  sampleWords: Array<{ english: string; spanish: string }>,
): string {
  const profile = LEVEL_PROFILES[levelId] ?? LEVEL_PROFILES["pre-a1-starters"]
  const slug = (topic?.slug || "").toLowerCase()
  const isPhonetics = slug.includes("phonetics") || slug.includes("pronunciation")

  const sampleWordList = sampleWords.slice(0, 15).map((w) => w.english).join(", ")
  const isYoungLearner =
    levelId === "pre-a1-starters" || levelId === "a1-movers" || levelId === "a2-flyers"

  if (isPhonetics) {
    return `You are a master Cambridge English phonetics author creating practice material for CEFR ${levelCode} (${profile.name}).

TOPIC: "${topic.title}"
FOCUS: "${topic.focus}"
DESCRIPTION: "${topic.description}"
LEVEL CONSTRAINT: ${profile.sentenceLength}. Designed for ${profile.ageGroup}.

TASK:
Create EXACTLY ${count} multiple-choice exercises testing pronunciation, phonetic sounds (IPA), syllable stress, vowel length, or sound discrimination suited for ${profile.name}.

FORMAT REQUIREMENTS:
- Exactly 4 options per question.
- "prompt": The question or sentence with "______".
- "options": Array of 4 strings.
- "correct_answer_index": 0, 1, 2, or 3.
- "explanation": ${
      isYoungLearner
        ? "Simple English phonetics tip followed by '🇪🇸 En español: ' explaining the sound in simple Spanish for children."
        : "Clear, simple explanation of the pronunciation rule."
    }
- "word": The target word.
- "phonetic": IPA pronunciation.
- "spanish_translation": Spanish translation or sound tip.
- "difficulty": "easy" or "medium".

Return ONLY a valid JSON array of ${count} objects matching the schema.`
  }

  const explanationInstruction = isYoungLearner
    ? `4. PEDAGOGICAL EXPLANATION (CRITICAL FOR YOUNG LEARNERS):
   - Since these students are young children and beginners who are just starting with English, the explanation MUST BE DUAL-LANGUAGE (Simple English rule + Clear Spanish explanation):
   - Structure: Short English rule sentence, followed by "🇪🇸 En español: " with a simple explanation in Spanish explaining WHY it is correct.
   - Example: "Use 'is' with singular third-person subjects. 🇪🇸 En español: Usamos 'is' porque 'The cat' es un solo animal."
   - Example: "Use 'an' before words that start with a vowel sound. 🇪🇸 En español: Usamos 'an' porque 'orange' comienza con sonido de vocal."
   - Example: "Use 'played' for actions finished in the past. 🇪🇸 En español: Usamos 'played' porque la oración dice 'yesterday' (ayer)."
   - Keep the Spanish explanation warm, simple, and direct so a beginner child instantly understands.`
    : `4. PEDAGOGICAL EXPLANATION:
   - Provide a clear, friendly grammatical explanation in English explaining why the correct option is right and why the other 3 fail the grammar rule.`

  return `You are an expert Cambridge English exam author creating practice exercises for CEFR ${levelCode} (${profile.name}).
${
  isYoungLearner
    ? `IMPORTANT: This is for YOUNG LEARNERS (Beginner Children). Every "explanation" MUST be bilingual with an English rule and a Spanish explanation starting with "🇪🇸 En español: ".`
    : ""
}

TOPIC DETAILS:
- Topic Title: "${topic.title}"
- Grammatical Focus: "${topic.focus}"
- Description: "${topic.description}"
- Level: CEFR ${levelCode} (${profile.name})
- Target Audience: ${profile.ageGroup}

STRICT LEVEL & SENTENCE LENGTH RULES:
1. SENTENCE LENGTH: ${profile.sentenceLength}.
   ${profile.syntaxRules}

2. UNAMBIGUOUS CONTEXT: The sentence MUST contain crystal-clear cues so that ONLY ONE answer is logically and grammatically valid.
   - For ${profile.name}, ensure the sentence is immediately clear and NOT convoluted.

3. FOUR BALANCED OPTIONS:
   - Exactly 4 distinct choices (1 correct answer + 3 realistic distractors representing typical learner mistakes for this level).

${explanationInstruction}

5. SAMPLE VOCABULARY TO USE (NATURALLY):
   - ${sampleWordList || "everyday basic vocabulary"}

6. OUTPUT FORMAT:
   - "prompt": The sentence with "______" where the blank goes.
   - "options": Array of 4 strings.
   - "correct_answer_index": Integer (0, 1, 2, or 3).
   - "explanation": ${
     isYoungLearner
       ? "MANDATORY BILINGUAL: Short English rule sentence followed by ' 🇪🇸 En español: ' with a simple Spanish explanation for children."
       : "Grammatical explanation in English."
   }
   - "word": The tested word/target item.
   - "phonetic": IPA pronunciation.
   - "spanish_translation": Spanish translation.
   - "difficulty": "easy" or "medium".

Generate EXACTLY ${count} distinct exercises.
Return ONLY a valid JSON array of ${count} objects matching the schema.`
}

function buildOpenResponsePrompt(
  count: number,
  levelId: CefrLevel,
  levelCode: string,
  topic: TopicDef,
  sampleWords: Array<{ english: string; spanish: string }>,
): string {
  const profile = LEVEL_PROFILES[levelId] ?? LEVEL_PROFILES["pre-a1-starters"]
  const sampleWordList = sampleWords.slice(0, 15).map((w) => `${w.english} (${w.spanish})`).join(", ")
  const isYoungLearner =
    levelId === "pre-a1-starters" || levelId === "a1-movers" || levelId === "a2-flyers"

  return `You are an expert Cambridge English author designing interactive OPEN-ENDED WRITING exercises for Spanish-speaking learners at CEFR ${levelCode} (${profile.name}).

TOPIC DETAILS:
- Topic Title: "${topic.title}"
- Grammatical Focus: "${topic.focus}"
- Description: "${topic.description}"
- Level: CEFR ${levelCode} (${profile.name})
- Target Audience: ${profile.ageGroup}

STRICT LEVEL & LENGTH RULES:
- ${profile.sentenceLength}.
- ${profile.syntaxRules}

TASK:
Create EXACTLY ${count} varied open-response exercises (NO multiple-choice options) that force active English production around "${topic.focus}".
Alternate naturally across these 3 formats:
1. Sentence transformation / rewrite (e.g., 'Rewrite in past simple: "Tom plays football every day." (Use: yesterday)' or 'Report this: Mia said, "I am tired."').
2. Spanish → English translation (e.g., 'Traducí al inglés: "Ayer jugamos al fútbol en el parque."').
3. Open fill-in-the-blank with cue in parentheses (e.g., 'Yesterday, Tom ______ (play) football in the park.'). Note: use "______" ONLY when asking to fill a single missing word/verb form with a clear cue in parentheses.

REQUIREMENTS FOR EVERY ITEM:
- "prompt": Clear instruction + sentence in English (or Spanish if translation). Never include A/B/C/D options.
- "expected_answer": The best canonical English response (for blanks, ONLY the missing word/phrase; for translations/rewrites, the full English sentence).
- "acceptable_answers": Array of 2 to 3 valid alternative English answers (e.g., contractions like "don't" vs "do not", optional "that", or full sentence when prompt has "______").
- "hint": A concise, helpful hint in Spanish (max 12 words) that nudges without giving away the answer.
- "explanation": ${
    isYoungLearner
      ? "MANDATORY BILINGUAL: Short English rule sentence followed by ' 🇪🇸 En español: ' with a warm, simple Spanish explanation."
      : "Clear grammatical explanation in English plus a short ' 🇪🇸 En español: ' note on the key rule."
  }
- "word": Key English target word or structure tested.
- "phonetic": IPA pronunciation of the key word.
- "spanish_translation": Spanish translation of the target sentence or word.
- "difficulty": "easy", "medium", or "hard".

SAMPLE VOCABULARY TO WEAVE IN NATURALLY:
- ${sampleWordList || "everyday useful vocabulary"}

Generate EXACTLY ${count} distinct open-ended exercises.
Return ONLY a valid JSON array matching the schema.`
}

function getMultipleChoiceSchema(isYoungLearner: boolean) {
  return {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        prompt: { type: "STRING" },
        options: { type: "ARRAY", items: { type: "STRING" } },
        correct_answer_index: { type: "INTEGER" },
        explanation: {
          type: "STRING",
          description: isYoungLearner
            ? "MANDATORY BILINGUAL: English explanation + ' 🇪🇸 En español: ' + Spanish reason."
            : "Clear pedagogical grammatical explanation in English.",
        },
        word: { type: "STRING" },
        phonetic: { type: "STRING" },
        spanish_translation: { type: "STRING" },
        difficulty: { type: "STRING" },
      },
      required: [
        "prompt",
        "options",
        "correct_answer_index",
        "explanation",
        "word",
        "phonetic",
        "spanish_translation",
        "difficulty",
      ],
    },
  } as const
}

function getOpenResponseSchema() {
  return {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        prompt: { type: "STRING" },
        expected_answer: { type: "STRING" },
        acceptable_answers: { type: "ARRAY", items: { type: "STRING" } },
        hint: { type: "STRING" },
        explanation: { type: "STRING" },
        word: { type: "STRING" },
        phonetic: { type: "STRING" },
        spanish_translation: { type: "STRING" },
        difficulty: { type: "STRING" },
      },
      required: [
        "prompt",
        "expected_answer",
        "acceptable_answers",
        "hint",
        "explanation",
        "word",
        "phonetic",
        "spanish_translation",
        "difficulty",
      ],
    },
  } as const
}

function resolveModelChain(tier: ExerciseGenTier): string[] {
  if (tier === "lightweight") {
    return Array.from(new Set([EXERCISE_MODEL, ...FALLBACK_MODELS].filter(Boolean)))
  }
  const heavyChain = [HEAVY_MODEL, ...HEAVY_FALLBACK_MODELS, EXERCISE_MODEL, ...FALLBACK_MODELS]
  return Array.from(new Set(heavyChain.filter(Boolean)))
}

async function callGemini(
  prompt: string,
  model: string,
  options?: {
    schema?: unknown
    temperature?: number
    thinkingLevel?: ThinkingLevel
    json?: boolean
    timeoutMs?: number
  },
): Promise<unknown> {
  const key = requireApiKey()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 25_000)

  const generationConfig: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.5,
  }

  if (options?.json !== false) {
    generationConfig.responseMimeType = "application/json"
    if (options?.schema) {
      generationConfig.responseSchema = options.schema
    }
  }

  // Gemini 4 models use thinkingLevel (LOW/MEDIUM/HIGH/XHIGH), never thinkingBudget
  if (model.startsWith("gemini-4-")) {
    generationConfig.thinkingConfig = {
      thinkingLevel: options?.thinkingLevel ?? "LOW",
    }
  }

  try {
    const response = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: controller.signal,
    })

    const data = (await response.json()) as GeminiResponse
    if (!response.ok) {
      const msg = data.error?.message ?? `Gemini API error (${response.status})`
      if (response.status === 429 || response.status === 503) {
        throw new TransientGeminiError(msg, response.status)
      }
      throw new Error(msg)
    }

    const text =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? ""
    if (!text) throw new Error("Gemini returned an empty response")

    return options?.json === false ? text.trim() : JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

async function callWithFallback<T>(
  modelsToTry: string[],
  runner: (model: string, ctx: { isLastModel: boolean; timeoutMs: number }) => Promise<T>,
): Promise<{ result: T; modelUsed: string }> {
  let lastError: unknown
  const deadlineAt = Date.now() + 50_000

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i]
    const isLastModel = i === modelsToTry.length - 1
    const remainingBudget = Math.max(8_000, deadlineAt - Date.now())
    const preferredTimeout = isLastModel
      ? 25_000
      : model.startsWith("gemini-4-") || model === "gemini-3.8-flash"
      ? 14_000
      : 24_000
    const timeoutMs = Math.min(preferredTimeout, remainingBudget)
    const maxAttempts = isLastModel ? 2 : 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await runner(model, { isLastModel, timeoutMs })
        return { result, modelUsed: model }
      } catch (error) {
        lastError = error
        const isTransient =
          error instanceof TransientGeminiError ||
          (error instanceof Error && error.name === "AbortError")
        if (isTransient && !isLastModel) {
          // Immediately fail over to the next healthy model instead of stalling on a 503/timeout
          break
        }
        if (attempt + 1 < maxAttempts && Date.now() + 6_000 < deadlineAt) {
          await new Promise((resolve) => setTimeout(resolve, 800))
        } else {
          break
        }
      }
    }
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error(
      "La generación tardó demasiado y fue cancelada por tiempo límite. Probá nuevamente o elegí 5 o 10 preguntas.",
    )
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini call failed")
}

function validateMultipleChoiceExercises(raw: unknown): GeneratedExerciseItem[] {
  if (!Array.isArray(raw)) throw new Error("Gemini response is not a JSON array")
  const results: GeneratedExerciseItem[] = []

  for (const item of raw) {
    if (
      !item ||
      typeof item.prompt !== "string" ||
      !item.prompt.includes("______") ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      typeof item.correct_answer_index !== "number" ||
      item.correct_answer_index < 0 ||
      item.correct_answer_index > 3
    ) {
      continue
    }

    let explanation = ""
    const rawAny = item as Record<string, unknown>
    if (typeof rawAny.explanation_en === "string" && typeof rawAny.explanation_es === "string") {
      const en = (rawAny.explanation_en as string).trim()
      const es = (rawAny.explanation_es as string).trim()
      explanation = `${en} 🇪🇸 En español: ${es}`
    } else if (typeof rawAny.explanation === "string") {
      explanation = (rawAny.explanation as string).trim()
    } else {
      explanation = "Correct usage based on Cambridge English rules."
    }

    const options = item.options.map(String)
    results.push({
      exercise_type: "multiple_choice",
      prompt: item.prompt.replace(/_{2,}/g, "______"),
      options,
      correct_answer_index: item.correct_answer_index,
      expected_answer: options[item.correct_answer_index] ?? "",
      explanation,
      word: item.word || options[item.correct_answer_index] || "",
      phonetic: item.phonetic || "",
      spanish_translation: item.spanish_translation || "",
      difficulty:
        item.difficulty === "hard" ? "hard" : item.difficulty === "medium" ? "medium" : "easy",
    })
  }

  return results
}

function validateOpenExercises(raw: unknown): GeneratedExerciseItem[] {
  if (!Array.isArray(raw)) throw new Error("Gemini response is not a JSON array")
  const results: GeneratedExerciseItem[] = []

  for (const item of raw) {
    if (
      !item ||
      typeof item.prompt !== "string" ||
      !item.prompt.trim() ||
      typeof item.expected_answer !== "string" ||
      !item.expected_answer.trim()
    ) {
      continue
    }

    const expected = item.expected_answer.trim()
    const rawAcceptable = Array.isArray(item.acceptable_answers)
      ? (item.acceptable_answers as unknown[])
          .map((v) => String(v ?? "").trim())
          .filter((v) => v.length > 0 && v.toLowerCase() !== expected.toLowerCase())
      : []
    const acceptable: string[] = Array.from(new Set<string>(rawAcceptable)).slice(0, 4)

    results.push({
      exercise_type: "open_response",
      prompt: item.prompt.trim().replace(/_{2,}/g, "______"),
      options: [],
      correct_answer_index: 0,
      expected_answer: expected,
      acceptable_answers: acceptable,
      hint: typeof item.hint === "string" && item.hint.trim() ? item.hint.trim() : undefined,
      explanation:
        typeof item.explanation === "string" && item.explanation.trim()
          ? item.explanation.trim()
          : "Respeta la estructura gramatical del tema.",
      word: typeof item.word === "string" && item.word.trim() ? item.word.trim() : expected.split(" ")[0] ?? "",
      phonetic: typeof item.phonetic === "string" ? item.phonetic.trim() : "",
      spanish_translation:
        typeof item.spanish_translation === "string" ? item.spanish_translation.trim() : "",
      difficulty:
        item.difficulty === "hard" ? "hard" : item.difficulty === "medium" ? "medium" : "easy",
    })
  }

  return results
}

async function generateSingleBatch(params: {
  kind: "multiple_choice" | "open_response"
  count: number
  levelId: CefrLevel
  levelCode: string
  topic: TopicDef
  sampleWords: Array<{ english: string; spanish: string }>
  modelsToTry: string[]
}): Promise<{ items: GeneratedExerciseItem[]; modelUsed: string }> {
  const { kind, count, levelId, levelCode, topic, sampleWords, modelsToTry } = params
  const isYoungLearner =
    levelId === "pre-a1-starters" || levelId === "a1-movers" || levelId === "a2-flyers"

  const prompt =
    kind === "open_response"
      ? buildOpenResponsePrompt(count, levelId, levelCode, topic, sampleWords)
      : buildMultipleChoicePrompt(count, levelId, levelCode, topic, sampleWords)

  const schema =
    kind === "open_response" ? getOpenResponseSchema() : getMultipleChoiceSchema(isYoungLearner)

  const { result, modelUsed } = await callWithFallback(modelsToTry, async (model, { timeoutMs }) => {
    const raw = await callGemini(prompt, model, {
      schema,
      temperature: kind === "open_response" ? 0.55 : 0.5,
      thinkingLevel: "LOW",
      timeoutMs,
    })
    const parsed =
      kind === "open_response" ? validateOpenExercises(raw) : validateMultipleChoiceExercises(raw)
    if (parsed.length === 0) {
      throw new Error("Generated exercises failed validation")
    }
    return parsed
  })

  return { items: result, modelUsed }
}

function dedupeExercisesByPrompt(items: GeneratedExerciseItem[]): GeneratedExerciseItem[] {
  const seen = new Set<string>()
  const out: GeneratedExerciseItem[] = []
  for (const item of items) {
    const key = item.prompt.toLowerCase().replace(/\s+/g, " ").trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/**
 * Generates calibrated CEFR exercises (multiple choice, open response, or mixed)
 * with automatic fallback from Gemini 4 Hydrogen and optional Decision-1 QA auditing.
 */
export async function generateTopicExercisesDetailed(
  count: number,
  levelId: CefrLevel,
  levelCode: string,
  topic: TopicDef,
  sampleWords: Array<{ english: string; spanish: string }> = [],
  options?: {
    mode?: ExerciseGenMode
    tier?: ExerciseGenTier
    runQa?: boolean
  },
): Promise<ExerciseGenerationResult> {
  const mode = options?.mode ?? "multiple_choice"
  const tier = options?.tier ?? (mode === "multiple_choice" ? "lightweight" : "heavy")
  const runQa = options?.runQa ?? true
  const modelsToTry = resolveModelChain(tier)

  let rawItems: GeneratedExerciseItem[] = []
  let modelUsed = modelsToTry[0] ?? EXERCISE_MODEL

  async function runSettledBatches(
    batches: Array<{ kind: "multiple_choice" | "open_response"; count: number }>,
  ): Promise<{ items: GeneratedExerciseItem[]; modelUsed: string }> {
    const settled = await Promise.allSettled(
      batches.map((b) =>
        generateSingleBatch({
          kind: b.kind,
          count: b.count,
          levelId,
          levelCode,
          topic,
          sampleWords,
          modelsToTry,
        }),
      ),
    )

    const fulfilled = settled.filter(
      (r): r is PromiseFulfilledResult<{ items: GeneratedExerciseItem[]; modelUsed: string }> =>
        r.status === "fulfilled" && r.value.items.length > 0,
    )

    if (fulfilled.length === 0) {
      const firstRejected = settled.find((r): r is PromiseRejectedResult => r.status === "rejected")
      throw firstRejected?.reason ?? new Error("AI generation failed to produce valid exercises.")
    }

    return {
      items: dedupeExercisesByPrompt(fulfilled.flatMap((r) => r.value.items)),
      modelUsed: fulfilled[0].value.modelUsed,
    }
  }

  if (mode === "mixed" && count >= 2) {
    const openCount = Math.ceil(count / 2)
    const mcCount = count - openCount
    const combined = await runSettledBatches([
      { kind: "open_response", count: openCount },
      { kind: "multiple_choice", count: mcCount },
    ])
    rawItems = combined.items
    modelUsed = combined.modelUsed
  } else {
    const kind = mode === "open_response" ? "open_response" : "multiple_choice"
    if (count > 10) {
      const firstHalf = Math.ceil(count / 2)
      const secondHalf = count - firstHalf
      const combined = await runSettledBatches([
        { kind, count: firstHalf },
        { kind, count: secondHalf },
      ])
      rawItems = combined.items
      modelUsed = combined.modelUsed
    } else {
      const batch = await generateSingleBatch({
        kind,
        count,
        levelId,
        levelCode,
        topic,
        sampleWords,
        modelsToTry,
      })
      rawItems = dedupeExercisesByPrompt(batch.items)
      modelUsed = batch.modelUsed
    }
  }

  if (!runQa) {
    return {
      items: rawItems,
      modelUsed,
      qa: {
        checked: 0,
        passed: rawItems.length,
        rejected: 0,
        skipped: true,
      },
    }
  }

  const qa = await auditGeneratedExercises(rawItems, {
    levelCode,
    topicTitle: topic.title,
    topicFocus: topic.focus,
  })

  return {
    items: qa.kept,
    modelUsed,
    qa: {
      checked: qa.checked,
      passed: qa.passed,
      rejected: qa.rejected,
      skipped: qa.skipped,
    },
  }
}

/**
 * Backward-compatible wrapper returning only the validated exercise array.
 */
export async function generateTopicExercises(
  count: number,
  levelId: CefrLevel,
  levelCode: string,
  topic: TopicDef,
  sampleWords: Array<{ english: string; spanish: string }> = [],
): Promise<GeneratedExerciseItem[]> {
  const result = await generateTopicExercisesDetailed(count, levelId, levelCode, topic, sampleWords, {
    mode: "multiple_choice",
    tier: "lightweight",
    runQa: false,
  })
  return result.items
}

/**
 * Generates a short, warm, personalized tutor explanation in Spanish only when requested on demand.
 */
export async function explainStudentMistake(params: {
  prompt: string
  expectedAnswer: string
  studentAnswer: string
  level: CefrLevel | string
  topicTitle: string
  topicFocus?: string
  errorCategory?: string
  score?: number
}): Promise<{ explanation: string; modelUsed: string }> {
  const modelsToTry = resolveModelChain("lightweight")
  const tutorPrompt = `You are a friendly, encouraging English tutor helping a Spanish-speaking student (${params.level}).

Topic: "${params.topicTitle}"${params.topicFocus ? ` (Focus: ${params.topicFocus})` : ""}
Exercise prompt: "${params.prompt}"
Expected model answer: "${params.expectedAnswer}"
Student wrote: "${params.studentAnswer}"
${params.errorCategory ? `Detected error category: ${params.errorCategory}` : ""}
${typeof params.score === "number" ? `Rubric score: ${params.score}/3` : ""}

Write a concise, clear explanation in Spanish (2 to 4 short sentences max, plain text without markdown headers) that:
1. Points out warmly what the student did right or what specifically needs adjusting in "${params.studentAnswer}".
2. Explains the grammar/vocabulary rule simply so they don't repeat it.
3. Shows the exact corrected English phrase clearly.`

  const { result, modelUsed } = await callWithFallback(modelsToTry, async (model, { timeoutMs }) => {
    const text = await callGemini(tutorPrompt, model, {
      json: false,
      temperature: 0.3,
      thinkingLevel: "LOW",
      timeoutMs,
    })
    return String(text).trim()
  })

  return { explanation: result, modelUsed }
}

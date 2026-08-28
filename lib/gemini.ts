import type { CefrLevel } from "./question-bank"
import type { TopicDef } from "./topics"

const API_BASE = "https://generativelanguage.googleapis.com/v1beta"

/** High-quality, primary model for exercise generation */
export const EXERCISE_MODEL = process.env.GEMINI_EXERCISE_MODEL ?? "gemini-3.7-flash"
export const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"]
export const HEAVY_MODEL = process.env.GEMINI_HEAVY_MODEL ?? "gemini-3.7-flash"

export const PROMPT_VERSION = "v3"

export type GeneratedExerciseItem = {
  prompt: string
  options: string[]
  correct_answer_index: number
  explanation: string
  word: string
  phonetic: string
  spanish_translation: string
  difficulty: "easy" | "medium" | "hard"
}

function requireApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY is not configured")
  return key
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string }
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

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      prompt: { type: "STRING" },
      options: { type: "ARRAY", items: { type: "STRING" } },
      correct_answer_index: { type: "INTEGER" },
      explanation: { type: "STRING" },
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

function buildPrompt(
  count: number,
  levelId: CefrLevel,
  levelCode: string,
  topic: TopicDef,
  sampleWords: Array<{ english: string; spanish: string }>
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
${
  isYoungLearner
    ? `
EXACT FORMAT EXAMPLE (COPY THIS BILINGUAL STRUCTURE FOR EVERY ITEM):
[
  {
    "prompt": "The dog ______ sleeping.",
    "options": ["is", "am", "are", "be"],
    "correct_answer_index": 0,
    "explanation": "Use 'is' with singular nouns like 'the dog'. 🇪🇸 En español: Usamos 'is' porque 'the dog' es un solo animal.",
    "word": "is",
    "phonetic": "/ɪz/",
    "spanish_translation": "está / es",
    "difficulty": "easy"
  }
]
`
    : ""
}

Generate EXACTLY ${count} distinct exercises.
Return ONLY a valid JSON array of ${count} objects matching the schema.`
}

function getResponseSchema(isYoungLearner: boolean) {
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

async function callGemini(prompt: string, model: string, schema?: unknown): Promise<unknown> {
  const key = requireApiKey()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const response = await fetch(`${API_BASE}/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: schema || getResponseSchema(false),
        },
      }),
      signal: controller.signal,
    })
    const data = (await response.json()) as GeminiResponse
    if (!response.ok) throw new Error(data.error?.message ?? `Gemini API error (${response.status})`)
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? ""
    if (!text) throw new Error("Gemini returned an empty response")
    return JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

function validateExercises(raw: unknown): GeneratedExerciseItem[] {
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

    results.push({
      prompt: item.prompt.replace(/_{2,}/g, "______"),
      options: item.options.map(String),
      correct_answer_index: item.correct_answer_index,
      explanation,
      word: item.word || item.options[item.correct_answer_index] || "",
      phonetic: item.phonetic || "",
      spanish_translation: item.spanish_translation || "",
      difficulty: item.difficulty === "hard" ? "hard" : item.difficulty === "medium" ? "medium" : "easy",
    })
  }
  return results
}

/**
 * Generates calibrated CEFR exercises for any topic with automatic model fallback.
 */
export async function generateTopicExercises(
  count: number,
  levelId: CefrLevel,
  levelCode: string,
  topic: TopicDef,
  sampleWords: Array<{ english: string; spanish: string }> = []
): Promise<GeneratedExerciseItem[]> {
  const modelsToTry = [EXERCISE_MODEL, ...FALLBACK_MODELS]
  const prompt = buildPrompt(count, levelId, levelCode, topic, sampleWords)
  const isYoungLearner =
    levelId === "pre-a1-starters" || levelId === "a1-movers" || levelId === "a2-flyers"
  const schemaToUse = getResponseSchema(isYoungLearner)
  let lastError: unknown

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callGemini(prompt, model, schemaToUse)
        const parsed = validateExercises(raw)
        if (parsed.length > 0) return parsed
        lastError = new Error("Generated exercises failed validation")
      } catch (error) {
        lastError = error
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Exercise generation failed")
}

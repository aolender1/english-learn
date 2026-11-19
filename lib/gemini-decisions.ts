import aiModelsConfig from "@/config/ai-models.json"
import type { CefrLevel } from "./question-bank"

const DECISIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/decisions"

export const DECISION_MODEL =
  process.env.GEMINI_DECISION_MODEL ??
  aiModelsConfig.tasks.decision?.primaryModel ??
  "gemini-decision-1"

export type ErrorCategory =
  | "none"
  | "wrong_tense"
  | "word_order"
  | "missing_or_extra_word"
  | "agreement_or_pronoun"
  | "vocabulary_meaning"
  | "spelling_minor"
  | "spanish_or_incomplete"

export type DecisionVerdict = "correct" | "almost" | "incorrect"

export type DecisionEvaluation = {
  isCorrect: boolean
  verdict: DecisionVerdict
  score: number
  maxScore: 3
  correctProbability: number
  ruleAppliedProbability: number
  confidence: number
  errorCategory: ErrorCategory
  errorLabelEs: string
  errorTipEs: string
  needsAiExplanation: boolean
  source: "exact" | "decision-api"
  latencyMs: number
  usage?: { inputTokens: number; outputTokens: number }
}

export type ExerciseQaResult = {
  passed: boolean
  unambiguousProb: number
  levelFitProb: number
  pedagogyProb: number
  avgScore: number
}

export type DecisionQuestion =
  | {
      type: "noul"
      instructions: string
      criteria?: {
        true_description?: string
        false_description?: string
      }
    }
  | {
      type: "choice"
      instructions: string
      criteria: Record<string, string>
    }
  | {
      type: "score"
      instructions: string
      criteria: string[]
    }

type DecisionsApiAnswer =
  | { type: "noul"; noul: number; confidence: number }
  | { type: "choice"; choice: string; probabilities?: Record<string, number>; confidence: number }
  | {
      type: "score"
      score: number
      probabilities?: Record<string, number>
      legend?: Record<string, string>
      confidence: number
    }

type DecisionsApiResponse = {
  answers?: Record<string, DecisionsApiAnswer>
  usage?: {
    total_tokens?: number
    total_input_tokens?: number
    total_output_tokens?: number
  }
  error?: { code?: number; message?: string; status?: string }
}

export const ERROR_CATEGORY_META: Record<ErrorCategory, { labelEs: string; tipEs: string }> = {
  none: {
    labelEs: "Sin errores",
    tipEs: "¡Excelente! Aplicaste correctamente la estructura gramatical y el vocabulario.",
  },
  wrong_tense: {
    labelEs: "Tiempo verbal",
    tipEs: "Revisá el tiempo verbal o la conjugación que pide el contexto de la consigna.",
  },
  word_order: {
    labelEs: "Orden de palabras",
    tipEs: "Prestá atención al orden sujeto + auxiliar/verbo + complementos en inglés.",
  },
  missing_or_extra_word: {
    labelEs: "Palabra faltante o sobrante",
    tipEs: "Falta o sobra alguna palabra clave (artículo, preposición, auxiliar o partícula).",
  },
  agreement_or_pronoun: {
    labelEs: "Concordancia / Pronombre",
    tipEs: "Revisá la concordancia sujeto-verbo (singular/plural) o la persona del pronombre.",
  },
  vocabulary_meaning: {
    labelEs: "Vocabulario / Sentido",
    tipEs: "La palabra elegida cambia el sentido esperado o no encaja con la expresión natural.",
  },
  spelling_minor: {
    labelEs: "Ortografía (casi perfecto)",
    tipEs: "La idea y la gramática son correctas, solo se escapó un pequeño detalle de ortografía.",
  },
  spanish_or_incomplete: {
    labelEs: "Incompleta / En español",
    tipEs: "Intentá completar la respuesta completa en inglés respetando la estructura del tema.",
  },
}

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error("GEMINI_API_KEY is not configured")
  return key
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/^[\s.,!?;:¡¿"'()]+|[\s.,!?;:¡¿"'()]+$/g, "")
    .replace(/\s+/g, " ")
}

function isExactMatch(
  studentAnswer: string,
  prompt: string,
  expectedAnswer: string,
  acceptableAnswers: string[] = [],
): boolean {
  const normalizedStudent = normalizeText(studentAnswer)
  if (!normalizedStudent) return false

  const candidates = [expectedAnswer, ...acceptableAnswers]
    .map((item) => item.trim())
    .filter(Boolean)

  for (const candidate of candidates) {
    if (normalizeText(candidate) === normalizedStudent) {
      return true
    }
    if (prompt.includes("______")) {
      const completed = prompt.replace(/_{2,}/g, candidate)
      if (normalizeText(completed) === normalizedStudent) {
        return true
      }
    }
  }

  return false
}

export type DecisionInputPart =
  | { type: "text"; text: string }
  | {
      type: "image"
      data: string
      mime_type: string
      resolution?: "low" | "medium" | "high"
    }

export async function callDecisionsApi(
  input: string | DecisionInputPart[],
  questions: Record<string, DecisionQuestion>,
): Promise<DecisionsApiResponse> {
  const key = requireApiKey()
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)

    try {
      const response = await fetch(DECISIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DECISION_MODEL,
          input,
          questions,
        }),
        signal: controller.signal,
      })

      const data = (await response.json()) as DecisionsApiResponse
      if (response.ok) return data

      const message = data.error?.message ?? `Decisions API error (${response.status})`
      if ((response.status === 429 || response.status === 503) && attempt === 0) {
        lastError = new Error(message)
        await new Promise((resolve) => setTimeout(resolve, 400))
        continue
      }
      throw new Error(message)
    } catch (error) {
      lastError = error
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        continue
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Decisions API request failed")
}

export async function evaluateOpenAnswer(params: {
  prompt: string
  expectedAnswer: string
  acceptableAnswers?: string[]
  studentAnswer: string
  level: CefrLevel | string
  topicTitle: string
  topicFocus?: string
}): Promise<DecisionEvaluation> {
  const {
    prompt,
    expectedAnswer,
    acceptableAnswers = [],
    studentAnswer,
    level,
    topicTitle,
    topicFocus = "",
  } = params

  if (isExactMatch(studentAnswer, prompt, expectedAnswer, acceptableAnswers)) {
    return {
      isCorrect: true,
      verdict: "correct",
      score: 3,
      maxScore: 3,
      correctProbability: 1,
      ruleAppliedProbability: 1,
      confidence: 1,
      errorCategory: "none",
      errorLabelEs: ERROR_CATEGORY_META.none.labelEs,
      errorTipEs: ERROR_CATEGORY_META.none.tipEs,
      needsAiExplanation: false,
      source: "exact",
      latencyMs: 0,
      usage: { inputTokens: 0, outputTokens: 0 },
    }
  }

  const isBlankPrompt = prompt.includes("______")
  const taskMode = isBlankPrompt
    ? "Fill-in-the-blank (accept either ONLY the missing blank word/phrase OR the full completed sentence)"
    : "Open English response (transformation, translation, or sentence production)"

  const inputLines = [
    `TASK MODE: ${taskMode}`,
    `CEFR LEVEL: ${level}`,
    `TOPIC TITLE: ${topicTitle}`,
    topicFocus ? `GRAMMAR FOCUS: ${topicFocus}` : "",
    `EXERCISE PROMPT: ${prompt}`,
    `REFERENCE EXPECTED ANSWER: ${expectedAnswer}`,
    acceptableAnswers.length > 0 ? `ACCEPTABLE ALTERNATIVES: ${acceptableAnswers.join(" | ")}` : "",
    `STUDENT ANSWER: ${studentAnswer.trim()}`,
  ].filter(Boolean)

  const t0 = Date.now()
  const response = await callDecisionsApi(inputLines.join("\n"), {
    is_correct: {
      type: "noul",
      instructions:
        "Determine whether the student's English answer is grammatically and semantically valid for the exercise prompt.",
      criteria: {
        true_description:
          "Valid English answer matching the expected meaning and grammar focus. Accept equivalent valid phrasing, standard contractions (don't/do not, she's/she is, I'm/I am), minor capitalization/punctuation differences, and either just the missing word(s) or the full completed sentence when the prompt contains '______'.",
        false_description:
          "Incorrect verb tense or grammar rule, wrong meaning, wrong word for the context, Spanish words mixed in, incomplete fragment, or gibberish.",
      },
    },
    rule_applied: {
      type: "noul",
      instructions:
        "Did the student accurately apply the target grammar focus of the topic in their answer?",
      criteria: {
        true_description:
          "The target grammar structure/focus of the topic is applied accurately even if there is a tiny non-grammatical typo.",
        false_description:
          "The target grammar structure is missing, misused, or uses the wrong tense/form/order.",
      },
    },
    error_category: {
      type: "choice",
      instructions:
        "Classify the primary issue in the student's answer relative to the reference expected answer.",
      criteria: {
        none: "No meaningful error; the answer is completely valid and natural.",
        wrong_tense: "Wrong verb tense, aspect, modal, or verb conjugation.",
        word_order: "Words are in the wrong order (e.g. question inversion or adverb placement).",
        missing_or_extra_word: "A required word (auxiliary, article, preposition, particle) is missing or an extra incorrect word was added.",
        agreement_or_pronoun: "Subject-verb agreement mismatch or wrong pronoun/possessive/perspective shift.",
        vocabulary_meaning: "Wrong lexical word or semantic meaning compared to the prompt/reference.",
        spelling_minor: "Grammar and structure are right, with only a small spelling typo (1-2 letters).",
        spanish_or_incomplete: "Answer is written in Spanish, blank, off-topic, or too incomplete to evaluate.",
      },
    },
    quality_score: {
      type: "score",
      instructions: "Score the student's answer on a 0 to 3 pedagogical rubric.",
      criteria: [
        "0 - Incorrect, off-topic, Spanish, or fails both meaning and target grammar.",
        "1 - Understandable attempt, but breaks the core grammar rule or changes key meaning.",
        "2 - Almost completely right; target grammar is applied, with only a tiny spelling slip or minor non-critical detail.",
        "3 - Completely correct, grammatical, and natural English response.",
      ],
    },
  })
  const latencyMs = Date.now() - t0

  const isCorrectAns = response.answers?.is_correct
  const ruleAns = response.answers?.rule_applied
  const categoryAns = response.answers?.error_category
  const scoreAns = response.answers?.quality_score

  const correctProbability = isCorrectAns?.type === "noul" ? isCorrectAns.noul : 0
  const ruleAppliedProbability = ruleAns?.type === "noul" ? ruleAns.noul : 0
  const rawScore = scoreAns?.type === "score" ? scoreAns.score : 0
  const score = Math.round(rawScore * 100) / 100

  const rawCategory = categoryAns?.type === "choice" ? categoryAns.choice : "vocabulary_meaning"
  const errorCategory: ErrorCategory =
    rawCategory in ERROR_CATEGORY_META ? (rawCategory as ErrorCategory) : "vocabulary_meaning"

  const confidences = [
    isCorrectAns?.confidence,
    ruleAns?.confidence,
    categoryAns?.confidence,
    scoreAns?.confidence,
  ].filter((c): c is number => typeof c === "number")
  const confidence =
    confidences.length > 0 ? Math.min(...confidences) : 0.5

  const spellingOnlyPass =
    errorCategory === "spelling_minor" && score >= 2.15 && ruleAppliedProbability >= 0.65
  const strictPass =
    correctProbability >= 0.65 && ruleAppliedProbability >= 0.55 && score >= 2.0
  const isCorrect = strictPass || spellingOnlyPass

  const verdict: DecisionVerdict =
    strictPass && errorCategory === "none"
      ? "correct"
      : isCorrect || (score >= 1.8 && correctProbability >= 0.45)
      ? "almost"
      : "incorrect"

  const needsAiExplanation = !isCorrect || verdict === "almost" || confidence < 0.72
  const meta = ERROR_CATEGORY_META[errorCategory]

  return {
    isCorrect,
    verdict,
    score,
    maxScore: 3,
    correctProbability,
    ruleAppliedProbability,
    confidence,
    errorCategory,
    errorLabelEs: meta.labelEs,
    errorTipEs: meta.tipEs,
    needsAiExplanation,
    source: "decision-api",
    latencyMs,
    usage: {
      inputTokens: response.usage?.total_input_tokens ?? response.usage?.total_tokens ?? 0,
      outputTokens: response.usage?.total_output_tokens ?? 0,
    },
  }
}

export type AuditableExercise = {
  exercise_type?: "multiple_choice" | "open_response"
  prompt: string
  options?: string[]
  correct_answer_index?: number
  expected_answer?: string
  acceptable_answers?: string[]
  explanation: string
}

async function auditSingleExercise(
  item: AuditableExercise,
  context: { levelCode: string; topicTitle: string; topicFocus: string },
): Promise<ExerciseQaResult> {
  const isOpen = item.exercise_type === "open_response" || !item.options?.length
  const answerPreview = isOpen
    ? `Expected Answer: ${item.expected_answer ?? ""}\nAcceptable Alternatives: ${(item.acceptable_answers ?? []).join(" | ")}`
    : `Options: ${(item.options ?? []).map((o, i) => `[${i}] ${o}`).join(" | ")}\nMarked Correct Index: ${item.correct_answer_index ?? 0}`

  const input = [
    `CEFR LEVEL: ${context.levelCode}`,
    `TOPIC: ${context.topicTitle}`,
    `FOCUS: ${context.topicFocus}`,
    `TYPE: ${isOpen ? "open_response" : "multiple_choice"}`,
    `PROMPT: ${item.prompt}`,
    answerPreview,
    `EXPLANATION: ${item.explanation}`,
  ].join("\n")

  const res = await callDecisionsApi(input, {
    unambiguous: {
      type: "noul",
      instructions:
        "Is this exercise clear and unambiguous, with the marked answer clearly valid (and for multiple choice, only one valid option)?",
      criteria: {
        true_description: "Clear prompt, valid expected answer, no ambiguous competing options.",
        false_description: "Vague prompt, multiple options are equally valid, or expected answer is wrong.",
      },
    },
    level_appropriate: {
      type: "noul",
      instructions: `Does the vocabulary, sentence length, and difficulty match CEFR ${context.levelCode}?`,
      criteria: {
        true_description: "Appropriate vocabulary and sentence complexity for the target CEFR level.",
        false_description: "Significantly too hard, too trivial, or mismatched for the CEFR level.",
      },
    },
    pedagogy_accurate: {
      type: "noul",
      instructions: "Is the explanation pedagogically accurate and helpful for the learner?",
      criteria: {
        true_description: "Explanation correctly states the grammar/phonetics rule and matches the answer.",
        false_description: "Explanation contradicts the answer, is factually wrong, or is unhelpful.",
      },
    },
  })

  const u = res.answers?.unambiguous?.type === "noul" ? res.answers.unambiguous.noul : 0
  const l = res.answers?.level_appropriate?.type === "noul" ? res.answers.level_appropriate.noul : 0
  const p = res.answers?.pedagogy_accurate?.type === "noul" ? res.answers.pedagogy_accurate.noul : 0
  const passed = u >= 0.6 && l >= 0.55 && p >= 0.55

  return {
    passed,
    unambiguousProb: u,
    levelFitProb: l,
    pedagogyProb: p,
    avgScore: (u + l + p) / 3,
  }
}

export async function auditGeneratedExercises<T extends AuditableExercise>(
  items: T[],
  context: { levelCode: string; topicTitle: string; topicFocus: string },
): Promise<{
  kept: T[]
  checked: number
  passed: number
  rejected: number
  skipped: boolean
}> {
  if (items.length === 0) {
    return { kept: [], checked: 0, passed: 0, rejected: 0, skipped: false }
  }

  try {
    const concurrency = 4
    const results: Array<{ item: T; qa: ExerciseQaResult }> = []

    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency)
      const chunkResults = await Promise.all(
        chunk.map(async (item) => ({
          item,
          qa: await auditSingleExercise(item, context),
        })),
      )
      results.push(...chunkResults)
    }

    const passedItems = results.filter((r) => r.qa.passed).map((r) => r.item)
    const rejected = results.length - passedItems.length

    if (passedItems.length > 0) {
      return {
        kept: passedItems,
        checked: results.length,
        passed: passedItems.length,
        rejected,
        skipped: false,
      }
    }

    // Never fail generation if strict QA rejects everything; keep the highest-scoring items.
    const topFallback = [...results]
      .sort((a, b) => b.qa.avgScore - a.qa.avgScore)
      .slice(0, Math.max(1, Math.ceil(results.length / 2)))
      .map((r) => r.item)

    return {
      kept: topFallback,
      checked: results.length,
      passed: 0,
      rejected: results.length,
      skipped: false,
    }
  } catch (error) {
    console.warn("[gemini-decisions] QA audit skipped due to API error:", error)
    return {
      kept: items,
      checked: 0,
      passed: items.length,
      rejected: 0,
      skipped: true,
    }
  }
}

export type VisualCandidateInput = {
  id: string
  title: string
  thumbnailUrl: string
}

export type VisualSelectionResult = {
  selectedIndex: number | null
  isRelevantProb: number
  classroomSafeProb: number
  clarityScore: number
  confidence: number
  latencyMs: number
  usage?: { inputTokens: number; outputTokens: number }
}

async function fetchThumbnailBase64(
  url: string,
): Promise<{ data: string; mimeType: string } | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > 4_000_000) return null
    const rawMime = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim()
    const mimeType = rawMime.startsWith("image/") ? rawMime : "image/jpeg"
    return { data: buf.toString("base64"), mimeType }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Evaluates up to 4 candidate visual thumbnails in ONE multimodal Decision-1 call (0 output tokens)
 * and selects the clearest, classroom-safe match for an English learning concept.
 */
export async function selectBestVisualWithDecision(params: {
  concept: string
  promptContext?: string
  candidates: VisualCandidateInput[]
}): Promise<VisualSelectionResult> {
  const slice = params.candidates.slice(0, 4)
  if (slice.length === 0) {
    return {
      selectedIndex: null,
      isRelevantProb: 0,
      classroomSafeProb: 0,
      clarityScore: 0,
      confidence: 0,
      latencyMs: 0,
    }
  }

  const fetched = await Promise.all(
    slice.map(async (candidate, origIndex) => {
      const img = await fetchThumbnailBase64(candidate.thumbnailUrl)
      return img ? { candidate, origIndex, img } : null
    }),
  )
  const loaded = fetched.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  )

  if (loaded.length === 0) {
    return {
      selectedIndex: null,
      isRelevantProb: 0,
      classroomSafeProb: 0,
      clarityScore: 0,
      confidence: 0,
      latencyMs: 0,
    }
  }

  const inputParts: DecisionInputPart[] = [
    {
      type: "text",
      text: [
        `Evaluate these ${loaded.length} visual candidates for an English learning exercise.`,
        `TARGET CONCEPT: "${params.concept}"`,
        params.promptContext ? `EXERCISE CONTEXT: "${params.promptContext}"` : "",
        `Goal: pick the cleanest, clearest, family-friendly visual that illustrates "${params.concept}" without distracting text memes or spoilers.`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ]

  const choiceCriteria: Record<string, string> = {}
  loaded.forEach((entry, idx) => {
    const key = `candidate_${idx}`
    choiceCriteria[key] = `Candidate ${idx} ("${entry.candidate.title || params.concept}") is the best, clearest visual match.`
    inputParts.push({
      type: "text",
      text: `Candidate ${idx} (${key}): "${entry.candidate.title || params.concept}"`,
    })
    inputParts.push({
      type: "image",
      data: entry.img.data,
      mime_type: entry.img.mimeType,
      resolution: "low",
    })
  })
  choiceCriteria.none =
    "None of the candidates clearly illustrate the concept, or all are distracting/inappropriate."

  const t0 = Date.now()
  const response = await callDecisionsApi(inputParts, {
    best_candidate: {
      type: "choice",
      instructions: `Which candidate best illustrates "${params.concept}" for an English classroom exercise?`,
      criteria: choiceCriteria,
    },
    is_relevant: {
      type: "noul",
      instructions: `Does the strongest candidate clearly represent the English concept "${params.concept}"?`,
      criteria: {
        true_description: `Visually depicts "${params.concept}" clearly.`,
        false_description: "Unrelated, confusing, or mostly text/unrelated meme.",
      },
    },
    classroom_safe: {
      type: "noul",
      instructions:
        "Are the best visual candidates safe and appropriate for students of all ages (including young learners)?",
      criteria: {
        true_description: "Family-friendly, clean, appropriate for school.",
        false_description: "Contains violence, profanity, adult themes, or unsafe imagery.",
      },
    },
    visual_clarity: {
      type: "score",
      instructions: "Rate how clear and helpful the best visual candidate is for teaching this concept.",
      criteria: [
        "0 - Unrelated, confusing, or text-heavy meme.",
        "1 - Weak or indirect connection.",
        "2 - Good visual match for the concept.",
        "3 - Crystal clear, memorable visual match for English learners.",
      ],
    },
  })
  const latencyMs = Date.now() - t0

  const bestAns = response.answers?.best_candidate
  const relAns = response.answers?.is_relevant
  const safeAns = response.answers?.classroom_safe
  const clarityAns = response.answers?.visual_clarity

  let selectedIndex: number | null = null
  if (bestAns?.type === "choice" && bestAns.choice.startsWith("candidate_")) {
    const idx = Number(bestAns.choice.replace("candidate_", ""))
    if (Number.isInteger(idx) && loaded[idx]) {
      selectedIndex = loaded[idx].origIndex
    }
  }

  const isRelevantProb = relAns?.type === "noul" ? relAns.noul : 0
  const classroomSafeProb = safeAns?.type === "noul" ? safeAns.noul : 0
  const clarityScore =
    clarityAns?.type === "score" ? Math.round(clarityAns.score * 100) / 100 : 0

  const confidences = [
    bestAns?.confidence,
    relAns?.confidence,
    safeAns?.confidence,
    clarityAns?.confidence,
  ].filter((c): c is number => typeof c === "number")
  const confidence = confidences.length > 0 ? Math.min(...confidences) : 0.5

  return {
    selectedIndex,
    isRelevantProb,
    classroomSafeProb,
    clarityScore,
    confidence,
    latencyMs,
    usage: {
      inputTokens: response.usage?.total_input_tokens ?? response.usage?.total_tokens ?? 0,
      outputTokens: response.usage?.total_output_tokens ?? 0,
    },
  }
}

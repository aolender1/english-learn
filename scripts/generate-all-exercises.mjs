import { loadEnvFile } from "node:process"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Pool } from "pg"

loadEnvFile(".env.local")

const key = process.env.GEMINI_API_KEY
if (!key) {
  console.error("GEMINI_API_KEY is not defined in .env.local")
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const MODEL = "gemini-3.7-flash"
const FALLBACK_MODEL = "gemini-3.5-flash-lite"

// Load CEFR vocabularies from CSV
const VOCAB_FILES = {
  "pre-a1-starters": ["vocabulario_Starters_PreA1.csv"],
  "a1-movers": ["vocabulario_Starters_PreA1.csv", "vocabulario_Movers_A1.csv"],
  "a2-flyers": ["vocabulario_Starters_PreA1.csv", "vocabulario_Movers_A1.csv", "vocabulario_Flyers_A2.csv"],
  "a2-key": ["vocabulario_Starters_PreA1.csv", "vocabulario_Movers_A1.csv", "vocabulario_Flyers_A2.csv", "vocabulario_Key_A2.csv"],
  "b1-preliminary": ["vocabulario_Starters_PreA1.csv", "vocabulario_Movers_A1.csv", "vocabulario_Flyers_A2.csv", "vocabulario_Key_A2.csv", "vocabulario_B1.csv"],
  "b1-plus": ["vocabulario_Starters_PreA1.csv", "vocabulario_Movers_A1.csv", "vocabulario_Flyers_A2.csv", "vocabulario_Key_A2.csv", "vocabulario_B1.csv", "vocabulario_B2.csv"],
  "b2-first": ["vocabulario_Starters_PreA1.csv", "vocabulario_Movers_A1.csv", "vocabulario_Flyers_A2.csv", "vocabulario_Key_A2.csv", "vocabulario_B1.csv", "vocabulario_B2.csv"],
  "c1-advanced": ["vocabulario_B1.csv", "vocabulario_B2.csv", "vocabulario_C1.csv"],
  "c2-proficiency": ["vocabulario_B1.csv", "vocabulario_B2.csv", "vocabulario_C1.csv", "vocabulario_C2.csv"],
}

function loadVocabularyForLevel(levelId) {
  const files = VOCAB_FILES[levelId] || ["vocabulario_Starters_PreA1.csv"]
  const words = []
  const seen = new Set()

  for (const filename of files) {
    const fullPath = join(process.cwd(), "data", "vocabulary", filename)
    if (!existsSync(fullPath)) continue
    const content = readFileSync(fullPath, "utf-8")
    const lines = content.split(/\r?\n/)
    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.split(";")
      if (parts.length < 2) continue
      const english = parts[0].replace(/^"|"$/g, "").trim()
      const spanish = parts[1].replace(/^"|"$/g, "").trim()
      if (english && english.length > 1 && !seen.has(english.toLowerCase())) {
        seen.add(english.toLowerCase())
        words.push({ english, spanish })
      }
    }
  }
  return words
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
      "difficulty"
    ],
  },
}

function buildPrompt(topic, sampleWords, batchNumber) {
  const isPhonetics = topic.slug.includes("phonetics") || topic.slug.includes("pronunciation")
  const difficultyTier = batchNumber === 1 ? "Fundamental to Intermediate" : "Intermediate to Advanced"

  if (isPhonetics) {
    return `You are a master Cambridge English phonetics and pronunciation author creating practice material for CEFR students.

TOPIC DETAILS:
- Topic: "${topic.title}"
- CEFR Level: ${topic.level}
- Phonetics & Pronunciation Focus: "${topic.focus}"
- Description: "${topic.description}"
- Batch: Part ${batchNumber} of 2 (${difficultyTier})

TASK:
Create EXACTLY 10 distinct, high-quality multiple-choice questions focusing on pronunciation, phonetic sounds (IPA), syllable stress, vowel length, or sound discrimination for this topic.

EXAMPLES:
- "Which word has the same vowel sound /æ/ as in 'cat'?" (options: ["apple", "cake", "car", "chair"], answer: "apple")
- "In the word 'important', which syllable receives the primary stress?" (options: ["im-POR-tant (2nd)", "IM-por-tant (1st)", "im-por-TANT (3rd)", "Equal stress"], answer: "im-POR-tant (2nd)")
- "The regular past tense ending '-ed' in 'watched' is pronounced as:" (options: ["/t/", "/d/", "/ɪd/", "/ed/"], answer: "/t/")

CRITERIA:
1. Exact phonetic symbol (IPA) and clear target sound.
2. Exactly 4 distinct choices per question.
3. Detailed, pedagogical explanation in English.
4. "prompt": The question or sentence with "______".
5. "word": The target word.
6. "phonetic": IPA pronunciation of the key word.
7. "spanish_translation": Spanish translation or pronunciation tip.
8. "difficulty": "${batchNumber === 1 ? "easy" : "hard"}".

Return ONLY a valid JSON array of 10 objects matching the schema.`
  }

  return `You are a master Cambridge English exam question author and expert linguist creating practice material for Cambridge English / CEFR students.

TOPIC DETAILS:
- Topic: "${topic.title}"
- CEFR Level: ${topic.level}
- Grammar & Context Focus: "${topic.focus}"
- Description: "${topic.description}"
- Batch: Part ${batchNumber} of 2 (${difficultyTier})

TASK:
Create EXACTLY 10 distinct, high-quality multiple-choice questions testing ONLY this topic.

STRICT CRITERIA FOR EXCELLENCE:
1. UNAMBIGUOUS CONTEXT: The sentence MUST contain explicit grammatical or semantic cues (time markers, subject-verb agreements, prepositions, collocations, situational context) so that ONLY ONE answer is logically and grammatically valid.
   - BAD: "She has a ______ bag." (vague)
   - GOOD: "Look! Right now, the chef ______ the soup in the kitchen." (options: ["is tasting", "tasted", "tastes", "taste"] -> only "is tasting" is correct for actions happening at the moment with "Look! Right now").

2. FOUR BALANCED OPTIONS:
   - Exactly 4 options per question.
   - 1 correct answer + 3 plausible distractors of the same part of speech that represent typical learner errors.

3. COMPREHENSIVE & PEDAGOGICAL EXPLANATION:
   - Explain WHY the correct answer is the only right choice.
   - Explain WHY the distractors are grammatically incorrect in this context.

4. VOCABULARY SELECTION:
   - Use natural CEFR words like: ${sampleWords.slice((batchNumber - 1) * 15, (batchNumber - 1) * 15 + 20).map(w => w.english).join(", ")}.

5. FORMAT:
   - "prompt": The sentence with exactly "______" where the blank goes.
   - "options": Array of 4 strings.
   - "correct_answer_index": Integer 0, 1, 2, or 3.
   - "explanation": Step-by-step grammatical explanation.
   - "word": The target word or key grammatical item tested.
   - "phonetic": IPA pronunciation of the key word.
   - "spanish_translation": Spanish translation of the key word or sentence concept.
   - "difficulty": "${batchNumber === 1 ? "easy" : "hard"}".

Return ONLY a valid JSON array of 10 objects matching the schema.`
}

async function callGeminiWithRetry(prompt, maxRetries = 6) {
  let modelToUse = MODEL

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

      const res = await fetch(`${API_BASE}/models/${modelToUse}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.65,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429 || res.status === 503) {
          const waitTime = Math.min(60, 15 * attempt)
          console.warn(`  [Gemini Rate Limit ${res.status}] Waiting ${waitTime}s before retry ${attempt}/${maxRetries}...`)
          modelToUse = attempt % 2 === 0 ? FALLBACK_MODEL : MODEL
          await new Promise(r => setTimeout(r, waitTime * 1000))
          continue
        }
        throw new Error(data.error?.message || `API error ${res.status}`)
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error("Empty response from Gemini")
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed) && parsed.length >= 8) {
        return parsed
      }
      throw new Error(`Invalid response count: got ${parsed?.length} items`)
    } catch (err) {
      if (attempt === maxRetries) throw err
      const waitTime = Math.min(45, 10 * attempt)
      console.warn(`  [Gemini Error - Attempt ${attempt}/${maxRetries}] ${err.message}. Waiting ${waitTime}s...`)
      await new Promise(r => setTimeout(r, waitTime * 1000))
    }
  }
  throw new Error("Failed after maximum retries")
}

async function getExistingTopics() {
  const res = await pool.query(`
    SELECT slug, level, title, description, focus 
    FROM topics 
    WHERE enabled = true 
    ORDER BY sort_order ASC
  `)
  return res.rows
}

async function getExerciseCountForTopic(topicSlug, level) {
  const res = await pool.query(
    `SELECT count(*) as total FROM exercises WHERE topic_slug = $1 AND level = $2`,
    [topicSlug, level]
  )
  return parseInt(res.rows[0]?.total || "0", 10)
}

async function saveExercises(topicSlug, level, items) {
  for (const item of items) {
    if (!item.prompt || !Array.isArray(item.options) || item.options.length < 2) continue
    const correctIdx = Math.max(0, Math.min(item.options.length - 1, item.correct_answer_index ?? 0))

    let normalizedPrompt = item.prompt.replace(/_{2,}/g, "______")

    await pool.query(
      `INSERT INTO exercises (
        topic_slug, level, prompt, options, correct_answer_index,
        explanation, word, phonetic, spanish_translation, difficulty, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ai')`,
      [
        topicSlug,
        level,
        normalizedPrompt,
        JSON.stringify(item.options),
        correctIdx,
        item.explanation || "Correct usage based on Cambridge English grammar rules.",
        item.word || "",
        item.phonetic || "",
        item.spanish_translation || "",
        item.difficulty || "medium",
      ]
    )
  }
}

async function exportJsonBackup() {
  const allRes = await pool.query(`
    SELECT id, topic_slug as "topicSlug", level, prompt, options, 
           correct_answer_index as "correctAnswerIndex", explanation, 
           word, phonetic, spanish_translation as "spanishTranslation", 
           difficulty, created_by as "createdBy"
    FROM exercises
    ORDER BY level, topic_slug, id
  `)
  writeFileSync(
    join(process.cwd(), "data", "seed-exercises.json"),
    JSON.stringify(allRes.rows, null, 2),
    "utf-8"
  )
  console.log(`  [Backup] Exported ${allRes.rows.length} total exercises to data/seed-exercises.json.`)
}

async function main() {
  console.log("=== High-Criteria Cambridge English Exercise Generator ===")
  const topicsList = await getExistingTopics()
  console.log(`Found ${topicsList.length} topics in Neon DB.`)

  const force = process.argv.includes("--force")
  let totalGenerated = 0
  let processedCount = 0

  for (let i = 0; i < topicsList.length; i++) {
    const topic = topicsList[i]
    const count = await getExerciseCountForTopic(topic.slug, topic.level)

    if (!force && count >= 20) {
      console.log(`[${i + 1}/${topicsList.length}] Topic "${topic.slug}" (${topic.level}) already has ${count} exercises. Skipping.`)
      continue
    }

    console.log(`\n[${i + 1}/${topicsList.length}] Generating 20 exercises for "${topic.title}" (${topic.level})...`)

    const vocab = loadVocabularyForLevel(topic.level)

    try {
      // Part 1: 10 exercises
      const prompt1 = buildPrompt(topic, vocab, 1)
      const batch1 = await callGeminiWithRetry(prompt1)
      console.log(`  ✓ Part 1: received ${batch1.length} exercises.`)

      // Pacing pause
      await new Promise(r => setTimeout(r, 3000))

      // Part 2: 10 exercises
      const prompt2 = buildPrompt(topic, vocab, 2)
      const batch2 = await callGeminiWithRetry(prompt2)
      console.log(`  ✓ Part 2: received ${batch2.length} exercises.`)

      const combined = [...batch1, ...batch2]

      // Clear previous partial exercises if any
      if (count > 0) {
        await pool.query(`DELETE FROM exercises WHERE topic_slug = $1 AND level = $2`, [topic.slug, topic.level])
      }

      await saveExercises(topic.slug, topic.level, combined)
      totalGenerated += combined.length
      processedCount++
      console.log(`  ✓ Saved ${combined.length} total exercises for "${topic.slug}". Total generated this session: ${totalGenerated}`)

      // Export periodic backup every 3 topics
      if (processedCount % 3 === 0) {
        await exportJsonBackup()
      }

      // Polite pacing pause between topics
      await new Promise(r => setTimeout(r, 4000))
    } catch (err) {
      console.error(`  ✗ Error generating exercises for topic "${topic.slug}":`, err.message)
      // On fatal error, back off 20s before next topic
      await new Promise(r => setTimeout(r, 20000))
    }
  }

  console.log("\n=======================================================")
  console.log(`Generation complete! Total new exercises generated: ${totalGenerated}`)
  console.log("=======================================================")

  await exportJsonBackup()
  await pool.end()
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})

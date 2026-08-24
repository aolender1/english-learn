import fs from "node:fs"
import path from "node:path"
import { loadEnvFile } from "node:process"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { eq, sql } from "drizzle-orm"

import { topicCatalog } from "../lib/topics"
import { parseVocabularyCsv, vocabularyFileNames, type VocabularyEntry } from "../lib/vocabulary"
import type { CefrLevel, Difficulty } from "../lib/question-bank"
import * as schema from "../lib/db/schema"

loadEnvFile(".env.local")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const db = drizzle(pool, { schema })

function loadAllVocabulary(): Record<CefrLevel, VocabularyEntry[]> {
  const dir = path.join(process.cwd(), "data", "vocabulary")
  const result = {
    "pre-a1-starters": [] as VocabularyEntry[],
    "a1-movers": [] as VocabularyEntry[],
    "a2-flyers": [] as VocabularyEntry[],
    "a2-key": [] as VocabularyEntry[],
    "b1-preliminary": [] as VocabularyEntry[],
    "b1-plus": [] as VocabularyEntry[],
    "b2-first": [] as VocabularyEntry[],
    "c1-advanced": [] as VocabularyEntry[],
    "c2-proficiency": [] as VocabularyEntry[],
  }

  for (const [level, fileName] of Object.entries(vocabularyFileNames) as Array<[CefrLevel, string]>) {
    try {
      const content = fs.readFileSync(path.join(dir, fileName), "utf-8")
      result[level] = parseVocabularyCsv(content, level)
    } catch (e) {
      console.warn(`Could not read ${fileName}:`, e)
    }
  }

  // b1-plus uses vocabulary up to b2
  result["b1-plus"] = [...result["b1-preliminary"], ...result["b2-first"]]
  return result
}

function getCumulativeVocab(level: CefrLevel, allVocab: Record<CefrLevel, VocabularyEntry[]>): VocabularyEntry[] {
  const order: CefrLevel[] = [
    "pre-a1-starters",
    "a1-movers",
    "a2-flyers",
    "a2-key",
    "b1-preliminary",
    "b2-first",
    "c1-advanced",
    "c2-proficiency",
  ]
  if (level === "b1-plus") {
    return [
      ...allVocab["pre-a1-starters"],
      ...allVocab["a1-movers"],
      ...allVocab["a2-flyers"],
      ...allVocab["a2-key"],
      ...allVocab["b1-preliminary"],
      ...allVocab["b2-first"],
    ]
  }
  const idx = order.indexOf(level)
  if (idx < 0) return allVocab["pre-a1-starters"]
  return order.slice(0, idx + 1).flatMap((lvl) => allVocab[lvl] ?? [])
}

function difficultyForLevel(level: CefrLevel): Difficulty {
  switch (level) {
    case "pre-a1-starters":
    case "a1-movers":
      return "easy"
    case "a2-flyers":
    case "a2-key":
      return "medium"
    case "b1-preliminary":
    case "b1-plus":
      return "hard"
    default:
      return "master"
  }
}

type GeneratedItem = {
  id?: string
  topicSlug: string
  level: CefrLevel
  prompt: string
  options: string[]
  correctAnswerIndex: number
  explanation: string
  word: string
  spanishTranslation: string
  difficulty: Difficulty
  createdBy: string
}

/**
 * Procedural linguistic exercise builder tailored to all 184 topics
 * combining exact CEFR cumulative vocabulary with accurate grammar sentence frames.
 */
function generateExercisesForTopic(
  topic: (typeof topicCatalog)[number],
  vocab: VocabularyEntry[]
): GeneratedItem[] {
  const items: GeneratedItem[] = []
  const difficulty = difficultyForLevel(topic.level)

  // Filter out any entries with empty words or commas in word
  const cleanVocab = vocab.filter(
    (v) => v.english && v.english.length > 1 && !v.english.includes(";") && !v.english.includes(",")
  )

  // Deterministic sample seed based on topic slug
  let seed = 0
  for (let i = 0; i < topic.slug.length; i++) {
    seed = (seed * 31 + topic.slug.charCodeAt(i)) >>> 0
  }
  const pseudoRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return (seed >>> 0) / 4294967296
  }

  // Shuffle vocabulary deterministically for this topic
  const shuffledVocab = [...cleanVocab].sort(() => pseudoRand() - 0.5)

  for (let i = 0; i < 20; i++) {
    const wordObj = shuffledVocab[i % shuffledVocab.length] || {
      english: "book",
      spanish: "libro",
      sourceLevel: "pre-a1-starters" as CefrLevel,
    }
    const w = wordObj.english.toLowerCase()
    const capW = w.charAt(0).toUpperCase() + w.slice(1)
    const span = wordObj.spanish

    let prompt = ""
    let options: string[] = []
    let correctAnswerIndex = 0
    let explanation = ""

    // Build sentence and options based on topic slug patterns
    const slug = topic.slug

    if (slug.includes("to-be") || slug.includes("was-were")) {
      const isPast = slug.includes("was-were")
      const subjects = [
        { s: "I", present: "am", past: "was", wrongPres: ["is", "are", "be"], wrongPast: ["were", "is", "be"] },
        { s: "She", present: "is", past: "was", wrongPres: ["are", "am", "be"], wrongPast: ["were", "are", "be"] },
        { s: "They", present: "are", past: "were", wrongPres: ["is", "am", "be"], wrongPast: ["was", "is", "be"] },
        { s: "We", present: "are", past: "were", wrongPres: ["is", "am", "be"], wrongPast: ["was", "are", "be"] },
        { s: "The " + w, present: "is", past: "was", wrongPres: ["are", "am", "be"], wrongPast: ["were", "are", "be"] },
      ]
      const sub = subjects[i % subjects.length]
      const correct = isPast ? sub.past : sub.present
      const wrong = isPast ? sub.wrongPast : sub.wrongPres
      prompt = `${sub.s} ______ with the ${w} ${isPast ? "yesterday" : "now"}.`
      options = [correct, wrong[0], wrong[1], wrong[2]]
      explanation = `Use '${correct}' with subject '${sub.s}' in the ${isPast ? "past" : "present"} simple of 'be'. (Vocabulary: ${w} - ${span}).`
    } else if (slug.includes("present-continuous")) {
      const verbForms = [
        { sub: "She", aux: "is", main: "using", wrong: ["uses", "use", "used"] },
        { sub: "They", aux: "are", main: "checking", wrong: ["checks", "check", "checked"] },
        { sub: "I", aux: "am", main: "holding", wrong: ["holds", "hold", "held"] },
        { sub: "We", aux: "are", main: "watching", wrong: ["watches", "watch", "watched"] },
      ]
      const vf = verbForms[i % verbForms.length]
      prompt = `Look! ${vf.sub} ______ the ${w} right now.`
      const correct = `${vf.aux} ${vf.main}`
      options = [correct, `${vf.aux} ${vf.wrong[0]}`, vf.wrong[1], vf.wrong[2]]
      explanation = `Present continuous uses '${vf.aux} + verb-ing' for actions happening right now with '${w}' (${span}).`
    } else if (slug.includes("have-has-got") || slug.includes("have-something-done")) {
      const isCausative = slug.includes("have-something-done")
      if (isCausative) {
        prompt = `We need to have our ${w} ______ before the trip.`
        options = ["repaired", "repairing", "repair", "to repair"]
        explanation = `Causative 'have + object + past participle' is used when someone else performs the service for the ${w} (${span}).`
      } else {
        const sub = i % 2 === 0 ? "My brother" : "My parents"
        const correct = i % 2 === 0 ? "has got" : "have got"
        const wrong = i % 2 === 0 ? ["have got", "is got", "got have"] : ["has got", "are got", "got has"]
        prompt = `${sub} ______ a new ${w} at home.`
        options = [correct, wrong[0], wrong[1], wrong[2]]
        explanation = `Use '${correct}' to express possession with subject '${sub}' and '${w}' (${span}).`
      }
    } else if (slug.includes("can-cant") || slug.includes("modals") || slug.includes("modal")) {
      if (slug.includes("deduction") || slug.includes("speculation")) {
        prompt = `Look at the broken ${w}. It ______ have been dropped accidentally.`
        options = ["must", "can't", "shouldn't", "needn't"]
        explanation = `'Must have + past participle' expresses strong logical deduction based on evidence relating to ${w} (${span}).`
      } else if (slug.includes("past-modal")) {
        prompt = `You ______ have told me earlier about the ${w}, but you forgot.`
        options = ["should", "must", "can't", "would"]
        explanation = `'Should have + past participle' expresses criticism or past unreal obligation concerning ${w} (${span}).`
      } else {
        prompt = `Excuse me, ______ I borrow your ${w} for a moment?`
        options = ["can", "am", "do", "have"]
        explanation = `'Can' is used with bare infinitive to ask for permission or express ability regarding ${w} (${span}).`
      }
    } else if (slug.includes("imperative")) {
      const isNeg = i % 2 === 0
      prompt = isNeg ? `Please ______ forget to take your ${w}!` : `______ the ${w} on the table carefully.`
      options = isNeg ? ["don't", "not", "no", "aren't"] : ["Put", "Putting", "Puts", "You put"]
      explanation = `Imperatives use the base form of the verb (positive) or 'Don't + base verb' (negative) for instructions with ${w} (${span}).`
    } else if (slug.includes("comparative") || slug.includes("superlative") || slug.includes("comparatives")) {
      const isSuper = slug.includes("superlative") || i % 2 === 1
      if (isSuper) {
        prompt = `This is the ______ ${w} in the entire collection.`
        options = ["most useful", "more useful", "usefulest", "as useful"]
        explanation = `Superlative form uses 'the most + adjective' for multi-syllable adjectives with ${w} (${span}).`
      } else {
        prompt = `This new ${w} is ______ than the old one.`
        options = ["more expensive", "expensive", "most expensive", "as expensive"]
        explanation = `Comparative form uses 'more + adjective + than' when comparing items with ${w} (${span}).`
      }
    } else if (slug.includes("conditional") || slug.includes("conditionals") || slug.includes("wishes")) {
      if (slug.includes("third") || slug.includes("mixed")) {
        prompt = `If we had checked the ${w} earlier, we ______ have avoided the delay.`
        options = ["would", "will", "are going to", "had"]
        explanation = `Third conditional uses 'If + had + past participle, would have + past participle' with ${w} (${span}).`
      } else if (slug.includes("second") || slug.includes("unreal")) {
        prompt = `If I had a better ${w}, I ______ finish this work much faster.`
        options = ["would", "will", "can", "am"]
        explanation = `Second conditional uses 'If + past simple, would + base verb' for hypothetical situations with ${w} (${span}).`
      } else {
        prompt = `If you need help with the ${w}, I ______ assist you tomorrow.`
        options = ["will", "would", "had", "was"]
        explanation = `First conditional uses 'If + present simple, will + base verb' for real future possibilities with ${w} (${span}).`
      }
    } else if (slug.includes("passive")) {
      prompt = `The ${w} ______ by the team during yesterday's meeting.`
      options = ["was discussed", "is discussing", "discussed", "were discuss"]
      explanation = `Passive voice uses 'was + past participle' for singular past actions focusing on the ${w} (${span}).`
    } else if (slug.includes("reported-speech") || slug.includes("indirect-questions")) {
      prompt = `She told me that she ______ the ${w} the previous afternoon.`
      options = ["had found", "finds", "has found", "will find"]
      explanation = `In reported speech, past actions backshift to the past perfect ('had found') with ${w} (${span}).`
    } else if (slug.includes("relative-clauses")) {
      const isPlace = i % 3 === 0
      const isPerson = i % 3 === 1
      if (isPlace) {
        prompt = `This is the place ______ we bought the ${w}.`
        options = ["where", "which", "who", "whom"]
        explanation = `Use relative adverb 'where' to refer to a place related to the ${w} (${span}).`
      } else if (isPerson) {
        prompt = `The person ______ recommended this ${w} was very helpful.`
        options = ["who", "which", "whose", "where"]
        explanation = `Use relative pronoun 'who' for people recommending the ${w} (${span}).`
      } else {
        prompt = `The ${w} ______ arrived this morning is already in use.`
        options = ["which", "who", "where", "whose"]
        explanation = `Use 'which' or 'that' for things and objects like ${w} (${span}).`
      }
    } else if (slug.includes("gerund") || slug.includes("infinitive") || slug.includes("verbs-to") || slug.includes("verbs-ing")) {
      const isGerund = slug.includes("ing") || i % 2 === 0
      if (isGerund) {
        prompt = `She enjoys ______ about the new ${w} in class.`
        options = ["learning", "to learn", "learned", "learn"]
        explanation = `The verb 'enjoy' is followed by a gerund (-ing form) when discussing the ${w} (${span}).`
      } else {
        prompt = `They decided ______ the ${w} after inspecting it carefully.`
        options = ["to purchase", "purchasing", "purchased", "purchase"]
        explanation = `The verb 'decide' is followed by a to-infinitive when deciding about ${w} (${span}).`
      }
    } else if (slug.includes("preposition") || slug.includes("prepositions") || slug.includes("at-in-on") || slug.includes("during-for-while")) {
      const prepChoice = [
        { p: "on the table next to the", opts: ["on", "at", "into", "to"] },
        { p: "in the drawer with the", opts: ["in", "at", "on", "from"] },
        { p: "at the entrance near the", opts: ["at", "on", "in", "to"] },
      ][i % 3]
      prompt = `Please leave the document ______ the table next to the ${w}.`
      options = ["on", "at", "in", "into"]
      explanation = `Preposition of place 'on' is used for surfaces near the ${w} (${span}).`
    } else if (slug.includes("phrasal-verbs")) {
      const phrasals = [
        { verb: "look after", def: "care for", wrong: ["look into", "look over", "look for"] },
        { verb: "give up", def: "stop doing", wrong: ["give in", "give away", "give off"] },
        { verb: "turn on", def: "activate", wrong: ["turn off", "turn into", "turn over"] },
        { verb: "run out of", def: "have no more", wrong: ["run into", "run over", "run away"] },
      ]
      const pv = phrasals[i % phrasals.length]
      prompt = `Be careful not to ______ the ${w} before the project is completed.`
      options = [pv.verb, pv.wrong[0], pv.wrong[1], pv.wrong[2]]
      explanation = `The phrasal verb '${pv.verb}' means '${pv.def}' in relation to the ${w} (${span}).`
    } else if (slug.includes("quantifiers") || slug.includes("much-many") || slug.includes("a-some-any") || slug.includes("all-both")) {
      prompt = `Do you have ______ extra information about this ${w}?`
      options = ["any", "many", "a few", "these"]
      explanation = `'Any' is used in questions and negative statements with uncountable nouns like information about ${w} (${span}).`
    } else {
      // General contextual topic frame
      prompt = `The instructor asked us to describe the ______ ${w} in detail.`
      options = ["selected", "select", "selecting", "selects"]
      explanation = `The past participle adjective 'selected' correctly modifies the noun '${w}' (${span}) in this context.`
    }

    // Ensure options are shuffled but correctAnswerIndex tracked correctly
    const correctOptionText = options[0]
    const shuffledOptions = [...options].sort(() => pseudoRand() - 0.5)
    correctAnswerIndex = shuffledOptions.indexOf(correctOptionText)

    items.push({
      topicSlug: topic.slug,
      level: topic.level,
      prompt,
      options: shuffledOptions,
      correctAnswerIndex,
      explanation,
      word: wordObj.english,
      spanishTranslation: span,
      difficulty,
      createdBy: "system",
    })
  }

  return items
}

async function main() {
  console.log("=== Seeding Topics & Generating 20 Exercises per Topic ===")
  const allVocab = loadAllVocabulary()
  console.log("Loaded vocabulary CSVs:")
  for (const [lvl, list] of Object.entries(allVocab)) {
    console.log(`  ${lvl}: ${list.length} entries`)
  }

  console.log(`\nTotal topics in catalog: ${topicCatalog.length}`)

  // 1. Seed / Upsert topics into database
  console.log("\n1. Upserting topics into Neon DB...")
  for (let idx = 0; idx < topicCatalog.length; idx++) {
    const t = topicCatalog[idx]
    await db
      .insert(schema.topics)
      .values({
        slug: t.slug,
        level: t.level,
        title: t.title,
        description: t.description,
        focus: t.focus,
        enabled: true,
        sortOrder: idx,
      })
      .onConflictDoUpdate({
        target: [schema.topics.slug, schema.topics.level],
        set: {
          title: t.title,
          description: t.description,
          focus: t.focus,
          updatedAt: new Date(),
        },
      })
  }
  console.log(`Successfully synced ${topicCatalog.length} topics.`)

  // 2. Generate 20 exercises per topic
  console.log("\n2. Generating 20 curated exercises per topic...")
  const allExercises: GeneratedItem[] = []

  for (const topic of topicCatalog) {
    const vocab = getCumulativeVocab(topic.level, allVocab)
    const exercises = generateExercisesForTopic(topic, vocab)
    allExercises.push(...exercises)
  }

  console.log(`Generated total of ${allExercises.length} exercises across ${topicCatalog.length} topics.`)

  // 3. Clear existing system exercises and insert in batches of 100
  console.log("\n3. Persisting exercises into Neon DB in batches...")
  // Optional: keep teacher-created exercises, delete old system exercises
  await db.delete(schema.exercises).where(eq(schema.exercises.createdBy, "system"))

  const BATCH_SIZE = 100
  for (let i = 0; i < allExercises.length; i += BATCH_SIZE) {
    const batch = allExercises.slice(i, i + BATCH_SIZE)
    await db.insert(schema.exercises).values(
      batch.map((item) => ({
        topicSlug: item.topicSlug,
        level: item.level,
        prompt: item.prompt,
        options: item.options,
        correctAnswerIndex: item.correctAnswerIndex,
        explanation: item.explanation,
        word: item.word,
        spanishTranslation: item.spanishTranslation,
        difficulty: item.difficulty,
        createdBy: "system",
      }))
    )
    process.stdout.write(`Inserted ${Math.min(i + BATCH_SIZE, allExercises.length)} / ${allExercises.length}\r`)
  }

  console.log("\nWriting backup seed file to data/seed-exercises.json...")
  fs.writeFileSync(
    path.join(process.cwd(), "data", "seed-exercises.json"),
    JSON.stringify(allExercises, null, 2),
    "utf-8"
  )

  console.log("\n=== Seeding completed successfully! ===")
  await pool.end()
}

main().catch((err) => {
  console.error("Fatal error during seeding:", err)
  process.exit(1)
})

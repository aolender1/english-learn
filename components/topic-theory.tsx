"use client"

import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, HelpCircle, Lightbulb, Sparkles, Volume2 } from "lucide-react"
import { AudioWordBadge } from "@/components/audio-word-badge"
import { levelLabel, type CefrLevel } from "@/lib/question-bank"
import type { TopicDef } from "@/lib/topics"

type TopicTheoryProps = {
  level: CefrLevel
  topic: TopicDef
  onStartPractice: () => void
  onBack: () => void
  starting?: boolean
}

// Generate rich pedagogical structure for any given topic
function getTopicTheoryData(topic: TopicDef, level: CefrLevel) {
  const slug = topic.slug.toLowerCase()

  if (slug.includes("to-be") || slug.includes("was-were")) {
    const isPast = slug.includes("was-were")
    return {
      concept: isPast
        ? "The verb 'to be' in the past simple has two forms: was and were. It describes past states, emotions, locations, or identities."
        : "The verb 'to be' is the most fundamental verb in English. In the present simple, it has three forms: am, is, and are.",
      formula: isPast
        ? [
            { label: "Affirmative", text: "I / He / She / It + was | You / We / They + were" },
            { label: "Negative", text: "Subject + was not (wasn't) / were not (weren't)" },
            { label: "Questions", text: "Was / Were + Subject + ... ?" },
          ]
        : [
            { label: "Affirmative", text: "I + am | He / She / It + is | You / We / They + are" },
            { label: "Negative", text: "Subject + am not / is not (isn't) / are not (aren't)" },
            { label: "Questions", text: "Am / Is / Are + Subject + ... ?" },
          ],
      examples: isPast
        ? [
            { en: "She was at the library yesterday.", es: "Ella estaba en la biblioteca ayer.", tip: "Use 'was' with singular third person." },
            { en: "They were very excited about the game.", es: "Ellos estaban muy emocionados por el partido.", tip: "Use 'were' with plural subjects." },
          ]
        : [
            { en: "I am a student at the language center.", es: "Soy estudiante en el centro de idiomas.", tip: "Only use 'am' with pronoun 'I'." },
            { en: "The book is on the desk.", es: "El libro está sobre el escritorio.", tip: "Use 'is' with singular nouns and he/she/it." },
          ],
      tips: [
        "In spoken English and informal writing, contractions (I'm, she's, they're, isn't, weren't) are standard.",
        "Remember that 'You' always takes 'are' (present) or 'were' (past), even when referring to one person.",
      ],
      keyWords: isPast ? ["yesterday", "last night", "ago", "were", "was"] : ["always", "today", "now", "student", "teacher"],
    }
  }

  if (slug.includes("present-continuous")) {
    return {
      concept: "The Present Continuous (am/is/are + verb-ing) describes actions taking place right now, temporary situations, or definite future plans.",
      formula: [
        { label: "Affirmative", text: "Subject + am/is/are + verb-ing" },
        { label: "Negative", text: "Subject + am/is/are + not + verb-ing" },
        { label: "Questions", text: "Am/Is/Are + Subject + verb-ing ... ?" },
      ],
      examples: [
        { en: "She is writing an email right now.", es: "Ella está escribiendo un correo ahora mismo.", tip: "Actions happening at the moment of speaking." },
        { en: "Look! They are playing in the garden.", es: "¡Mira! Están jugando en el jardín.", tip: "Words like 'Look!' or 'Listen!' signal present continuous." },
      ],
      tips: [
        "Stative verbs (like love, know, understand, believe, want) are rarely used in continuous tenses.",
        "Spelling rule: verbs ending in consonant-vowel-consonant double the last consonant (run -> running, sit -> sitting).",
      ],
      keyWords: ["now", "right now", "at the moment", "look", "listen"],
    }
  }

  if (slug.includes("phonetic") || slug.includes("pronunciation")) {
    return {
      concept: "English is not a phonetic language—words are often pronounced differently from how they are spelled. Mastering IPA (International Phonetic Alphabet) and word stress builds clear listening and speaking skills.",
      formula: [
        { label: "Vowel Sounds", text: "Short vowels (/ɪ/, /e/, /æ/, /ʌ/, /ɒ/, /ʊ/) vs Long vowels (/iː/, /ɑː/, /ɔː/, /uː/, /ɜː/)" },
        { label: "Diphthongs", text: "Two vowel sounds gliding together (/eɪ/, /aɪ/, /ɔɪ/, /aʊ/, /əʊ/, /ɪə/, /eə/)" },
        { label: "Word Stress", text: "The mark (ˈ) indicates the primary stressed syllable in the phonetic transcription." },
      ],
      examples: [
        { en: "Ship (/ʃɪp/) vs Sheep (/ʃiːp/)", es: "Diferencia entre vocal corta /ɪ/ y larga /iː/.", tip: "Contrastive vowel length changes the word meaning." },
        { en: "Record (noun: /ˈrek.ɔːd/) vs Record (verb: /rɪˈkɔːd/)", es: "El acento cambia según la función gramatical.", tip: "Nouns often stress the 1st syllable, verbs the 2nd." },
      ],
      tips: [
        "Click the speaker icon 🔊 next to each word below to listen to native British/American audio pronunciation.",
        "Notice the weak vowel 'schwa' (/ə/), the most common sound in spoken English (like 'a' in 'about').",
      ],
      keyWords: ["pronunciation", "vowel", "consonant", "accent", "syllable", "rhythm"],
    }
  }

  // Default rich pedagogical breakdown derived from topic
  return {
    concept: topic.description || `Understanding and applying the grammar principles of "${topic.title}".`,
    formula: [
      { label: "Grammar Focus", text: topic.focus },
      { label: "Application", text: "Use appropriate sentence structures and register appropriate for CEFR " + level.toUpperCase() },
    ],
    examples: [
      {
        en: `Practise ${topic.title} in real-world contexts.`,
        es: "Ejemplo contextualizado según el nivel correspondiente.",
        tip: "Pay attention to word order and auxiliary verbs.",
      },
    ],
    tips: [
      "Read each sentence carefully and identify the time markers and subject-verb agreement.",
      "Review explanations after each question to reinforce the grammar rule.",
    ],
    keyWords: ["grammar", "practice", "sentence", "context", "accuracy"],
  }
}

export function TopicTheory({ level, topic, onStartPractice, onBack, starting = false }: TopicTheoryProps) {
  const theory = getTopicTheoryData(topic, level)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      {/* Top Back navigation */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="button-back">
          <ArrowLeft size={16} /> Back to {levelLabel(level)} topics
        </button>
        <span className="tag font-mono text-xs uppercase">{levelLabel(level)}</span>
      </div>

      {/* Main Topic Header */}
      <section className="flex flex-col gap-4 border-b border-border pb-8">
        <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-widest">
          <BookOpen size={15} /> Topic Overview & Theory
        </div>
        <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-foreground">
          {topic.title}
        </h1>
        <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
          {theory.concept}
        </p>
      </section>

      {/* Grammar Rules & Formulas */}
      <section className="flex flex-col gap-4 bg-card border border-border p-6 rounded-lg">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles size={17} className="text-primary" /> Key Grammar Structures
        </h2>
        <div className="flex flex-col gap-2.5">
          {theory.formula.map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-2 bg-secondary/50 p-3 rounded border border-border/50 text-sm">
              <span className="font-mono text-xs font-bold text-primary min-w-28 uppercase">
                {item.label}:
              </span>
              <span className="font-medium text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Example Sentences */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 size={17} className="text-primary" /> Natural Examples
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {theory.examples.map((ex, idx) => (
            <div key={idx} className="border border-border bg-card p-4 rounded flex flex-col justify-between gap-2">
              <div>
                <p className="font-serif text-base font-medium text-foreground">&ldquo;{ex.en}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1 italic">{ex.es}</p>
              </div>
              <p className="text-[11px] text-primary/90 bg-primary/10 p-2 rounded border border-primary/20">
                <strong>Tip:</strong> {ex.tip}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pro Tips & Pitfalls */}
      <section className="flex flex-col gap-3 border-l-2 border-primary bg-secondary/40 p-5 rounded-r">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Lightbulb size={16} className="text-amber-400" /> Tips & Common Mistakes to Avoid
        </h3>
        <ul className="flex flex-col gap-2 pl-4 list-disc text-xs md:text-sm text-muted-foreground leading-relaxed">
          {theory.tips.map((tip, idx) => (
            <li key={idx}>{tip}</li>
          ))}
        </ul>
      </section>

      {/* Key Vocabulary & Pronunciation */}
      {theory.keyWords && theory.keyWords.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Volume2 size={16} className="text-primary" /> Key Topic Words (Audio & Phonetics)
            </h3>
            <span className="text-xs text-muted-foreground">Click speaker to listen</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {theory.keyWords.map((w) => (
              <AudioWordBadge key={w} word={w} />
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 mt-4">
        <button onClick={onBack} className="button-secondary w-full sm:w-auto">
          <ArrowLeft size={16} /> All {levelLabel(level)} Topics
        </button>

        <button
          onClick={onStartPractice}
          disabled={starting}
          className="button-primary w-full sm:w-auto py-3 px-6 text-base font-semibold shadow-md flex items-center justify-center gap-2"
        >
          {starting ? (
            "Loading exercises..."
          ) : (
            <>
              Empezar a practicar <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

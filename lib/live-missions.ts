import type { CefrLevel } from "./question-bank"
import { levelLabel } from "./question-bank"
import { getDefaultTopicTheoryData, type TopicDef } from "./topics"

export type LiveVoiceOption = {
  id: string
  label: string
  style: string
}

export const LIVE_VOICES: readonly LiveVoiceOption[] = [
  { id: "Aoede", label: "Aoede", style: "Cálida y natural · Recomendada" },
  { id: "Puck", label: "Puck", style: "Amigable y dinámica" },
  { id: "Kore", label: "Kore", style: "Clara y didáctica" },
  { id: "Charon", label: "Charon", style: "Pausada y serena" },
  { id: "Fenrir", label: "Fenrir", style: "Expresiva y enérgica" },
] as const

export const DEFAULT_LIVE_VOICE = "Aoede"

export function isValidLiveVoice(voiceName: string): boolean {
  return LIVE_VOICES.some((v) => v.id === voiceName)
}

export type MissionObjective = {
  id: string
  labelEs: string
  labelEn: string
  criterionEn: string
}

export type ChecklistItemState = MissionObjective & {
  completed: boolean
  probability: number
}

export type TranscriptTurn = {
  role: "user" | "model"
  text: string
  ts: number
}

export type SpeakingMission = {
  level: CefrLevel
  levelDisplay: string
  topicSlug: string
  topicTitle: string
  topicFocus: string
  missionTitle: string
  missionGoal: string
  scenarioEs: string
  suggestedDurationSec: number
  cefrBand: "starter" | "intermediate" | "advanced"
  objectives: MissionObjective[]
  starterPromptsEs: string[]
  systemInstruction: string
}

type CefrSpeakingProfile = {
  band: "starter" | "intermediate" | "advanced"
  paceInstruction: string
  spanishPolicy: string
  complexityInstruction: string
}

function getCefrProfile(level: CefrLevel): CefrSpeakingProfile {
  switch (level) {
    case "pre-a1-starters":
    case "a1-movers":
      return {
        band: "starter",
        paceInstruction:
          "Speak slowly, warmly, and very clearly in simple A1 English (1 to 2 short sentences max per turn).",
        spanishPolicy:
          "Keep 90% in simple English, but if the student hesitates, freezes, or speaks Spanish, give a brief encouraging 1-sentence hint in Spanish and immediately model a simple English sentence for them to try.",
        complexityInstruction:
          "Use everyday high-frequency words, concrete objects, and short questions (Yes/No or simple Wh- questions).",
      }
    case "a2-flyers":
    case "a2-key":
    case "b1-preliminary":
    case "b1-plus":
      return {
        band: "intermediate",
        paceInstruction:
          "Speak clearly at a natural conversational pace (2 short sentences per turn, ending with one engaging follow-up question).",
        spanishPolicy:
          "Stay in natural English by default. Only switch briefly to Spanish if the student explicitly asks for help in Spanish or struggles repeatedly with the same rule, then switch right back to English.",
        complexityInstruction:
          "Encourage full sentences, everyday storytelling, comparisons, and clear use of the target grammar structure.",
      }
    case "b2-first":
    case "c1-advanced":
    case "c2-proficiency":
      return {
        band: "advanced",
        paceInstruction:
          "Speak at a fluent, natural conversational speed with idiomatic phrasing (2 to 3 concise sentences max per turn).",
        spanishPolicy:
          "Conduct the conversation fully in English unless the student explicitly requests a quick Spanish clarification on a subtle nuance.",
        complexityInstruction:
          "Push for precision, nuance, natural collocations, reasoned opinions, and accurate complex clauses.",
      }
  }
}

export function buildSpeakingMission(params: {
  level: CefrLevel
  topic: TopicDef
  studentName?: string | null
}): SpeakingMission {
  const { level, topic, studentName } = params
  const profile = getCefrProfile(level)
  const levelDisplay = levelLabel(level)
  const theory = topic.theory ?? getDefaultTopicTheoryData(topic, level)
  const cleanFocus = (topic.focus || topic.description || topic.title).trim()
  const exampleHint = theory.examples?.[0]?.en ? `Example pattern: "${theory.examples[0].en}"` : ""
  const keyVocab = (theory.keyWords ?? []).slice(0, 6).join(", ")
  const firstName = studentName?.trim().split(/\s+/)[0] || ""

  const objectives: MissionObjective[] = [
    {
      id: "obj_target_grammar",
      labelEs: `Usar "${topic.title}" al hablar`,
      labelEn: `Apply "${topic.title}" naturally`,
      criterionEn: `The student used the target English grammar or vocabulary for "${topic.title}" (focus: ${cleanFocus}) accurately at least once in their spoken turns.`,
    },
    {
      id: "obj_complete_sentences",
      labelEs: "Responder con oraciones completas en inglés",
      labelEn: "Respond in complete English sentences",
      criterionEn:
        "The student answered in at least two clear, complete English sentences rather than isolated single words or Spanish.",
    },
    {
      id: "obj_interactive_detail",
      labelEs: "Sumar un ejemplo personal o repregunta",
      labelEn: "Add a personal detail or ask a question",
      criterionEn:
        "The student gave a personal example, extra detail, or asked the tutor a relevant follow-up question in English.",
    },
  ]

  const scenarioEs =
    profile.band === "starter"
      ? `Charla guiada paso a paso para practicar "${topic.title}" con frases cortas y ayuda en español si te trabás.`
      : profile.band === "intermediate"
      ? `Diálogo práctico de situaciones cotidianas usando "${topic.title}" para ganar soltura y precisión.`
      : `Conversación fluida de nivel ${levelDisplay} enfocada en dominar los matices de "${topic.title}".`

  const systemInstruction = [
    `You are Wordshift Live Tutor, a friendly, patient bilingual English speaking coach running a focused 3-minute voice practice mission.`,
    firstName ? `The student's name is ${firstName}.` : "",
    `CEFR Level: ${levelDisplay} (${level}).`,
    `Topic: "${topic.title}".`,
    `Grammar / Language Focus: ${cleanFocus}.`,
    exampleHint,
    keyVocab ? `Useful topic vocabulary to weave in naturally: ${keyVocab}.` : "",
    ``,
    `MISSION GOALS FOR THE STUDENT TO ACHIEVE IN THIS CALL:`,
    `1. ${objectives[0].labelEn}: ${objectives[0].criterionEn}`,
    `2. ${objectives[1].labelEn}: ${objectives[1].criterionEn}`,
    `3. ${objectives[2].labelEn}: ${objectives[2].criterionEn}`,
    ``,
    `VOICE CONVERSATION RULES:`,
    `- ${profile.paceInstruction}`,
    `- ${profile.complexityInstruction}`,
    `- ${profile.spanishPolicy}`,
    `- Keep EVERY response concise so dialogue stays interactive and balanced. Never give long lectures or monologues.`,
    `- Speaking output only: do NOT output markdown, bullet lists, asterisks, emojis, or stage directions.`,
    `- When the student makes a grammar slip on the target topic, warmly recast the corrected sentence naturally inside your reply and ask them to try another example.`,
    `- Actively steer the chat so the student gets easy opportunities to complete all 3 mission goals.`,
  ]
    .filter(Boolean)
    .join("\n")

  return {
    level,
    levelDisplay,
    topicSlug: topic.slug,
    topicTitle: topic.title,
    topicFocus: cleanFocus,
    missionTitle: `Misión oral: ${topic.title}`,
    missionGoal: `Completá los 3 objetivos hablando sobre ${topic.title} (${levelDisplay}).`,
    scenarioEs,
    suggestedDurationSec: 180,
    cefrBand: profile.band,
    objectives,
    starterPromptsEs: [
      `Pedile ejemplos cotidianos de "${topic.title}"`,
      "Si no entendés algo, decí 'Can you repeat that slowly?' o pedí pista en español",
      "Intentá responder siempre con una oración completa en inglés",
    ],
    systemInstruction,
  }
}

export function createInitialChecklist(mission: Pick<SpeakingMission, "objectives">): ChecklistItemState[] {
  return mission.objectives.map((obj) => ({
    ...obj,
    completed: false,
    probability: 0,
  }))
}

export function toPublicMission(mission: SpeakingMission): Omit<SpeakingMission, "systemInstruction"> {
  const { systemInstruction: _omitted, ...publicPart } = mission
  void _omitted
  return publicPart
}

import type { CefrLevel } from "./question-bank"

export type TopicDef = {
  slug: string
  title: string
  description: string
  /** Grammar instructions given to Gemini so generated sentences match the topic. */
  focus: string
  levels: CefrLevel[]
}

export const topicCatalog: TopicDef[] = [
  {
    slug: "reported-speech",
    title: "Reported Speech",
    description:
      "Transform direct speech, questions and requests with accurate tense and perspective changes.",
    focus:
      "Reported speech. Example sentences should describe someone reporting what another person said, asked or requested (e.g. 'She told me that the meeting was a real challenge.'). Keep natural reported-speech contexts around the vocabulary word.",
    levels: ["b1-preliminary", "b2-first"],
  },
]

export function topicsForLevel(level: CefrLevel): TopicDef[] {
  return topicCatalog.filter((topic) => topic.levels.includes(level))
}

export function findTopic(slug: string, level: CefrLevel): TopicDef | null {
  return topicCatalog.find((topic) => topic.slug === slug && topic.levels.includes(level)) ?? null
}

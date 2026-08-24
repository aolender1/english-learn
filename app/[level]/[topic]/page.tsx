import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { GameApp } from "@/components/game-app"
import { cefrLevels, resolveLevelSlug } from "@/lib/question-bank"
import { resolveTopicSlug } from "@/lib/topics"

type Props = {
  params: Promise<{ level: string; topic: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { level: levelParam, topic: topicParam } = await props.params
  const level = resolveLevelSlug(levelParam)
  if (!level) return { title: "Topic Not Found" }

  const topic = resolveTopicSlug(topicParam, level)
  const info = cefrLevels.find((l) => l.id === level)

  if (!topic || !info) return { title: "Topic Not Found" }

  return {
    title: `${topic.title} (${info.code}) Practice | Wordshift`,
    description: topic.description || `Practise ${topic.title} at CEFR ${info.code} level with contextual multiple-choice exercises.`,
  }
}

export default async function TopicPage(props: Props) {
  const { level: levelParam, topic: topicParam } = await props.params
  const level = resolveLevelSlug(levelParam)

  if (!level) {
    notFound()
  }

  const topic = resolveTopicSlug(topicParam, level)

  return (
    <GameApp
      initialLevel={level}
      initialTopicSlug={topic ? topic.slug : topicParam}
      initialView="theory"
    />
  )
}

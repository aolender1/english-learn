import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { GameApp } from "@/components/game-app"
import { cefrLevels, resolveLevelSlug } from "@/lib/question-bank"

type Props = {
  params: Promise<{ level: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { level: levelParam } = await props.params
  const level = resolveLevelSlug(levelParam)
  if (!level) return { title: "Level Not Found" }

  const info = cefrLevels.find((l) => l.id === level)
  if (!info) return { title: "Level Not Found" }

  return {
    title: `${info.code} ${info.exam} English Practice Topics | Wordshift`,
    description: `Practise Cambridge English ${info.code} (${info.exam}) grammar and vocabulary topics with interactive exercises.`,
  }
}

export default async function LevelPage(props: Props) {
  const { level: levelParam } = await props.params
  const level = resolveLevelSlug(levelParam)

  if (!level) {
    notFound()
  }

  return <GameApp initialLevel={level} initialView="level" />
}

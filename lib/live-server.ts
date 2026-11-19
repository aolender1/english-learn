import { and, eq } from "drizzle-orm"

import aiModelsConfig from "@/config/ai-models.json"
import { db } from "@/lib/db"
import { topics as topicsTable } from "@/lib/db/schema"
import { buildSpeakingMission, DEFAULT_LIVE_VOICE, isValidLiveVoice, type SpeakingMission } from "@/lib/live-missions"
import { cefrLevels, type CefrLevel } from "@/lib/question-bank"
import { findTopic, type TopicDef, type TopicTheoryData } from "@/lib/topics"

const AUTH_TOKENS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/auth_tokens"
export const LIVE_WS_BASE_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained"

export const LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ??
  aiModelsConfig.tasks.live?.primaryModel ??
  "gemini-3.8-live"

export async function resolveTopicForLive(
  levelInput: string,
  topicSlugInput: string,
): Promise<{ level: CefrLevel; topic: TopicDef } | null> {
  const level = cefrLevels.find((item) => item.id === levelInput)?.id
  if (!level) return null

  const slug = topicSlugInput.trim()
  if (!slug) return null

  let topic = findTopic(slug, level)
  if (topic) return { level, topic }

  const [dbTopic] = await db
    .select()
    .from(topicsTable)
    .where(and(eq(topicsTable.slug, slug), eq(topicsTable.level, level)))
    .limit(1)

  if (!dbTopic) return null

  topic = {
    slug: dbTopic.slug,
    level: dbTopic.level as CefrLevel,
    title: dbTopic.title,
    description: dbTopic.description ?? "",
    focus: dbTopic.focus ?? "",
    theory: (dbTopic.theory as TopicTheoryData | null) ?? null,
    enabled: dbTopic.enabled,
  }
  return { level, topic }
}

export async function resolveMissionFromStoredSession(params: {
  level: string
  topicSlug: string
  missionTitle: string
  missionGoal: string
  studentName?: string | null
}): Promise<SpeakingMission> {
  const resolved = await resolveTopicForLive(params.level, params.topicSlug)
  if (resolved) {
    return buildSpeakingMission({
      level: resolved.level,
      topic: resolved.topic,
      studentName: params.studentName,
    })
  }

  const fallbackLevel: CefrLevel =
    cefrLevels.find((item) => item.id === params.level)?.id ?? "b1-preliminary"
  return buildSpeakingMission({
    level: fallbackLevel,
    topic: {
      slug: params.topicSlug,
      level: fallbackLevel,
      title: params.missionTitle.replace(/^Misión oral:\s*/i, "") || params.topicSlug,
      description: params.missionGoal,
      focus: params.missionGoal,
    },
    studentName: params.studentName,
  })
}

export async function createLiveEphemeralToken(params: {
  mission: SpeakingMission
  voiceName?: string
}): Promise<{ token: string; model: string; voiceName: string; expiresAt: string; wsBaseUrl: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const voiceName =
    params.voiceName && isValidLiveVoice(params.voiceName) ? params.voiceName : DEFAULT_LIVE_VOICE
  const expireTime = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(AUTH_TOKENS_ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
        bidiGenerateContentSetup: {
          model: `models/${LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: params.mission.systemInstruction }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      }),
      signal: controller.signal,
    })

    const data = (await res.json().catch(() => ({}))) as {
      name?: string
      error?: { message?: string; status?: string; code?: number }
    }

    if (!res.ok || !data.name) {
      const msg = data.error?.message || `Live auth token request failed (${res.status})`
      throw new Error(msg)
    }

    return {
      token: data.name,
      model: LIVE_MODEL,
      voiceName,
      expiresAt: expireTime,
      wsBaseUrl: LIVE_WS_BASE_URL,
    }
  } finally {
    clearTimeout(timeout)
  }
}

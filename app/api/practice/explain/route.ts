import { jsonError } from "@/lib/api-auth"
import { explainStudentMistake } from "@/lib/gemini"

export async function POST(request: Request) {
  let body: {
    prompt?: string
    expectedAnswer?: string
    studentAnswer?: string
    level?: string
    topicTitle?: string
    topicFocus?: string
    errorCategory?: string
    score?: number
  }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body.", 400)
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""
  const expectedAnswer = typeof body.expectedAnswer === "string" ? body.expectedAnswer.trim() : ""
  const studentAnswer = typeof body.studentAnswer === "string" ? body.studentAnswer.trim() : ""
  const level = typeof body.level === "string" ? body.level.trim() : ""
  const topicTitle = typeof body.topicTitle === "string" ? body.topicTitle.trim() : ""

  if (!prompt || !expectedAnswer || !studentAnswer || !level || !topicTitle) {
    return jsonError("Missing required explanation fields.", 400)
  }

  try {
    const result = await explainStudentMistake({
      prompt,
      expectedAnswer,
      studentAnswer: studentAnswer.slice(0, 500),
      level,
      topicTitle,
      topicFocus: typeof body.topicFocus === "string" ? body.topicFocus.trim() : undefined,
      errorCategory: typeof body.errorCategory === "string" ? body.errorCategory.trim() : undefined,
      score: typeof body.score === "number" ? body.score : undefined,
    })

    return Response.json(result)
  } catch (error) {
    console.error("[api/practice/explain POST]", error)
    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "GEMINI_API_KEY is not configured on the server."
        : error instanceof Error
        ? error.message
        : "Failed to generate explanation."
    return jsonError(message, 500)
  }
}

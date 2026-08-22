import type { CefrLevel } from "./question-bank"

export type VocabularyEntry = { english: string; spanish: string; sourceLevel: CefrLevel }

const availableOrder: CefrLevel[] = [
  "pre-a1-starters", "a1-movers", "a2-flyers", "a2-key",
  "b1-preliminary", "b2-first", "c1-advanced", "c2-proficiency",
]

export function parseVocabularyCsv(input: string, sourceLevel: CefrLevel): VocabularyEntry[] {
  const rows: string[][] = []
  const firstLine = input.split(/\r?\n/, 1)[0] ?? ""
  const delimiter = firstLine.includes(";") ? ";" : ","
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { field += '"'; index++ }
      else quoted = !quoted
    } else if (character === delimiter && !quoted) { row.push(field.trim()); field = "" }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index++
      row.push(field.trim()); field = ""
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else field += character
  }
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)

  return rows.slice(1).flatMap((columns) => {
    const english = columns[0]?.replace(/^\uFEFF/, "").trim()
    const spanish = columns.slice(1).join(",").trim()
    return english && spanish ? [{ english, spanish, sourceLevel }] : []
  })
}

export function cumulativeVocabulary(level: CefrLevel, lists: Partial<Record<CefrLevel, VocabularyEntry[]>>) {
  const levelIndex = availableOrder.indexOf(level)
  if (levelIndex < 0) return []
  return availableOrder.slice(0, levelIndex + 1).flatMap((item) => lists[item] ?? [])
}

export const vocabularyFileNames: Record<CefrLevel, string> = {
  "pre-a1-starters": "vocabulario_Starters_Pre_A1.csv",
  "a1-movers": "vocabulario_Movers_A1.csv",
  "a2-flyers": "vocabulario_Flyers_A2.csv",
  "a2-key": "vocabulario_A2.csv",
  "b1-preliminary": "vocabulario_B1.csv",
  "b2-first": "vocabulario_B2.csv",
  "c1-advanced": "vocabulario_C1.csv",
  "c2-proficiency": "vocabulario_C2.csv",
}

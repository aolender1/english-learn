import { writeFileSync } from "node:fs"
import { join } from "node:path"

const CATALOG_URL = "https://googlefonts.github.io/noto-emoji-animation/data/api.json"

async function main() {
  console.log(`Fetching official Google Noto Animated Emoji catalog from ${CATALOG_URL}...`)
  const res = await fetch(CATALOG_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch Noto catalog: HTTP ${res.status}`)
  }

  const raw = await res.json()

  const icons = (raw.icons ?? [])
    .filter((icon) => typeof icon.codepoint === "string" && icon.codepoint.trim().length > 0)
    .map((icon) => ({
      cp: icon.codepoint.trim().toLowerCase(),
      cat: icon.categories?.[0] ?? "Other",
      tags: Array.from(
        new Set(
          (icon.tags ?? [])
            .map((tag) => String(tag).replace(/^:|:$/g, "").trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
    }))

  const outPath = join(process.cwd(), "data", "noto-animated-emoji.json")
  writeFileSync(outPath, JSON.stringify(icons), "utf-8")
  console.log(`Saved ${icons.length} verified animated Noto emojis to ${outPath}`)
}

main().catch((err) => {
  console.error("Error syncing Noto catalog:", err)
  process.exit(1)
})

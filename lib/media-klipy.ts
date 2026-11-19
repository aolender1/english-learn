const KLIPY_API_BASE = "https://api.klipy.com/api/v1"

export type KlipyGifItem = {
  id: string
  slug: string
  title: string
  url: string
  previewUrl: string
  mp4Url: string | null
  width: number | null
  height: number | null
  mediaType: "webp" | "gif"
}

type KlipyFormatInfo = {
  url?: string
  width?: number
  height?: number
  size?: number
}

type KlipySizeBucket = {
  gif?: KlipyFormatInfo
  webp?: KlipyFormatInfo
  jpg?: KlipyFormatInfo
  mp4?: KlipyFormatInfo
  webm?: KlipyFormatInfo
}

type KlipyRawItem = {
  id?: string | number
  slug?: string
  title?: string
  file?: {
    hd?: KlipySizeBucket
    md?: KlipySizeBucket
    sm?: KlipySizeBucket
  }
}

type KlipySearchResponse = {
  result?: boolean
  data?: {
    data?: KlipyRawItem[]
  }
  message?: string
}

function requireKlipyKey(): string {
  const key = process.env.KLIPY_API_KEY?.trim()
  if (!key) {
    throw new Error("KLIPY_API_KEY is not configured on the server.")
  }
  return key
}

export async function searchKlipyGifs(
  query: string,
  opts?: { perPage?: number; page?: number; customerId?: string },
): Promise<KlipyGifItem[]> {
  const cleanQuery = query.trim()
  if (!cleanQuery) return []

  const apiKey = requireKlipyKey()
  const perPage = Math.max(1, Math.min(12, opts?.perPage ?? 6))
  const page = Math.max(1, opts?.page ?? 1)
  const customerId = opts?.customerId?.trim() || "wordshift"

  const url = new URL(`${KLIPY_API_BASE}/${encodeURIComponent(apiKey)}/gifs/search`)
  url.searchParams.set("q", cleanQuery)
  url.searchParams.set("per_page", String(perPage))
  url.searchParams.set("page", String(page))
  url.searchParams.set("customer_id", customerId)
  url.searchParams.set("locale", "us")
  url.searchParams.set("content_filter", "high")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(url.toString(), { signal: controller.signal })
    const raw = (await res.json()) as KlipySearchResponse
    if (!res.ok || raw.result === false) {
      throw new Error(raw.message ?? `KLIPY API error (${res.status})`)
    }

    const items = raw.data?.data ?? []
    const mapped: KlipyGifItem[] = []

    for (const item of items) {
      const hd = item.file?.hd
      const md = item.file?.md
      const sm = item.file?.sm

      const webpInfo = hd?.webp?.url ? hd.webp : md?.webp?.url ? md.webp : sm?.webp
      const gifInfo = hd?.gif?.url ? hd.gif : md?.gif?.url ? md.gif : sm?.gif
      const mainInfo = webpInfo?.url ? webpInfo : gifInfo
      if (!mainInfo?.url) continue

      const previewInfo = sm?.jpg?.url
        ? sm.jpg
        : md?.jpg?.url
        ? md.jpg
        : hd?.jpg?.url
        ? hd.jpg
        : mainInfo

      const mp4Url = hd?.mp4?.url ?? md?.mp4?.url ?? sm?.mp4?.url ?? null

      mapped.push({
        id: String(item.id ?? item.slug ?? mapped.length),
        slug: String(item.slug ?? ""),
        title: String(item.title ?? cleanQuery).trim() || cleanQuery,
        url: mainInfo.url,
        previewUrl: previewInfo.url ?? mainInfo.url,
        mp4Url,
        width: typeof mainInfo.width === "number" ? mainInfo.width : null,
        height: typeof mainInfo.height === "number" ? mainInfo.height : null,
        mediaType: webpInfo?.url ? "webp" : "gif",
      })
    }

    return mapped
  } finally {
    clearTimeout(timeout)
  }
}

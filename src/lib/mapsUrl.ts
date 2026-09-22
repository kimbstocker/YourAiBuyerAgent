export interface MapsSearch {
  /** The search text, e.g. "Real estate agent". */
  query: string
  /** Map centre as [lat, lng] when the link carries one. */
  center?: [number, number]
  zoom?: number
  /** Non fatal observations, e.g. the query does not look like an agent search. */
  warnings: string[]
}

export type ParseResult = { ok: true; value: MapsSearch } | { ok: false; error: string }

const SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl']

function isGoogleHost(host: string): boolean {
  return /(^|\.)google\.[a-z.]+$/i.test(host)
}

function numberOr(value: string | null | undefined): number | undefined {
  if (value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Read query, centre and zoom from a pasted Google Maps URL.
 *
 * Handles the modern path form (/maps/search/<query>/@lat,lng,zoomz) and the
 * older query form (?q=<query>&ll=lat,lng&z=zoom). Short links cannot be read
 * without following a redirect, so they are reported for the user to expand.
 */
export function parseMapsUrl(input: string): ParseResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Paste a Google Maps link first.' }

  let url: URL
  try {
    url = new URL(text)
  } catch {
    return { ok: false, error: 'That is not a URL. Copy the link from the Google Maps address bar or Share button.' }
  }

  if (SHORT_HOSTS.includes(url.hostname)) {
    return {
      ok: false,
      error: 'That is a short link. Open it in your browser, then copy the full Google Maps URL from the address bar.',
    }
  }

  if (!isGoogleHost(url.hostname)) {
    return { ok: false, error: 'That does not look like a Google Maps link.' }
  }

  let query = ''
  let center: [number, number] | undefined
  let zoom: number | undefined

  const pathMatch = url.pathname.match(/\/maps\/search\/([^/]+)/)
  if (pathMatch) {
    query = decodeURIComponent(pathMatch[1].replace(/\+/g, ' ')).trim()
  } else if (url.searchParams.get('q')) {
    query = (url.searchParams.get('q') ?? '').trim()
  }

  const at = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z)?/)
  if (at) {
    center = [Number(at[1]), Number(at[2])]
    zoom = numberOr(at[3])
  } else if (url.searchParams.get('ll')) {
    const [lat, lng] = (url.searchParams.get('ll') ?? '').split(',').map(Number)
    if (Number.isFinite(lat) && Number.isFinite(lng)) center = [lat, lng]
    zoom = numberOr(url.searchParams.get('z'))
  }

  if (!query) {
    return { ok: false, error: 'This Google Maps link has no search in it. Search for "Real estate agent" first, then copy the link.' }
  }

  const warnings: string[] = []
  if (!/real\s*estate|agent|realty|property/i.test(query)) {
    warnings.push(`The search was "${query}". For best results search Google Maps for "Real estate agent" around your suburbs.`)
  }

  return { ok: true, value: { query, center, zoom, warnings } }
}

import { validateRun, type Listing, type SiteData } from './listings.ts'

/** One run file dropped into runs/ by the scheduled house watch. See runs/README.md. */
export interface RunFile {
  date: string
  label: string
  listings: Listing[]
  sitesChecked?: string[]
  notes?: string
}

export interface ApplyResult {
  data: SiteData
  /** False when the run was already applied (same or older date). */
  applied: boolean
  /** Listings appended to seen. */
  added: number
}

type SeenListing = Pick<Listing, 'group' | 'address' | 'bbc' | 'price' | 'agency' | 'url'>

function toSeen(l: Listing): SeenListing {
  return { group: l.group, address: l.address, bbc: l.bbc, price: l.price, agency: l.agency, url: l.url }
}

/**
 * Merge a run file into the site data: latestRun becomes the run, and each of
 * its listings is appended to seen unless the url is already there. Pure; the
 * input is not mutated.
 */
export function applyRun(input: SiteData, run: RunFile): ApplyResult {
  if (run.date <= input.latestRun.date) return { data: input, applied: false, added: 0 }
  const problems = validateRun(run.listings)
  const nums = run.listings.map((l) => l.num).sort((a, b) => a - b)
  if (nums.some((n, i) => n !== i + 1)) problems.push(`Listings must be numbered continuously from 1, got ${nums.join(', ')}`)
  if (problems.length > 0) throw new Error(`Run ${run.date} is not publishable: ${problems.join('; ')}`)

  const seenUrls = new Set(input.seen.map((s) => s.url))
  const additions = run.listings.filter((l) => !seenUrls.has(l.url)).map(toSeen)
  const data: SiteData = {
    ...input,
    latestRun: { date: run.date, label: run.label, listings: run.listings.map((l) => ({ ...l })) },
    seen: [...input.seen, ...(additions as Listing[])],
  }
  return { data, applied: true, added: additions.length }
}

const j = (v: unknown): string =>
  Array.isArray(v) ? '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']' : JSON.stringify(v)
const objLine = (o: object) =>
  '{ ' + Object.entries(o).map(([k, v]) => `${j(k)}: ${j(v)}`).join(', ') + ' }'
const objArray = (arr: object[], indent: string) =>
  arr.length === 0 ? '[]' : '[\n' + arr.map((o) => `${indent}  ${objLine(o)}`).join(',\n') + `\n${indent}]`

/**
 * Serialise in the repo's hand-kept style: scalars and string arrays on one
 * line, arrays of objects with one object per line. Keeps data commits to a
 * handful of changed lines.
 */
export function formatSiteData(data: SiteData): string {
  const entries = Object.entries(data)
  const lines = entries.map(([key, value], i) => {
    const comma = i < entries.length - 1 ? ',' : ''
    if (key === 'latestRun') {
      const r = data.latestRun
      return `  "latestRun": {\n    "date": ${j(r.date)},\n    "label": ${j(r.label)},\n    "listings": ${objArray(r.listings, '    ')}\n  }${comma}`
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      return `  ${j(key)}: ${objArray(value as object[], '  ')}${comma}`
    }
    return `  ${j(key)}: ${j(value)}${comma}`
  })
  return '{\n' + lines.join('\n') + '\n}\n'
}

/** Run files (runs/YYYY-MM-DD.json or YYYY-MM-DD-N.json) dated after the latest applied run, oldest first. */
export function pendingRuns(paths: string[], latestDate: string): string[] {
  const dated = paths
    .map((p) => ({ p, m: /(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.json$/.exec(p) }))
    .filter((x): x is { p: string; m: RegExpExecArray } => x.m !== null && x.m[1] > latestDate)
  return dated
    .sort((a, b) => a.m[1].localeCompare(b.m[1]) || Number(a.m[2] ?? 0) - Number(b.m[2] ?? 0))
    .map((x) => x.p)
}

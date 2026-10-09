import { validateRun, type Listing, type ListingStatus, type SiteData } from './listings.ts'

/** One run file dropped into runs/ by the scheduled house watch. See runs/README.md. */
export interface RunFile {
  date: string
  /** Sequence within the date, from the file name suffix (runs/YYYY-MM-DD-N.json); absent means 1. */
  seq?: number
  label: string
  listings: Listing[]
  sitesChecked?: string[]
  notes?: string
  /** Re-checks of listings already in seen, matched by url. */
  statusUpdates?: StatusUpdate[]
}

export interface StatusUpdate {
  url: string
  status: ListingStatus
  /** New price text when the guide changed; omitted keeps the existing one. */
  price?: string
  soldPrice?: string
  /** ISO date of the check; defaults to the run date. */
  checked?: string
}

export interface ApplyResult {
  data: SiteData
  /** False when the run was already applied (same or older date and seq). */
  applied: boolean
  /** Listings appended to seen. */
  added: number
  /** Seen listings whose status was updated. */
  updated: number
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
/** True when run (date, seq) comes after latest (date, seq). */
function isAfter(date: string, seq: number | undefined, latestDate: string, latestSeq: number | undefined): boolean {
  return date > latestDate || (date === latestDate && (seq ?? 1) > (latestSeq ?? 1))
}

export function applyRun(input: SiteData, run: RunFile): ApplyResult {
  if (!isAfter(run.date, run.seq, input.latestRun.date, input.latestRun.seq)) {
    return { data: input, applied: false, added: 0, updated: 0 }
  }
  const problems = validateRun(run.listings)
  const nums = run.listings.map((l) => l.num).sort((a, b) => a - b)
  if (nums.some((n, i) => n !== i + 1)) problems.push(`Listings must be numbered continuously from 1, got ${nums.join(', ')}`)
  const seenUrls = new Set(input.seen.map((s) => s.url))
  const updates = new Map((run.statusUpdates ?? []).map((u) => [u.url, u]))
  for (const u of updates.values()) {
    if (!seenUrls.has(u.url)) problems.push(`Status update for a url not in seen: ${u.url}`)
  }
  if (problems.length > 0) throw new Error(`Run ${run.date} is not publishable: ${problems.join('; ')}`)

  const seen = input.seen.map((s) => {
    const u = updates.get(s.url)
    if (!u) return s
    const next: Listing = { ...s, status: u.status, statusChecked: u.checked ?? run.date }
    if (u.price) next.price = u.price
    if (u.soldPrice) next.soldPrice = u.soldPrice
    else delete next.soldPrice
    return next
  })
  const additions = run.listings.filter((l) => !seenUrls.has(l.url)).map(toSeen)
  const data: SiteData = {
    ...input,
    latestRun: {
      date: run.date,
      ...(run.seq !== undefined ? { seq: run.seq } : {}),
      label: run.label,
      listings: run.listings.map((l) => ({ ...l })),
    },
    seen: [...seen, ...(additions as Listing[])],
  }
  return { data, applied: true, added: additions.length, updated: updates.size }
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
      const seq = r.seq !== undefined ? `    "seq": ${j(r.seq)},\n` : ''
      return `  "latestRun": {\n    "date": ${j(r.date)},\n${seq}    "label": ${j(r.label)},\n    "listings": ${objArray(r.listings, '    ')}\n  }${comma}`
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      return `  ${j(key)}: ${objArray(value as object[], '  ')}${comma}`
    }
    return `  ${j(key)}: ${j(value)}${comma}`
  })
  return '{\n' + lines.join('\n') + '\n}\n'
}

const RUN_FILE = /(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.json$/

/** Sequence number from a run file name's -N suffix (runs/2026-10-09-2.json gives 2); undefined without one. */
export function runSeq(path: string): number | undefined {
  const m = RUN_FILE.exec(path)
  return m?.[2] === undefined ? undefined : Number(m[2])
}

/** Run files (runs/YYYY-MM-DD.json or YYYY-MM-DD-N.json) after the latest applied run's date and seq, oldest first. */
export function pendingRuns(paths: string[], latestDate: string, latestSeq?: number): string[] {
  const dated = paths
    .map((p) => ({ p, m: RUN_FILE.exec(p) }))
    .filter((x): x is { p: string; m: RegExpExecArray } => x.m !== null && isAfter(x.m[1], runSeq(x.p), latestDate, latestSeq))
  return dated
    .sort((a, b) => a.m[1].localeCompare(b.m[1]) || (runSeq(a.p) ?? 1) - (runSeq(b.p) ?? 1))
    .map((x) => x.p)
}

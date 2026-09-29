// Merge pending run files from runs/ into src/data/listings.json.
// Usage: node scripts/merge-run.ts [--check] [runs/2026-10-02.json ...]
//   no args   merge every run file dated after latestRun.date, oldest first
//   --check   report what would change, write nothing (exit 1 if a run is pending)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { applyRun, formatSiteData, pendingRuns, type RunFile } from '../src/lib/mergeRun.ts'
import type { SiteData } from '../src/lib/listings.ts'

const DATA = 'src/data/listings.json'
const RUNS = 'runs'

const args = process.argv.slice(2)
const check = args.includes('--check')
const explicit = args.filter((a) => !a.startsWith('--'))

let data = JSON.parse(readFileSync(DATA, 'utf8')) as SiteData
const candidates = explicit.length > 0 ? explicit : readdirSync(RUNS).map((f) => join(RUNS, f))
const files = pendingRuns(candidates, data.latestRun.date)

if (files.length === 0) {
  console.log(`Nothing to merge: latest applied run is ${data.latestRun.date}.`)
  process.exit(0)
}

let changed = false
for (const file of files) {
  const run = JSON.parse(readFileSync(file, 'utf8')) as RunFile
  const result = applyRun(data, run)
  if (!result.applied) {
    console.log(`Skip ${file}: ${run.date} is not after ${data.latestRun.date}.`)
    continue
  }
  data = result.data
  changed = true
  console.log(`${check ? 'Would merge' : 'Merged'} ${file}: ${run.listings.length} listing(s) in run, ${result.added} added to seen.`)
}

if (check) process.exit(changed ? 1 : 0)
if (changed) {
  writeFileSync(DATA, formatSiteData(data))
  console.log(`Wrote ${DATA}; latest run is now ${data.latestRun.date}.`)
}

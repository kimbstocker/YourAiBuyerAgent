import { describe, it, expect } from 'vitest'
import rawData from './listings.json'
import { validateRun, type SiteData, type GroupId } from '../lib/listings'

const data = rawData as SiteData
const groupIds = new Set<GroupId>(data.groups.map((g) => g.id))

describe('listings.json', () => {
  it('passes the run validation used before publishing', () => {
    expect(validateRun(data.latestRun.listings)).toEqual([])
  })

  it('numbers the latest run continuously from 1', () => {
    const nums = data.latestRun.listings.map((l) => l.num).sort((a, b) => a - b)
    expect(nums).toEqual(nums.map((_, i) => i + 1))
  })

  it('only uses group ids that are declared in groups', () => {
    const rows = [...data.latestRun.listings, ...data.seen]
    const unknown = rows.filter((r) => !groupIds.has(r.group)).map((r) => `${r.address} (${r.group})`)
    expect(unknown).toEqual([])
  })

  it('gives every seen listing an address and a link', () => {
    const broken = data.seen.filter((r) => !r.address || !r.url).map((r) => r.address || '(no address)')
    expect(broken).toEqual([])
  })

  it('carries every listing from the latest run into the seen list, so it is not reported twice', () => {
    const seenUrls = new Set(data.seen.map((r) => r.url))
    const missing = data.latestRun.listings.filter((l) => !seenUrls.has(l.url)).map((l) => l.address)
    expect(missing).toEqual([])
  })

  it('uses https links only', () => {
    const rows = [...data.latestRun.listings, ...data.seen]
    const insecure = rows.filter((r) => r.url && !r.url.startsWith('https://')).map((r) => r.url)
    expect(insecure).toEqual([])
  })

  it('has a run date in ISO form', () => {
    expect(data.latestRun.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

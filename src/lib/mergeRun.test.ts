import { describe, it, expect } from 'vitest'
import { applyRun, formatSiteData, pendingRuns, runSeq, type RunFile } from './mergeRun'
import type { SiteData, Listing } from './listings'

const listing = (over: Partial<Listing> = {}): Listing => ({
  num: 1,
  group: 'focus',
  address: '1 Test Street, Manly',
  bbc: '3/2/1',
  price: 'Auction',
  agency: 'Test Agency',
  url: 'https://example.com/1',
  lat: -33.79,
  lng: 151.27,
  exact: true,
  ...over,
})

const base = (): SiteData => ({
  title: 'Northern Beaches house watch',
  criteria: 'House only',
  focusSuburbs: ['Manly', 'Balgowlah'],
  justOutsideSuburbs: ['Seaforth'],
  mapCenter: [-33.79, 151.268],
  mapZoom: 14,
  groups: [
    { id: 'focus', label: 'Focus suburbs' },
    { id: 'nearMiss', label: 'Near misses (fail only on type)' },
    { id: 'justOutside', label: 'Just outside' },
  ],
  latestRun: { date: '2026-09-25', label: 'Friday 25 September 2026', listings: [listing()] },
  seen: [{ group: 'focus', address: '1 Test Street, Manly', bbc: '3/2/1', price: 'Auction', agency: 'Test Agency', url: 'https://example.com/1' } as Listing],
  excluded: 'nothing',
})

const run = (over: Partial<RunFile> = {}): RunFile => ({
  date: '2026-09-29',
  label: 'Tuesday 29 September 2026',
  listings: [
    listing({ num: 1, address: '65 Wanganella Street, Balgowlah', url: 'https://example.com/65' }),
    listing({ num: 2, group: 'nearMiss', address: '74 Seaview Street, Balgowlah (townhouse)', url: 'https://example.com/74', exact: false }),
  ],
  sitesChecked: ['Cunninghams'],
  notes: '',
  ...over,
})

describe('applyRun', () => {
  it('replaces latestRun with the run file and appends new listings to seen without coordinates', () => {
    const { data, applied, added } = applyRun(base(), run())
    expect(applied).toBe(true)
    expect(added).toBe(2)
    expect(data.latestRun.date).toBe('2026-09-29')
    expect(data.latestRun.label).toBe('Tuesday 29 September 2026')
    expect(data.latestRun.listings.map((l) => l.num)).toEqual([1, 2])
    expect(data.seen).toHaveLength(3)
    expect(data.seen[1]).toEqual({
      group: 'focus',
      address: '65 Wanganella Street, Balgowlah',
      bbc: '3/2/1',
      price: 'Auction',
      agency: 'Test Agency',
      url: 'https://example.com/65',
    })
  })

  it('does not duplicate a seen listing whose url is already present', () => {
    const { data, added } = applyRun(base(), run({ listings: [listing({ url: 'https://example.com/1' })] }))
    expect(added).toBe(0)
    expect(data.seen).toHaveLength(1)
  })

  it('skips a run whose date has already been applied', () => {
    const { data, applied } = applyRun(base(), run({ date: '2026-09-25' }))
    expect(applied).toBe(false)
    expect(data).toEqual(base())
  })

  it('skips a run older than the latest applied run', () => {
    const { applied } = applyRun(base(), run({ date: '2026-09-22' }))
    expect(applied).toBe(false)
  })

  it('applies a second run on the same date when its seq is higher', () => {
    const { data, applied } = applyRun(base(), run({ date: '2026-09-25', seq: 2 }))
    expect(applied).toBe(true)
    expect(data.latestRun.date).toBe('2026-09-25')
    expect(data.latestRun.seq).toBe(2)
  })

  it('skips a same-date run whose seq is not higher than the applied one', () => {
    const input = base()
    input.latestRun.seq = 2
    expect(applyRun(input, run({ date: '2026-09-25', seq: 2 })).applied).toBe(false)
    expect(applyRun(input, run({ date: '2026-09-25' })).applied).toBe(false)
  })

  it('applies a later date after a same-date second run and drops the seq', () => {
    const input = base()
    input.latestRun.seq = 2
    const { data, applied } = applyRun(input, run({ date: '2026-09-29' }))
    expect(applied).toBe(true)
    expect(data.latestRun.seq).toBeUndefined()
  })

  it('accepts an empty run and still moves the run date forward', () => {
    const { data, applied, added } = applyRun(base(), run({ listings: [] }))
    expect(applied).toBe(true)
    expect(added).toBe(0)
    expect(data.latestRun.listings).toEqual([])
    expect(data.latestRun.date).toBe('2026-09-29')
  })

  it('rejects a run that fails validation instead of publishing bad data', () => {
    const bad = run({ listings: [listing({ num: 3 })] })
    expect(() => applyRun(base(), bad)).toThrow(/numbered/i)
  })

  it('applies status updates to seen listings by url, keeping the rest of the row', () => {
    const { data, applied, updated } = applyRun(
      base(),
      run({
        listings: [],
        statusUpdates: [
          { url: 'https://example.com/1', status: 'sold', soldPrice: '$3,565,000', checked: '2026-10-04' },
        ],
      }),
    )
    expect(applied).toBe(true)
    expect(updated).toBe(1)
    expect(data.seen[0]).toMatchObject({
      address: '1 Test Street, Manly',
      price: 'Auction',
      status: 'sold',
      soldPrice: '$3,565,000',
      statusChecked: '2026-10-04',
    })
  })

  it('replaces the price text when a status update carries a new guide', () => {
    const { data } = applyRun(
      base(),
      run({ listings: [], statusUpdates: [{ url: 'https://example.com/1', status: 'available', price: 'For sale $2,749,000', checked: '2026-10-04' }] }),
    )
    expect(data.seen[0].price).toBe('For sale $2,749,000')
    expect(data.seen[0].status).toBe('available')
  })

  it('rejects a status update whose url is not in seen, so a typo cannot be silently dropped', () => {
    const bad = run({ listings: [], statusUpdates: [{ url: 'https://example.com/nope', status: 'sold' }] })
    expect(() => applyRun(base(), bad)).toThrow(/not in seen/i)
  })

  it('leaves every other key untouched', () => {
    const { data } = applyRun(base(), run())
    const { latestRun: _a, seen: _b, ...rest } = data
    const { latestRun: _c, seen: _d, ...expected } = base()
    expect(rest).toEqual(expected)
  })
})

describe('formatSiteData', () => {
  it('writes scalars and string arrays on one line and one object per line, so diffs stay small', () => {
    const text = formatSiteData(base())
    expect(text).toContain('  "focusSuburbs": ["Manly", "Balgowlah"],\n')
    expect(text).toContain('  "mapCenter": [-33.79, 151.268],\n')
    expect(text).toContain('    { "id": "focus", "label": "Focus suburbs" },\n')
    expect(text).toContain('    "date": "2026-09-25",\n')
    expect(text).toMatch(/    "listings": \[\n      \{ "num": 1, "group": "focus", /)
    expect(text).toMatch(/  "seen": \[\n    \{ "group": "focus", /)
    expect(text.endsWith('}\n')).toBe(true)
  })

  it('round-trips through JSON.parse', () => {
    expect(JSON.parse(formatSiteData(base()))).toEqual(base())
  })

  it('writes the run seq on its own line and round-trips it', () => {
    const data = base()
    data.latestRun.seq = 2
    const text = formatSiteData(data)
    expect(text).toContain('    "date": "2026-09-25",\n    "seq": 2,\n')
    expect(JSON.parse(text)).toEqual(data)
  })

  it('writes an empty listings array inline', () => {
    const data = base()
    data.latestRun.listings = []
    expect(formatSiteData(data)).toContain('    "listings": []\n')
  })
})

describe('runSeq', () => {
  it('reads the -N suffix from a run file name, defaulting to undefined', () => {
    expect(runSeq('runs/2026-10-09-2.json')).toBe(2)
    expect(runSeq('runs/2026-10-09.json')).toBeUndefined()
  })
})

describe('pendingRuns', () => {
  it('returns run files newer than the latest applied date, oldest first', () => {
    const files = ['runs/2026-10-02.json', 'runs/README.md', 'runs/2026-09-29.json', 'runs/2026-09-25.json', 'runs/2026-10-02-2.json']
    expect(pendingRuns(files, '2026-09-29')).toEqual(['runs/2026-10-02.json', 'runs/2026-10-02-2.json'])
  })

  it('includes a same-date second run when only the first run of that date has been applied', () => {
    const files = ['runs/2026-10-02.json', 'runs/2026-10-02-2.json', 'runs/2026-10-02-3.json']
    expect(pendingRuns(files, '2026-10-02')).toEqual(['runs/2026-10-02-2.json', 'runs/2026-10-02-3.json'])
    expect(pendingRuns(files, '2026-10-02', 2)).toEqual(['runs/2026-10-02-3.json'])
  })
})

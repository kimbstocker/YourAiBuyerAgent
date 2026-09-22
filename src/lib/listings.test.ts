import { describe, it, expect } from 'vitest'
import {
  groupListings,
  isExactPin,
  pinColor,
  validateRun,
  formatRunSummary,
  type Listing,
  type GroupId,
} from './listings'

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

const groups = [
  { id: 'focus' as GroupId, label: 'Focus suburbs' },
  { id: 'nearMiss' as GroupId, label: 'Near misses' },
  { id: 'justOutside' as GroupId, label: 'Just outside' },
]

describe('groupListings', () => {
  it('returns groups in the configured order, not the order rows appear', () => {
    const rows = [
      listing({ num: 3, group: 'justOutside' }),
      listing({ num: 1, group: 'focus' }),
      listing({ num: 2, group: 'nearMiss' }),
    ]
    expect(groupListings(rows, groups).map((g) => g.id)).toEqual(['focus', 'nearMiss', 'justOutside'])
  })

  it('omits groups that have no rows so empty headings are never rendered', () => {
    const rows = [listing({ group: 'focus' })]
    expect(groupListings(rows, groups).map((g) => g.id)).toEqual(['focus'])
  })

  it('keeps every row exactly once', () => {
    const rows = [
      listing({ num: 1, group: 'focus' }),
      listing({ num: 2, group: 'focus' }),
      listing({ num: 3, group: 'justOutside' }),
    ]
    const grouped = groupListings(rows, groups)
    expect(grouped.flatMap((g) => g.rows)).toHaveLength(3)
    expect(grouped.find((g) => g.id === 'focus')?.rows.map((r) => r.num)).toEqual([1, 2])
  })

  it('returns an empty array when there are no rows', () => {
    expect(groupListings([], groups)).toEqual([])
  })
})

describe('isExactPin', () => {
  it('is exact only when the flag is explicitly true', () => {
    expect(isExactPin(listing({ exact: true }))).toBe(true)
    expect(isExactPin(listing({ exact: false }))).toBe(false)
  })

  it('treats a missing flag as approximate, so an unverified pin is never shown as exact', () => {
    const { exact: _omit, ...rest } = listing()
    expect(isExactPin(rest as Listing)).toBe(false)
  })
})

describe('pinColor', () => {
  it('uses red for exact and orange for approximate positions', () => {
    expect(pinColor(true)).toBe('#c81e2d')
    expect(pinColor(false)).toBe('#f08c1e')
  })
})

describe('validateRun', () => {
  it('accepts a well formed run', () => {
    expect(validateRun([listing({ num: 1 }), listing({ num: 2, url: 'https://example.com/2' })])).toEqual([])
  })

  it('reports duplicate pin numbers, which would make the map ambiguous', () => {
    const problems = validateRun([listing({ num: 1 }), listing({ num: 1 })])
    expect(problems.join(' ')).toMatch(/duplicate/i)
  })

  it('reports coordinates outside the Northern Beaches sanity box', () => {
    const problems = validateRun([listing({ lat: -23.17, lng: 150.76 })])
    expect(problems.join(' ')).toMatch(/coordinates/i)
  })

  it('reports a listing with no link, since the pin would open nothing', () => {
    const problems = validateRun([listing({ url: '' })])
    expect(problems.join(' ')).toMatch(/url/i)
  })

  it('allows a listing with no coordinates at all and does not flag it as out of range', () => {
    const { lat: _la, lng: _ln, ...rest } = listing()
    expect(validateRun([rest as Listing])).toEqual([])
  })
})

describe('formatRunSummary', () => {
  it('uses the singular for one listing', () => {
    expect(formatRunSummary(1)).toBe('1 new listing')
  })

  it('uses the plural for none and for many', () => {
    expect(formatRunSummary(0)).toBe('0 new listings')
    expect(formatRunSummary(4)).toBe('4 new listings')
  })
})

import { describe, it, expect } from 'vitest'
import {
  statusLabel,
  groupListings,
  isExactPin,
  pinColor,
  validateRun,
  formatRunSummary,
  groupBySuburb,
  suburbOrder,
  displayAddress,
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
  it('uses red for exact focus and just-outside pins, blue for exact near misses', () => {
    expect(pinColor('focus', true)).toBe('#c81e2d')
    expect(pinColor('justOutside', true)).toBe('#c81e2d')
    expect(pinColor('nearMiss', true)).toBe('#2457c5')
  })

  it('uses orange for every approximate pin, whatever its group', () => {
    expect(pinColor('focus', false)).toBe('#f08c1e')
    expect(pinColor('nearMiss', false)).toBe('#f08c1e')
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

describe('statusLabel', () => {
  const row = { num: 1, group: 'focus', address: 'x', bbc: '3/2/1', price: 'Auction', agency: 'a', url: 'https://e' } as Listing
  it('treats a listing with no status as available', () => {
    expect(statusLabel(row)).toBe('Available')
  })
  it('shows the sold price when one is known, otherwise says undisclosed', () => {
    expect(statusLabel({ ...row, status: 'sold', soldPrice: '$3,565,000' })).toBe('Sold $3,565,000')
    expect(statusLabel({ ...row, status: 'sold' })).toBe('Sold (price undisclosed)')
  })
  it('labels the other states plainly', () => {
    expect(statusLabel({ ...row, status: 'underOffer' })).toBe('Under offer')
    expect(statusLabel({ ...row, status: 'withdrawn' })).toBe('Withdrawn')
  })
})

describe('groupBySuburb', () => {
  const order = ['Freshwater', 'North Manly', 'Manly', 'Balgowlah', 'Seaforth']

  it('puts suburbs in the configured order with Freshwater and North Manly first', () => {
    const rows = [
      listing({ num: 1, address: '5 A St, Seaforth', group: 'justOutside' }),
      listing({ num: 2, address: '6 B St, Manly' }),
      listing({ num: 3, address: '7 C St, North Manly' }),
      listing({ num: 4, address: '8 D St, Freshwater' }),
    ]
    expect(groupBySuburb(rows, order).map((g) => g.suburb)).toEqual(['Freshwater', 'North Manly', 'Manly', 'Seaforth'])
  })

  it('derives the suburb from the text after the last comma, ignoring a bracketed note', () => {
    const rows = [listing({ address: '3/120 Addison Rd, Manly (apartment)', group: 'nearMiss' })]
    expect(groupBySuburb(rows, order).map((g) => g.suburb)).toEqual(['Manly'])
  })

  it('appends unknown suburbs alphabetically after the configured ones', () => {
    const rows = [
      listing({ num: 1, address: '1 X St, Zetland' }),
      listing({ num: 2, address: '1 Y St, Cromer' }),
      listing({ num: 3, address: '1 Z St, Manly' }),
    ]
    expect(groupBySuburb(rows, order).map((g) => g.suburb)).toEqual(['Manly', 'Cromer', 'Zetland'])
  })

  it('within a suburb lists houses before near misses and available before sold or withdrawn', () => {
    const rows = [
      listing({ num: 1, address: '1 A St, Manly', group: 'nearMiss', status: 'sold' }),
      listing({ num: 2, address: '2 A St, Manly', group: 'focus', status: 'withdrawn' }),
      listing({ num: 3, address: '3 A St, Manly', group: 'nearMiss' }),
      listing({ num: 4, address: '4 A St, Manly', group: 'focus' }),
    ]
    expect(groupBySuburb(rows, order)[0].rows.map((r) => r.num)).toEqual([4, 2, 3, 1])
  })

  it('keeps every row exactly once and drops empty suburbs', () => {
    const rows = [listing({ num: 1, address: '1 A St, Manly' }), listing({ num: 2, address: '2 A St, Manly' })]
    const grouped = groupBySuburb(rows, order)
    expect(grouped).toHaveLength(1)
    expect(grouped.flatMap((g) => g.rows)).toHaveLength(2)
  })
})

describe('suburbOrder', () => {
  it('starts with the priority suburbs, then the remaining focus suburbs, then just outside', () => {
    expect(suburbOrder(['Freshwater', 'North Manly'], ['Manly', 'North Manly', 'Freshwater'], ['Seaforth'])).toEqual([
      'Freshwater',
      'North Manly',
      'Manly',
      'Seaforth',
    ])
  })
})

describe('displayAddress', () => {
  it('tags a near miss that has no bracketed type note', () => {
    expect(displayAddress(listing({ address: '1 A St, Manly', group: 'nearMiss' }))).toBe('1 A St, Manly (near miss)')
  })
  it('leaves houses and already-annotated near misses alone', () => {
    expect(displayAddress(listing({ address: '1 A St, Manly' }))).toBe('1 A St, Manly')
    expect(displayAddress(listing({ address: '1 A St, Manly (apartment)', group: 'nearMiss' }))).toBe('1 A St, Manly (apartment)')
  })
})

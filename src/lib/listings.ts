export type GroupId = 'focus' | 'nearMiss' | 'justOutside'

export interface Group {
  id: GroupId
  label: string
}

export interface Listing {
  /** Continuous pin number for this run; matches the # column and the map pin. */
  num: number
  group: GroupId
  address: string
  /** Bed/bath/car, e.g. "3/2/1". Empty when the agency did not publish it. */
  bbc: string
  /** Price text as published, including "Auction" or "Undisclosed". */
  price: string
  agency: string
  /** Exact agency listing URL. */
  url: string
  lat?: number
  lng?: number
  /** True when lat/lng came from the listing itself rather than a suburb lookup. */
  exact?: boolean
}

export interface GroupedListings extends Group {
  rows: Listing[]
}

export interface RunData {
  date: string
  label: string
  listings: Listing[]
}

export interface SiteData {
  title: string
  criteria: string
  focusSuburbs: string[]
  justOutsideSuburbs: string[]
  mapCenter: [number, number]
  mapZoom: number
  groups: Group[]
  latestRun: RunData
  seen: Listing[]
  excluded: string
}

export const EXACT_COLOR = '#c81e2d'
export const APPROX_COLOR = '#f08c1e'

/** Northern Beaches sanity box, used to catch a coordinate pasted from the wrong listing. */
export const BOUNDS = { minLat: -33.83, maxLat: -33.74, minLng: 151.22, maxLng: 151.31 }

/**
 * Bucket listings into the configured groups, in configured order, dropping
 * groups with no rows so the page never renders an empty heading.
 */
export function groupListings(listings: Listing[], groups: Group[]): GroupedListings[] {
  return groups
    .map((group) => ({ ...group, rows: listings.filter((l) => l.group === group.id) }))
    .filter((group) => group.rows.length > 0)
}

/** A pin counts as exact only when the flag is explicitly true. */
export function isExactPin(listing: Listing): boolean {
  return listing.exact === true
}

export function pinColor(exact: boolean): string {
  return exact ? EXACT_COLOR : APPROX_COLOR
}

export function hasCoords(listing: Listing): listing is Listing & { lat: number; lng: number } {
  return typeof listing.lat === 'number' && typeof listing.lng === 'number'
}

/**
 * Check a run's data before it is published. Returns a list of human readable
 * problems; an empty list means the run is fine.
 */
export function validateRun(listings: Listing[]): string[] {
  const problems: string[] = []
  const seenNums = new Set<number>()

  for (const l of listings) {
    if (seenNums.has(l.num)) {
      problems.push(`Duplicate pin number ${l.num} (${l.address})`)
    }
    seenNums.add(l.num)

    if (!l.url) {
      problems.push(`Missing url for ${l.address}`)
    }

    if (hasCoords(l)) {
      const inBox =
        l.lat >= BOUNDS.minLat && l.lat <= BOUNDS.maxLat && l.lng >= BOUNDS.minLng && l.lng <= BOUNDS.maxLng
      if (!inBox) {
        problems.push(`Coordinates out of range for ${l.address}: ${l.lat}, ${l.lng}`)
      }
    }
  }

  return problems
}

export function formatRunSummary(count: number): string {
  return `${count} new listing${count === 1 ? '' : 's'}`
}

export type PropertyType = 'house' | 'townhouse' | 'apartment' | 'land'

export interface Criteria {
  minBeds: number
  minBaths: number
  minCars: number
  maxPrice: number
  propertyTypes: PropertyType[]
}

export interface Agency {
  name: string
  website: string
  /** Where the agent found it; filled in by a run, not by the user. */
  source?: 'maps' | 'manual'
}

export interface SearchConfig {
  id: string
  name: string
  mapsUrl: string
  query: string
  center?: [number, number]
  zoom?: number
  focusSuburbs: string[]
  justOutsideSuburbs: string[]
  criteria: Criteria
  agencies: Agency[]
  createdAt: string
}

export function defaultCriteria(): Criteria {
  return { minBeds: 3, minBaths: 2, minCars: 1, maxPrice: 4_000_000, propertyTypes: ['house'] }
}

/** Split a free text list of suburbs on commas or newlines, deduplicated case insensitively. */
export function parseSuburbList(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/[,\n]/)) {
    const s = raw.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

export function validateConfig(cfg: SearchConfig): string[] {
  const problems: string[] = []
  if (!cfg.name.trim()) problems.push('Give the search a name.')
  if (!cfg.mapsUrl.trim()) problems.push('Paste a Google Maps link.')
  if (cfg.focusSuburbs.length === 0) problems.push('Add at least one focus suburb.')
  const c = cfg.criteria
  if (!(c.maxPrice > 0)) problems.push('Max price must be greater than zero.')
  if (c.minBeds < 0) problems.push('Minimum bedrooms cannot be negative.')
  if (c.minBaths < 0) problems.push('Minimum bathrooms cannot be negative.')
  if (c.minCars < 0) problems.push('Minimum car spaces cannot be negative.')
  if (c.propertyTypes.length === 0) problems.push('Choose at least one property type.')
  return problems
}

export function newConfigId(): string {
  return `cfg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Where a search config lives. Swap the implementation for a backend later. */
export interface ConfigStore {
  load(): SearchConfig | null
  save(cfg: SearchConfig): void
  clear(): void
}

export const CONFIG_KEY = 'yourAiBuyerAgent.searchConfig'

export class LocalStorageConfigStore implements ConfigStore {
  load(): SearchConfig | null {
    try {
      const raw = localStorage.getItem(CONFIG_KEY)
      return raw ? (JSON.parse(raw) as SearchConfig) : null
    } catch {
      return null
    }
  }

  save(cfg: SearchConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
    } catch {
      // Storage may be unavailable (private mode); the page still works for this session.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(CONFIG_KEY)
    } catch {
      // ignore
    }
  }
}

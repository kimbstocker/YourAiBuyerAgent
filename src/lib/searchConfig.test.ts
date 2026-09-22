import { describe, it, expect, beforeEach } from 'vitest'
import {
  defaultCriteria,
  parseSuburbList,
  validateConfig,
  LocalStorageConfigStore,
  type SearchConfig,
} from './searchConfig'

const base = (over: Partial<SearchConfig> = {}): SearchConfig => ({
  id: 'cfg-1',
  name: 'Northern Beaches',
  mapsUrl: 'https://www.google.com/maps/search/Real+estate+agent/@-33.79,151.26,14z',
  query: 'Real estate agent',
  center: [-33.79, 151.26],
  zoom: 14,
  focusSuburbs: ['Manly', 'Balgowlah'],
  justOutsideSuburbs: ['Seaforth'],
  criteria: defaultCriteria(),
  agencies: [],
  createdAt: '2026-09-22T00:00:00.000Z',
  ...over,
})

describe('parseSuburbList', () => {
  it('splits on commas and newlines, trims, and drops blanks', () => {
    expect(parseSuburbList('Manly, Balgowlah\nFairlight,,  \n Freshwater ')).toEqual(['Manly', 'Balgowlah', 'Fairlight', 'Freshwater'])
  })

  it('removes duplicates case insensitively, keeping the first spelling', () => {
    expect(parseSuburbList('Manly, manly, MANLY, Fairlight')).toEqual(['Manly', 'Fairlight'])
  })

  it('returns an empty list for empty input', () => {
    expect(parseSuburbList('')).toEqual([])
  })
})

describe('defaultCriteria', () => {
  it('matches the criteria the Northern Beaches watch uses', () => {
    expect(defaultCriteria()).toEqual({ minBeds: 3, minBaths: 2, minCars: 1, maxPrice: 4_000_000, propertyTypes: ['house'] })
  })
})

describe('validateConfig', () => {
  it('accepts a complete config', () => {
    expect(validateConfig(base())).toEqual([])
  })

  it('requires a name, a maps url and at least one focus suburb', () => {
    const problems = validateConfig(base({ name: '', mapsUrl: '', focusSuburbs: [] }))
    expect(problems.join(' ')).toMatch(/name/i)
    expect(problems.join(' ')).toMatch(/maps/i)
    expect(problems.join(' ')).toMatch(/suburb/i)
  })

  it('rejects a non positive max price and negative minimums', () => {
    const problems = validateConfig(base({ criteria: { ...defaultCriteria(), maxPrice: 0, minBeds: -1 } }))
    expect(problems.join(' ')).toMatch(/price/i)
    expect(problems.join(' ')).toMatch(/bed/i)
  })

  it('requires at least one property type', () => {
    expect(validateConfig(base({ criteria: { ...defaultCriteria(), propertyTypes: [] } })).join(' ')).toMatch(/property type/i)
  })
})

describe('LocalStorageConfigStore', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing has been saved', () => {
    expect(new LocalStorageConfigStore().load()).toBeNull()
  })

  it('round trips a config', () => {
    const store = new LocalStorageConfigStore()
    store.save(base())
    expect(store.load()).toEqual(base())
  })

  it('clears a saved config', () => {
    const store = new LocalStorageConfigStore()
    store.save(base())
    store.clear()
    expect(store.load()).toBeNull()
  })

  it('returns null rather than throwing when stored JSON is corrupt', () => {
    localStorage.setItem('yourAiBuyerAgent.searchConfig', '{not json')
    expect(new LocalStorageConfigStore().load()).toBeNull()
  })
})

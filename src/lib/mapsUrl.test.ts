import { describe, it, expect } from 'vitest'
import { parseMapsUrl } from './mapsUrl'

describe('parseMapsUrl', () => {
  it('reads the query, centre and zoom from a Google Maps search URL', () => {
    const r = parseMapsUrl('https://www.google.com/maps/search/Real+estate+agent/@-33.7955,151.2653,14z/data=!3m1!4b1')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.query).toBe('Real estate agent')
    expect(r.value.center).toEqual([-33.7955, 151.2653])
    expect(r.value.zoom).toBe(14)
  })

  it('decodes percent encoded queries', () => {
    const r = parseMapsUrl('https://www.google.com/maps/search/real%20estate%20agent%20manly/@-33.79,151.28,15z')
    expect(r.ok && r.value.query).toBe('real estate agent manly')
  })

  it('accepts the ?q= form used by older links and the mobile app', () => {
    const r = parseMapsUrl('https://maps.google.com/?q=real+estate+agent+balgowlah&ll=-33.79,151.26&z=13')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.query).toBe('real estate agent balgowlah')
    expect(r.value.center).toEqual([-33.79, 151.26])
    expect(r.value.zoom).toBe(13)
  })

  it('accepts a regional Google domain', () => {
    const r = parseMapsUrl('https://www.google.com.au/maps/search/Real+estate+agent/@-33.79,151.26,14z')
    expect(r.ok && r.value.query).toBe('Real estate agent')
  })

  it('reports a short link as needing expansion rather than failing silently', () => {
    const r = parseMapsUrl('https://maps.app.goo.gl/AbCdEf123')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/short link/i)
  })

  it('rejects a URL that is not Google Maps', () => {
    const r = parseMapsUrl('https://www.domain.com.au/sale/manly-nsw-2095/')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/google maps/i)
  })

  it('rejects text that is not a URL at all', () => {
    expect(parseMapsUrl('real estate agent manly').ok).toBe(false)
    expect(parseMapsUrl('').ok).toBe(false)
  })

  it('still succeeds without a centre, leaving it undefined', () => {
    const r = parseMapsUrl('https://www.google.com/maps/search/Real+estate+agent+Manly')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.center).toBeUndefined()
    expect(r.value.zoom).toBeUndefined()
  })

  it('warns when the query does not look like a real estate agent search', () => {
    const r = parseMapsUrl('https://www.google.com/maps/search/coffee/@-33.79,151.26,14z')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.warnings.join(' ')).toMatch(/real estate agent/i)
  })

  it('trims surrounding whitespace from a pasted link', () => {
    const r = parseMapsUrl('  https://www.google.com/maps/search/Real+estate+agent/@-33.79,151.26,14z \n')
    expect(r.ok).toBe(true)
  })
})

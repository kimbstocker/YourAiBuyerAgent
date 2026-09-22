import { describe, it, expect } from 'vitest'
import { renderSkillMarkdown, renderConfigJson, skillFileName } from './skillDraft'
import { defaultCriteria, type SearchConfig } from './searchConfig'

const cfg: SearchConfig = {
  id: 'cfg-1',
  name: 'Northern Beaches',
  mapsUrl: 'https://www.google.com/maps/search/Real+estate+agent/@-33.79,151.26,14z',
  query: 'Real estate agent',
  center: [-33.79, 151.26],
  zoom: 14,
  focusSuburbs: ['Manly', 'Balgowlah'],
  justOutsideSuburbs: ['Seaforth', 'Clontarf'],
  criteria: { ...defaultCriteria(), maxPrice: 4_000_000 },
  agencies: [
    { name: 'Cunninghams', website: 'https://www.cunninghamsre.com.au/' },
    { name: 'Clarke & Humel', website: 'https://clarkeandhumel.com.au/' },
  ],
  createdAt: '2026-09-22T00:00:00.000Z',
}

describe('renderSkillMarkdown', () => {
  const md = renderSkillMarkdown(cfg)

  it('starts with YAML frontmatter carrying a slug name and a description', () => {
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toMatch(/^name: northern-beaches-house-watch$/m)
    expect(md).toMatch(/^description: .+/m)
  })

  it('states the criteria in the form agency sites filter on', () => {
    expect(md).toContain('3+ bedrooms')
    expect(md).toContain('2+ bathrooms')
    expect(md).toContain('1+ car')
    expect(md).toContain('$4,000,000')
    expect(md).toMatch(/house/i)
  })

  it('lists the focus and just outside suburbs separately', () => {
    expect(md).toMatch(/Focus suburbs[^\n]*Manly, Balgowlah/)
    expect(md).toMatch(/Just outside[^\n]*Seaforth, Clontarf/)
  })

  it('lists each known agency with its website', () => {
    expect(md).toContain('Cunninghams')
    expect(md).toContain('https://www.cunninghamsre.com.au/')
    expect(md).toContain('Clarke & Humel')
  })

  it('tells the agent to discover agencies from the Maps search when none are listed yet', () => {
    const md2 = renderSkillMarkdown({ ...cfg, agencies: [] })
    expect(md2).toMatch(/discover/i)
    expect(md2).toContain(cfg.mapsUrl)
  })

  it('includes the dedupe rule, so the agent only reports new listings', () => {
    expect(md).toMatch(/already seen/i)
  })

  it('describes the listings.json output shape the site reads', () => {
    expect(md).toContain('latestRun')
    expect(md).toContain('seen')
    expect(md).toMatch(/lat.*lng/)
  })
})

describe('renderConfigJson', () => {
  it('is valid JSON that round trips the config', () => {
    expect(JSON.parse(renderConfigJson(cfg))).toEqual(cfg)
  })

  it('is pretty printed for humans', () => {
    expect(renderConfigJson(cfg)).toContain('\n  "name"')
  })
})

describe('skillFileName', () => {
  it('slugs the search name', () => {
    expect(skillFileName('Northern Beaches')).toBe('northern-beaches-house-watch.SKILL.md')
    expect(skillFileName("Kim's Inner  West / Search!")).toBe('kims-inner-west-search-house-watch.SKILL.md')
  })
})

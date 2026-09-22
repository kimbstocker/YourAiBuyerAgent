import type { SearchConfig } from './searchConfig'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function skillFileName(name: string): string {
  return `${slugify(name)}-house-watch.SKILL.md`
}

export function renderConfigJson(cfg: SearchConfig): string {
  return JSON.stringify(cfg, null, 2)
}

const money = (n: number) => `$${n.toLocaleString('en-AU')}`

/**
 * Draft a SKILL.md an AI agent can follow to run this search. It mirrors the
 * skill that drives the Northern Beaches watch: criteria, suburbs, agencies,
 * dedupe against what has already been reported, and the listings.json shape
 * this site renders.
 */
export function renderSkillMarkdown(cfg: SearchConfig): string {
  const slug = `${slugify(cfg.name)}-house-watch`
  const c = cfg.criteria
  const types = c.propertyTypes.join(', ')
  const focus = cfg.focusSuburbs.join(', ')
  const outside = cfg.justOutsideSuburbs.join(', ')

  const agencies =
    cfg.agencies.length > 0
      ? cfg.agencies.map((a, i) => `${i + 1}. ${a.name}: ${a.website}`).join('\n')
      : [
          `No agencies are listed yet. Discover them first: open the Google Maps search below, read every result`,
          `for "${cfg.query}", and record each agency's name and website. Add them to the config's agencies list`,
          `so later runs do not repeat the discovery.`,
          ``,
          `Maps search: ${cfg.mapsUrl}`,
        ].join('\n')

  return `---
name: ${slug}
description: Twice weekly check of local real estate agency websites for newly listed ${types} in ${focus}${outside ? ` (and just outside: ${outside})` : ''} meeting ${c.minBeds}+/${c.minBaths}+/${c.minCars}+ under ${money(c.maxPrice)}; report only listings not seen before.
---

# ${cfg.name} house watch

## Goal

Find properties newly listed for sale on the agency websites below, keep only the ones that meet the criteria and have not been reported before, and publish them to the listings page (map plus tables).

## Criteria

- Property type: ${types} only. Exclude anything else (apartments, units, townhouses, triplexes, strata titled residences and land unless listed above).
- ${c.minBeds}+ bedrooms, ${c.minBaths}+ bathrooms, ${c.minCars}+ car space. Agency sites filter on minimums; apply the same.
- Price ${money(c.maxPrice)} or under. Keep auction, contact agent and market preview listings with no published price and label the price as undisclosed.

## Suburbs

- Focus suburbs (main group): ${focus}
- Just outside (second group): ${outside || 'none'}
- Near misses (optional third group): dwellings in the focus suburbs that meet bed/bath/car and price but fail only on property type.

## Agencies to check

${agencies}

For each agency capture: address, bed/bath/car, price text, agency name, exact listing URL. If a site is down, retry once later in the run and mention it in the report.

## Dedupe

Keep a running list of every listing already seen (address, agency, listing id or URL). Never report a listing that is already on it, including ones excluded for price or type. After each run append the newly reported listings to that list.

## Coordinates

Agency detail pages usually embed the exact latitude and longitude in their HTML. Use those and mark the pin exact. Sanity check the values fall inside the map area of the search${cfg.center ? ` (centre ${cfg.center[0]}, ${cfg.center[1]})` : ''}. If a page has no coordinates, geocode the street with Nominatim (one request per second) and mark the pin approximate. Never download map tiles in bulk.

## Output

Update \`src/data/listings.json\` in the site repository and push:

- \`latestRun\`: \`date\` (ISO), \`label\`, and \`listings\`, numbered 1..N continuously in this order: focus suburbs, near misses, just outside. Each listing has \`num\`, \`group\` (focus | nearMiss | justOutside), \`address\`, \`bbc\` (e.g. "3/2/1"), \`price\`, \`agency\`, \`url\`, \`lat\`, \`lng\`, \`exact\`.
- \`seen\`: append every listing from this run so it is not reported again.

Run \`npm test\` before pushing; the data suite checks numbering, group ids, links and that each new listing was carried into \`seen\`.

If nothing new was found, set \`latestRun.listings\` to an empty list and say which sites were checked.

## Source

Generated from a Google Maps search for "${cfg.query}": ${cfg.mapsUrl}
Config id: ${cfg.id}. Created: ${cfg.createdAt}.
`
}

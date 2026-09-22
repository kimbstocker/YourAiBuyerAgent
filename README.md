# YourAiBuyerAgent

A React + TypeScript site for an AI powered house watch. Two pages, reached from the hamburger menu:

- **Home** (`#/`): paste a Google Maps "Real estate agent" search link, name the search, list your suburbs and criteria, and the page generates a JSON config plus a SKILL.md draft that an AI agent follows to watch those agencies' websites. A Run button triggers a run through a pluggable agent adapter and links to the listings when it completes. An Account panel (stub auth) records per user token usage for later billing.
- **Listings** (`#/listings`): an interactive map of the latest run's new listings (numbered pins, click a pin to open the agency listing) and the listing tables below, in the same layout as the PDF report it replaces.

## Architecture

The UI depends only on three small interfaces in `src/adapters/` and `src/lib/searchConfig.ts`, so a real backend can be plugged in without touching the pages:

- `AgentRunner` (`adapters/agentRunner.ts`): `trigger(config)`, `status(runId)`, `subscribe(runId, listener)`. `StubAgentRunner` simulates a run locally.
- `AuthProvider` (`adapters/auth.ts`): `currentUser`, `signIn`, `signOut`, `usage`, `recordUsage`. `StubAuthProvider` keeps a local account in the browser.
- `ConfigStore` (`lib/searchConfig.ts`): `load`, `save`, `clear`. `LocalStorageConfigStore` is the browser implementation.

The stubs are wired up once in `src/App.tsx`. Routing uses a hash router so it works on GitHub Pages without server rewrites.

The Maps link parser (`lib/mapsUrl.ts`) reads the query, centre and zoom from a pasted URL. Short links (`maps.app.goo.gl`) cannot be read without following a redirect, so the page asks the user to open the link and copy the full URL. `lib/skillDraft.ts` renders the SKILL.md from the config.

## How it works

Everything the page shows comes from one file: `src/data/listings.json`.

- `latestRun` holds the date and the new listings from the most recent check. Each listing has a continuous number (`num`), a group (`focus`, `nearMiss`, `justOutside`), address, bed/bath/car (`bbc`), price text, agency, listing URL and coordinates (`lat`, `lng`, `exact`). Pins are red when `exact` is true and orange when the position is only street or suburb level.
- `seen` is the running list of every listing already reported, grouped the same way.
- `criteria`, `focusSuburbs`, `justOutsideSuburbs`, `mapCenter`, `mapZoom` and `excluded` are the text and settings shown around the tables.

To publish a new run, update `latestRun`, append the new rows to `seen`, run the tests, commit and push. No code changes are needed.

The shape of that file is typed in `src/lib/listings.ts` (`SiteData`, `Listing`), so a missing or misspelled field is a type error rather than a blank cell on the page.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # run the test suite once
npm run test:watch # re-run tests as you edit
npm run typecheck  # tsc --noEmit
npm run build      # typecheck, then build into dist/
```

## Tests

The project is developed test first, with Vitest and React Testing Library. Suites:

- `src/lib/mapsUrl.test.ts` covers the Google Maps link parser: path and query forms, regional domains, short links, non Maps URLs, missing centre, and the "not an agent search" warning.
- `src/lib/searchConfig.test.ts` covers suburb list parsing, default criteria, config validation and the localStorage store (including corrupt data).
- `src/lib/skillDraft.test.ts` covers the SKILL.md render: frontmatter, criteria wording, suburbs, agencies, the discovery fallback when no agencies are known yet, dedupe rule and output shape.
- `src/adapters/adapters.test.ts` covers the stub runner's lifecycle and subscriptions and the stub auth's sign in, sign out and usage accounting.
- `src/components/Nav.test.tsx` covers the hamburger menu: open and close, links, current page marking, Escape.
- `src/pages/HomePage.test.tsx` covers the home page end to end in jsdom: instructions, link preview and errors, validation, generate, tabs, download, restore from storage, run progress to the listings link, and sign in with usage.

- `src/lib/listings.test.ts` covers the pure logic: grouping in configured order, the exact-versus-approximate pin rule, pin colours, and run validation.
- `src/components/ListingsTable.test.tsx` covers the table contract: the PDF column set, the optional `#` column, and that each listing links out in a new tab (and renders no empty anchor when a URL is missing).
- `src/components/ListingsMap.test.tsx` covers the map contract: one pin per listing with coordinates, pin numbers matching the `#` column, colour by accuracy, and that clicking a pin opens the right listing. `react-leaflet` is mocked in `src/test/setup.ts`, since jsdom has no canvas or layout engine.
- `src/data/listings.test.ts` guards the data file itself: continuous numbering from 1, known group ids, https links, an ISO run date, and that every listing in the latest run has been carried into `seen` so it is never reported twice.

That last suite is the useful one when adding a run: if the new data is inconsistent, `npm test` says so before anything is pushed.

## Hosting on GitHub Pages

`.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages on every push to `main`. In the repository settings, under Pages, set the source to "GitHub Actions" once. The site is then served at `https://<your-user>.github.io/YourAiBuyerAgent/`.

## Attribution

Map tiles are from OpenStreetMap (© OpenStreetMap contributors). Listing details link back to the agency websites they came from.

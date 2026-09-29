# Run files

Each Northern Beaches house watch run drops one file here: `runs/YYYY-MM-DD.json` (run date, Sydney time). The scheduled Cowork task writes the file and nothing else; a Claude Code skill in this repo merges it into `src/data/listings.json`, runs the tests and build, commits and pushes.

## Format

```json
{
  "date": "2026-09-29",
  "label": "Tuesday 29 September 2026",
  "listings": [
    {
      "num": 1,
      "group": "focus",
      "address": "65 Wanganella Street, Balgowlah",
      "bbc": "3/2/1",
      "price": "Undisclosed (For Sale)",
      "agency": "Cunninghams",
      "url": "https://www.cunninghamsre.com.au/property/house-nsw-balgowlah-1p12675/",
      "lat": -33.79516,
      "lng": 151.25758,
      "exact": true
    }
  ],
  "sitesChecked": ["Cunninghams", "..."],
  "notes": "optional free text (sites down, pre-existing test failures, etc.)"
}
```

- `num` is continuous 1..N across groups in the order focus, nearMiss, justOutside.
- `group` is one of `focus`, `nearMiss`, `justOutside`.
- `exact` is true when the coordinates came from the agency page, false when geocoded from the street.
- `listings` is `[]` when the run found nothing new.

## How a run gets published

The `/publish-run` Claude Code skill (`.claude/skills/publish-run/SKILL.md`) drives `scripts/merge-run.ts`, which:

1. Picks every file here dated after `latestRun.date` in `src/data/listings.json`, oldest first (`YYYY-MM-DD-2.json` sorts after `YYYY-MM-DD.json`).
2. Sets `latestRun.date`, `latestRun.label` and `latestRun.listings` from the file.
3. Appends each listing to `seen` as `{group, address, bbc, price, agency, url}` unless its `url` is already present.
4. Rewrites `listings.json` in its one-object-per-line format so the diff stays small.
5. Refuses a run whose numbering is not continuous from 1 or whose coordinates are outside the Northern Beaches box.

The skill then runs `npm test` and `npm run build`, commits as `data: house watch run YYYY-MM-DD (N new listings)` and pushes `main`.

`node scripts/merge-run.ts --check` reports pending files without writing (exit 1 when there is something to merge); a SessionStart hook in `.claude/settings.json` runs it and nudges you to `/publish-run`.

### Making it fully automatic (optional)

Claude Code does not watch folders by itself. To have the merge happen with no one at the keyboard, run a headless session from a launchd agent after each scheduled run (they fire at 4 pm Sydney time on Tuesday and Friday), e.g. at 4:40 pm:

```
/usr/local/bin/claude -p "/publish-run" --cwd ~/Projects/YourAiBuyerAgent --allowedTools "Bash(node scripts/merge-run.ts*),Bash(npm test),Bash(npm run build),Bash(git *)"
```

That session uses your Mac's own git credentials, which is what the Cowork task cannot do.

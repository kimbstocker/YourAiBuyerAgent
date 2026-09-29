---
name: publish-run
description: Publish new house watch run files. Use when a new runs/YYYY-MM-DD.json has appeared (the scheduled Cowork task drops one every Tuesday and Friday), when the user says "publish the run", "merge the run file", "/publish-run", or when the SessionStart hook reports pending run files. Merges the file into src/data/listings.json, runs tests and build, commits and pushes main so GitHub Pages updates.
---

# Publish a house watch run

The scheduled house watch never edits code. It writes one file per run into `runs/` (format in `runs/README.md`). This skill takes every run file newer than `latestRun.date` in `src/data/listings.json`, merges it, verifies, commits and pushes. Do not hand-edit `listings.json`; the merge is deterministic and covered by `src/lib/mergeRun.test.ts`.

## Steps

1. Sync first so the merge lands on the current data:
   `git pull --ff-only origin main`
   If the tree is dirty with unrelated changes, stop and ask before continuing.

2. See what is pending (writes nothing, exit code 1 means there is work):
   `node scripts/merge-run.ts --check`
   If it prints "Nothing to merge", say so and stop.

3. Merge:
   `node scripts/merge-run.ts`
   The script applies pending files oldest first, replaces `latestRun`, appends unseen listings (matched by `url`) to `seen`, and rewrites `listings.json` in the repo's one-object-per-line format so the diff is only the changed lines. It refuses a run whose numbering is not continuous from 1 or whose coordinates fall outside the Northern Beaches box; if it throws, fix the run file (never the script) and rerun.

4. Verify. All three must pass before committing:
   `npm test` (the data suite `src/data/listings.test.ts` is the one that matters; `Nav.test.tsx` has three known failures on main that are unrelated, do not block on them until they are fixed)
   `npm run build`
   `git diff --stat` should show only `src/data/listings.json` plus the new `runs/*.json` file(s).

5. Commit and push (the user has authorised this for run files):
   ```
   git add src/data/listings.json runs/
   git commit -m "data: house watch run YYYY-MM-DD (N new listings)"
   git push origin main
   ```
   Use the date and count from the merge output. When several runs were merged in one go, list each date in the body.

6. Report in one or two lines: which run file(s) were merged, how many listings were added, the commit hash, and that GitHub Pages will show it at https://kimbstocker.github.io/YourAiBuyerAgent/#/listings within a couple of minutes.

## Rules

- Never edit `src/data/listings.json` by hand or with an ad hoc script; always go through `scripts/merge-run.ts` so formatting and validation stay consistent.
- Never modify a run file to make it merge unless the problem is obviously a data slip (a duplicate `num`, a missing `https://`); if the content itself looks wrong, ask.
- Never re-apply a run whose date is not after `latestRun.date`; the script skips these on purpose.
- Do not push anything except the data file and run files under this skill. Code changes go through the normal TDD workflow and their own commits.
- If `git push` is rejected because main moved, `git pull --rebase origin main` and push again; the data file rarely conflicts, but if it does, rerun the merge from the pulled version rather than resolving by hand.

# Notes for AI Agents

## Branch naming

Use a `fix/` or `enh/` prefix depending on the kind of work:

- `fix/` — bug fixes
- `enh/` — enhancements / new functionality
- `inf/` - infrastructure changes to dependency versions or workflows

If the branch addresses a specific issue, include its number right after the
prefix: `fix/12-some-bug-fix`. If there's no issue, just describe the work:
`enh/short-description`.

## Formatting

Run `npx prettier --check <file>` (or `--write` to fix) on every changed file
immediately before committing — including Markdown and other non-code files,
not just source. `npm run format:check` (CI's check) catches misses anyway,
but formatting issues (emphasis-style `*text*` vs `_text_`, trailing
whitespace, wrapping) are easy to miss by eye and cheap for Prettier to catch
instantly.

## Release PRs

A release PR merges a `release/vX.Y.Z` branch into `main` once its sub-PRs are
individually reviewed, tested, and merged into the release branch. Use this
format:

- **Title**: `Release vX.Y.Z`
- **`## Summary`** — one or two sentences: this rolls up everything merged
  into `release/vX.Y.Z` since it branched from `main`; each sub-PR is
  separately reviewed/tested/merged already, so this is the final
  integration merge.
- **`## Merged into release/vX.Y.Z`** — a table of every sub-PR already
  merged into the release branch:

  | PR  | Title | Issue(s) closed on this merge |
  | --- | ----- | ----------------------------- |

  Use `—` (with a short parenthetical) for a PR that doesn't close an issue
  outright — a partial fix, a follow-up, or infrastructure work.

- **A second table, `## Open PRs targeting release/vX.Y.Z`** — every open or
  draft PR whose base branch is still `release/vX.Y.Z` at the time the
  release PR is opened, so a reviewer can see at a glance what's still in
  flight and isn't in this release cut:

  | PR  | Title | Issue(s) Addressed |
  | --- | ----- | ------------------ |

  If nothing is still open against the release branch, keep the section
  header and state that explicitly (e.g. "None — every PR targeting this
  branch has been merged.") rather than omitting the section. Also check for
  any PR still based on a branch that has since been merged _into_ the
  release branch (a sub-branch of a sub-PR) — those won't literally show the
  release branch as their base, but are effectively stranded and worth
  flagging too, so a reviewer can decide whether to retarget them onto the
  release branch or hold them for next time.

- **`## Test plan`** — a brief note that each sub-PR carries its own test
  plan (`npm test`/`typecheck`/`lint`/`format:check` all green) and this
  release merge itself introduces no additional changes. If any conflicts had
  to be resolved while rebasing a sub-PR's branch onto the release branch,
  re-run the full suite on that branch afterward rather than trusting a clean
  rebase alone — an auto-merged conflict can silently drop a change (e.g. one
  side's edit to a since-renamed import) without git flagging it as a
  conflict.

- **`package.json`'s `version` field** is bumped by hand, only as part of
  actually merging the release PR into `main` — not when cutting the release
  branch or merging any individual sub-PR into it. Don't bump it yourself
  unless explicitly asked to, and don't treat it lagging the release branch
  name as a bug to fix.

## Useful scripts

- `npm test` — run the unit test suite once (`npm run test:watch` for watch
  mode).
- `npm run test:nyt` — the slow backtest against all official NYT Wordle
  answers (`src/lib/nytAnswers.test.ts`); only relevant when `guess.ts` or its
  dependencies (the dictionaries, `clue.ts`) change. Not part of the default
  `npm test` run.
- `npm run typecheck` / `npm run lint` / `npm run format:check` — the same
  checks CI runs; run all of them (plus `npm run build`) before considering
  any change done.
- `npm run rank` — regenerates `src/data/dictionary-ranked.json` from
  `src/data/dictionary.json` and `src/data/frequencies.json`. Run this after
  any manual edit to `dictionary.json` (e.g. adding or removing words) — the
  ranked file is a derived build artifact, not meant to be hand-edited.

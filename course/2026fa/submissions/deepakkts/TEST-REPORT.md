# TEST-REPORT: opt-start-window

## Executive summary

This report is the evidence that the prototype runs in the real repository, on
the real data, and fails safely where it should. It records the repository's own
checks before and after the change, the offline tests, every named failure case
with its real output, and which claims in the assignment brief still hold.

Everything passes except one check: the repository's personal-data scan reports
one finding, in a file this contribution never touched, and reports the same
finding on an unmodified copy of the upstream repository. Under the operator's
rules that finding stops the run before anything is committed or pushed.

## Where this was run

2026-10-03, a clone of the fork `DeepakKTS/the-reallocation-engine` on branch
`contrib/2026fa-deepakkts-opt-start-window`, base `upstream/main` at `015843d`.
Node v24.21.0, Python 3.13.2, macOS, with the test suite also run once on Node
v20.20.2, the version CI uses. Commands executed by Claude Code in the operator's
session. This file was written against the working tree just before the first
commit; that commit's SHA is recorded in `SUBMISSION.md`.

## Toolchain baseline

| Step | Before the change | After the change |
| --- | --- | --- |
| `npm run doctor` | exit 0, output below | exit 0, byte-identical to before (`diff` printed nothing) |
| `npm run verify` | exit 0, 158 files conform | exit 0, 180 files conform |
| `node scripts/conformance.mjs scripts/contrib/2026fa/deepakkts-opt-start-window/` | n/a | exit 0, 20 files conform |
| `node scripts/pii-scan.mjs` | not run before the change; a clean `upstream/main` worktree gives the same finding | exit 1, one finding in `package-lock.json`; see below |

`npm run doctor`, before (and, byte for byte, after):

```

> the-reallocation-engine@1.0.0 doctor
> node scripts/doctor.mjs

RECIPE DOCTOR — The Reallocation Engine
==========================================

ENVIRONMENT (required)
  ✓ node       v24.21.0
  ✓ python3    Python 3.13.2

ENVIRONMENT (optional — features degrade without these)
  — pandoc     not found (resume/PDF rendering)
  — libreoffice not found (PDF fallback)
  ✓ playwright installed

RUNNABLE COMMANDS (npm script → target file present?)
  ✓ verify         scripts/conformance.mjs
  ✓ manifest-check scripts/manifest-check.mjs
  ✓ eval:score     scripts/eval/score-run.mjs
  ✓ eval:report    scripts/eval/report.mjs
  ✓ doctor         scripts/doctor.mjs
  ✓ bls:local-wage scripts/bls/local-wage-adjustment.py
  ✓ build-instructions scripts/build-instructions.mjs
  ✓ to-markdown    scripts/to-markdown.mjs
  ✓ score          scripts/score/role-scorer.mjs
  ✓ score:gates    scripts/score/gate-harness.mjs
  ✓ ats:dedup      scripts/ats/dedup-tracker.mjs
  ✓ ats:liveness   scripts/ats/check-liveness.mjs
  ✓ ats:merge      scripts/ats/merge-tracker.mjs
  ✓ ats:normalize  scripts/ats/normalize-statuses.mjs
  ✓ ats:scan       scripts/ats/scan.mjs
  ✓ ats:verify     scripts/ats/verify-pipeline.mjs
  ✓ resumes:pdf    scripts/resumes/generate-pdf.mjs
  ✓ svg-to-png     scripts/svg-to-png.mjs
  ✓ audit:layout   scripts/svg-layout-audit.mjs
  ✓ postsvg-to-png scripts/svg-layout-audit.mjs
  ✓ skill-demand   scripts/score/skill-demand-monitor.mjs
  ✓ skill-demand:test scripts/score/skill-demand-monitor.test.mjs
  ✓ fetch-postings scripts/ats/fetch-real-postings.py
  ✓ pii-scan       scripts/pii-scan.mjs

DOMAIN DIRECTORIES
  ✓ data/sec
  ✓ data/bls
  ✓ data/ats
  ✓ data/80-days-to-stay
  ✓ scripts/sec
  ✓ scripts/bls
  ✓ scripts/ats
  ✓ scripts/resumes

PRIVACY (no personal data committed)
  ✓ no private/PII paths are tracked

RECIPES (33)
  with lifecycle frontmatter: 33   missing: 0
  by status: DRAFT 28 · RUNNABLE-SAMPLE 4 · RUNNABLE-LIVE  # DRAFT | SPECIFIED | RUNNABLE-SAMPLE | RUNNABLE-LIVE | VERIFIED 1
  open TODOs: 318 declared (in frontmatter) · 318 [TODO markers in bodies

SUMMARY
  environment: ✓ runnable
  recipes: 33/33 carry lifecycle frontmatter — all tracked
  next: continue
```

`doctor` is identical after the change because it reads only top-level
`recipes/*.md`. It never sees `recipes/cases/`, so it does not count this
recipe's `todos_open`. The recipe body has 5 `[TODO` markers and its frontmatter
declares 5. The fifth, the reason label at exactly the unemployment ceiling, was
added after the outputs in this file were captured; it changes no code.

`npm run verify`, before:

```

> the-reallocation-engine@1.0.0 verify
> node scripts/conformance.mjs && node scripts/manifest-check.mjs

conformance: 158 files (85 md · 36 py · 30 js · 4 sh · 3 json)
✓ all conform (machine half of P4). Adequacy is still the human gate.
MANIFEST CHECK — The Reallocation Engine
==========================================

WARN (3):
  W1 ignore path not in .gitignore: archive/
  W2 private path not gitignored (PII/secret risk): private/
  W2 private path not gitignored (PII/secret risk): data/ats/

✓ manifest check passed (3 warnings)
```

`npm run verify`, after:

```

> the-reallocation-engine@1.0.0 verify
> node scripts/conformance.mjs && node scripts/manifest-check.mjs

conformance: 180 files (88 md · 36 py · 40 js · 12 json · 4 sh)
✓ all conform (machine half of P4). Adequacy is still the human gate.
MANIFEST CHECK — The Reallocation Engine
==========================================

WARN (3):
  W1 ignore path not in .gitignore: archive/
  W2 private path not gitignored (PII/secret risk): private/
  W2 private path not gitignored (PII/secret risk): data/ats/

✓ manifest check passed (3 warnings)
```

Conformance on this contribution's folder:

```
$ node scripts/conformance.mjs scripts/contrib/2026fa/deepakkts-opt-start-window/
conformance: 20 files (1 md · 10 js · 9 json)
✓ all conform (machine half of P4). Adequacy is still the human gate.
```

`npm run verify` does not cover `course/` or `logs/`, so the documents were checked
directly as well: `node scripts/conformance.mjs` over the recipe, the card, the
run log and `course/2026fa/submissions/deepakkts` printed
`conformance: 15 files (12 md · 3 json)` and `✓ all conform`.

### The personal-data scan

```
$ node scripts/pii-scan.mjs
pii-scan: 1 finding(s) — see DATA_CONTRACT.md §Zero-Conditions

  [email] package-lock.json — <address redacted in this file>

If a finding is a false positive (fictional data outside the sanctioned dirs),
move it under search/examples/ or resumes/ rather than allowlisting it here.
```

The address is redacted above, because quoting it would make this file a finding
too. It is an npm package author's address in the lockfile's package metadata.
What was checked:

- `package-lock.json` is tracked and unmodified on this branch (`git status` and
  `git diff` print nothing for it); it last changed upstream in `d08afdd`.
- The same scan run on a clean worktree of `upstream/main` (`015843d`) printed
  the same single finding and exited 1.
- The same scan run over a copy holding only this contribution's five paths
  printed `pii-scan: clean ✓` and exited 0.

So the finding predates this contribution and lies outside its namespace, which
it may not edit; `package-lock.json` was not modified. CI's working-tree scan
(`node scripts/pii-scan.mjs` in the `doctor-and-pii` job) will report this same
finding on any pull request against this repository until the lockfile changes
upstream. The branch-history scan (`--diff`) covers only this branch's commits.
The run stopped here once under the operator's rule that any non-clean scan is a
stop; the operator reviewed the evidence above and authorised the commit.

## Facts about the engine, checked against the clone

| Fact in the assignment brief | Result | Evidence |
| --- | --- | --- |
| Role quality carries zero weight (`role_quality: 0.0`, `[VERIFY]`) | confirmed | `scripts/score/role-scorer.mjs` line 37 |
| `bls:local-wage` feeds nothing yet | confirmed | no script other than its own README references it; `DOMAIN.md` gap 9 says so |
| Only samples of the SEC data ship | confirmed | `data/sec/form-d/processed/sample/` holds four `*.sample.json`, each "first 50 of" 13,325 to 15,981 companies; `.gitignore` line 32 ignores the full files |
| `data/raw/`, `data/verified/`, `logs/gate-decisions/` do not exist | confirmed | all three absent |
| The `snickerdoodle` CLI is roadmap, not runtime | confirmed | not on `PATH`, not in `package.json` |
| Every top-level recipe is still DRAFT | no longer true | frontmatter of the 33 top-level recipes: 28 DRAFT, 4 RUNNABLE-SAMPLE, 1 RUNNABLE-LIVE |
| `npm run bls:local-wage` fails on a fresh clone | confirmed | `missing .venv — create it with: ...`, exit 2; `data/bls/local-wage/requirements.txt` absent |
| `validate-h1b-join-sample.py` needs full data it does not have | confirmed | `FileNotFoundError` for `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped.csv`, exit 1 (it would overwrite a tracked audit file if the input existed; it was run only after confirming the input was absent) |

## Offline test suite

```
$ node --test scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs
✔ timeline: work that finishes before the clock starts costs no unemployment days (1.21425ms)
✔ timeline: a process that eats into the buffer is kept and penalised (0.078ms)
✔ timeline: breaching the unemployment ceiling gates to zero (0.061042ms)
✔ timeline: a start past the authorisation cliff gates to zero (0.069292ms)
✔ timeline: every factor carries the dates that produced it (0.082333ms)
✔ intake: a malformed date is rejected, not coerced (0.177708ms)
✔ intake: an authorisation end date already in the past stops the run (0.05475ms)
✔ intake: STEM eligibility must be supplied explicitly and is never inferred (0.073375ms)
✔ sources: an unusable CSV header stops the run and prints what it saw (0.54ms)
✔ schema: the value field is learned per term, p for votes and factor for gates (0.375958ms)
✔ schema: a term whose number field cannot be determined stops with the observed keys (0.139958ms)
✔ gate fields: a timeline of 0 is emitted under the gate field the scorer reads (0.193459ms)
✔ gate fields, regression: the old single-field emitter fails the same check (0.398333ms)
✔ schema: an unmappable example stops the run instead of writing a bad roles file (0.0655ms)
✔ pipeline: roles land in the right buckets and the skip rate is reported (3.123166ms)
✔ pipeline: a company with no sponsorship record becomes a networking target, not a zero (1.860792ms)
✔ pipeline: an unchecked posting is held at the liveness gate with the command to run (1.428ms)
✔ occupation: bls_soc_code lookup keeps the .00 base row and records the skipped detailed rows (0.104959ms)
✔ pipeline: a missing occupation row empties role quality and never substitutes zero (2.305709ms)
✔ form d: dates like 31-MAR-2026 parse exactly and anything else is rejected (0.039083ms)
✔ form d: the loader reads companies[].company.name and reports rejected dates (0.093583ms)
✔ form d: zero issuers from a non-empty set of files fails loudly (0.084875ms)
✔ pipeline: a missing Form D match omits the term rather than scoring it zero (1.018167ms)
✔ approvals: an empty cell is missing evidence and only an explicit 0 is a recorded zero (1.086541ms)
✔ tier: emitted in the scorer vocabulary, and omitted with a reason when it has no match (1.256917ms)
✔ pipeline: calendar-dropped roles never reach the roles file (1.094916ms)
✔ pipeline: fit rescuing a non-sponsor is flagged by name, using the scorer weights (1.074792ms)
✔ config: the fit-rescue check follows the weights in the scorer config, not constants (1.419958ms)
✔ config: with no config block the fit-rescue check is skipped and the report says so (1.418708ms)
✔ pipeline: the written report shows the dates behind every factor (1.028334ms)
✔ privacy: the written JSON log carries no absolute path from inside the repository (1.048666ms)
✔ break attempt: the gate assertion fails the mutated scorer (0.206084ms)
✔ break attempt: the gate assertion passes a scorer that zeroes a closed gate (0.076459ms)
✔ break attempt: with no threshold from the scorer the assertion refuses to judge (0.046583ms)
✔ gate check via the CLI: the repository scorer closes a zeroed timeline gate (26.6525ms)
✔ gate check via the CLI: the mutant scorer run the same way is caught (24.583084ms)
ℹ tests 36
ℹ suites 0
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 117.279541
```

The same suite on Node v20.20.2, the version CI uses (the default reporter there
is TAP; `fnm` installed v20.20.2 for this one run):

```
$ fnm exec --using=20 node --test scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs
TAP version 13
# Subtest: timeline: work that finishes before the clock starts costs no unemployment days
ok 1 - timeline: work that finishes before the clock starts costs no unemployment days
  ---
  duration_ms: 1.555209
  ...
# Subtest: timeline: a process that eats into the buffer is kept and penalised
ok 2 - timeline: a process that eats into the buffer is kept and penalised
  ---
  duration_ms: 0.0815
  ...
# Subtest: timeline: breaching the unemployment ceiling gates to zero
ok 3 - timeline: breaching the unemployment ceiling gates to zero
  ---
  duration_ms: 0.057625
  ...
# Subtest: timeline: a start past the authorisation cliff gates to zero
ok 4 - timeline: a start past the authorisation cliff gates to zero
  ---
  duration_ms: 0.05375
  ...
# Subtest: timeline: every factor carries the dates that produced it
ok 5 - timeline: every factor carries the dates that produced it
  ---
  duration_ms: 0.103333
  ...
# Subtest: intake: a malformed date is rejected, not coerced
ok 6 - intake: a malformed date is rejected, not coerced
  ---
  duration_ms: 0.274667
  ...
# Subtest: intake: an authorisation end date already in the past stops the run
ok 7 - intake: an authorisation end date already in the past stops the run
  ---
  duration_ms: 0.059208
  ...
# Subtest: intake: STEM eligibility must be supplied explicitly and is never inferred
ok 8 - intake: STEM eligibility must be supplied explicitly and is never inferred
  ---
  duration_ms: 0.08625
  ...
# Subtest: sources: an unusable CSV header stops the run and prints what it saw
ok 9 - sources: an unusable CSV header stops the run and prints what it saw
  ---
  duration_ms: 0.626458
  ...
# Subtest: schema: the value field is learned per term, p for votes and factor for gates
ok 10 - schema: the value field is learned per term, p for votes and factor for gates
  ---
  duration_ms: 0.571792
  ...
# Subtest: schema: a term whose number field cannot be determined stops with the observed keys
ok 11 - schema: a term whose number field cannot be determined stops with the observed keys
  ---
  duration_ms: 0.420125
  ...
# Subtest: gate fields: a timeline of 0 is emitted under the gate field the scorer reads
ok 12 - gate fields: a timeline of 0 is emitted under the gate field the scorer reads
  ---
  duration_ms: 0.201709
  ...
# Subtest: gate fields, regression: the old single-field emitter fails the same check
ok 13 - gate fields, regression: the old single-field emitter fails the same check
  ---
  duration_ms: 0.666333
  ...
# Subtest: schema: an unmappable example stops the run instead of writing a bad roles file
ok 14 - schema: an unmappable example stops the run instead of writing a bad roles file
  ---
  duration_ms: 0.149166
  ...
# Subtest: pipeline: roles land in the right buckets and the skip rate is reported
ok 15 - pipeline: roles land in the right buckets and the skip rate is reported
  ---
  duration_ms: 4.100833
  ...
# Subtest: pipeline: a company with no sponsorship record becomes a networking target, not a zero
ok 16 - pipeline: a company with no sponsorship record becomes a networking target, not a zero
  ---
  duration_ms: 1.870083
  ...
# Subtest: pipeline: an unchecked posting is held at the liveness gate with the command to run
ok 17 - pipeline: an unchecked posting is held at the liveness gate with the command to run
  ---
  duration_ms: 2.080959
  ...
# Subtest: occupation: bls_soc_code lookup keeps the .00 base row and records the skipped detailed rows
ok 18 - occupation: bls_soc_code lookup keeps the .00 base row and records the skipped detailed rows
  ---
  duration_ms: 0.206167
  ...
# Subtest: pipeline: a missing occupation row empties role quality and never substitutes zero
ok 19 - pipeline: a missing occupation row empties role quality and never substitutes zero
  ---
  duration_ms: 2.857459
  ...
# Subtest: form d: dates like 31-MAR-2026 parse exactly and anything else is rejected
ok 20 - form d: dates like 31-MAR-2026 parse exactly and anything else is rejected
  ---
  duration_ms: 0.05625
  ...
# Subtest: form d: the loader reads companies[].company.name and reports rejected dates
ok 21 - form d: the loader reads companies[].company.name and reports rejected dates
  ---
  duration_ms: 0.210375
  ...
# Subtest: form d: zero issuers from a non-empty set of files fails loudly
ok 22 - form d: zero issuers from a non-empty set of files fails loudly
  ---
  duration_ms: 0.142125
  ...
# Subtest: pipeline: a missing Form D match omits the term rather than scoring it zero
ok 23 - pipeline: a missing Form D match omits the term rather than scoring it zero
  ---
  duration_ms: 1.315041
  ...
# Subtest: approvals: an empty cell is missing evidence and only an explicit 0 is a recorded zero
ok 24 - approvals: an empty cell is missing evidence and only an explicit 0 is a recorded zero
  ---
  duration_ms: 1.162917
  ...
# Subtest: tier: emitted in the scorer vocabulary, and omitted with a reason when it has no match
ok 25 - tier: emitted in the scorer vocabulary, and omitted with a reason when it has no match
  ---
  duration_ms: 1.252375
  ...
# Subtest: pipeline: calendar-dropped roles never reach the roles file
ok 26 - pipeline: calendar-dropped roles never reach the roles file
  ---
  duration_ms: 1.454958
  ...
# Subtest: pipeline: fit rescuing a non-sponsor is flagged by name, using the scorer weights
ok 27 - pipeline: fit rescuing a non-sponsor is flagged by name, using the scorer weights
  ---
  duration_ms: 1.262541
  ...
# Subtest: config: the fit-rescue check follows the weights in the scorer config, not constants
ok 28 - config: the fit-rescue check follows the weights in the scorer config, not constants
  ---
  duration_ms: 1.719166
  ...
# Subtest: config: with no config block the fit-rescue check is skipped and the report says so
ok 29 - config: with no config block the fit-rescue check is skipped and the report says so
  ---
  duration_ms: 1.824125
  ...
# Subtest: pipeline: the written report shows the dates behind every factor
ok 30 - pipeline: the written report shows the dates behind every factor
  ---
  duration_ms: 1.506584
  ...
# Subtest: privacy: the written JSON log carries no absolute path from inside the repository
ok 31 - privacy: the written JSON log carries no absolute path from inside the repository
  ---
  duration_ms: 1.38825
  ...
# Subtest: break attempt: the gate assertion fails the mutated scorer
ok 32 - break attempt: the gate assertion fails the mutated scorer
  ---
  duration_ms: 0.331542
  ...
# Subtest: break attempt: the gate assertion passes a scorer that zeroes a closed gate
ok 33 - break attempt: the gate assertion passes a scorer that zeroes a closed gate
  ---
  duration_ms: 0.159666
  ...
# Subtest: break attempt: with no threshold from the scorer the assertion refuses to judge
ok 34 - break attempt: with no threshold from the scorer the assertion refuses to judge
  ---
  duration_ms: 0.049417
  ...
# Subtest: gate check via the CLI: the repository scorer closes a zeroed timeline gate
ok 35 - gate check via the CLI: the repository scorer closes a zeroed timeline gate
  ---
  duration_ms: 27.597125
  ...
# Subtest: gate check via the CLI: the mutant scorer run the same way is caught
ok 36 - gate check via the CLI: the mutant scorer run the same way is caught
  ---
  duration_ms: 24.310125
  ...
1..36
# tests 36
# suites 0
# pass 36
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 130.920875
```

No network calls. The two `gate check via the CLI` tests run the repository's own
`scripts/score/role-scorer.mjs`, and the BROKEN mutant, as subprocesses over a
fixture.

## Gate check against the real scorer

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --gate-check
gate-check against scripts/score/role-scorer.mjs (CLI, --out-dir in a temp directory)
  probe as emitted: {"company":"Gate Probe Example Co","title":"Synthetic probe role","sponsorship":{"p":0.95,"source":"your-input"},"fit":{"p":0.95,"source":"your-input"},"liveness":{"factor":1,"source":"your-input"},"timeline":{"factor":0,"source":"your-input"}}
  scorer read timeline multiplier 0; arithmetic (0.95·0.35 + 0.95·0.3) × 1 × 0 = 0.000
  composite 0 <= closed-gate threshold 0.05 (scorer config gate_zero); recommendation Skip
  timeline behaves as a gate
```

Before the per-term fix the same probe was emitted as `"timeline":{"p":0}` and
the scorer returned composite 0.6175, Apply, with the timeline multiplier read as 1.

## Named failure cases, each exercised against real data

| Failure case | How it was triggered | Observed | Test |
| --- | --- | --- | --- |
| Company missing from the sponsorship data | Anthropic and Scale AI, absent from the CSV | `missing: no-sponsor-record`, routed to networking, never scored | pipeline networking test |
| Company present with an empty approvals cell | Vercel Inc, `Total Approvals` = `""` | `missing: empty-approvals-cell`, routed to networking | approvals test |
| SOC code with no row | Discord's SOC set to 15-2098 | `role_quality: missing: no-occupation-row`, no value substituted | occupation tests |
| Posting not liveness-checked | Moloco's liveness set to null | held, exact `ats:liveness` command printed, absent from the roles file | liveness test |
| Malformed date | `auth_end_date: 2028-02-30` | `IntakeError`, exit 2, out-dir not created | intake test |
| Unusable CSV header | `--sponsors-csv data/bls/compact/soc_occupation_compact.csv` | `SourceError`, every header printed, exit 2 | header test |
| Form D miss | all ten real targets | `no-form-d-match`, term omitted from the roles file | Form D tests |
| Form D files of the wrong shape | `--formd-dir data/examples` | `SourceError ... zero issuers indexed`, exit 2 | Form D loud-failure test |
| Gate behaving as a vote | `--gate-check --scorer fixtures/BROKEN-additive-gate-scorer.mjs` | `GateViolation`, composite 0.7675, exit 1 | CLI mutant test |

The modified inputs for the SOC, liveness and date cases are edited copies of the
committed intake and targets, kept in a scratch directory outside the repository
(`<scratch>` below).

**Missing SOC row:**

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json --targets <scratch>/c5/targets-soc.json --out-dir <scratch>/c5/soc
opt-start-window 2026-10-03-opt-start-window
  roles in         10
  scored           7
  dropped (clock)  0
  needs liveness   0
  network only     3
  pre-scorer skip  0.3
  json   2026-10-03-opt-start-window.json (outside the repository)
  report 2026-10-03-opt-start-window.md (outside the repository)
  roles  2026-10-03-opt-start-window-roles.json (outside the repository)

Next: npm run score -- 2026-10-03-opt-start-window-roles.json (outside the repository) --out-dir soc (outside the repository)
exit 0

Discord role_quality: {"status":"missing","summary":"missing: no-occupation-row","reason":"no-occupation-row"} | bucket: scored
```

**Null liveness:**

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json --targets <scratch>/c5/targets-liveness.json --out-dir <scratch>/c5/liveness
opt-start-window 2026-10-03-opt-start-window
  roles in         10
  scored           6
  dropped (clock)  0
  needs liveness   1
  network only     3
  pre-scorer skip  0.4
  json   2026-10-03-opt-start-window.json (outside the repository)
  report 2026-10-03-opt-start-window.md (outside the repository)
  roles  2026-10-03-opt-start-window-roles.json (outside the repository)

Next: npm run score -- 2026-10-03-opt-start-window-roles.json (outside the repository) --out-dir liveness (outside the repository)
exit 0

Moloco: {"bucket":"needs_liveness","liveness":{"value":null,"source":"missing","basis":"not checked"},"next_action":"run `npm run ats:liveness -- https://job-boards.greenhouse.io/moloco/jobs/7985823003` and put the result in the targets file"}
Moloco in roles file: false
```

**Malformed date:**

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --intake <scratch>/c5/intake-baddate.json --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json --out-dir <scratch>/c5/baddate2

IntakeError: auth_end_date is not a real calendar date: 2028-02-30

No output was written. Nothing was guessed to fill the gap.
exit 2
```

**Unusable CSV header:**

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json --sponsors-csv data/bls/compact/soc_occupation_compact.csv --out-dir <scratch>/c5/header

SourceError: No CSV under data/80-days-to-stay/ has both a company column and a sponsorship-evidence column. Headers observed are listed below; add the real column name to COMPANY_COLUMNS / TIER_COLUMNS / COUNT_COLUMNS in lib/sources.mjs, or pass --sponsors-csv with a file that has them.
{
  "rejected": [
    {
      "file": "data/bls/compact/soc_occupation_compact.csv",
      "header": [
        "onet_soc_code",
        "bls_soc_code",
        "title",
        "description",
        "job_zone",
        "alternate_title_count",
        "alternate_titles_sample",
        "oews_year",
        "employment",
        "annual_mean_wage",
        "annual_median_wage",
        "hourly_mean_wage",
        "hourly_median_wage",
        "employment_prse",
        "ability_originality_lv",
        "ability_problem_sensitivity_lv",
        "ability_deductive_reasoning_lv",
        "ability_inductive_reasoning_lv",
        "ability_selective_attention_lv",
        "ability_oral_comprehension_lv",
        "skill_programming_lv",
        "skill_critical_thinking_lv",
        "skill_judgment_decision_making_lv",
        "skill_complex_problem_solving_lv",
        "skill_systems_analysis_lv",
        "skill_systems_evaluation_lv",
        "skill_social_perceptiveness_lv",
        "skill_active_listening_lv",
        "skill_persuasion_lv",
        "skill_instructing_lv",
        "skill_service_orientation_lv",
        "cognitive_pivot_score"
      ]
    }
  ]
}

No output was written. Nothing was guessed to fill the gap.
exit 2
```

The message still says "No CSV under data/80-days-to-stay/" although the file was
named with `--sponsors-csv`. The behaviour is right; the wording is not, and it
was left as found.

**Form D miss** (from the committed run JSON) **and Form D files of the wrong shape:**

```
Reddit Inc {"value":null,"source":"missing","basis":"no-form-d-match"}
Discord Inc {"value":null,"source":"missing","basis":"no-form-d-match"}
Moloco Inc {"value":null,"source":"missing","basis":"no-form-d-match"}
any funding key in roles file: false
```

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json --formd-dir data/examples --out-dir <scratch>/c5/formd

SourceError: Form D: 6 file(s) scanned and zero issuers indexed. The expected shape is { companies: [ { company: { name }, filing: { date_filed } } ] }; the files below did not match it.
{
  "files": 6,
  "records": 0,
  "unrecognised_files": [
    {
      "file": "data/examples/ch11-roles.json",
      "reason": "no companies array",
      "topLevelKeys": [
        "0",
        "1",
        "2",
        "3",
        "4"
      ]
    },
    {
      "file": "data/examples/gate-behavior-roles.json",
      "reason": "no companies array",
      "topLevelKeys": [
        "0",
        "1",
        "2",
        "3",
        "4"
      ]
    },
    {
      "file": "data/examples/role-scores.json",
      "reason": "no companies array",
      "topLevelKeys": [
        "_scorer",
        "_chapter",
        "generated",
        "config",
        "profile_needs_sponsorship",
        "roles"
      ]
    },
    {
      "file": "data/examples/run-envelope.json",
      "reason": "no companies array",
      "topLevelKeys": [
        "workflow",
        "run_id",
        "mode",
        "created_at",
        "requested_by",
        "sources",
        "approvals",
        "limits",
        "notes"
      ]
    },
    {
      "file": "data/examples/skill-demand/example-postings.json",
      "reason": "no companies array",
      "topLevelKeys": [
        "_note",
        "postings"
      ]
    },
    {
      "file": "data/examples/skill-demand/example-profile.json",
      "reason": "no companies array",
      "topLevelKeys": [
        "_note",
        "skills"
      ]
    }
  ],
  "dates_rejected": []
}

No output was written. Nothing was guessed to fill the gap.
exit 2
```

**The BROKEN mutant gate check:** the output is in `WORKED-RUN.md` and above in
the gate-check section; `GateViolation ... produced composite 0.7675, above the
closed-gate threshold 0.05`, exit 1.

**Scenario, not a failure case: the same real list as if applying on 1 February:**

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json --as-of 2027-02-01 --out-dir <scratch>/c5/asof
opt-start-window 2027-02-01-opt-start-window
  roles in         10
  scored           1
  dropped (clock)  9
  needs liveness   0
  network only     0
  pre-scorer skip  0.9
  json   2027-02-01-opt-start-window.json (outside the repository)
  report 2027-02-01-opt-start-window.md (outside the repository)
  roles  2027-02-01-opt-start-window-roles.json (outside the repository)

Next: npm run score -- 2027-02-01-opt-start-window-roles.json (outside the repository) --out-dir asof (outside the repository)
exit 0

| Role | Expected days to start | Projected start | Auth end | Unemployment days after this process | Factor | Why |
| --- | --- | --- | --- | --- | --- | --- |
| Reddit Inc · Machine Learning Engineer | 120 | 2027-06-01 | 2028-01-18 | 120 of 90 | **0** | exceeds-unemployment-ceiling |
| Discord Inc · Data Scientist - Client Platform | 105 | 2027-05-17 | 2028-01-18 | 105 of 90 | **0** | exceeds-unemployment-ceiling |
| Moloco Inc · Data Scientist II, Product - Moloco Commerce Media | 90 | 2027-05-02 | 2028-01-18 | 90 of 90 | **0** | eats-into-buffer |
| Airbnb Inc · Data Scientist - Algorithms, Community Support | 120 | 2027-06-01 | 2028-01-18 | 120 of 90 | **0** | exceeds-unemployment-ceiling |
| Attentive Mobile Inc · Senior Machine Learning Engineer | 120 | 2027-06-01 | 2028-01-18 | 120 of 90 | **0** | exceeds-unemployment-ceiling |
| Cellanome Inc · Machine Learning Engineer | 75 | 2027-04-17 | 2028-01-18 | 75 of 90 | **0.5** | eats-into-buffer |
| FourKites Inc · Senior AI Engineer | 90 | 2027-05-02 | 2028-01-18 | 90 of 90 | **0** | eats-into-buffer |
| Anthropic · Data Engineer | 150 | 2027-07-01 | 2028-01-18 | 150 of 90 | **0** | exceeds-unemployment-ceiling |
| Scale AI · Machine Learning Research Scientist, Evaluations | 120 | 2027-06-01 | 2028-01-18 | 120 of 90 | **0** | exceeds-unemployment-ceiling |
| Vercel Inc · Software Engineer, AI SDK | 105 | 2027-05-17 | 2028-01-18 | 105 of 90 | **0** | exceeds-unemployment-ceiling |
```

## Diff scope

The scope was measured on the staged index just before the first commit. The
line count shown for this file was taken just before the table was pasted into it:

```
$ git add <the five paths> && git diff --cached --stat
 .../2026fa/submissions/deepakkts/CHANGE-BRIEF.md   |  182 ++
 course/2026fa/submissions/deepakkts/FRICTIONAL.md  |  277 +++
 .../2026fa/submissions/deepakkts/JUSTIFICATION.md  |   96 +
 course/2026fa/submissions/deepakkts/SOURCES.md     |   79 +
 course/2026fa/submissions/deepakkts/SUBMISSION.md  |   66 +
 course/2026fa/submissions/deepakkts/TEST-REPORT.md |  792 +++++++
 course/2026fa/submissions/deepakkts/WORKED-RUN.md  |  358 +++
 .../runs/2026-10-03-opt-start-window-roles.json    |  149 ++
 .../runs/2026-10-03-opt-start-window.json          | 2454 ++++++++++++++++++++
 .../deepakkts/runs/2026-10-03-opt-start-window.md  |  126 +
 .../submissions/deepakkts/runs/role-scores.json    |  324 +++
 .../submissions/deepakkts/runs/role-scores.md      |   17 +
 logs/runs/2026fa-deepakkts-1.md                    |  116 +
 .../2026fa/deepakkts-opt-start-window.card.md      |   74 +
 recipes/cases/2026fa/deepakkts-opt-start-window.md |  297 +++
 .../2026fa/deepakkts-opt-start-window/README.md    |  165 ++
 .../fixtures/BROKEN-additive-gate-scorer.mjs       |   33 +
 .../fixtures/BROKEN-single-value-field-schema.mjs  |   15 +
 .../example-roles-unmappable-gate.fixture.json     |    7 +
 .../fixtures/example-roles.fixture.json            |   17 +
 .../fixtures/formd-oldshape/oldshape.fixture.json  |    4 +
 .../fixtures/formd/formd.fixture.json              |    9 +
 .../fixtures/intake.sample.json                    |   14 +
 .../fixtures/role-scores-noconfig.fixture.json     |    5 +
 .../fixtures/role-scores.fixture.json              |   20 +
 .../fixtures/soc.fixture.csv                       |    7 +
 .../fixtures/sponsors-badheader.fixture.csv        |    2 +
 .../fixtures/sponsors.fixture.csv                  |    8 +
 .../fixtures/targets.real.json                     |  125 +
 .../fixtures/targets.sample.json                   |   74 +
 .../2026fa/deepakkts-opt-start-window/lib/csv.mjs  |   81 +
 .../2026fa/deepakkts-opt-start-window/lib/gate.mjs |   82 +
 .../deepakkts-opt-start-window/lib/report.mjs      |  119 +
 .../deepakkts-opt-start-window/lib/schema.mjs      |  205 ++
 .../deepakkts-opt-start-window/lib/sources.mjs     |  315 +++
 .../deepakkts-opt-start-window/lib/timeline.mjs    |  173 ++
 .../2026fa/deepakkts-opt-start-window/run.mjs      |  438 ++++
 .../test/opt-start-window.test.mjs                 |  400 ++++
 38 files changed, 7725 insertions(+)
```

`git status` showed no tracked file modified outside these paths, and nothing
under `logs/RUN_LOG.md`, another student's namespace, `book/`, or any tracked
example output.

## What the gates leave for a human to judge

The script clears P1 to P4 mechanically and reports what it did. It cannot judge:

- whether the echoed authorisation dates match an actual I-20 and EAD (here they
  are an invented persona's, so P1 has not been cleared by a human);
- whether each `expected_days_to_start` is honest for its employer;
- whether a company with Proven-band approvals sponsors the target occupation,
  since the data is company-wide;
- whether a skip rate of 0.3 before scoring and 0% in the scorer reflects a good
  target list or the Proven-tier mapping that makes every Proven role an Apply;
- whether a networking-bucket company is worth a conversation;
- whether any override is justified, and what private fact justifies it.

Until a named person signs those judgements, `attestation` stays null and the
recipe stays at RUNNABLE-SAMPLE.

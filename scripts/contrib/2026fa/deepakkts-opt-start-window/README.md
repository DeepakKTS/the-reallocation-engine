# opt-start-window

Turns an OPT intake plus a target list into a scorer-ready roles file, with every
timeline factor carrying the dates that produced it.

Chapter 10 specifies a timeline factor computed from eight intake fields and says
the output must always be "the factor *and* the dates that produced it".
`scripts/score/role-scorer.mjs` consumes a timeline number labelled `your-input`,
but nothing in the repository produces that number from an intake, and nothing
records the arithmetic behind it. This fills that step.

Recipe: `recipes/cases/2026fa/deepakkts-opt-start-window.md`

## Run it

One command from the repository root:

```
node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs \
  --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json \
  --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json \
  --out-dir course/2026fa/submissions/deepakkts/runs
```

`targets.real.json` lists ten real postings checked with `npm run ats:liveness`
on 2026-10-03. `targets.sample.json` is the invented seven-role list the offline
tests use.

Then hand the roles file to the existing scorer:

```
npm run score -- course/2026fa/submissions/deepakkts/runs/<run-id>-roles.json \
  --out-dir course/2026fa/submissions/deepakkts/runs
```

Gate check against the repository's real scorer, through its command line:

```
node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --gate-check
```

Tests, offline, no repo data and no network. Two of them run the repository's
scorer as a subprocess over a fixture:

```
node --test scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs
```

## Flags

| Flag | Default | Why you would use it |
| --- | --- | --- |
| `--intake` | the sample persona | Point at a file **outside the repository** for your real dates |
| `--targets` | the sample targets | Your own candidate roles |
| `--out-dir` | required | Always your own namespace, never over a tracked file |
| `--repo-root` | cwd | Running from somewhere other than the repo root |
| `--sponsors-csv` | discovered under `data/80-days-to-stay/` | Name the CSV explicitly |
| `--formd-dir` | `data/sec/form-d/processed/sample/` | A different Form D extract |
| `--soc-csv` | `data/bls/compact/soc_occupation_compact.csv` | A different occupation table |
| `--example` | `data/examples/ch11-roles.json` | The file the roles schema is learned from |
| `--as-of` | `as_of` in the intake | Re-run an old decision against today's date |
| `--funding-window-days` | 540 | How recent a Form D filing has to be to count |
| `--funding-missing` | `omit` | `zero` forces a missing filing to score 0, which is a lie; the run warns |
| `--gate-check` | off | Assert the real scorer treats timeline as a gate |
| `--scorer` | `scripts/score/role-scorer.mjs` | Point the gate check at another scorer CLI, such as the BROKEN mutant |
| `--scorer-config` | a probe run of the scorer | A `role-scores.json` whose `config` block supplies the fit-rescue weights |

Exit codes: `0` ran, `2` a source, intake, or schema problem (nothing written),
`3` nothing scorable.

## Input files

`intake.sample.json` holds the eight Chapter 10 fields. Every one is `your-input`.
`stem_eligible` and `unemployment_ceiling_days` must be supplied explicitly: this
tool does not rule on STEM eligibility, does not infer the 90 or 150 day ceiling,
and is not immigration advice. Confirm both with a DSO or an immigration attorney.

`targets.sample.json` holds one entry per candidate role:

| Field | Label | Note |
| --- | --- | --- |
| `company`, `title`, `soc_code`, `url` | your-input | `soc_code` drives the occupation lookup |
| `expected_days_to_start` | your-input | Your estimate of the full process. Never guessed for you |
| `fit` | model-judgment | Your own CV-versus-posting estimate. No resume is read |
| `liveness` | record | From `npm run ats:liveness`: `active` entered as 1.0, `expired` as 0.0, `uncertain` as `null`. `null` holds the role at the gate |
| `liveness_checked_at` | record | When you ran that check |

## Outputs

Three files in `--out-dir`:

- `<run-id>.json`, the agent half of the contract. Every source path with a
  sha256 prefix, the intake echoed, every term with its label, every gate decision.
- `<run-id>.md`, the human half. Dates first, then the evidence table, the
  fit-rescue warnings, the four next-action buckets, the skip rate, and an
  explicit list of what the run did not verify.
- `<run-id>-roles.json`, input for `npm run score`, in the shape learned from
  `data/examples/ch11-roles.json`.

## Design decisions worth knowing before you read the code

**The roles schema is discovered, not hardcoded, and per term.** `lib/schema.mjs`
reads `data/examples/ch11-roles.json` and learns, for each term, which field holds
its number. In that file votes use `p` and gates use `factor`. The first version
learned one field for every term, wrote gates as `{p: ...}`, and the scorer
ignored them and treated both gates as 1. If a required term cannot be mapped, or
its number field cannot be determined, the run stops, prints the keys it saw, and
writes nothing. The sponsorship tier is emitted in the example file's own
vocabulary (`Proven`, `Likely`, `None`); a tier with no match there is omitted
and the reason recorded.

**Columns are discovered, not assumed.** `lib/sources.mjs` scans
`data/80-days-to-stay/` for a CSV that has a company column and a sponsorship
evidence column. If none qualifies it prints every header it saw and stops. The
shipped CSV has `Total Approvals` and no tier or SOC column, so sponsorship is
company-wide and the tier is derived from the count by `COUNT_THRESHOLDS`.

**Form D is read in its real shape.** Records are under `companies`, the name is
`company.name`, the date is `filing.date_filed` in the form `31-MAR-2026`, parsed
exactly. A non-empty set of files that yields zero issuers stops the run.

**Occupations are looked up by `bls_soc_code`.** Where a code has several O*NET
rows the `.00` base row is kept and the skipped detailed rows are listed by title.

**Missing is not zero.** A company absent from the sponsorship data, or present
with an empty `Total Approvals` cell, produces `status: missing`, not
`P(sponsorship) = 0`. Only an explicit `0` in the cell is a recorded zero. Absence of a record and a record of
non-sponsorship are different claims and only the second justifies a Skip, so an
unmatched company is routed to the networking list instead.

**The tier is a record; the probability is not.** `TIER_PROBABILITY` in
`lib/sources.mjs` maps Proven/Likely/Occasional/None to 0.9/0.6/0.3/0.0. That
mapping is an operator assumption, labelled as such in every output.

**The scorer is never re-implemented.** `scripts/score/role-scorer.mjs` exports
nothing and runs `main()` on import, so `--gate-check` runs it the way
`scripts/score/gate-harness.mjs` does: a probe roles file in a temp directory, the
CLI with `--out-dir`, then `role-scores.json` is read. The composite must be at or
below the scorer's own `gate_zero`. The same assertion fails
`fixtures/BROKEN-additive-gate-scorer.mjs`, where the timeline term is added
instead of multiplied. The fit-rescue check uses the weights from the `config`
block the scorer writes; with no config block the check is skipped, never
defaulted.

**Fixture values are synthetic, in the real files' shapes.** Test companies are
invented, contacts are `@example.com`, and the numbers in `soc.fixture.csv` are
placeholders, not BLS figures. `role-scores.fixture.json` carries the config block
copied from the real scorer's output. `targets.real.json` names real companies and
public postings and holds no personal data. Nothing personal belongs in a tracked
fixture.

## Layout

```
run.mjs                       CLI and pipeline
lib/timeline.mjs              intake validation, timeline factor, date trace
lib/sources.mjs               source discovery, column mapping, lookups
lib/schema.mjs                roles-file schema discovery
lib/gate.mjs                  gate assertion, scorer-agnostic
lib/csv.mjs                   CSV reader, company-name normaliser
lib/report.mjs                Markdown renderer
test/opt-start-window.test.mjs  36 offline tests
fixtures/                     persona intake, sample and real targets, CSV, Form D and
                              scorer-output fixtures, two BROKEN mutants
```

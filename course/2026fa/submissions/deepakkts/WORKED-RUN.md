# Worked run: opt-start-window

## Executive summary

This is one complete run of the recipe on the repository's real data: ten real job
postings at ten real companies, checked for liveness the same day, scored for a
December graduate whose work authorisation starts in mid-January. Read it to see
exactly what the tool verified from a record, what it took from a person or a
model, and where it went wrong on first contact with the real files.

It found that seven of the ten roles are scorable (five Apply, two Consider) and
three belong on a networking list because the data holds no sponsorship evidence
for them. It also found that, applying in October, no role's calendar is at risk,
and that the same list run as if applying on 1 February loses nine of ten roles to
the clock. Before the fixes recorded here, the tool would have scored a role with
a closed timeline gate as an Apply without any warning.

## Run record

- Recipe: `recipes/cases/2026fa/deepakkts-opt-start-window.md` v0.1.0, status RUNNABLE-SAMPLE
- Executed: 2026-10-03, by Claude Code (Opus 5.5) in the operator's terminal, on a
  clone of the fork `DeepakKTS/the-reallocation-engine`, branch
  `contrib/2026fa-deepakkts-opt-start-window`, Node v24.21.0, Python 3.13.2
- Data: the shipped repository files only. Form D is the shipped sample (first 50
  issuers per quarter, four quarters); full quarters are gitignored and were not
  fetched.

## Inputs

**Intake**, `fixtures/intake.sample.json`, an invented persona (contact
`persona-a@example.com`). Every field is your-input. These are not anyone's real
dates; `auth_end_date` is a persona assumption, not a determination of anyone's
authorisation period.

| Field | Value |
| --- | --- |
| as_of | 2026-10-03 |
| auth_type | OPT |
| auth_start_date | 2027-01-15 |
| auth_end_date | 2028-01-18 |
| unemployment_days_used | 0 |
| unemployment_ceiling_days | 90 |
| buffer_target_days | 60 |
| stem_eligible | true (supplied, not determined) |

**Targets**, `fixtures/targets.real.json`: ten real public postings, found on the
companies' public Greenhouse job boards on 2026-10-03.

| Company | Posting | SOC (your-input) | Why it is in the list |
| --- | --- | --- | --- |
| Reddit Inc | Machine Learning Engineer | 15-1252 | 408 approvals in the CSV |
| Discord Inc | Data Scientist - Client Platform | 15-2051 | 122 approvals |
| Moloco Inc | Data Scientist II, Product - Moloco Commerce Media | 15-2051 | 200 approvals |
| Airbnb Inc | Data Scientist - Algorithms, Community Support | 15-2051 | 1000 approvals |
| Attentive Mobile Inc | Senior Machine Learning Engineer | 15-1252 | 96 approvals |
| Cellanome Inc | Machine Learning Engineer | 15-1252 | 4 approvals, a Likely-band count |
| FourKites Inc | Senior AI Engineer | 15-1252 | 8 approvals, a Likely-band count |
| Anthropic | Data Engineer | 15-1252 | absent from the CSV, on purpose |
| Scale AI | Machine Learning Research Scientist, Evaluations | 15-2051 | absent from the CSV, on purpose |
| Vercel Inc | Software Engineer, AI SDK | 15-1252 | present with an empty approvals cell, on purpose |

Which values are estimates:

- `expected_days_to_start` (75 to 150 days) is an estimate by the AI session, not
  a record: an application in the week of `as_of`, a 4 to 8 week loop, 2 to 4
  weeks for offer and background check, longer for large employers. The basis is
  written beside each value in the targets file.
- `fit` (0.35 to 0.7) is a model judgment by the AI session against the invented
  persona, from the posting title and seniority only. No posting body and no
  resume were read.
- `liveness` is 1.0 for all ten, from the `ats:liveness` run below. The mapping
  `active` = 1.0 is the operator's.
- The Cellanome row is Palo Alto in the CSV while its board lists Foster City and
  San Diego; the match rests on the shared `cellanome.com` domain, an operator
  judgment.

## Commands and their output

Liveness, run once for all ten postings:

```
$ npm run ats:liveness -- <the ten URLs in targets.real.json>
Checking 10 URL(s)...

✅ active     https://job-boards.greenhouse.io/reddit/jobs/8244082
✅ active     https://job-boards.greenhouse.io/discord/jobs/8840756002
✅ active     https://job-boards.greenhouse.io/moloco/jobs/7985823003
✅ active     https://careers.airbnb.com/positions/8031901?gh_jid=8031901
✅ active     https://job-boards.greenhouse.io/attentive/jobs/4120595009
✅ active     https://job-boards.greenhouse.io/cellanome/jobs/4683977006
✅ active     https://job-boards.greenhouse.io/fourkites/jobs/8212401
✅ active     https://job-boards.greenhouse.io/anthropic/jobs/4956672008
✅ active     https://job-boards.greenhouse.io/scaleai/jobs/4728014005
✅ active     https://job-boards.greenhouse.io/vercel/jobs/5474915004

Results: 10 active  0 expired  0 uncertain
```

(Run at 2026-10-03T18:19Z. The npm banner line, which repeats the ten URLs, is
omitted above.)

The prototype:

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs \
    --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json \
    --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json \
    --out-dir course/2026fa/submissions/deepakkts/runs
opt-start-window 2026-10-03-opt-start-window
  roles in         10
  scored           7
  dropped (clock)  0
  needs liveness   0
  network only     3
  pre-scorer skip  0.3
  json   course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window.json
  report course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window.md
  roles  course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window-roles.json

Next: npm run score -- course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window-roles.json --out-dir course/2026fa/submissions/deepakkts/runs
```

The existing scorer:

```
$ npm run score -- course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window-roles.json --out-dir course/2026fa/submissions/deepakkts/runs

> the-reallocation-engine@1.0.0 score
> node scripts/score/role-scorer.mjs course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window-roles.json --out-dir course/2026fa/submissions/deepakkts/runs

✓ scored 7 roles → Apply 5 · Consider 2 · Skip 0 (skip 0%)
  course/2026fa/submissions/deepakkts/runs/role-scores.json  +  course/2026fa/submissions/deepakkts/runs/role-scores.md
```

From the scorer's report, `runs/role-scores.md`:

```
| Discord Inc — Data Scientist - Client Platform | 0.525 | **Apply** | composite 0.525 ≥ 0.3, gates healthy | sponsorship 0.9·0.35 [your-input]; fit 0.7·0.3 [model-judgment] × liveness 1[record]×timeline 1[your-input] |
| Moloco Inc — Data Scientist II, Product - Moloco Commerce Media | 0.510 | **Apply** | composite 0.510 ≥ 0.3, gates healthy | sponsorship 0.9·0.35 [your-input]; fit 0.65·0.3 [model-judgment] × liveness 1[record]×timeline 1[your-input] |
| Reddit Inc — Machine Learning Engineer | 0.495 | **Apply** | composite 0.495 ≥ 0.3, gates healthy | sponsorship 0.9·0.35 [your-input]; fit 0.6·0.3 [model-judgment] × liveness 1[record]×timeline 1[your-input] |
| Airbnb Inc — Data Scientist - Algorithms, Community Support | 0.495 | **Apply** | composite 0.495 ≥ 0.3, gates healthy | sponsorship 0.9·0.35 [your-input]; fit 0.6·0.3 [model-judgment] × liveness 1[record]×timeline 1[your-input] |
| Attentive Mobile Inc — Senior Machine Learning Engineer | 0.420 | **Apply** | composite 0.420 ≥ 0.3, gates healthy | sponsorship 0.9·0.35 [your-input]; fit 0.35·0.3 [model-judgment] × liveness 1[record]×timeline 1[your-input] |
| Cellanome Inc — Machine Learning Engineer | 0.375 | **Consider** | above threshold (0.375) but one soft spot: sponsorship tier "Likely" | sponsorship 0.6·0.35 [your-input]; fit 0.55·0.3 [model-judgment] × liveness 1[record]×timeline 1[your-input] |
| FourKites Inc — Senior AI Engineer | 0.330 | **Consider** | above threshold (0.330) but one soft spot: sponsorship tier "Likely" | sponsorship 0.6·0.35 [your-input]; fit 0.4·0.3 [model-judgment] × liveness 1[record]×timeline 1[your-input] |
```

From the prototype's report, `runs/2026-10-03-opt-start-window.md`, the routing of
the three roles that never reached the scorer:

```
- **Anthropic · Data Engineer** · no sponsorship record found (no-sponsor-record), which is not the same as a record of non-sponsorship; informational interview before any application
- **Scale AI · Machine Learning Research Scientist, Evaluations** · no sponsorship record found (no-sponsor-record), which is not the same as a record of non-sponsorship; informational interview before any application
- **Vercel Inc · Software Engineer, AI SDK** · no sponsorship record found (empty-approvals-cell), which is not the same as a record of non-sponsorship; informational interview before any application
```

and its source notes:

```
- 80 Days sponsorship CSV: columns used: {"company":"company_name","tier":null,"count":"Total Approvals","soc":null}; approvals cell empty in 28812 of 30369 rows (missing, never read as 0); no SOC column, so sponsorship is company-wide and never narrowed to the target SOC code
- SEC Form D samples: 4 JSON file(s) scanned, 200 record(s) read, 196 issuer(s) indexed, 0 date(s) rejected as unparseable, 0 file(s) unrecognised; full quarters are gitignored, so a miss here means "not in the sample", not "no funding"
- Scorer input contract (schema learned from this file): keys={"company":"company","title":"title","soc":null,"url":null,"sponsorship":"sponsorship","fit":"fit","liveness":"liveness","timeline":"timeline","funding":null,"role_quality":null}; value field per term={"sponsorship":"p","fit":"p","liveness":"factor","timeline":"factor"}; tier vocabulary=["Proven","None","Likely"]
- Scorer weights for the fit-rescue check: sponsorship 0.35, fit 0.3
```

Every timeline factor in this run is 1. The latest projected start is Anthropic at
2027-03-02, 46 days onto the clock, inside the 60-day buffer. To see the clock do
any work on the same real list, the run was repeated with `--as-of 2027-02-01`
(output in a scratch directory, not committed):

```
$ node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json --as-of 2027-02-01 --out-dir <scratch>/c5/asof
opt-start-window 2027-02-01-opt-start-window
  roles in         10
  scored           1
  dropped (clock)  9
  needs liveness   0
  network only     0
  pre-scorer skip  0.9
```

```
| Moloco Inc · Data Scientist II, Product - Moloco Commerce Media | 90 | 2027-05-02 | 2028-01-18 | 90 of 90 | **0** | eats-into-buffer |
| Cellanome Inc · Machine Learning Engineer | 75 | 2027-04-17 | 2028-01-18 | 75 of 90 | **0.5** | eats-into-buffer |
| Anthropic · Data Engineer | 150 | 2027-07-01 | 2028-01-18 | 150 of 90 | **0** | exceeds-unemployment-ceiling |
```

(three of the ten rows shown; all ten are in `TEST-REPORT.md`.)

## Verified versus inferred, line by line

| Value in this run | Label | Where it came from |
| --- | --- | --- |
| Reddit 408, Discord 122, Moloco 200, Airbnb 1000, Attentive 96, Cellanome 4, FourKites 8 approvals | record | `mapped_student_employment_targets_v3.csv`, column `Total Approvals`, sha256 prefix `eccdee2addf472b1` |
| Anthropic and Scale AI absent from the CSV | record (of absence) | no row after suffix normalisation; reported as `missing`, never as 0 |
| Vercel approvals cell empty | record (of absence) | row `VERCEL INC` exists, cell is `""`; reported as `missing: empty-approvals-cell` |
| Tier Proven (10 or more) and Likely (3 to 9) | your-input | `COUNT_THRESHOLDS` in `lib/sources.mjs`; the CSV has no tier column |
| P(sponsorship) 0.9 and 0.6 | your-input | `TIER_PROBABILITY` in `lib/sources.mjs`; emitted with `source: your-input` |
| Sponsorship being about the target occupation | not verified | the CSV has no SOC column; every count is company-wide |
| Fit 0.35 to 0.7 | model-judgment | the AI session, from title and seniority only |
| Liveness 1.0 | record | `npm run ats:liveness`, all `active` at 2026-10-03T18:19Z; the number 1.0 is the operator's mapping of `active` |
| expected_days_to_start | your-input | AI estimate, basis in the targets file |
| Timeline factor 1 for all ten | your-input | arithmetic over the intake dates; dates published per role in the report |
| Intake dates | your-input | invented persona |
| SOC code per posting | your-input | operator assignment of each title |
| SOC rows present; for 15-2051 two detailed rows skipped (Business Intelligence Analysts, Clinical Data Managers) | record | `soc_occupation_compact.csv`, `bls_soc_code`, sha256 prefix `bac5acf77ca2d252` |
| Funding missing for all ten | record (of absence in the sample) | `no-form-d-match` against 196 issuers in the shipped sample; weighted nowhere |
| Weights 0.35 and 0.3, threshold 0.30, gate_zero 0.05 | record | the `config` block of `role-scores.json` written by the scorer |
| Composite and recommendation | computed by the scorer | `scripts/score/role-scorer.mjs`; as reliable as the weakest input above, which is the your-input sponsorship probability and the model-judgment fit |

## Verification

**Hand check of one role, from the CSV row to the composite (Cellanome).**

```
1. CSV row:
   record 5194 | company_name = CELLANOME INC | Total Approvals = '4.0'
2. prototype JSON evidence:
   {"approvals":4,"rows_matched":1,"source_columns":{"company":"company_name","tier":null,"count":"Total Approvals","soc":null},"value":0.6,"basis":"approvals:4","tier_emitted":"Likely","fit":0.55,"liveness":1,"timeline":1}
   mapping in force: {"proven":0.9,"likely":0.6,"occasional":0.3,"none":0}
3. scorer audit trace:
   {"composite":0.375,"recommendation":"Consider","reason":"above threshold (0.375) but one soft spot: sponsorship tier \"Likely\"","trace":{"votes":[{"factor":"sponsorship","value":0.6,"weight":0.35,"contribution":0.21,"source":"your-input"},{"factor":"fit","value":0.55,"weight":0.3,"contribution":0.165,"source":"model-judgment"}],"vote_sum":0.375,"gates":[{"factor":"liveness","multiplier":1,"source":"record"},{"factor":"timeline","multiplier":1,"source":"your-input"}],"gate_product":1,"arithmetic":"(0.6·0.35 + 0.55·0.3) × 1 × 1 = 0.375"}}
4. by hand: 0.6*0.35 + 0.55*0.3 = 0.375; times 1 times 1
```

The CSV says 4.0. The prototype read 4 approvals from one matched row. 4 is in the
3 to 9 band, so the tier is Likely and the probability 0.6. By hand,
0.6 × 0.35 = 0.21 and 0.55 × 0.3 = 0.165, which sum to 0.375; both gates are 1, so
the composite is 0.375. The scorer printed 0.375 and demoted the role to Consider
because `likely` is in its `soft_sponsorship_tiers`, which only happens because
the tier is now emitted. It reconciles.

**The timeline arithmetic, by hand.** The persona's clock starts 2027-01-15.
Anthropic: 2026-10-03 plus 150 days is 2027-03-02; 2027-01-15 to 2027-03-02 is
16 + 28 + 2 = 46 days, under the 60-day buffer, so the factor is 1. The report
prints 46 of 90 and factor 1.

**The test suite.** 36 of 36 offline tests pass; output in `TEST-REPORT.md`.

**Deliberate break attempts.** In the attestation below, and each failure case
with its real output in `TEST-REPORT.md`.

## Reflection

**What worked.** Routing by evidence held up on real data. The two absent
companies and the empty-cell company went to networking with the reason printed,
and the two Likely-band companies were demoted to Consider by the scorer's own
rule. The schema-learning design survived the real contract once it learned the
value field per term rather than once.

**What broke or was missed.** The first contact with the real repository found
five defects, the worst of them silent: the roles file wrote gates as `{"p": ...}`,
the scorer read gates from `factor`, and a probe with timeline 0 scored Apply at
0.6175. Every one of those was fixed inside this folder and is listed in the
attestation. The real run then showed three things the fixtures never could:

- With the tier bands and probabilities in this prototype, every Proven role with
  open gates is an Apply whatever its fit, because 0.9 × 0.35 = 0.315 already
  clears the 0.30 threshold. Attentive is an Apply at fit 0.35. The scored skip
  rate is 0%, far under the "skip at least half" norm, and the cause is this
  mapping, not the target list alone.
- In October the calendar never bites for this persona. The recipe's value shows
  only when the same list is run later, which the October run alone hides.
- At exactly the ceiling (Moloco at 90 of 90 days in the February scenario) the
  factor is 0 and the role is dropped, but its reason reads `eats-into-buffer`.
  The arithmetic matches the documented formula; the label is misleading. It is
  recorded in the recipe as `[TODO: DEV]` item 5 and left unchanged, so every
  output pasted here still reproduces from the committed code.

**Next improvement, done in this run.** The earlier draft named one next step:
read the weights from the scorer instead of restating them. That is now true. The
fit-rescue check reads the `config` block the scorer writes, and skips itself
with a printed reason when there is none.

**One concrete next improvement.** For each role, print the last `as_of` date on
which its timeline factor is still 1, computed from `expected_days_to_start` and
the intake, so a December graduate sees "apply by this date" instead of
discovering in February that the window closed. The February scenario above is the
evidence that this date is the decision the person actually needs.

## Attestation

- Recipe: opt-start-window v0.1.0
- By: Deepak Kumaran T S · 2026-10-03

Every command below was run by Claude Code in the operator's session on
2026-10-03; `SOURCES.md` and `FRICTIONAL.md` record the split between the AI's work
and the operator's decisions. Recipe frontmatter `attestation` stays null.

### Tested

| Ran | Saw | Expected |
|---|---|---|
| Break attempt, the gate probe: a strong-vote role (sponsorship 0.95, fit 0.95, liveness 1) with timeline 0, written by the prototype's own emitter and scored by the real scorer CLI | Before the fix: emitted `"timeline":{"p":0}`, the scorer read the timeline multiplier as 1, composite 0.6175, Apply. After the fix: emitted `"timeline":{"factor":0}`, multiplier 0, composite 0, Skip, at or below `gate_zero` 0.05 | A zeroed gate holds the composite at or below the scorer's closed-gate threshold |
| Break attempt: `run.mjs --gate-check --scorer fixtures/BROKEN-additive-gate-scorer.mjs` | `GateViolation ... produced composite 0.7675, above the closed-gate threshold 0.05`, exit 1 | The assertion must fail a scorer that adds the gate |
| Break attempt: the old single-field emitter, kept as `fixtures/BROKEN-single-value-field-schema.mjs`, against the emitted-key-name test | it writes `{"p":0,"source":"your-input"}` and the test's assertion fails | The test must fail the behaviour that hid the bug |
| Break attempt: `lib/sources.mjs` mutated to read an empty approvals cell, then to keep the last occupation row | one test failed each time (34 pass, 1 fail, out of the 35 tests the suite had then), and all pass after restoring | The tests must catch each regression |
| `run.mjs --gate-check` against `scripts/score/role-scorer.mjs` | composite 0 <= 0.05, timeline multiplier 0, Skip | composite at or below `gate_zero` |
| `node --test .../opt-start-window.test.mjs` on Node v24.21.0, and once on Node v20.20.2 (the CI version) | 36 pass, 0 fail on both | all pass |
| The real run on ten postings | 7 scored, 3 network, 0 dropped, 0 held; scorer Apply 5, Consider 2, Skip 0 | four buckets separated, no value invented |
| Hand recomputation of Cellanome from CSV row to composite | 4.0 approvals, Likely, 0.6, composite 0.375, Consider | 0.375, matching the scorer |
| Break attempt: intake with `auth_end_date: 2028-02-30` | `IntakeError`, exit 2, out-dir not created | refuse a date that does not exist |
| Break attempt: `--sponsors-csv data/bls/compact/soc_occupation_compact.csv` | `SourceError`, every header printed, exit 2 | refuse rather than guess a column |
| Break attempt: `--formd-dir data/examples` | `SourceError: Form D: 6 file(s) scanned and zero issuers indexed`, exit 2 | stop loudly instead of finding nothing |
| Discord's SOC set to 15-2098; Moloco's liveness set to null | role quality `missing: no-occupation-row`; Moloco held with the exact `ats:liveness` command and absent from the roles file | report missing, never substitute |

### Did not test

- The scorer's internals. It was exercised only through its command line with the
  roles this prototype emits and with probes. Its `--profile` weighting, its
  override path, the Consider band below the threshold, and its soft-timeline
  demotion (timeline under 0.6) were not exercised by any role in this run.
- A Form D hit on real data. None of the ten targets is among the 196 issuers in
  the shipped sample, so the funding-recency branch ran only on fixtures; full
  quarters were not fetched.
- An `expired` or `uncertain` liveness result on a real posting. All ten were
  `active`. A liveness of 0.0 has not been run through the prototype anywhere, on
  fixtures or real data; a null liveness ran only on fixtures and on an edited
  copy of the real targets.
- The `ats:liveness` detection logic itself. Its verdict was taken as given.
- Whether any company actually sponsors for the target occupation. The CSV is
  company-wide.
- The identity of fuzzy-looking joins: Cellanome by domain, and the
  `holdings` / `technologies` suffix stripping seen with Ramp and Plaid.
- The SOC code assigned to each posting title, and the fit and day estimates.
  No posting body was read.
- The intake against real documents. The dates are an invented persona's, so the
  P1 human gate was never cleared against an I-20 or EAD.
- Node 20 for anything except the test suite. The real run, the scorer and the
  gate check ran on Node v24.21.0; only the 36 tests were also run on v20.20.2.
- The repository's CI on this branch, at the time this file was written.

### Broke during testing, fixed

- The import-based gate check could not run: `role-scorer.mjs` exports nothing
  and calls `main()` on import, which printed its usage line and exited 2. Fixed
  in `run.mjs`: `gateCheck` runs the CLI in a temp directory with `--out-dir`.
- Gates were emitted under `p`, the scorer ignored them and treated them as 1, and
  a timeline-0 probe scored Apply at 0.6175. Fixed in `lib/schema.mjs`: the value
  field is learned per term.
- The tier was never emitted, so the scorer's Likely-to-Consider rule could not
  fire. Fixed in `lib/schema.mjs` and `run.mjs`; Cellanome and FourKites are now
  Consider.
- The Form D loader indexed 0 issuers from four real files without stopping.
  Fixed in `lib/sources.mjs`: real shape, exact `DD-MON-YYYY` parsing, and a loud
  stop on zero issuers.
- The occupation lookup missed `15-2051`, and the alternative column would have
  kept the last of three rows. Fixed in `lib/sources.mjs`: `bls_soc_code`, `.00`
  base row, skipped rows listed.
- An empty approvals cell was read as 0. Fixed in `lib/sources.mjs`.
- The fit-rescue check used fixed thresholds. Fixed in `run.mjs`: weights from the
  scorer's `config` block, skipped when absent.
- The emitted sponsorship term was labelled `record` although the probability is
  an operator mapping. Fixed in `run.mjs`: labelled `your-input`.
- The JSON log carried absolute paths, including the operator's home directory.
  Fixed in `run.mjs`; a test now fails if it comes back.
- Two test expectations changed because the persona's `auth_start_date` moved
  from 2027-01-19 to 2027-01-15: test 2 now expects 76 days and 0.467 instead of
  72 and 0.6, worked out by hand from the calendar.

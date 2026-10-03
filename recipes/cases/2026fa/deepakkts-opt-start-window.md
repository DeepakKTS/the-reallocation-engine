---
status: RUNNABLE-SAMPLE
todos_open: 5
last_gate: null
attestation: null
recipe_version: 0.1.0
---

# opt-start-window: scoring a December graduate's roles against the clock that has not started yet

## Executive summary

**What it does.** Takes an OPT intake and a list of candidate roles, computes a
Chapter 10 timeline factor for each one, attaches the dates that produced that
factor, joins sponsorship evidence from the 80 Days data, reports funding and
occupation evidence alongside without weighting either, and writes a roles file
for the existing Chapter 11 scorer plus a human report. Roles the calendar has already ruled out never reach the
scorer; roles with no sponsorship record are routed to a networking list instead
of being scored as non-sponsors.

**Who it is for.** An international master's student finishing in December 2026
and targeting AI/ML and data roles under SOC 15-2051 and 15-1252 with a January
2027 start, whose post-completion OPT begins in the same month the job would start.

**What it decides.** For each role, one of four next actions: score it, check its
liveness first, network into the company instead of applying, or drop it today.
It does not decide whether to apply. It decides where the next hour goes.

**What it will not do.** It will not rule on STEM eligibility, infer an
unemployment ceiling, read a resume, fetch a posting, or treat a company it cannot
find as a company that does not sponsor.

## The situation this is built for

A December graduate is in a position the standard OPT advice does not describe.
The 90-day unemployment clock has not started. It starts on the OPT start date,
which for a December completion lands in January or February. Interviewing that
happens before that date costs nothing against the ceiling. Interviewing that
runs past it costs a day per day.

That produces a scheduling fact that is invisible in every job board: a long
hiring process started in October is cheap, and the same process started in
February is expensive. Two postings with identical sponsorship records, identical
wages and identical fit are not equally worth the next hour, and nothing the
student can see from the outside says which is which. Chapter 10 defines the
factor that captures this. The repository consumes that factor but never produces
it, so today it is a number a student types in by hand, with no trace back to a
date and no way for anybody to check it.

## Purpose and source inventory

| Source | Path | Role in the decision | Label |
| --- | --- | --- | --- |
| Sponsorship history | `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv`, column `Total Approvals` (found by header inspection) | vote | the count is a record; the count-to-tier bands and tier-to-probability mapping are your-input |
| Funding recency and occupation data | `data/sec/form-d/processed/sample/` and `data/bls/compact/soc_occupation_compact.csv` | reported to the human, weighted nowhere | record |
| Posting liveness | output of `npm run ats:liveness -- <job-url>`, entered in the targets file as 1.0 for `active`, 0.0 for `expired`, null for `uncertain` | gate | record |
| Visa timeline | computed here from the intake | gate | your-input |
| Fit | supplied per role in the targets file | vote | model-judgment |
| Scorer input contract | `data/examples/ch11-roles.json` | schema learned from it, per term | record |
| Scorer weights and gate floor | the `config` block of the `role-scores.json` the scorer writes | fit-rescue check and gate check | record |
| Composite | `scripts/score/role-scorer.mjs`, via `npm run score` | decision | record |

Why funding and occupation data carry no weight here:

- **Funding.** `scripts/score/role-scorer.mjs` has no funding term at all, so a
  Form D filing cannot move any Apply, Consider or Skip decision; the report shows
  it so a human can use it, and on the shipped samples it matched none of the ten
  real targets.
- **Occupation data.** The scorer sets `role_quality: 0.0` (marked `[VERIFY]` in
  its CONFIG and recorded in `DOMAIN.md` as an open authorial decision), so the
  wage and ability columns are reported and change nothing.

Commands, in order:

```
npm run doctor
npm run ats:liveness -- <job-url>                 # once per posting, result pasted into the targets file
node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs \
  --intake <intake outside the repo> \
  --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json \
  --out-dir course/2026fa/submissions/deepakkts/runs
npm run score -- course/2026fa/submissions/deepakkts/runs/<run-id>-roles.json \
  --out-dir course/2026fa/submissions/deepakkts/runs
node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --gate-check
node --test scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs
```

`--out-dir` is mandatory on both the prototype and the scorer. Without it the
scorer overwrites the tracked example output and that change lands in the PR.

## Proposed additions

1. A per-employer time-to-offer source. `expected_days_to_start` is the single
   input with the most leverage over the output and the weakest provenance: today
   it is the operator's guess. [TODO: DATA SOURCE] a defensible distribution of
   process length by employer size or ATS provider, so the field can be a record
   with a stated spread rather than a point estimate.
2. An npm target. The prototype runs through `node` directly. [TODO: DEV] a
   `score:start-window` script, which per `CONTRIBUTING.md` is earned at promotion
   by a maintainer, not claimed here.
3. A role-quality weight. DOMAIN.md gap 3 records that `role_quality: 0.0` is an
   open authorial decision, not an oversight. [TODO: DEV] revisit once that
   decision is made; this recipe deliberately proposes no weight and routes the
   occupation data to the human report instead.
4. Somewhere to log gate decisions. `logs/gate-decisions/` is named in older
   recipes and does not exist. [TODO: DATA SOURCE] until it does, every gate
   decision is written into the run-log entry under `logs/runs/` and into the JSON
   output, both of which exist today.
5. A correct reason label at the ceiling. When the projected unemployment total
   equals `unemployment_ceiling_days` exactly (and the projected start is on or
   before `auth_end_date`), `timelineFactor` in `lib/timeline.mjs` returns factor
   (ceiling - total) / (ceiling - buffer) = 0, which is correct and drops the role,
   but labels it `eats-into-buffer` instead of naming the closed gate. No role in
   the committed real run hit it (the largest total was 46 of 90); in the
   uncommitted 1 February scenario Moloco and FourKites did, at 90 of 90. The label
   misnames a decision it does not change. [TODO: DEV] return a closed-gate reason
   when the total equals the ceiling, with a test at exactly 90 of 90. Deferred so
   the pasted outputs in this run stay reproducible from the committed code.

## Phase gates

**P1, intake sanity. Automatable, human clears.** The run stops unless every one
of the eight intake fields is present and parses as a real date or a non-negative
number, `auth_end_date` is after both `auth_start_date` and `as_of`,
`buffer_target_days` is below `unemployment_ceiling_days`, and `stem_eligible` is
an explicit boolean. Nothing is defaulted. A human reads the echoed intake table
against their I-20 and EAD and clears the gate. Testable condition: `node --test
scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs`
passes the four intake tests, and the report's intake table matches the documents.

**P2, source resolution. Automatable.** The run stops unless the sponsorship CSV
resolves to a file with a company column and a sponsorship-evidence column, the
roles schema maps the four required terms and finds the number field of each one,
and the Form D files yield at least one issuer when any files are present. On
failure it prints the headers, keys or file shapes it actually saw and writes
nothing. Testable condition: the run exits 2 and `--out-dir` is not created.

**P3, liveness. Hard stop, human runs the check.** A role whose `liveness` is
null is never scored and never guessed. It is listed with the exact
`npm run ats:liveness` command to run. Testable condition: no role in
`<run-id>-roles.json` lacks a liveness term. Roles the calendar already dropped
are excluded before this gate, so nobody spends a liveness check on a dead role.

**P4, timeline. Hard stop, arithmetic visible.** A factor of 0 drops the role
from the roles file entirely. A factor between 0 and 1 is kept and penalised.
Every factor is published with `as_of`, `expected_days_to_start`,
`projected_start`, `auth_end_date`, the unemployment days this process would add,
and the projected total against the ceiling. Testable condition: the Markdown
report has a dates row for every role, and `--gate-check` runs the real scorer's
command line on a strong-vote probe written in the emitted shape
(`"timeline": {"factor": 0}`) and finds the composite at or below the scorer's own
`gate_zero`.

**P5, adequacy. Human only.** A person decides whether the skip rate is credible,
whether any fit-rescue flag changes a decision, and whether to override. An
override is legitimate only with a written note naming the private fact the data
could not hold. No script clears this gate, and `attestation` stays null until a
named human signs the run.

## What this recipe can and cannot verify

**Verified, from a record:**

- That a company does or does not appear in the shipped sponsorship data, with the
  file, the matched columns, and the row count behind the answer.
- The `Total Approvals` value recorded for that company, or that the cell is empty.
- Whether a Form D filing for that company appears in the shipped samples, and how
  old it is.
- Whether the occupation code has a row in the compact BLS table, and which
  detailed rows were set aside in favour of the `.00` base row.
- The sha256 prefix of every file read, so a run can be reproduced or disputed.

**Computed, and traceable, but not a record:**

- The timeline factor. It is arithmetic over dates the operator supplied. The
  arithmetic is published; the dates are only as good as the documents behind them.

**Not verified, and labelled so everywhere:**

- Liveness. Fetched by a different tool, pasted in by a human, trusted as given.
- Fit. A model judgment, supplied per role. No resume is read.
- The tier-to-probability mapping. Proven 0.9, Likely 0.6, Occasional 0.3, None
  0.0 is an operator assumption, not a published rate. The CSV has no tier column,
  so the tier itself is derived from the approvals count by operator bands (10 or
  more Proven, 3 to 9 Likely, 1 to 2 Occasional, 0 None). Occasional has no match
  in the scorer's vocabulary, so it is never emitted as a tier. A consequence worth
  knowing: 0.9 x 0.35 = 0.315 already clears the 0.30 threshold, so every Proven
  role with open gates scores Apply whatever its fit.
- Occupation-specific sponsorship. The sponsorship CSV has no SOC column, so the
  evidence is company-wide and can never be narrowed to 15-2051 or 15-1252. A
  company that sponsors only engineers reads the same as one that sponsors data
  scientists.
- Most of the dataset. `Total Approvals` is empty in 28,812 of 30,369 rows
  (94.9%) and holds an explicit zero in 5. An empty cell is reported as missing
  evidence and routes the role to networking; it is never read as 0.
- The low end of the timeline factor. The scorer treats any gate at or below its
  `gate_zero` of 0.05 as closed, so a factor in (0, 0.05] that this recipe keeps
  is a Skip in the scorer. At exactly the ceiling (for example 90 of 90 days) the
  factor is 0 and the role is dropped, although its reason reads
  `eats-into-buffer`.
- `expected_days_to_start`. An estimate per role, and the input with the most
  influence over the result.
- Company identity. Matching is exact after legal-suffix normalisation, with no
  fuzzy matching. A subsidiary filed under another legal name reads as "no record",
  which routes it to networking rather than scoring it as a non-sponsor. The
  normaliser also strips `holdings` and `technologies`, so "Ramp" joins
  `RAMP HOLDINGS INC` and "Plaid" joins `PLAID TECHNOLOGIES INC`; those joins are
  plausible and unverified.
- Form D coverage. Sample only; full quarters are gitignored. Absence of a filing
  is absence of evidence.
- Role quality. Reported, weighted 0.0 by the scorer, changes no decision here.
- Anything legal. STEM eligibility, the applicable ceiling, and what counts as
  unemployment are questions for a DSO or an immigration attorney.

## Output contract

One file cannot serve both customers, so there are two, plus the scorer's input.

`<out-dir>/<run-id>.json`, for the agent. Run id, recipe and version, generated
timestamp, every source with its resolved path and sha256 prefix, the mapped
column names, the learned schema, the intake echoed field by field, the
tier-to-probability mapping in force, and per role: bucket, next action, timeline
factor with its full date trace, every evidence term with value, label and basis,
and the role-quality lookup result. Plus counts, the skip rate, fit-rescue flags,
and the not-verified list.

`<out-dir>/<run-id>.md`, for the person. Sources, the intake echoed with the
instruction to check it against the documents, the per-role factor table with its
dates, the labelled evidence table, fit-rescue warnings, the four next-action
buckets, the skip rate, and what the run did not verify.

`<out-dir>/<run-id>-roles.json`, for `npm run score`, in the shape learned from
`data/examples/ch11-roles.json`. Only scorable roles appear. A term with no record
behind it is omitted rather than set to zero.

## Stop conditions

- Any intake field missing, unparseable, or internally inconsistent. Exit 2.
- No sponsorship CSV with usable columns. Exit 2, headers printed.
- The roles schema cannot be mapped onto the example file, or a term's number
  field cannot be determined. Exit 2, keys printed.
- Form D files present but zero issuers indexed. Exit 2, file shapes printed.
- A target without `expected_days_to_start`, or with a fit outside 0 to 1. Exit 2.
- No role survives to scoring. Exit 3. This is a result, not a failure.

Nothing partial is written on a stop. A run that cannot complete leaves no output
to be mistaken for one that did.

## Next action per result

| Result | What it means | Where the hour goes |
| --- | --- | --- |
| Scored, scorer says Apply | Live, sponsoring, calendar clears | The two application hours of the 3-3-2 day |
| Scored, scorer says Consider | Near threshold or one soft factor | Only if it beats the other Considers and the buffer allows |
| Scored, scorer says Skip | Below threshold on the evidence | Nothing. A skip is the product working |
| Needs liveness | Posting unverified | One `npm run ats:liveness` call, then re-run |
| Network | Company has no sponsorship record here | The three networking hours: an informational interview, not an application |
| Dropped | Timeline factor 0 | Dropped today. The freed hours go to networking and to the credibility project |

## Run-log template

```markdown
# Run: 2026fa-deepakkts-<n>

- Recipe: recipes/cases/2026fa/deepakkts-opt-start-window.md v0.1.0
- Status claimed: RUNNABLE-SAMPLE
- Date:
- Operator:
- as_of used:
- Intake source: (outside the repository; dates confirmed against I-20 and EAD: yes/no)

## Commands run

## Sources resolved (path + sha256 prefix, copied from the JSON output)

## Counts

- Roles in / scored / dropped / needs liveness / network:
- Pre-scorer skip rate:
- Scorer verdicts (Apply / Consider / Skip):

## Gates

- P1 intake: cleared by / held because
- P2 sources: cleared by / held because
- P3 liveness: roles held
- P4 timeline: roles dropped, with reasons
- P5 adequacy: human, name and date, or "not cleared"

## Overrides

- Role, direction, and the private fact the scorer could not hold. None is a valid entry.

## What this run did not verify

## Corrections made during the run
```

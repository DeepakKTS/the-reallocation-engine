# CHANGE-BRIEF: opt-start-window

Written before the prototype was built. Predictions are append-only: the
revisions section at the end records what actually happened, and nothing above it
has been edited to look correct in hindsight.

## 1. The situation and the layers it draws on

An international master's student completing an M.S. in December 2026 and
targeting AI/ML and data roles under SOC 15-2051 and 15-1252 with a January 2027
start, whose post-completion OPT begins in the same month the role would start,
so the hiring process and the unemployment clock overlap rather than run in
sequence.

Layers used:

- **80 Days to Stay**: sponsorship history, as a vote.
- **SEC Form D** (shipped samples), funding recency, as a vote.
- **Job-Ops / ATS**: posting liveness, as a gate, consumed from
  `npm run ats:liveness` rather than fetched.
- **The Cognitive Pivot**: the compact occupation table, reported to the human
  only, because the scorer weights role quality 0.0.
- **Visa timeline** (Chapter 10), the gate this recipe actually produces.

## 2. What is reused, and what is new

Reused, with exact paths:

- `scripts/score/role-scorer.mjs`, imported, never re-implemented, per
  `CONTRIBUTING.md`'s engine API section.
- `data/examples/ch11-roles.json`, the input contract; the roles schema is read
  from it at runtime.
- `data/80-days-to-stay/`, sponsorship CSV, discovered by header inspection.
- `data/sec/form-d/processed/sample/`, Form D samples.
- `data/bls/compact/soc_occupation_compact.csv`, occupation rows.
- `npm run ats:liveness`, `npm run score`, `npm run doctor`, `npm run verify`,
  `node scripts/pii-scan.mjs`, `node scripts/conformance.mjs`.

New, and why it belongs: Chapter 10 specifies a timeline factor computed from
eight intake fields and states that the output must always be the factor *and*
the dates that produced it. The scorer consumes a timeline number labelled
`your-input`; nothing in the repository produces it from an intake, and no run
records the arithmetic. That is a named gap in the chapter's own terms, not a
feature invented for an assignment. The gate harness at `scripts/score/
gate-harness.mjs` tests that the gate *behaves* like a gate; this produces the
value that goes through it.

## 3. Gates, and what a human must see

- **P1 intake**: the echoed intake table, checked line by line against the I-20
  and EAD. Nothing is defaulted; `stem_eligible` and the ceiling must be supplied.
- **P2 sources**: the resolved file paths, the matched column names, and the
  sha256 prefixes, so the human can confirm which file the numbers came from.
- **P3 liveness**: for any held role, the exact `npm run ats:liveness` command.
  No role is scored on a guessed liveness.
- **P4 timeline**: the factor with its full date trace, plus a `--gate-check`
  showing the real scorer zeroing a strong-vote role when timeline is 0.
- **P5 adequacy**: human only. The skip rate, the fit-rescue flags, and any
  override with its written reason.

## 4. Predicted failure cases, and the check for each

1. **A company is missing from the sponsorship CSV.** Expected often, since the
   dataset is a set of employers, not of all employers. Check: the role must be
   routed to the networking bucket with `sponsorship: null`, never scored as 0.
   Test: `pipeline: a company with no sponsorship record becomes a networking
   target, not a zero`.
2. **A SOC code has no row in the compact table.** Check: role quality reports
   `missing` with a reason, no wage column is filled, and no zero is substituted.
   Test: `pipeline: a missing occupation row empties role quality and never
   substitutes zero`.
3. **A posting URL has not been liveness-checked.** Check: the role is held at
   the gate and the exact command is printed. Test: `pipeline: an unchecked
   posting is held at the liveness gate with the command to run`.
4. **An OPT date is already past, or malformed.** Check: the run stops with a
   named field, writes nothing, and never coerces the date. Tests: `intake: a
   malformed date is rejected, not coerced` and `intake: an authorisation end
   date already in the past stops the run`.
5. **The CSV header is not what the code expects.** Check: the run prints every
   header it saw and exits 2. Test: `sources: an unusable CSV header stops the
   run and prints what it saw`.

## 5. One prediction about what the first pass gets wrong

The roles file will not match `data/examples/ch11-roles.json`. I am writing the
emitter without having read that file, so the key names, the nesting, or the
source-label field will be wrong, and the first `npm run score` will either
reject the file or silently score a role with missing terms. The second outcome
is the dangerous one. Mitigation planned before the first run: read the example
file at runtime, learn the keys and the value shape from it, and stop with the
observed keys printed rather than writing a file that looks right and is not.

---

## Revisions

**2026-10-03, the schema prediction was right, and the mitigation changed the
design.** Writing the emitter against an unseen contract was not viable, so
`lib/schema.mjs` learns the shape from the example file instead of hardcoding it,
and the same approach was extended to the CSV columns in `lib/sources.mjs`. What
started as a mitigation became the main design decision of the prototype.

**2026-10-03, two failures during the build, both fixed.** `node --test` against
a directory path failed to resolve under Node 22, so the documented test command
names the test file explicitly. The Form D loader, pointed at the fixtures
directory, indexed every JSON file in it including the intake and targets, which
inflated the reported sample count; the fixture moved to `fixtures/formd/` and the
source note now reports issuers indexed as well as files scanned.

**Pending.** Everything above has been exercised against fixtures only. The
schema discovery, the column discovery, and the gate check have never run against
the real repository data or the real scorer. Until they do, the status claim
stands at RUNNABLE-SAMPLE and the attestation stays null.

**2026-10-03, first contact with the real repository: the run stopped, then was
fixed under authorisation.** Written after the prototype met a clone of
`the-reallocation-engine`. Nothing above this entry was edited.

Section 5 predicted the schema mismatch. The real failure mode was worse than
predicted, because it was silent. The prediction said the first `npm run score`
would either reject the file or silently score a role with missing terms. What
happened was the second outcome, in its worst form: the schema learner mapped
every key without complaint, wrote the gates as `{"p": ...}`, and the scorer,
which reads gates from `factor`, treated both gates as 1. A probe with timeline 0
and strong votes scored Apply at composite 0.6175. Nothing stopped and nothing
printed a warning. The mitigation in section 5 (learn the shape, stop with the
keys printed) did not catch it, because the keys were right and the value field
was wrong.

Five findings, all reproduced on the real repository data:

1. `scripts/score/role-scorer.mjs` exports nothing and runs `main()` on import,
   so the import-based `--gate-check` printed the scorer's usage line and exited
   2. `CONTRIBUTING.md` lists `CONFIG`, `SRC`, `applyProfile` and `scoreRole` as
   exports; `scripts/score/gate-harness.mjs` documents that they are not.
2. The example roles file uses `p` for votes and `factor` for gates; the
   prototype used one value field for every term (the silent failure above).
3. The Form D samples hold records under `companies`, with the name at
   `company.name` and dates like `31-MAR-2026`; the loader found 0 issuers and
   did not stop.
4. The occupation lookup matched `onet_soc_code`, so `15-2051` missed; under
   `bls_soc_code` there are three rows for `15-2051` and the old map kept the
   last (Clinical Data Managers).
5. `Total Approvals` is empty in 28,812 of 30,369 rows (94.9%), and the prototype
   read an empty cell as 0, which made a missing record a recorded non-sponsor.

The run stopped at step B4 because each fix needed more than a one-line data
change. The student then authorised eight changes, all inside
`scripts/contrib/2026fa/deepakkts-opt-start-window/`:

1. `--gate-check` runs the scorer CLI on a probe in a temp directory with
   `--out-dir`, reads `role-scores.json`, and asserts the composite is at or below
   the scorer's own `gate_zero`.
2. The value field is learned per term (`p` for votes, `factor` for gates), and a
   term whose field cannot be determined stops the run with its keys printed.
3. The sponsorship tier is emitted in the example file's vocabulary; a tier with
   no match is omitted and the reason recorded.
4. The Form D loader reads the real shape, parses `DD-MON-YYYY` exactly, and stops
   when a non-empty set of files yields zero issuers.
5. Occupations are looked up by `bls_soc_code`, keeping the `.00` base row and
   listing the skipped detailed rows.
6. An empty approvals cell is missing; only an explicit 0 is a recorded zero.
7. The fit-rescue check uses the weights from the scorer's `config` block and is
   skipped, not defaulted, when there is none.
8. One offline test per fix, including a regression fixture that reproduces the
   old single-field emitter and fails the emitted-key-name test.

Three things are documented and left unchanged, because they belong to the
repository: the sponsorship CSV has no SOC column, so sponsorship cannot be
narrowed to 15-2051 or 15-1252; the scorer has no funding term, so Form D evidence
carries no weight; and the scorer closes any gate at or below 0.05, which
truncates the low end of the timeline factor.

Two further changes were made during the real run and are recorded in
`FRICTIONAL.md`: the emitted sponsorship term is labelled `your-input`, because
the probability is an operator mapping of the count, which the code's own comment
already said; and the JSON log no longer carries absolute paths, which had put the
operator's home directory into a file meant for commit.

Predictions 1, 2, 3 and 5 in section 4, and the malformed-date half of 4, were
exercised against real repository data; the date-already-past half of 4 was
exercised only in the offline tests. The outputs are in `TEST-REPORT.md`.

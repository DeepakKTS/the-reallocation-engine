# Run: 2026fa-deepakkts-1

## Executive summary

This records the first run of the start-window recipe on the repository's real
data and ten real job postings. The run stopped once on first contact, because the
prototype was writing a file the scorer misread without any warning. It completed
after eight authorised fixes. Seven roles were scored (five Apply, two Consider)
and three were routed to networking because the data holds no sponsorship
evidence for them. No human has cleared the final gate.

## 2026-10-03, opt-start-window, real-data sample run

- **Recipe:** `recipes/cases/2026fa/deepakkts-opt-start-window.md` v0.1.0
- **Inputs:** `fixtures/intake.sample.json` (invented persona), `fixtures/targets.real.json`
  (ten real postings), `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv`,
  `data/sec/form-d/processed/sample/`, `data/bls/compact/soc_occupation_compact.csv`,
  `data/examples/ch11-roles.json`
- **Outputs:** `course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window.{json,md}`,
  `2026-10-03-opt-start-window-roles.json`, `role-scores.{json,md}`
- **Result:** 10 in, 7 scored, 3 network; scorer Apply 5, Consider 2, Skip 0
- **Open issues:** pre-scorer skip rate 0.3 and scorer skip rate 0%; every Proven role
  is Apply whatever its fit; no Form D hit; P5 not cleared by a human;
  `node scripts/pii-scan.mjs` reports one finding in `package-lock.json`, a file this
  run did not touch, which the same scan also reports on an unmodified `upstream/main`

## Run record

- Recipe: recipes/cases/2026fa/deepakkts-opt-start-window.md v0.1.0
- Status claimed: RUNNABLE-SAMPLE
- Date: 2026-10-03
- Operator: Deepak Kumaran T S (decisions); commands executed by Claude Code (Opus 5.5) in the operator's session
- as_of used: 2026-10-03 (plus one scenario at 2027-02-01, not committed)
- Intake source: `fixtures/intake.sample.json`, an invented persona inside the
  repository. Dates confirmed against an I-20 or EAD: **no. These are not real
  dates.**

## Commands run

```
npm run doctor
npm run verify
node --test scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs
node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs --gate-check
npm run ats:liveness -- <the ten URLs in fixtures/targets.real.json>
node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs \
  --intake  scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json \
  --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json \
  --out-dir course/2026fa/submissions/deepakkts/runs
npm run score -- course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window-roles.json \
  --out-dir course/2026fa/submissions/deepakkts/runs
node scripts/conformance.mjs scripts/contrib/2026fa/deepakkts-opt-start-window/
node scripts/pii-scan.mjs
```

The failure-case runs are listed with their output in
`course/2026fa/submissions/deepakkts/TEST-REPORT.md`.

## Sources resolved (path + sha256 prefix, copied from the JSON output)

| What | Path | sha256 (16) |
| --- | --- | --- |
| 80 Days sponsorship CSV | `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` | eccdee2addf472b1 |
| SEC Form D samples | `data/sec/form-d/processed/sample` | n/a (4 files, 200 records, 196 issuers) |
| BLS compact occupation table | `data/bls/compact/soc_occupation_compact.csv` | bac5acf77ca2d252 |
| Scorer input contract | `data/examples/ch11-roles.json` | daf9fef43408a492 |
| Intake | `scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json` | baf86670ea04921a |
| Targets | `scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json` | b5485703ed1c1c9b |

Columns used: `company_name`, `Total Approvals`; no tier column, no SOC column.
Weights for the fit-rescue check came from the scorer's own `config` block:
sponsorship 0.35, fit 0.3.

## Counts

- Roles in / scored / dropped / needs liveness / network: 10 / 7 / 0 / 0 / 3
- Pre-scorer skip rate: 0.3
- Scorer verdicts (Apply / Consider / Skip): 5 / 2 / 0

## Gates

- P1 intake: cleared mechanically against the persona intake. **Not cleared by a
  human against real documents, because the dates are invented.**
- P2 sources: cleared. On first contact it should have stopped and did not: Form D
  indexed 0 issuers, the occupation lookup used the wrong column, and the schema
  wrote gates under the wrong field. All three now stop or resolve correctly.
- P3 liveness: 0 roles held; all ten postings `active` from `npm run ats:liveness`
  at 2026-10-03T18:19Z.
- P4 timeline: 0 roles dropped at `as_of` 2026-10-03 (latest projected start
  2027-03-02, 46 of 90 days). `--gate-check` against the real scorer: composite 0,
  at or below `gate_zero` 0.05.
- P5 adequacy: **not cleared.** No named human has judged the skip rate or signed
  the run, so `attestation` stays null.

## Overrides

None.

## What this run did not verify

Whether any company sponsors for the target occupation (the CSV is company-wide);
any Form D hit (no target is in the shipped sample); any `expired` or `uncertain`
liveness; the fit values, the day estimates and the SOC assignment of each title,
which are judgments and estimates; the identity of the Cellanome join, made by
domain; the persona's dates against real documents.

## Corrections made during the run

1. The run stopped at step B4 under the operator's abort rule: the scorer could
   not be imported, gates were written as `{"p": ...}` and read by the scorer as 1,
   Form D indexed nothing, the occupation lookup missed, and empty approvals cells
   read as 0. Eight fixes were made after the operator authorised them; each is
   listed in `course/2026fa/submissions/deepakkts/CHANGE-BRIEF.md`.
2. The emitted sponsorship label changed from `record` to `your-input`.
3. The JSON log stopped carrying absolute paths.
4. The fixture run that the draft left in `runs/` was overwritten by this run.

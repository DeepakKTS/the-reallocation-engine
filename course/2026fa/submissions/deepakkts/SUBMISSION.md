# SUBMISSION

- **Assignment:** The Reallocation Engine, Recipe Design Assignment
- **Student:** Deepak Kumaran T S
- **GitHub handle:** DeepakKTS (paths and branch use the lowercase form `deepakkts`)
- **Domain / situation:** International M.S. student completing in December 2026,
  targeting AI/ML and data roles under SOC 15-2051 and 15-1252 with a January 2027
  start, whose post-completion OPT begins in the same month the role would start.
- **Recipe path:** `recipes/cases/2026fa/deepakkts-opt-start-window.md`
  (card: `recipes/cases/2026fa/deepakkts-opt-start-window.card.md`)
- **Prototype command** (from the repository root):
  ```
  node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs \
    --intake  scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json \
    --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json \
    --out-dir course/2026fa/submissions/deepakkts/runs
  npm run score -- course/2026fa/submissions/deepakkts/runs/2026-10-03-opt-start-window-roles.json \
    --out-dir course/2026fa/submissions/deepakkts/runs
  ```
  Tests: `node --test scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs`
- **GitHub repository / branch / PR URL:** https://github.com/DeepakKTS/the-reallocation-engine /
  `contrib/2026fa-deepakkts-opt-start-window` /
  https://github.com/nikbearbrown/the-reallocation-engine/pull/25
- **Submitted commit SHA:** `09f1cc6b3d6838ac25a5c7b3e9b7ed5766017872` (the content
  commit). The PR head and the Canvas ZIP are the next commit, which changes only
  this file to record this SHA and the PR URL; a file cannot contain its own
  commit's SHA.
- **Lifecycle stage claimed:** RUNNABLE-SAMPLE

## Summary of my changes

A recipe and prototype that produce the Chapter 10 timeline factor the Chapter 11
scorer already consumes but nothing in the repository generates. It validates an
eight-field OPT intake, computes a factor per role with the full date arithmetic
attached, joins sponsorship evidence from the 80 Days data, holds any posting
whose liveness has not been checked, routes companies with no sponsorship
evidence (absent, or present with an empty approvals cell) to a networking list
instead of scoring them as non-sponsors, and emits a roles file for
`npm run score` in the shape learned at runtime, per term, from
`data/examples/ch11-roles.json`. Funding and occupation data are reported to the
person and weighted nowhere. The gate check runs the real scorer's command line.

Run on ten real postings: 7 scored (Apply 5, Consider 2, Skip 0), 3 routed to
networking, one role traced by hand from its CSV row to the composite. 36 offline
tests, including two BROKEN fixtures that the gate and emitted-key tests must
fail.

## Known limitations

- `expected_days_to_start` is an estimate with no source behind it, and it has
  more influence on the output than any other input. In this run the estimates and
  the fit values are the AI session's, labelled as such.
- Sponsorship is company-wide: the CSV has no SOC column, so it cannot say whether
  a company sponsors data scientists in particular.
- `Total Approvals` is empty for 28,812 of 30,369 companies (94.9%); those are
  treated as no evidence.
- The approvals count is the record; the tier bands and the tier-to-probability
  mapping (0.9 / 0.6 / 0.3 / 0.0) are operator assumptions. With them, every
  Proven role with open gates scores Apply whatever its fit.
- Funding carries no weight because the scorer has no funding term, and the
  shipped Form D sample matched none of the ten targets.
- The scorer closes any gate at or below 0.05, which truncates the low end of the
  timeline factor.
- Liveness is consumed, never fetched. Fit is a model judgment. No resume is read.
- Company matching is exact after legal-suffix normalisation; a subsidiary can
  read as absent, and stripping `holdings` or `technologies` can join two
  different entities.
- No immigration advice: STEM eligibility and the applicable unemployment ceiling
  are supplied by the operator and belong to a DSO or an attorney.
- `attestation` is null. No named human has cleared the adequacy gate.

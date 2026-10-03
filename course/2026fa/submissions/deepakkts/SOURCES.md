# SOURCES: opt-start-window

## The repository and its governing documents

- `nikbearbrown/the-reallocation-engine`. Code MIT, book CC BY 4.0.
- `SNICKERDOODLE.md`, `DOMAIN.md`, `_MANIFEST.md`, `CONTRIBUTING.md`,
  `DATA_CONTRACT.md`, read for the prime directive, the known-gaps list, the
  namespace rules, and the privacy contract.
- Chapter 10, *The Visa Timeline Manager*, the eight intake fields, the gate
  rather than tiebreaker argument, the three-case resolution of the factor, and
  the rule that a factor must carry its dates. This recipe implements that
  chapter's missing step.
- Chapter 11, *The Bayesian Role Scorer*, the composite's shape, the weights
  (sponsorship 0.35, fit 0.30), the gate-versus-vote distinction, the override
  discipline, and the fit-rescue error the report flags.
- `DOMAIN.md` known gaps 3 and 9, `role_quality: 0.0` as an open authorial
  decision, and `bls:local-wage` feeding nothing. Both are addressed by reporting
  occupation data to the human and weighting it nowhere.
- `scripts/score/gate-harness.mjs`, for the documented fact that the scorer
  exports nothing, and for the pattern of running the scorer CLI in a temp
  directory, which `--gate-check` now follows.

## Data

- `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv`,
  sponsorship history (`Total Approvals`). Read, never rewritten. Its own audit,
  `data/80-days-to-stay/data/SEC_DOL_H1b_data_mapped-audit.md`, reports the same
  94.9% null rate this work counted independently.
- `data/sec/form-d/processed/sample/`, four shipped samples (first 50 issuers
  per quarter); full quarters are gitignored and were not fetched.
- `data/bls/compact/soc_occupation_compact.csv`, occupation rows.
- `data/examples/ch11-roles.json`, the scorer's input contract; the roles schema
  is learned from it per term rather than restated.
- Ten public job postings at real companies, listed in
  `fixtures/targets.real.json`, found through the companies' public Greenhouse
  job boards and checked with `npm run ats:liveness` on 2026-10-03.

## Code reused rather than reimplemented

- `scripts/score/role-scorer.mjs`, run through its command line for the gate
  check and the fit-rescue weights, and through `npm run score` for the decision.
  Per `CONTRIBUTING.md`, a harness that tests its own copy of the composite tests
  nothing, so no composite is computed in this folder.
- `npm run ats:liveness`, the only source of liveness values. The prototype
  reads them and refuses to invent them.

## Personas and fixtures

The intake persona and every company in the test fixtures are invented. Contacts
use `@example.com`. The numbers in `soc.fixture.csv` are synthetic placeholders,
not BLS figures. `role-scores.fixture.json` carries the config block copied from
the real scorer's output. `targets.real.json` names real companies and public
postings and holds no personal data. No real resume, tracker, or contact data was
read or written. The AI did not open `private/`, `search/resume.json` or `data/ats/`;
the repository's own `pii-scan` walks the whole working tree, as it is designed to.

## Tools, and the split between them

- **Claude (chat), session 1, 2026-10-03.** Read the public repository and the
  two chapters, designed the recipe, wrote the prototype, fixtures and tests, ran
  the test suite and a fixture run in a scratch container, and wrote the first
  draft of every document in this folder. It worked without a clone: no
  `npm install`, no repository data, and no access to the real scorer.
- **Claude Code (Opus 5.5), session 2, 2026-10-03.** Worked in a clone of the
  fork on the operator's machine. It ran every command whose output appears in
  this folder; found the five defects listed in `CHANGE-BRIEF.md` and stopped;
  after authorisation, made the eight changes and two further fixes, wrote the
  tests for them, chose the ten target postings, ran the liveness check, the real
  run, the scorer and the hand verification, and revised every document here. It
  also wrote the fit values and day estimates in `targets.real.json`, which are
  labelled as its judgments and estimates.
- **The operator, Deepak Kumaran T S.** Set the run plan, its rules and its abort
  conditions; chose the persona's dates; authorised the code changes after the
  first stop; set the constraints on target selection and on how funding is
  presented. Those decisions are listed in the `[ME]` section of
  `FRICTIONAL.md`, which also records the operator's answers to three questions.

Nothing in this submission claims a command was run that was not run.

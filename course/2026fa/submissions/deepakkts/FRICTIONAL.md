# FRICTIONAL: opt-start-window

Two voices in this file and they are kept apart. Sections marked **[AI]** are the
factual record of what Claude attempted: a planning session in chat, and a session
in Claude Code against a clone of the repository, both on 2026-10-03. Sections
marked **[ME]** hold the student's part: the operator decisions made in the Claude
Code session, recorded by the AI and labelled as such, and three questions only
the student can answer, left blank.

---

## [AI] Session 1: 2026-10-03, planning and first build

**Tool:** Claude (chat), with web access to the public repository and a scratch
container running Node v22.22.2. No clone of the repository was available: the
container had no network, so no `npm install`, no `npm run doctor`, no access to
`data/`, and no access to `scripts/score/role-scorer.mjs`.

### Attempt 1: read the scorer source directly

Expectation: fetch `scripts/score/role-scorer.mjs` and
`data/examples/ch11-roles.json` and write an emitter against the real contract.

What happened: raw file URLs were refused, and GitHub's directory listings are
closed to automated access, so neither file could be read. Only linked blob pages
were reachable.

Response: pulled what was reachable instead, `README.md`, `DOMAIN.md`,
`_MANIFEST.md`, `CONTRIBUTING.md`, and Chapters 10 and 11. Chapter 11 gives the
weights (sponsorship 0.35, fit 0.30) and a worked example; `DOMAIN.md` gives the
two numbers that example produces, 0.446 and 0.178. Checking the arithmetic:
`0.9 × 0.35 + 0.7 × 0.30 = 0.525`, and `0.525 × 1.0 × 0.85 = 0.446`. The
non-sponsor case: `0.7 × 0.30 × 0.85 = 0.178`. Both reproduce exactly, which
confirmed the composite's shape and that `role_quality: 0.0` contributes nothing.
Learned: the book plus the known-gaps list was enough to pin the formula, and not
enough to pin the field names.

### Attempt 2: write the emitter anyway

Expectation: guess reasonable key names and document the risk.

What happened: rejected on reflection. A roles file with the wrong key names
would either be refused by the scorer, which is survivable, or silently scored
with missing terms, which is the exact fluent-and-wrong failure the whole book is
about.

Response: `lib/schema.mjs` reads `data/examples/ch11-roles.json` at runtime,
learns the keys and the value shape, and stops with the observed keys printed if
a required term cannot be mapped. The same approach was then applied to the CSV
columns. Learned: being unable to read the contract produced a better design than
reading it would have, because the result survives the contract changing.

### Attempt 3: a gate harness

Expectation: build a harness proving the timeline gate behaves as a gate.

What happened: Chapter 10 says `npm run score:gates` and
`scripts/score/gate-harness.mjs` already exist, with their own recipe and card.
The idea was taken.

Response: changed the contribution to the step upstream of it. Chapter 10
specifies a timeline factor computed from eight intake fields and insists the
output is the factor plus the dates behind it; the repository consumes the factor
and never produces it. The gate assertion survives as one function used for the
break attempt, not as the contribution.

### Attempt 4: run the tests

What happened: `node --test <directory>` failed to resolve under Node 22.22.2
with `MODULE_NOT_FOUND`. Twenty-one tests then passed on the first run with the
explicit file path.

Response: every documented test command names the file. Unresolved: whether the
course's CI invokes tests by directory, in which case this needs revisiting.

### Attempt 5: read the generated report critically

What happened: two problems visible only in the output. The Form D loader,
pointed at the fixtures directory, indexed every JSON file in it and claimed four
sample files. Absolute container paths appeared in the sources table.

Response: fixture moved to `fixtures/formd/`; the note now reports issuers
indexed as well as files scanned; `relPath` reports in-repo paths relative to the
root and out-of-repo paths by filename only, so a committed artifact cannot carry
a home directory. Learned: the second bug is a privacy bug, and it was invisible
in the tests because the tests never read the report as a document.

### [AI] What was deliberately not done

- No repository file outside the student's namespace was modified or proposed for
  modification.
- No weight was proposed for `role_quality`. `DOMAIN.md` records it as an open
  authorial decision, and overriding it from a student contribution would be
  claiming a judgement that is not available to make.
- No personal data of any kind was written into any file. The persona is
  invented, contacts are `@example.com`, and the real intake path is documented
  as living outside the repository.
- No terminal output was invented. Everything pasted into `TEST-REPORT.md` and
  Part 1 of `WORKED-RUN.md` was produced by a command that actually ran; every
  command that has not run is marked `PASTE` or "not yet executed".

---

## [AI] Session 2: 2026-10-03, Claude Code against a clone of the repository

**Tool:** Claude Code (Opus 5.5) in the operator's terminal, with the operator's
GitHub CLI login. Node v24.21.0, Python 3.13.2. The operator gave a written run
plan with six abort conditions and asked for an unattended run to the PR.

### Part A: reconnaissance, then a stop

What was tried: forked and cloned the repository, captured `npm run doctor` and
`npm run verify` as the before-baseline, read the governing files, the scorer, the
example roles file, `conformance.mjs`, `pii-scan.mjs` and `doctor.mjs`, and
inventoried the 80 Days CSV, the Form D samples and the BLS table.

What was expected: at most a few one-line fixes to `CANDIDATES` or the column
lists, which is what the draft was designed to need.

What happened, each item reproduced rather than inferred:

1. `role-scorer.mjs` exports nothing and calls `main()` on import.
   `run.mjs --gate-check` printed `Usage: role-scorer.mjs <roles.json> ...` and
   exited 2. `CONTRIBUTING.md` lists four exports; `gate-harness.mjs` says there
   are none.
2. The schema learner chose `p` as the value field for every term. A probe built
   with the draft's own `buildRole` (timeline 0, strong votes) was emitted as
   `"timeline":{"p":0}` and scored by `npm run score` as Apply, composite 0.6175,
   with both gates read as 1. This is the failure CHANGE-BRIEF section 5 predicted,
   and it was silent.
3. The Form D loader reported `4 JSON file(s) scanned, 0 issuer(s) indexed` and
   carried on.
4. The occupation lookup returned `no-occupation-row` for `15-2051`.
5. A real row with `Total Approvals` = `""` came back as approvals 0, tier
   `none`, probability 0.

Response: stopped at step B4 under abort condition 2, because each fix needed
more than one line. Steps B1 to B3 had run first: the draft was copied in, the
persona's `auth_start_date` set to 2027-01-15, and the tests run. One premise in
the run plan did not hold: the plan said the date change would break tests 1 and
2, but all 21 still passed, because the test file has its own copy of the intake.
The copy was synced to 2027-01-15 and the expectations recomputed by hand from the
calendar: test 1 is unchanged (45 days ends 2026-11-17, before the clock starts),
test 2 changed from 72 days and 0.6 to 76 days and 0.467. The expectations changed
because the input changed; the code was not consulted to choose them.

Learned: the draft's discovery approach mapped every key name correctly and still
produced a wrong file, because the error was in the value field, one level below
where discovery looked.

### Part B: the eight authorised changes, the real run, and a second stop

What was tried: the eight changes listed in CHANGE-BRIEF, each with a test. Two
of the fixes were mutation-checked by breaking them on purpose: reading an empty
approvals cell as a number, and keeping the last occupation row. Each break failed
exactly one test (34 pass, 1 fail of 35), and the suite passed again once the code
was restored.

What happened on the real run:

- The gate check through the CLI: composite 0, timeline multiplier 0, Skip. The
  same check against the BROKEN mutant: `GateViolation`, composite 0.7675.
- Target selection needed real postings, because a role without a liveness value
  never reaches the scorer. The repository's own scan config lives under
  `data/ats/`, which the operator ruled off-limits, so the public Greenhouse job
  board API (`boards-api.greenhouse.io`) was queried with `curl`: fourteen
  employers from the 80 Days data, four more to find absent and empty-cell
  companies, and a batch of board names guessed from the first word of companies
  with 3 to 9 approvals. This was operator research outside the prototype; the
  prototype itself calls no network host. Three of the guessed boards (`clara`,
  `denver`, `future`) could not be confirmed as the same company and were not
  used; FourKites matched on city, and Cellanome was kept on its matching domain.
- `npm run ats:liveness` on ten URLs: all `active`.
- 7 scored, 3 network. Scorer: Apply 5, Consider 2, Skip 0. Cellanome traced by
  hand from CSV record 5194 (`4.0`) to composite 0.375; it reconciled.

Two problems found in the output and fixed beyond the eight authorised changes,
both small and both in this folder:

- The JSON log carried absolute paths, including the operator's home directory,
  in `repo_root` and every `source_file`. The draft claimed this had been fixed;
  the fix covered only the sources table. Paths are now written relative to the
  repository root, error details printed to the terminal are relativised the same
  way, and a test fails if an absolute path comes back.
- The emitted sponsorship term was labelled `record`, while the code's own comment
  said the probability is labelled `your-input` everywhere. The label now matches
  the comment.

Findings recorded and not fixed, because they are not this folder's to fix or
were not authorised: every Proven role scores Apply whatever its fit
(0.9 x 0.35 = 0.315 clears 0.30); at exactly the ceiling the factor is 0 but the
reason reads `eats-into-buffer`; the error for an unusable `--sponsors-csv` file
still says "No CSV under data/80-days-to-stay/" even when the file was named
explicitly.

**Second stop.** `node scripts/pii-scan.mjs` reported one finding:
`[email] package-lock.json`, an npm package author's address inside the lockfile's
package metadata (the address is left out of this file, because quoting it would
make this file a finding too). The lockfile is tracked, unmodified on this
branch, and last changed upstream in `d08afdd`. The same scan on a clean worktree
of `upstream/main` (015843d) reports the same single finding; the same scan over a
copy of only this contribution's five paths reports `pii-scan: clean ✓`. A
non-clean scan is one of the operator's abort conditions, so the run stopped
before staging, committing or pushing. Nothing was committed and no PR was opened.

### Part C: proceeding past the second stop

The operator reviewed the three-way evidence on the scan finding and authorised
the commit, with three additions, all made before the first commit:

- The scan result is pasted in `TEST-REPORT.md` with the three locating facts and
  the statement that CI's working-tree scan reports it on any PR against this
  repository. In this folder's files the flagged address is redacted, because
  quoting it would make the quoting file a finding; the PR body quotes it
  verbatim. `package-lock.json` was not modified.
- The ceiling-boundary label became `[TODO: DEV]` item 5 in the recipe, with its
  exact trigger, and `todos_open` went from 4 to 5. `lib/timeline.mjs` was not
  changed, so every pasted output still reproduces from the committed code.
- Node 20 was installed with `fnm` (about four seconds) and the suite run once:
  36 pass, 0 fail on v20.20.2.

### [AI] The draft's open questions, answered by this session

- Did `data/examples/ch11-roles.json` map cleanly? The key names did; the value
  field did not, and that was the dangerous part.
- Does `scoreRole` export under that name? No. Nothing is exported.
- Does `npm run doctor` agree with `todos_open: 4`? `doctor` reads only top-level
  `recipes/*.md` and never sees `recipes/cases/`, so it does not count this
  recipe at all. The body had 4 `[TODO` markers and the frontmatter said 4; a
  fifth was added in Part C, and both now say 5.

### [AI] Traceability

| Claim | Where to check it |
| --- | --- |
| The prototype runs on real data | `runs/2026-10-03-opt-start-window.json`, `runs/role-scores.json`, `WORKED-RUN.md` |
| The gate assertion has teeth | `fixtures/BROKEN-additive-gate-scorer.mjs`, `fixtures/BROKEN-single-value-field-schema.mjs`, and their tests |
| The silent-gate failure was real | `CHANGE-BRIEF.md` revision of 2026-10-03, and the before and after numbers in `WORKED-RUN.md` |
| Every failure case ran | `TEST-REPORT.md` |
| Commit | the content commit's SHA and the PR URL are recorded in `SUBMISSION.md` by a follow-up commit |

---

## [ME] Operator decisions made in the Claude Code session

Recorded by the AI from the operator's written instructions in that session. They
are decisions the operator made; the wording here is the AI's.

- Set the persona's `auth_start_date` to 2027-01-15 and kept `auth_end_date` at
  2028-01-18 as a stated assumption, with no other real date anywhere.
- Set six abort conditions before the run; the run stopped on condition 2.
- After reading the abort report, authorised all eight code changes, confined to
  this folder, with the repository's discrepancies to be documented and not
  patched.
- Required targets drawn from rows with a non-empty approvals value, plus two
  companies absent from the data and one with an empty cell, and liveness left
  null unless actually checked.
- Required funding and role quality to be presented as weighted nowhere, and any
  JUSTIFICATION claim the funding signal no longer supports to be cut rather than
  softened.
- Kept the status at RUNNABLE-SAMPLE and `attestation` at null.
- After the second stop, judged the scan finding to be upstream's on the three-way
  evidence and authorised the commit, push and PR, with the finding documented
  rather than omitted.
- Chose to record the ceiling-boundary label as a `[TODO: DEV]` instead of fixing
  `lib/timeline.mjs` now, because a code change would invalidate every pasted
  output and the defect mislabels a decision it does not change.
- Asked for one test run on Node 20 if it could be had within two minutes.

## [ME] Three questions for me

1. The day estimates in `targets.real.json` (75 to 150) are the AI's: from my own applications so far, which one is furthest off, and in which direction?
   Answer:
2. Every Proven-tier role scored Apply whatever its fit: do I change `TIER_PROBABILITY`, raise it with the maintainer, or leave it, and why?
   Answer:
3. Which of the AI's changes did I check myself against the diff, and what did I look for?
   Answer:

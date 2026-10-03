---
status: RUNNABLE-SAMPLE
todos_open: 0
last_gate: null
attestation: null
recipe_version: 0.1.0
---

# Card: opt-start-window

**One line.** Score your roles against the clock that has not started yet, and
publish the dates behind every factor.

**Use it when** you finish in December, your OPT starts in the new year, and you
are deciding which of a dozen postings deserves tomorrow morning.

**Do not use it** to answer a visa question. It does not rule on STEM
eligibility, does not pick your unemployment ceiling, and is not legal advice.
Those go to your DSO or an immigration attorney.

## Before you start

- Your authorisation dates, from the I-20 and EAD, not from memory.
- Your unemployment days already used, and the ceiling that applies to you.
- A buffer target you are willing to defend.
- One liveness result per posting, from `npm run ats:liveness -- <job-url>`.
- Your own fit estimate per role. Nothing reads your resume.

## Run

```
node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs \
  --intake <your intake, outside the repository> \
  --targets <your targets> \
  --out-dir course/2026fa/submissions/deepakkts/runs

npm run score -- course/2026fa/submissions/deepakkts/runs/<run-id>-roles.json \
  --out-dir course/2026fa/submissions/deepakkts/runs
```

## Read the report in this order

1. **The intake table.** Check it against your documents. A wrong authorisation
   date is the only error here that costs the whole search instead of one
   application.
2. **The dropped list.** These are gone today. Taking the time back is the point.
3. **The networking list.** No sponsorship record found is not the same as a
   record of non-sponsorship. These are conversations, not applications.
4. **The fit-rescue warnings.** A high fit holding up a low-sponsorship role is
   the Chapter 11 error, and fit is your judgment, not a record.
5. **The skip rate.** Under half, and the target list is the problem.

## Where you sign

The script clears the first four gates. The last one is yours: decide whether the
skip rate is credible, whether any override is justified, and write down the
private fact behind it. Until a named human signs it, the attestation stays null
and the recipe stays unpromoted.

## The honest limits, short form

Liveness is trusted as entered from `npm run ats:liveness`. Fit is a judgment.
The approvals count is the record; the tier bands and the tier-to-probability
mapping are assumptions, and with them every Proven role with open gates is an
Apply whatever its fit. Sponsorship is company-wide: the data has no occupation
column, so it cannot say whether a company sponsors data scientists in particular.
The approvals cell is empty for 94.9% of companies in the data (28,812 of 30,369),
and an empty cell means no evidence, never zero. `expected_days_to_start` is a
guess with more influence on the answer than anything else in the file. Funding
and role quality are reported and weighted nowhere: the scorer has no funding
term and weights role quality 0.0. Form D coverage is the shipped sample only. The
scorer closes any gate at or below 0.05, so a very small timeline factor is a Skip
there. Company matching is exact after suffix normalisation, so a subsidiary can
read as absent.

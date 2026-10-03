# OPT start-window run: 2026-10-03-opt-start-window

Recipe: `recipes/cases/2026fa/deepakkts-opt-start-window.md` v0.1.0 · status RUNNABLE-SAMPLE
Generated: 2026-10-03T18:31:33.582Z · as_of date used for all arithmetic: **2026-10-03**

## Sources actually read

| What | Path | sha256 (16) |
| --- | --- | --- |
| 80 Days sponsorship CSV | `data/80-days-to-stay/80-days-csv/mapped_student_employment_targets_v3.csv` | eccdee2addf472b1 |
| SEC Form D samples | `data/sec/form-d/processed/sample` | n/a |
| BLS compact occupation table | `data/bls/compact/soc_occupation_compact.csv` | bac5acf77ca2d252 |
| Scorer input contract (schema learned from this file) | `data/examples/ch11-roles.json` | daf9fef43408a492 |
| Scorer weights for the fit-rescue check | `scripts/score/role-scorer.mjs (config block of role-scores.json from a probe run)` | n/a |
| Intake | `scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json` | baf86670ea04921a |
| Targets | `scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.real.json` | b5485703ed1c1c9b |

- 80 Days sponsorship CSV: columns used: {"company":"company_name","tier":null,"count":"Total Approvals","soc":null}; approvals cell empty in 28812 of 30369 rows (missing, never read as 0); no SOC column, so sponsorship is company-wide and never narrowed to the target SOC code
- SEC Form D samples: 4 JSON file(s) scanned, 200 record(s) read, 196 issuer(s) indexed, 0 date(s) rejected as unparseable, 0 file(s) unrecognised; full quarters are gitignored, so a miss here means "not in the sample", not "no funding"
- BLS compact occupation table: looked up by bls_soc_code; where a code has several rows the onet_soc_code .00 base row is kept
- Scorer input contract (schema learned from this file): keys={"company":"company","title":"title","soc":null,"url":null,"sponsorship":"sponsorship","fit":"fit","liveness":"liveness","timeline":"timeline","funding":null,"role_quality":null}; value field per term={"sponsorship":"p","fit":"p","liveness":"factor","timeline":"factor"}; tier vocabulary=["Proven","None","Likely"]
- Scorer weights for the fit-rescue check: sponsorship 0.35, fit 0.3
- Intake: every field your-input
- Targets: liveness values come from npm run ats:liveness; fit is an operator estimate

## Intake echoed back (every field is your-input)

| Field | Value |
| --- | --- |
| as_of | 2026-10-03 |
| auth_type | OPT |
| auth_start_date | 2027-01-15 |
| auth_end_date | 2028-01-18 |
| unemployment_days_used | 0 |
| unemployment_ceiling_days | 90 |
| buffer_target_days | 60 |
| stem_eligible | true |

Check these against your I-20 and EAD before you trust a single factor below. A wrong authorisation date is the one error in this whole pipeline that costs the search rather than one application. This run does not rule on STEM eligibility or give immigration advice; `stem_eligible` is echoed exactly as you supplied it, and anything legal belongs with your DSO or an attorney.

## Timeline factor per role, with the dates that produced it

| Role | Expected days to start | Projected start | Auth end | Unemployment days after this process | Factor | Why |
| --- | --- | --- | --- | --- | --- | --- |
| Reddit Inc · Machine Learning Engineer | 120 | 2027-01-31 | 2028-01-18 | 16 of 90 | **1** | inside-buffer |
| Discord Inc · Data Scientist - Client Platform | 105 | 2027-01-16 | 2028-01-18 | 1 of 90 | **1** | inside-buffer |
| Moloco Inc · Data Scientist II, Product - Moloco Commerce Media | 90 | 2027-01-01 | 2028-01-18 | 0 of 90 | **1** | inside-buffer |
| Airbnb Inc · Data Scientist - Algorithms, Community Support | 120 | 2027-01-31 | 2028-01-18 | 16 of 90 | **1** | inside-buffer |
| Attentive Mobile Inc · Senior Machine Learning Engineer | 120 | 2027-01-31 | 2028-01-18 | 16 of 90 | **1** | inside-buffer |
| Cellanome Inc · Machine Learning Engineer | 75 | 2026-12-17 | 2028-01-18 | 0 of 90 | **1** | inside-buffer |
| FourKites Inc · Senior AI Engineer | 90 | 2027-01-01 | 2028-01-18 | 0 of 90 | **1** | inside-buffer |
| Anthropic · Data Engineer | 150 | 2027-03-02 | 2028-01-18 | 46 of 90 | **1** | inside-buffer |
| Scale AI · Machine Learning Research Scientist, Evaluations | 120 | 2027-01-31 | 2028-01-18 | 16 of 90 | **1** | inside-buffer |
| Vercel Inc · Software Engineer, AI SDK | 105 | 2027-01-16 | 2028-01-18 | 1 of 90 | **1** | inside-buffer |

## Evidence per role, every term labelled

| Role | Sponsorship evidence (record) | P(sponsorship) | Label | Tier emitted | Funding | Label | Liveness | Label | Timeline | Label | Role quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reddit Inc | 408 approvals | 0.9 | your-input | Proven | n/a | missing | 1 | record | 1 | your-input | SOC 15-1252 row present (weighted 0.0 by the scorer) |
| Discord Inc | 122 approvals | 0.9 | your-input | Proven | n/a | missing | 1 | record | 1 | your-input | SOC 15-2051 row present (weighted 0.0 by the scorer); base row kept, 2 detailed row(s) skipped: Business Intelligence Analysts, Clinical Data Managers |
| Moloco Inc | 200 approvals | 0.9 | your-input | Proven | n/a | missing | 1 | record | 1 | your-input | SOC 15-2051 row present (weighted 0.0 by the scorer); base row kept, 2 detailed row(s) skipped: Business Intelligence Analysts, Clinical Data Managers |
| Airbnb Inc | 1000 approvals | 0.9 | your-input | Proven | n/a | missing | 1 | record | 1 | your-input | SOC 15-2051 row present (weighted 0.0 by the scorer); base row kept, 2 detailed row(s) skipped: Business Intelligence Analysts, Clinical Data Managers |
| Attentive Mobile Inc | 96 approvals | 0.9 | your-input | Proven | n/a | missing | 1 | record | 1 | your-input | SOC 15-1252 row present (weighted 0.0 by the scorer) |
| Cellanome Inc | 4 approvals | 0.6 | your-input | Likely | n/a | missing | 1 | record | 1 | your-input | SOC 15-1252 row present (weighted 0.0 by the scorer) |
| FourKites Inc | 8 approvals | 0.6 | your-input | Likely | n/a | missing | 1 | record | 1 | your-input | SOC 15-1252 row present (weighted 0.0 by the scorer) |
| Anthropic | missing: no-sponsor-record | n/a | missing | none (no sponsorship evidence) | n/a | missing | 1 | record | 1 | your-input | SOC 15-1252 row present (weighted 0.0 by the scorer) |
| Scale AI | missing: no-sponsor-record | n/a | missing | none (no sponsorship evidence) | n/a | missing | 1 | record | 1 | your-input | SOC 15-2051 row present (weighted 0.0 by the scorer); base row kept, 2 detailed row(s) skipped: Business Intelligence Analysts, Clinical Data Managers |
| Vercel Inc | missing: empty-approvals-cell | n/a | missing | none (no sponsorship evidence) | n/a | missing | 1 | record | 1 | your-input | SOC 15-1252 row present (weighted 0.0 by the scorer) |

Role quality is reported here and nowhere else: the composite in `scripts/score/role-scorer.mjs` carries `role_quality: 0.0`, so the wage and ability columns change no decision. They are shown so a human can overrule a borderline Consider on grounds the scorer does not weigh.

## Fit-rescue warnings

Rule: flag a scored role when fit x 0.3 > sponsorship x 0.35 (weights from scripts/score/role-scorer.mjs (config block of role-scores.json from a probe run)). A role flagged here is held up by fit more than by sponsorship, and fit is a model judgment, not a record. Chapter 11 calls this the central scoring error.

_none flagged_

## Where each role goes next

### Scored, hand the roles file to `npm run score` and spend the Chapter 2 two hours on the Applies (7)

- **Reddit Inc · Machine Learning Engineer** · included in roles.json; run the scorer, then spend application time on the Applies only
- **Discord Inc · Data Scientist - Client Platform** · included in roles.json; run the scorer, then spend application time on the Applies only
- **Moloco Inc · Data Scientist II, Product - Moloco Commerce Media** · included in roles.json; run the scorer, then spend application time on the Applies only
- **Airbnb Inc · Data Scientist - Algorithms, Community Support** · included in roles.json; run the scorer, then spend application time on the Applies only
- **Attentive Mobile Inc · Senior Machine Learning Engineer** · included in roles.json; run the scorer, then spend application time on the Applies only
- **Cellanome Inc · Machine Learning Engineer** · included in roles.json; run the scorer, then spend application time on the Applies only
- **FourKites Inc · Senior AI Engineer** · included in roles.json; run the scorer, then spend application time on the Applies only

### Blocked at Gate B, liveness unknown, run the check before anything else (0)

_none_

### No sponsorship record found, networking target, not an application target (3)

- **Anthropic · Data Engineer** · no sponsorship record found (no-sponsor-record), which is not the same as a record of non-sponsorship; informational interview before any application
- **Scale AI · Machine Learning Research Scientist, Evaluations** · no sponsorship record found (no-sponsor-record), which is not the same as a record of non-sponsorship; informational interview before any application
- **Vercel Inc · Software Engineer, AI SDK** · no sponsorship record found (empty-approvals-cell), which is not the same as a record of non-sponsorship; informational interview before any application

### Dropped by the calendar, factor 0, reallocate the time today (0)

_none_

## Run summary

- Roles in: 10
- Scored: 7
- Skipped before scoring: 3 (0 by the calendar, 3 with no sponsorship record, 0 blocked on liveness)
- Pre-scorer skip rate: 0.3

A healthy run skips at least half of what it evaluates. A low skip rate here is a reason to distrust the target list, not a reason to celebrate.

## What this run did not verify

- Liveness is not fetched here. This tool reads a liveness value you obtained from npm run ats:liveness; it never invents one, and a role without one is held at the gate.
- Fit is a model judgment supplied in the targets file. No CV is read and no resume file is touched.
- Sponsorship tier or approval count is a record. The mapping from that record to a probability is an operator assumption, not a record, and the emitted sponsorship term is labelled your-input for that reason.
- Sponsorship evidence is company-wide when the CSV has no SOC column, so it says nothing about the target occupation specifically.
- Funding (Form D) is reported here and weighted nowhere: scripts/score/role-scorer.mjs has no funding term.
- The scorer treats a gate at or below its gate_zero (0.05 in the shipped CONFIG) as closed, so any timeline factor in (0, 0.05] is a Skip there even though this run keeps the role.
- Company joins are exact after suffix normalisation, with no fuzzy matching. A subsidiary filed under a different legal name will read as "no record" rather than as a non-sponsor.
- Form D coverage is the shipped sample only; full quarters are gitignored, so absence of a filing is absence of evidence.
- Role quality is reported but weighted 0.0 by scripts/score/role-scorer.mjs, so it changes no Apply/Consider/Skip outcome in this run.
- expected_days_to_start is an estimate you supply per role, not an employer-published figure.
- This run does not rule on STEM eligibility, does not compute your unemployment ceiling, and is not immigration advice.

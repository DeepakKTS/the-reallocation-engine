# Domain justification: opt-start-window

## Who uses this, and in exactly what situation

An international master's student completing an M.S. in December 2026, targeting
AI/ML and data roles under SOC 15-2051 and 15-1252 with a January 2027 start,
whose post-completion OPT begins in the same month the role would begin. The
unemployment clock has not started yet. It starts in the new year, part-way
through processes that are already running.

A student in that exact position would recognise the workflow immediately,
because its central question is one they cannot answer any other way: of two
postings with the same sponsorship record and the same wage band, which one can
finish before the clock that starts in January runs down.

## The information asymmetry

From outside a company a student cannot see how long its hiring process takes,
and the engine's existing components do not ask. Sponsorship history, funding,
liveness and wage data all describe the employer. None of them describes the
calendar, which is the one constraint that belongs to the student alone.

The asymmetry is sharper for a December graduate than for a mid-OPT one. For a
student already on OPT, every week of process costs a day of the ceiling, and
the arithmetic is uniform. For a December graduate the same process costs nothing
before the OPT start date and a day per day afterwards, so the cost of a slow
employer depends on when the process starts. Two identical postings are not worth
the same hour, and nothing visible on either posting says which is which.

The second asymmetry is one the engine can create by accident. A company absent
from the sponsorship dataset looks exactly like a company that does not sponsor,
and a pipeline that scores it 0 produces a confident Skip from no evidence at all.
In the shipped 80 Days data this is the common case, not the edge case: the
`Total Approvals` cell is empty for 28,812 of 30,369 companies (94.9%), and the
first version of this prototype read every one of those empty cells as a recorded
zero. This recipe separates the cases: absence and an empty cell route to
networking, and only an explicit recorded zero is scored.

## How it connects to the engine

It produces the Chapter 10 gate that the Chapter 11 scorer already consumes.
Chapter 10 specifies a factor computed from eight intake fields and insists the
output is always the factor and the dates behind it;
`scripts/score/role-scorer.mjs` takes that factor as `your-input` and nothing in
the repository produces it. This fills that step and hands the result to the
existing scorer rather than scoring anything itself. Along the way it reads the
80 Days sponsorship data as a vote, consumes liveness from
`npm run ats:liveness`, and shows the Form D samples and the compact BLS table to
the person without weighting either, because the scorer has no funding term and
weights role quality 0.0.

## Where it fits the 3-3-2 day

It takes over the research half of the two research-and-apply hours: deciding
which postings are worth tailoring for, and in what order.

Done by hand, triaging a dozen postings means a sponsorship lookup, a liveness
check and a calendar estimate per role, at roughly ten to fifteen minutes each, so
two to three hours a week for a list that turns over. The script does the
sponsorship lookup and the calendar arithmetic for the whole list in one command;
the liveness check stays a separate command the person runs. **Estimate, labelled
as an estimate: about 1.5 to 2 hours a week saved**, from the arithmetic above
less the liveness checks that stay manual. Nobody timed it.

It feeds both other blocks. The networking bucket is a direct input to the three
networking hours: it holds live postings at companies the data has no sponsorship
evidence for (3 of 10 in the real run), where a conversation can find out what a
missing record cannot. The dropped list returns time to
the credibility block, and the dropped roles are usually the ones that felt
exciting, which is the point.

## Failure modes specific to this domain

**A plausible `expected_days_to_start` moves a role across a gate, and nothing
marks it as the weakest input.** It is the one field with no record behind it and
the most leverage over the output: at the persona's dates, 180 days yields 0.467
and 200 yields 0. A student who estimates optimistically gets a clean report full of
Applies with full provenance on every other term, and the one guess is what moved
the decision. The person least able to catch it is the student who has never been
through a US hiring process and has no felt sense of how long a loop takes, which
is most first-year international master's students. The run publishes the
projected start date next to the factor so the error is visible as a calendar
claim rather than a number, but it cannot detect it.

**A subsidiary or a renamed employer reads as "no record".** Company matching is
exact after legal-suffix normalisation, with no fuzzy matching, which is the safe
direction: a missed match sends a real sponsor to the networking list, costing an
application. The inverse error would be worse. The person least able to catch it
is the student targeting large employers that file under holding-company names,
because the miss is silent and looks like a dataset gap rather than a join bug.
Checking means knowing the legal entity name, which is exactly the thing an
outsider does not know. The real data showed the inverse error is possible too:
the normaliser strips `holdings` and `technologies`, so "Ramp" joins
`RAMP HOLDINGS INC` and "Plaid" joins `PLAID TECHNOLOGIES INC`. Both joins look
right; neither was verified, and a wrong one would score a company on another
entity's record.

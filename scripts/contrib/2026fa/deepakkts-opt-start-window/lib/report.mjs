// The human half of the output contract.
//
// The JSON log is for the agent: complete, flat, every term labelled. This file
// is for the person: it leads with the dates, because a timeline factor without
// its dates is a number nobody can defend.

const LABEL = { record: 'record', 'model-judgment': 'model-judgment', 'your-input': 'your-input' };

function pct(n) { return n === null || n === undefined ? 'n/a' : String(n); }

export function renderMarkdown(run) {
  const L = [];
  L.push(`# OPT start-window run: ${run.run_id}`);
  L.push('');
  L.push(`Recipe: \`${run.recipe}\` v${run.recipe_version} · status ${run.recipe_status}`);
  L.push(`Generated: ${run.generated_at} · as_of date used for all arithmetic: **${run.intake.as_of}**`);
  L.push('');

  L.push('## Sources actually read');
  L.push('');
  L.push('| What | Path | sha256 (16) |');
  L.push('| --- | --- | --- |');
  for (const s of run.sources) L.push(`| ${s.what} | \`${s.path}\` | ${s.sha256 || 'n/a'} |`);
  L.push('');
  if (run.sources.some((s) => s.note)) {
    for (const s of run.sources.filter((x) => x.note)) L.push(`- ${s.what}: ${s.note}`);
    L.push('');
  }

  L.push('## Intake echoed back (every field is your-input)');
  L.push('');
  L.push('| Field | Value |');
  L.push('| --- | --- |');
  for (const [k, v] of Object.entries(run.intake)) L.push(`| ${k} | ${v} |`);
  L.push('');
  L.push('Check these against your I-20 and EAD before you trust a single factor below. ' +
    'A wrong authorisation date is the one error in this whole pipeline that costs the search rather than one application. ' +
    'This run does not rule on STEM eligibility or give immigration advice; `stem_eligible` is echoed exactly as you supplied it, ' +
    'and anything legal belongs with your DSO or an attorney.');
  L.push('');

  L.push('## Timeline factor per role, with the dates that produced it');
  L.push('');
  L.push('| Role | Expected days to start | Projected start | Auth end | Unemployment days after this process | Factor | Why |');
  L.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of run.roles) {
    const t = r.timeline.trace;
    L.push(`| ${r.company} · ${r.title} | ${t.expected_days_to_start} | ${t.projected_start} | ${t.auth_end_date} | ${t.projected_unemployment_total} of ${t.unemployment_ceiling_days} | **${r.timeline.factor}** | ${r.timeline.reason} |`);
  }
  L.push('');

  L.push('## Evidence per role, every term labelled');
  L.push('');
  L.push('| Role | Sponsorship evidence (record) | P(sponsorship) | Label | Tier emitted | Funding | Label | Liveness | Label | Timeline | Label | Role quality |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of run.roles) {
    const ev = r.terms.sponsorship.evidence;
    const evCell = ev.status === 'ok'
      ? (ev.approvals !== null ? `${ev.approvals} approvals` : `tier ${ev.tier}`)
      : `missing: ${ev.reason}`;
    L.push(
      `| ${r.company} | ${evCell} | ${pct(r.terms.sponsorship.value)} | ${LABEL[r.terms.sponsorship.source] || r.terms.sponsorship.source} ` +
      `| ${r.terms.sponsorship.tier_emitted || (r.terms.sponsorship.tier_note ? `none (${r.terms.sponsorship.tier_note})` : 'none')} ` +
      `| ${pct(r.terms.funding.value)} | ${r.terms.funding.source} | ${pct(r.terms.liveness.value)} | ${r.terms.liveness.source} ` +
      `| ${pct(r.terms.timeline.value)} | ${r.terms.timeline.source} | ${r.role_quality.summary} |`,
    );
  }
  L.push('');
  L.push('Role quality is reported here and nowhere else: the composite in `scripts/score/role-scorer.mjs` carries ' +
    '`role_quality: 0.0`, so the wage and ability columns change no decision. They are shown so a human can overrule ' +
    'a borderline Consider on grounds the scorer does not weigh.');
  L.push('');

  L.push('## Fit-rescue warnings');
  L.push('');
  if (run.flags.fit_rescue_skipped) {
    L.push(`Not checked. ${run.flags.fit_rescue_skipped}.`);
  } else {
    L.push(`Rule: ${run.flags.fit_rescue_rule}. A role flagged here is held up by fit more than by sponsorship, ` +
      'and fit is a model judgment, not a record. Chapter 11 calls this the central scoring error.');
    L.push('');
    if (run.flags.fit_rescue.length === 0) L.push('_none flagged_');
    for (const f of run.flags.fit_rescue) L.push(`- **${f.company}**, sponsorship ${f.sponsorship} (contributes ${f.sponsorship_contribution}), fit ${f.fit} (contributes ${f.fit_contribution})`);
  }
  L.push('');

  L.push('## Where each role goes next');
  L.push('');
  for (const [bucket, label] of [
    ['scored', 'Scored, hand the roles file to `npm run score` and spend the Chapter 2 two hours on the Applies'],
    ['needs_liveness', 'Blocked at Gate B, liveness unknown, run the check before anything else'],
    ['network', 'No sponsorship record found, networking target, not an application target'],
    ['dropped', 'Dropped by the calendar, factor 0, reallocate the time today'],
  ]) {
    const rows = run.buckets[bucket];
    L.push(`### ${label} (${rows.length})`);
    L.push('');
    if (rows.length === 0) { L.push('_none_'); L.push(''); continue; }
    for (const r of rows) L.push(`- **${r.company} · ${r.title}** · ${r.next_action}`);
    L.push('');
  }

  L.push('## Run summary');
  L.push('');
  L.push(`- Roles in: ${run.counts.in}`);
  L.push(`- Scored: ${run.counts.scored}`);
  L.push(`- Skipped before scoring: ${run.counts.in - run.counts.scored} (${run.counts.dropped} by the calendar, ${run.counts.network} with no sponsorship record, ${run.counts.needs_liveness} blocked on liveness)`);
  L.push(`- Pre-scorer skip rate: ${run.counts.skip_rate}`);
  L.push('');
  L.push('A healthy run skips at least half of what it evaluates. A low skip rate here is a reason to distrust the ' +
    'target list, not a reason to celebrate.');
  L.push('');

  L.push('## What this run did not verify');
  L.push('');
  for (const item of run.not_verified) L.push(`- ${item}`);
  L.push('');
  return L.join('\n');
}

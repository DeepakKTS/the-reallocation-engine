// Offline test suite. No network and no repo data: every input is a fixture in
// ../fixtures. The two command-line gate tests also run the repository's own
// scorer (scripts/score/role-scorer.mjs) as a subprocess, over a fixture.
// Run from the repo root with:
//   node --test scripts/contrib/2026fa/deepakkts-opt-start-window/test/opt-start-window.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateIntake, timelineFactor, IntakeError } from '../lib/timeline.mjs';
import {
  discoverSponsorsCsv, indexSponsors, lookupSponsorship, sponsorshipProbability,
  parseFormDDate, loadFormDIndex, lookupFunding, loadSocTable, lookupSoc, SourceError,
} from '../lib/sources.mjs';
import { loadExampleRoles, discoverRoleSchema, mapTier, SchemaError } from '../lib/schema.mjs';
import { assertTimelineIsAGate, assertClosedGate, buildGateProbe, GateViolation } from '../lib/gate.mjs';
import { runPipeline, gateCheck } from '../run.mjs';
import { scoreRole as brokenScoreRole } from '../fixtures/BROKEN-additive-gate-scorer.mjs';
import { buildRoleSingleField } from '../fixtures/BROKEN-single-value-field-schema.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, '..', 'fixtures');
const REPO = join(HERE, '..', '..', '..', '..', '..');
const SCORER_CONFIG = JSON.parse(readFileSync(join(FIX, 'role-scores.fixture.json'), 'utf8')).config;

function fixtureSchema() {
  return discoverRoleSchema(loadExampleRoles(join(FIX, 'example-roles.fixture.json')));
}

// The emitted-key-name check. The gate field name is read straight from the
// example file's own timeline entry, not from the schema learner under test.
function assertTimelineZeroUnderGateField(role, example) {
  const exampleTimeline = example.roles[0].timeline;
  const gateField = ['factor', 'multiplier', 'value'].find((f) => f in exampleTimeline);
  assert.ok(role.timeline && typeof role.timeline === 'object', 'timeline term missing from emitted role');
  assert.equal(role.timeline[gateField], 0, `timeline 0 must be written under "${gateField}"`);
  assert.deepEqual(Object.keys(role.timeline).filter((k) => k !== gateField && k !== 'source'), [], 'no other number field on the gate');
}

const INTAKE = {
  as_of: '2026-10-03',
  auth_type: 'OPT',
  auth_start_date: '2027-01-15',
  auth_end_date: '2028-01-18',
  unemployment_days_used: 0,
  unemployment_ceiling_days: 90,
  buffer_target_days: 60,
  stem_eligible: true,
};

function pipeline(extra = {}) {
  const out = mkdtempSync(join(tmpdir(), 'osw-'));
  return runPipeline({
    repoRoot: FIX,
    intake: join(FIX, 'intake.sample.json'),
    targets: join(FIX, 'targets.sample.json'),
    sponsorsCsv: join(FIX, 'sponsors.fixture.csv'),
    formdDir: join(FIX, 'formd'),
    socCsv: join(FIX, 'soc.fixture.csv'),
    example: join(FIX, 'example-roles.fixture.json'),
    scorerConfig: join(FIX, 'role-scores.fixture.json'),
    outDir: out,
    ...extra,
  });
}

test('timeline: work that finishes before the clock starts costs no unemployment days', () => {
  const intake = validateIntake(INTAKE);
  const r = timelineFactor(intake, 45);
  assert.equal(r.factor, 1);
  assert.equal(r.reason, 'inside-buffer');
  assert.equal(r.trace.unemployment_days_added_by_this_process, 0);
  assert.equal(r.trace.projected_start, '2026-11-17');
});

test('timeline: a process that eats into the buffer is kept and penalised', () => {
  // 2026-10-03 + 180 days = 2027-04-01; 2027-01-15 to 2027-04-01 is 76 days;
  // (90 - 76) / (90 - 60) = 0.4667, rounded to 0.467.
  const intake = validateIntake(INTAKE);
  const r = timelineFactor(intake, 180);
  assert.equal(r.reason, 'eats-into-buffer');
  assert.equal(r.trace.projected_start, '2027-04-01');
  assert.equal(r.trace.projected_unemployment_total, 76);
  assert.equal(r.factor, 0.467);
});

test('timeline: breaching the unemployment ceiling gates to zero', () => {
  const intake = validateIntake(INTAKE);
  const r = timelineFactor(intake, 200);
  assert.equal(r.factor, 0);
  assert.equal(r.reason, 'exceeds-unemployment-ceiling');
});

test('timeline: a start past the authorisation cliff gates to zero', () => {
  const intake = validateIntake(INTAKE);
  const r = timelineFactor(intake, 500);
  assert.equal(r.factor, 0);
  assert.equal(r.reason, 'start-past-auth-end');
});

test('timeline: every factor carries the dates that produced it', () => {
  const intake = validateIntake(INTAKE);
  const r = timelineFactor(intake, 180);
  for (const k of ['as_of', 'projected_start', 'auth_end_date', 'unemployment_ceiling_days', 'buffer_target_days']) {
    assert.ok(r.trace[k] !== undefined, `trace is missing ${k}`);
  }
});

test('intake: a malformed date is rejected, not coerced', () => {
  assert.throws(() => validateIntake({ ...INTAKE, auth_end_date: '2027-02-31' }), IntakeError);
  assert.throws(() => validateIntake({ ...INTAKE, auth_end_date: '18-01-2028' }), IntakeError);
});

test('intake: an authorisation end date already in the past stops the run', () => {
  assert.throws(
    () => validateIntake({ ...INTAKE, auth_start_date: '2025-01-01', auth_end_date: '2026-01-01' }),
    /on or before as_of/,
  );
});

test('intake: STEM eligibility must be supplied explicitly and is never inferred', () => {
  const { stem_eligible, ...withoutStem } = INTAKE;
  assert.throws(() => validateIntake(withoutStem), IntakeError);
  assert.throws(() => validateIntake({ ...INTAKE, stem_eligible: 'probably' }), /DSO|attorney/);
});

test('sources: an unusable CSV header stops the run and prints what it saw', () => {
  try {
    discoverSponsorsCsv(FIX, join(FIX, 'sponsors-badheader.fixture.csv'));
    assert.fail('expected a SourceError');
  } catch (err) {
    assert.ok(err instanceof SourceError);
    assert.deepEqual(err.detail.rejected[0].header, ['col_a', 'col_b', 'col_c']);
  }
});

test('schema: the value field is learned per term, p for votes and factor for gates', () => {
  const schema = fixtureSchema();
  assert.equal(schema.keys.sponsorship, 'sponsorship');
  assert.equal(schema.keys.timeline, 'timeline');
  assert.equal(schema.terms.sponsorship.valueField, 'p');
  assert.equal(schema.terms.fit.valueField, 'p');
  assert.equal(schema.terms.liveness.valueField, 'factor');
  assert.equal(schema.terms.timeline.valueField, 'factor');
  assert.equal(schema.terms.timeline.sourceField, 'source');
  assert.equal(schema.terms.sponsorship.tierField, 'tier');
  assert.deepEqual([...schema.tierVocabulary].sort(), ['Likely', 'None', 'Proven']);
});

test('schema: a term whose number field cannot be determined stops with the observed keys', () => {
  const example = loadExampleRoles(join(FIX, 'example-roles-unmappable-gate.fixture.json'));
  try {
    discoverRoleSchema(example);
    assert.fail('expected a SchemaError');
  } catch (err) {
    assert.ok(err instanceof SchemaError);
    assert.equal(err.detail.term, 'timeline');
    assert.deepEqual(err.detail.observedKeys, ['weird', 'source']);
  }
});

test('gate fields: a timeline of 0 is emitted under the gate field the scorer reads', () => {
  const example = loadExampleRoles(join(FIX, 'example-roles.fixture.json'));
  const probe = buildGateProbe(discoverRoleSchema(example));
  assertTimelineZeroUnderGateField(probe, example);
  assert.equal(probe.liveness.factor, 1);
  assert.equal(probe.sponsorship.p, 0.95);
});

test('gate fields, regression: the old single-field emitter fails the same check', () => {
  const example = loadExampleRoles(join(FIX, 'example-roles.fixture.json'));
  const old = buildRoleSingleField(example, {
    sponsorship: { value: 0.95, source: 'your-input' },
    fit: { value: 0.95, source: 'your-input' },
    liveness: { value: 1, source: 'your-input' },
    timeline: { value: 0, source: 'your-input' },
  });
  assert.deepEqual(old.timeline, { p: 0, source: 'your-input' });
  assert.throws(() => assertTimelineZeroUnderGateField(old, example), assert.AssertionError);
});

test('schema: an unmappable example stops the run instead of writing a bad roles file', () => {
  assert.throws(() => discoverRoleSchema({ roles: [{ alpha: 1, beta: 2 }], path: 'synthetic' }), SchemaError);
});

test('pipeline: roles land in the right buckets and the skip rate is reported', () => {
  const { run } = pipeline();
  assert.equal(run.counts.in, 7);
  assert.equal(run.counts.scored, 3);
  assert.equal(run.counts.dropped, 2);
  assert.equal(run.counts.needs_liveness, 1);
  assert.equal(run.counts.network, 1);
  assert.equal(run.counts.skip_rate, 0.57);
});

test('pipeline: a company with no sponsorship record becomes a networking target, not a zero', () => {
  const { run } = pipeline();
  const vantage = run.roles.find((r) => r.company.startsWith('Vantage'));
  assert.equal(vantage.bucket, 'network');
  assert.equal(vantage.terms.sponsorship.value, null);
  assert.equal(vantage.terms.sponsorship.source, 'missing');
  assert.match(vantage.next_action, /not the same as a record of non-sponsorship/);
});

test('pipeline: an unchecked posting is held at the liveness gate with the command to run', () => {
  const { run } = pipeline();
  const pellucid = run.roles.find((r) => r.company.startsWith('Pellucid'));
  assert.equal(pellucid.bucket, 'needs_liveness');
  assert.equal(pellucid.terms.liveness.value, null);
  assert.match(pellucid.next_action, /npm run ats:liveness/);
});

test('occupation: bls_soc_code lookup keeps the .00 base row and records the skipped detailed rows', () => {
  const table = loadSocTable(FIX, join(FIX, 'soc.fixture.csv'));
  assert.equal(table.socCol, 'bls_soc_code');
  const hit = lookupSoc(table, '15-2051');
  assert.equal(hit.status, 'ok');
  assert.equal(hit.row.title, 'Data Scientists');
  assert.deepEqual(hit.detailed_rows_skipped.map((r) => r.title), ['Business Intelligence Analysts', 'Clinical Data Managers']);
  const ambiguous = lookupSoc(table, '99-9998');
  assert.equal(ambiguous.status, 'missing');
  assert.equal(ambiguous.reason, 'no-single-base-row');
  assert.equal(ambiguous.candidate_rows.length, 2);
  assert.equal(lookupSoc(table, '15-9999').reason, 'no-occupation-row');
});

test('pipeline: a missing occupation row empties role quality and never substitutes zero', () => {
  const { run } = pipeline();
  const lakeview = run.roles.find((r) => r.company.startsWith('Lakeview'));
  assert.equal(lakeview.role_quality.status, 'ok');
  const quarry = run.roles.find((r) => r.company.startsWith('Quarrystone'));
  assert.equal(quarry.soc_code, '15-2051');
  const { run: run2 } = pipeline({ socCsv: join(FIX, 'sponsors-badheader.fixture.csv') });
  for (const r of run2.roles) {
    assert.equal(r.role_quality.status, 'missing');
    assert.equal(r.role_quality.value, undefined);
  }
});

test('form d: dates like 31-MAR-2026 parse exactly and anything else is rejected', () => {
  assert.equal(parseFormDDate('31-MAR-2026'), '2026-03-31');
  assert.equal(parseFormDDate('14-JUN-2026'), '2026-06-14');
  assert.equal(parseFormDDate('2026-06-14'), null);
  assert.equal(parseFormDDate('31-FEB-2026'), null);
  assert.equal(parseFormDDate('31-Mar-2026'), null);
  assert.equal(parseFormDDate(null), null);
});

test('form d: the loader reads companies[].company.name and reports rejected dates', () => {
  const { index, audit } = loadFormDIndex([join(FIX, 'formd', 'formd.fixture.json')]);
  assert.equal(index.size, 4);
  assert.equal(audit.records, 4);
  assert.deepEqual(audit.dates_rejected.map((d) => d.raw).sort(), ['2026-06-14', '31-FEB-2026']);
  const bad = lookupFunding(index, 'Brightwater Example Fund', '2026-10-03', 540);
  assert.equal(bad.status, 'missing');
  assert.equal(bad.reason, 'form-d-date-unparseable');
  const good = lookupFunding(index, 'Harborline Robotics, Inc.', '2026-10-03', 540);
  assert.equal(good.filing_date, '2026-06-14');
  assert.equal(good.days_since_filing, 111);
});

test('form d: zero issuers from a non-empty set of files fails loudly', () => {
  try {
    loadFormDIndex([join(FIX, 'formd-oldshape', 'oldshape.fixture.json')]);
    assert.fail('expected a SourceError');
  } catch (err) {
    assert.ok(err instanceof SourceError);
    assert.match(err.message, /zero issuers indexed/);
    assert.equal(err.detail.unrecognised_files.length, 1);
  }
});

test('pipeline: a missing Form D match omits the term rather than scoring it zero', () => {
  const { run } = pipeline();
  const cedarmill = run.roles.find((r) => r.company.startsWith('Cedarmill'));
  assert.equal(cedarmill.terms.funding.value, null);
  assert.equal(cedarmill.terms.funding.basis, 'no-form-d-match');
  const harborline = run.roles.find((r) => r.company.startsWith('Harborline'));
  assert.equal(harborline.terms.funding.value, 1);
  assert.equal(harborline.terms.funding.source, 'record');
});

test('approvals: an empty cell is missing evidence and only an explicit 0 is a recorded zero', () => {
  const src = discoverSponsorsCsv(FIX, join(FIX, 'sponsors.fixture.csv'));
  const idx = indexSponsors(src);
  const empty = lookupSponsorship(idx, src, 'Ironbark Example Labs', '15-2051');
  assert.equal(empty.status, 'missing');
  assert.equal(empty.reason, 'empty-approvals-cell');
  assert.equal(sponsorshipProbability(empty).value, null);
  const zero = lookupSponsorship(idx, src, 'Lakeview Mutual Holdings', '15-2051');
  assert.equal(zero.status, 'ok');
  assert.equal(zero.approvals, 0);
  assert.equal(sponsorshipProbability(zero).value, 0);
  const { run } = pipeline();
  assert.match(run.sources[0].note, /approvals cell empty in 1 of 7 rows/);
});

test('tier: emitted in the scorer vocabulary, and omitted with a reason when it has no match', () => {
  const schema = fixtureSchema();
  assert.equal(mapTier(schema, 'proven').tier, 'Proven');
  assert.equal(mapTier(schema, 'likely').tier, 'Likely');
  assert.equal(mapTier(schema, 'none').tier, 'None');
  const occ = mapTier(schema, 'occasional');
  assert.equal(occ.tier, null);
  assert.match(occ.note, /omitted rather than guessed/);
  const { paths } = pipeline();
  const written = JSON.parse(readFileSync(paths.roles, 'utf8'));
  const harborline = written.find((r) => r.company.startsWith('Harborline'));
  assert.deepEqual(harborline.sponsorship, { p: 0.9, tier: 'Proven', source: 'your-input' });
  assert.equal(written.find((r) => r.company.startsWith('Cedarmill')).sponsorship.tier, 'Likely');
  assert.deepEqual(harborline.timeline, { factor: 1, source: 'your-input' });
});

test('pipeline: calendar-dropped roles never reach the roles file', () => {
  const { run, scorerRoles, paths } = pipeline();
  assert.equal(scorerRoles.length, 3);
  const written = JSON.parse(readFileSync(paths.roles, 'utf8'));
  assert.equal(written.length, 3);
  const names = written.map((r) => r.company);
  assert.ok(!names.some((n) => n.startsWith('Northgate')));
  assert.ok(!names.some((n) => n.startsWith('Quarrystone')));
  assert.equal(run.buckets.dropped.length, 2);
});

test('pipeline: fit rescuing a non-sponsor is flagged by name, using the scorer weights', () => {
  const { run } = pipeline();
  assert.equal(run.flags.fit_rescue.length, 1);
  assert.equal(run.flags.fit_rescue[0].company, 'Lakeview Mutual Holdings');
  assert.equal(run.flags.fit_rescue[0].sponsorship, 0);
  assert.equal(run.flags.fit_rescue[0].fit_contribution, 0.246);
  assert.match(run.flags.fit_rescue_rule, /fit x 0\.3 > sponsorship x 0\.35/);
});

test('config: the fit-rescue check follows the weights in the scorer config, not constants', () => {
  const dir = mkdtempSync(join(tmpdir(), 'osw-cfg-'));
  const cfgPath = join(dir, 'role-scores.json');
  writeFileSync(cfgPath, JSON.stringify({ config: { ...SCORER_CONFIG, weights: { sponsorship: 0.35, fit: 0, role_quality: 0 } } }));
  const { run } = pipeline({ scorerConfig: cfgPath });
  assert.equal(run.flags.fit_rescue.length, 0);
  assert.match(run.flags.fit_rescue_rule, /fit x 0 > sponsorship x 0\.35/);
});

test('config: with no config block the fit-rescue check is skipped and the report says so', () => {
  const { run, paths } = pipeline({ scorerConfig: join(FIX, 'role-scores-noconfig.fixture.json') });
  assert.equal(run.flags.fit_rescue.length, 0);
  assert.equal(run.flags.fit_rescue_rule, null);
  assert.match(run.flags.fit_rescue_skipped, /no weights were assumed/);
  assert.match(readFileSync(paths.markdown, 'utf8'), /Not checked\./);
});

test('pipeline: the written report shows the dates behind every factor', () => {
  const { paths } = pipeline();
  const md = readFileSync(paths.markdown, 'utf8');
  assert.match(md, /Projected start/);
  assert.match(md, /2027-04-01/);
  assert.match(md, /What this run did not verify/);
});

test('privacy: the written JSON log carries no absolute path from inside the repository', () => {
  const { paths } = pipeline();
  const text = readFileSync(paths.json, 'utf8');
  assert.ok(!text.includes(FIX), 'absolute fixture path leaked into the JSON log');
  assert.equal(JSON.parse(text).repo_root, '.');
});

test('break attempt: the gate assertion fails the mutated scorer', () => {
  assert.throws(() => assertTimelineIsAGate(brokenScoreRole, fixtureSchema(), { threshold: SCORER_CONFIG.gate_zero }), GateViolation);
});

test('break attempt: the gate assertion passes a scorer that zeroes a closed gate', () => {
  const result = assertTimelineIsAGate(() => ({ composite: 0 }), fixtureSchema(), { threshold: SCORER_CONFIG.gate_zero });
  assert.equal(result.ok, true);
});

test('break attempt: with no threshold from the scorer the assertion refuses to judge', () => {
  assert.throws(() => assertClosedGate(0, undefined, {}), /No closed-gate threshold/);
});

test('gate check via the CLI: the repository scorer closes a zeroed timeline gate', () => {
  const res = gateCheck({ repoRoot: REPO, example: join(FIX, 'example-roles.fixture.json') });
  assert.equal(res.ok, true);
  assert.equal(res.timelineMultiplier, 0);
  assert.equal(res.composite, 0);
  assert.equal(res.threshold, 0.05);
  assert.equal(res.recommendation, 'Skip');
});

test('gate check via the CLI: the mutant scorer run the same way is caught', () => {
  try {
    gateCheck({ repoRoot: REPO, example: join(FIX, 'example-roles.fixture.json'), scorer: join(FIX, 'BROKEN-additive-gate-scorer.mjs') });
    assert.fail('expected a GateViolation');
  } catch (err) {
    assert.ok(err instanceof GateViolation, String(err));
    assert.equal(err.detail.composite, 0.7675);
  }
});

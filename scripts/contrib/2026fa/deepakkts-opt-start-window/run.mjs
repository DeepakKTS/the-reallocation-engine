#!/usr/bin/env node
// opt-start-window, turn an OPT intake plus a target list into a scorer-ready
// roles file, with every timeline factor carrying the dates that produced it.
//
// One command from the repo root:
//   node scripts/contrib/2026fa/deepakkts-opt-start-window/run.mjs \
//     --intake scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/intake.sample.json \
//     --targets scripts/contrib/2026fa/deepakkts-opt-start-window/fixtures/targets.sample.json \
//     --out-dir course/2026fa/submissions/deepakkts/runs
//
// Exit codes: 0 ran, 2 source or schema problem, 3 nothing scorable.

import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateIntake, timelineFactor, iso, IntakeError } from './lib/timeline.mjs';
import {
  discoverSponsorsCsv, indexSponsors, lookupSponsorship, sponsorshipProbability,
  discoverFormDSamples, loadFormDIndex, lookupFunding,
  loadSocTable, lookupSoc, sha256, relPath, SourceError, TIER_PROBABILITY,
} from './lib/sources.mjs';
import { loadExampleRoles, discoverRoleSchema, buildRole, wrapRoles, mapTier, SchemaError } from './lib/schema.mjs';
import { renderMarkdown } from './lib/report.mjs';
import { buildGateProbe, assertClosedGate, GateViolation } from './lib/gate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const RECIPE = 'recipes/cases/2026fa/deepakkts-opt-start-window.md';
export const RECIPE_VERSION = '0.1.0';
export const RECIPE_STATUS = 'RUNNABLE-SAMPLE';

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq > -1) { args[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { args[a.slice(2)] = true; } else { args[a.slice(2)] = next; i++; }
  }
  return args;
}

function round4(x) { return Math.round(x * 10000) / 10000; }

function readJson(path, what) {
  if (!existsSync(path)) throw new SourceError(`${what} not found at ${path}`, { path });
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch (err) {
    throw new SourceError(`${what} at ${path} is not valid JSON: ${err.message}`, { path });
  }
}

function validateTargets(raw) {
  const roles = Array.isArray(raw) ? raw : raw.roles;
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new SourceError('targets file must contain a non-empty roles array', {});
  }
  roles.forEach((r, i) => {
    if (!r.company) throw new SourceError(`targets[${i}] has no company`, { role: r });
    if (r.expected_days_to_start === undefined) {
      throw new SourceError(`targets[${i}] (${r.company}) has no expected_days_to_start. It is your-input and is never guessed.`, { role: r });
    }
    const fit = Number(r.fit);
    if (!Number.isFinite(fit) || fit < 0 || fit > 1) {
      throw new SourceError(`targets[${i}] (${r.company}) needs a fit between 0 and 1. Fit is a model judgment you supply; this tool does not read your resume.`, { role: r });
    }
  });
  return roles;
}

// Run the scorer the way scripts/score/gate-harness.mjs does: as a subprocess
// over a roles file in a temp directory, always with --out-dir, then read the
// role-scores.json it writes. role-scorer.mjs exports nothing and runs main() on
// import, so importing it is not an option.
export function runScorerCli(scorerPath, rolesPayload) {
  if (!existsSync(scorerPath)) throw new SourceError(`scorer not found at ${scorerPath}`, { scorerPath });
  const tmp = mkdtempSync(join(tmpdir(), 'osw-scorer-'));
  const rolesFile = join(tmp, 'roles.json');
  writeFileSync(rolesFile, JSON.stringify(rolesPayload, null, 2));
  try {
    execFileSync(process.execPath, [scorerPath, rolesFile, '--out-dir', tmp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    throw new SourceError(`scorer exited non-zero: ${(err.stderr || err.message || '').trim()}`, { scorerPath });
  }
  const outFile = join(tmp, 'role-scores.json');
  if (!existsSync(outFile)) throw new SourceError('scorer wrote no role-scores.json', { scorerPath, tmp });
  return { parsed: JSON.parse(readFileSync(outFile, 'utf8')), outFile };
}

// The weights come from the config block the scorer writes into role-scores.json:
// either a file you name with --scorer-config, or a probe run of the scorer CLI.
// If no config block is available the fit-rescue check is skipped and the report
// says so. There is no hardcoded fallback.
export function readScorerConfig({ repoRoot, scorerConfig, scorer, example, schema }) {
  if (scorerConfig) {
    const path = resolve(scorerConfig);
    const parsed = readJson(path, 'scorer output (--scorer-config)');
    return { config: parsed.config ?? null, from: `${relPath(repoRoot, path)} (config block)` };
  }
  const scorerPath = resolve(scorer || join(repoRoot, 'scripts', 'score', 'role-scorer.mjs'));
  if (!existsSync(scorerPath)) return { config: null, from: `no scorer at ${relPath(repoRoot, scorerPath)} and no --scorer-config` };
  const { parsed } = runScorerCli(scorerPath, wrapRoles(example, [buildGateProbe(schema)]));
  return { config: parsed.config ?? null, from: `${relPath(repoRoot, scorerPath)} (config block of role-scores.json from a probe run)` };
}

export function runPipeline(opts) {
  const repoRoot = resolve(opts.repoRoot || process.cwd());
  const asOfOverride = opts.asOf || null;

  const intakeRaw = readJson(resolve(opts.intake), 'intake file');
  if (asOfOverride) intakeRaw.as_of = asOfOverride;
  const intake = validateIntake(intakeRaw);
  const targets = validateTargets(readJson(resolve(opts.targets), 'targets file'));

  const sponsors = discoverSponsorsCsv(repoRoot, opts.sponsorsCsv ? resolve(opts.sponsorsCsv) : null);
  const sponsorIndex = indexSponsors(sponsors);
  const formD = discoverFormDSamples(repoRoot, opts.formdDir ? resolve(opts.formdDir) : null);
  const { index: formDIndex, audit: formDAudit } = loadFormDIndex(formD.files);
  const socTable = loadSocTable(repoRoot, opts.socCsv ? resolve(opts.socCsv) : null);

  const example = loadExampleRoles(resolve(opts.example || join(repoRoot, 'data', 'examples', 'ch11-roles.json')));
  const schema = discoverRoleSchema(example);

  const scorerCfg = readScorerConfig({ repoRoot, scorerConfig: opts.scorerConfig, scorer: opts.scorer, example, schema });
  const weights = scorerCfg.config?.weights;
  const rescueWeights = weights && Number.isFinite(weights.sponsorship) && Number.isFinite(weights.fit)
    ? { sponsorship: weights.sponsorship, fit: weights.fit }
    : null;

  const approvalsCells = sponsors.countCol
    ? { total: sponsors.rows.length, empty: sponsors.rows.filter((r) => String(r[sponsors.countCol] ?? '').trim() === '').length }
    : null;

  const fundingWindow = Number(opts.fundingWindowDays || 540);
  const fundingMissing = opts.fundingMissing === 'zero' ? 'zero' : 'omit';

  const roles = [];
  const buckets = { scored: [], needs_liveness: [], network: [], dropped: [] };
  const fitRescue = [];
  const scorerRoles = [];

  for (const t of targets) {
    const tl = timelineFactor(intake, t.expected_days_to_start);
    const sponsorEvidence = lookupSponsorship(sponsorIndex, sponsors, t.company, t.soc_code);
    const sponsorP = sponsorshipProbability(sponsorEvidence);
    const funding = lookupFunding(formDIndex, t.company, iso(intake.asOf), fundingWindow);
    const soc = lookupSoc(socTable, t.soc_code);

    const livenessKnown = typeof t.liveness === 'number' && Number.isFinite(t.liveness);

    const tierOut = sponsorEvidence.status === 'ok' ? mapTier(schema, sponsorP.derived_tier) : { tier: null, note: 'no sponsorship evidence' };
    const terms = {
      sponsorship: {
        value: sponsorP.value,
        source: sponsorEvidence.status === 'ok' ? 'your-input' : 'missing',
        basis: sponsorP.basis,
        evidence: sponsorEvidence,
        tier_emitted: tierOut.tier,
        tier_note: tierOut.note,
        mapping_note: sponsors.tierCol
          ? 'the tier is a record; the tier-to-probability mapping is your-input (lib/sources.mjs TIER_PROBABILITY)'
          : 'the approvals count is the record; the CSV has no tier column, so the count-to-tier bands (COUNT_THRESHOLDS) and the tier-to-probability mapping (TIER_PROBABILITY) are both your-input',
      },
      fit: { value: Number(t.fit), source: 'model-judgment', basis: 'operator estimate of CV against the posting' },
      liveness: {
        value: livenessKnown ? t.liveness : null,
        source: livenessKnown ? 'record' : 'missing',
        basis: livenessKnown ? `npm run ats:liveness, checked ${t.liveness_checked_at || 'date not supplied'}` : 'not checked',
      },
      timeline: { value: tl.factor, source: 'your-input', basis: tl.reason },
      funding: {
        value: funding.status === 'ok' ? funding.value : (fundingMissing === 'zero' ? 0 : null),
        source: funding.status === 'ok' ? 'record' : 'missing',
        basis: funding.status === 'ok' ? `Form D filed ${funding.filing_date}` : funding.reason,
      },
    };

    const roleQuality = soc.status === 'ok'
      ? {
        status: 'ok',
        summary: `SOC ${t.soc_code} row present (weighted 0.0 by the scorer)` +
          (soc.detailed_rows_skipped.length ? `; base row kept, ${soc.detailed_rows_skipped.length} detailed row(s) skipped: ${soc.detailed_rows_skipped.map((r) => r.title).join(', ')}` : ''),
        row: soc.row,
        detailed_rows_skipped: soc.detailed_rows_skipped,
        source_file: soc.source_file,
      }
      : { status: 'missing', summary: `missing: ${soc.reason}`, reason: soc.reason, ...(soc.candidate_rows ? { candidate_rows: soc.candidate_rows } : {}) };

    let bucket;
    let nextAction;
    if (tl.factor === 0) {
      bucket = 'dropped';
      nextAction = `drop now (${tl.reason}); the freed hours go to networking, per the 3-3-2 split`;
    } else if (!livenessKnown) {
      bucket = 'needs_liveness';
      nextAction = t.url
        ? `run \`npm run ats:liveness -- ${t.url}\` and put the result in the targets file`
        : 'no posting URL supplied; find the posting or move this to the networking list';
    } else if (sponsorEvidence.status !== 'ok') {
      bucket = 'network';
      nextAction = `no sponsorship record found (${sponsorEvidence.reason}), which is not the same as a record of non-sponsorship; informational interview before any application`;
    } else {
      bucket = 'scored';
      nextAction = 'included in roles.json; run the scorer, then spend application time on the Applies only';
    }

    const row = {
      company: t.company,
      title: t.title || '(title not supplied)',
      soc_code: t.soc_code || null,
      url: t.url || null,
      bucket,
      next_action: nextAction,
      timeline: tl,
      terms,
      role_quality: roleQuality,
    };
    roles.push(row);
    buckets[bucket].push(row);

    if (bucket === 'scored') {
      // Fit rescue: fit contributes more to the vote sum than sponsorship does,
      // using the scorer's own weights. Chapter 11's central scoring error.
      if (rescueWeights) {
        const fitPart = terms.fit.value * rescueWeights.fit;
        const sponsorPart = terms.sponsorship.value * rescueWeights.sponsorship;
        if (fitPart > sponsorPart) {
          fitRescue.push({ company: t.company, sponsorship: terms.sponsorship.value, fit: terms.fit.value, fit_contribution: round4(fitPart), sponsorship_contribution: round4(sponsorPart) });
        }
      }
      scorerRoles.push(buildRole(schema, {
        company: t.company,
        title: t.title,
        soc: t.soc_code,
        url: t.url,
        terms: {
          sponsorship: { value: terms.sponsorship.value, source: 'your-input', tier: tierOut.tier },
          fit: { value: terms.fit.value, source: 'model-judgment' },
          liveness: { value: terms.liveness.value, source: 'record' },
          timeline: { value: terms.timeline.value, source: 'your-input' },
          funding: terms.funding.value === null ? null : { value: terms.funding.value, source: 'record' },
        },
      }));
    }
  }

  const runId = `${iso(intake.asOf)}-opt-start-window`;
  const counts = {
    in: roles.length,
    scored: buckets.scored.length,
    dropped: buckets.dropped.length,
    network: buckets.network.length,
    needs_liveness: buckets.needs_liveness.length,
    skip_rate: roles.length === 0 ? 0 : Math.round(((roles.length - buckets.scored.length) / roles.length) * 100) / 100,
  };

  const run = {
    run_id: runId,
    recipe: RECIPE,
    recipe_version: RECIPE_VERSION,
    recipe_status: RECIPE_STATUS,
    generated_at: new Date().toISOString(),
    repo_root: '.',
    sources: [
      {
        what: '80 Days sponsorship CSV',
        path: relPath(repoRoot, sponsors.path),
        sha256: sha256(sponsors.path),
        note: `columns used: ${JSON.stringify({ company: sponsors.companyCol, tier: sponsors.tierCol, count: sponsors.countCol, soc: sponsors.socCol })}` +
          (approvalsCells ? `; approvals cell empty in ${approvalsCells.empty} of ${approvalsCells.total} rows (missing, never read as 0)` : '') +
          (sponsors.socCol ? '' : '; no SOC column, so sponsorship is company-wide and never narrowed to the target SOC code'),
      },
      { what: 'SEC Form D samples', path: relPath(repoRoot, formD.dir), sha256: null, note: `${formD.files.length} JSON file(s) scanned, ${formDAudit.records} record(s) read, ${formDIndex.size} issuer(s) indexed, ${formDAudit.dates_rejected.length} date(s) rejected as unparseable, ${formDAudit.unrecognised_files.length} file(s) unrecognised; full quarters are gitignored, so a miss here means "not in the sample", not "no funding"` },
      { what: 'BLS compact occupation table', path: relPath(repoRoot, socTable.path), sha256: socTable.status === 'ok' ? sha256(socTable.path) : null, note: socTable.status === 'ok' ? `looked up by ${socTable.socCol}; where a code has several rows the ${socTable.onetCol || 'O*NET'} .00 base row is kept` : `not loaded: ${socTable.reason}` },
      { what: 'Scorer input contract (schema learned from this file)', path: relPath(repoRoot, example.path), sha256: sha256(example.path), note: `keys=${JSON.stringify(schema.keys)}; value field per term=${JSON.stringify(Object.fromEntries(Object.entries(schema.terms).map(([k, v]) => [k, v.valueField])))}; tier vocabulary=${JSON.stringify(schema.tierVocabulary)}` },
      { what: 'Scorer weights for the fit-rescue check', path: scorerCfg.from, sha256: null, note: rescueWeights ? `sponsorship ${rescueWeights.sponsorship}, fit ${rescueWeights.fit}` : 'no config block available; fit-rescue check skipped' },
      { what: 'Intake', path: relPath(repoRoot, resolve(opts.intake)), sha256: sha256(resolve(opts.intake)), note: 'every field your-input' },
      { what: 'Targets', path: relPath(repoRoot, resolve(opts.targets)), sha256: sha256(resolve(opts.targets)), note: 'liveness values come from npm run ats:liveness; fit is an operator estimate' },
    ],
    intake: {
      as_of: iso(intake.asOf),
      auth_type: intake.authType,
      auth_start_date: iso(intake.authStart),
      auth_end_date: iso(intake.authEnd),
      unemployment_days_used: intake.used,
      unemployment_ceiling_days: intake.ceiling,
      buffer_target_days: intake.buffer,
      stem_eligible: intake.stemEligible,
    },
    tier_probability_mapping: TIER_PROBABILITY,
    schema,
    roles,
    buckets,
    counts,
    flags: {
      fit_rescue: fitRescue,
      fit_rescue_rule: rescueWeights
        ? `flag a scored role when fit x ${rescueWeights.fit} > sponsorship x ${rescueWeights.sponsorship} (weights from ${scorerCfg.from})`
        : null,
      fit_rescue_skipped: rescueWeights ? null : `skipped: ${scorerCfg.from}; no weights were assumed in their place`,
    },
    not_verified: [
      'Liveness is not fetched here. This tool reads a liveness value you obtained from npm run ats:liveness; it never invents one, and a role without one is held at the gate.',
      'Fit is a model judgment supplied in the targets file. No CV is read and no resume file is touched.',
      'Sponsorship tier or approval count is a record. The mapping from that record to a probability is an operator assumption, not a record, and the emitted sponsorship term is labelled your-input for that reason.',
      'Sponsorship evidence is company-wide when the CSV has no SOC column, so it says nothing about the target occupation specifically.',
      'Funding (Form D) is reported here and weighted nowhere: scripts/score/role-scorer.mjs has no funding term.',
      'The scorer treats a gate at or below its gate_zero (0.05 in the shipped CONFIG) as closed, so any timeline factor in (0, 0.05] is a Skip there even though this run keeps the role.',
      'Company joins are exact after suffix normalisation, with no fuzzy matching. A subsidiary filed under a different legal name will read as "no record" rather than as a non-sponsor.',
      'Form D coverage is the shipped sample only; full quarters are gitignored, so absence of a filing is absence of evidence.',
      'Role quality is reported but weighted 0.0 by scripts/score/role-scorer.mjs, so it changes no Apply/Consider/Skip outcome in this run.',
      'expected_days_to_start is an estimate you supply per role, not an employer-published figure.',
      'This run does not rule on STEM eligibility, does not compute your unemployment ceiling, and is not immigration advice.',
    ],
  };

  const outDir = resolve(opts.outDir);
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, `${runId}.json`);
  const mdPath = join(outDir, `${runId}.md`);
  const rolesPath = join(outDir, `${runId}-roles.json`);
  // Any path inside the repository is written relative to its root, so the
  // committed log never carries the operator's home directory.
  const relativise = (_k, v) => (typeof v === 'string' && v.startsWith(repoRoot + sep) ? relPath(repoRoot, v) : v);
  writeFileSync(jsonPath, JSON.stringify(run, relativise, 2));
  writeFileSync(mdPath, renderMarkdown(run));
  writeFileSync(rolesPath, JSON.stringify(wrapRoles(example, scorerRoles), null, 2));

  return { run, paths: { json: jsonPath, markdown: mdPath, roles: rolesPath }, schema, scorerRoles };
}

// Run the gate assertion against the repository's real scorer. Separate from the
// offline test suite because it needs scripts/score/role-scorer.mjs to be present.
export function gateCheck(opts) {
  const repoRoot = resolve(opts.repoRoot || process.cwd());
  const example = loadExampleRoles(resolve(opts.example || join(repoRoot, 'data', 'examples', 'ch11-roles.json')));
  const schema = discoverRoleSchema(example);
  const scorerPath = resolve(opts.scorer || join(repoRoot, 'scripts', 'score', 'role-scorer.mjs'));
  const probe = buildGateProbe(schema);
  const { parsed } = runScorerCli(scorerPath, wrapRoles(example, [probe]));
  const scored = Array.isArray(parsed.roles) ? parsed.roles[0] : null;
  const threshold = parsed.config?.gate_zero;
  const timelineGate = scored?.trace?.gates?.find((g) => g.factor === 'timeline') ?? null;
  const detail = { probe, scored };
  const result = assertClosedGate(scored?.composite, threshold, detail);
  return {
    scorerPath: relPath(repoRoot, scorerPath),
    ...result,
    probe,
    timelineMultiplier: timelineGate ? timelineGate.multiplier : null,
    recommendation: scored?.recommendation ?? null,
    arithmetic: scored?.trace?.arithmetic ?? null,
  };
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) {
    process.stdout.write(readFileSync(join(HERE, 'README.md'), 'utf8'));
    return 0;
  }
  const opts = {
    repoRoot: a['repo-root'],
    intake: a.intake || join(HERE, 'fixtures', 'intake.sample.json'),
    targets: a.targets || join(HERE, 'fixtures', 'targets.sample.json'),
    outDir: a['out-dir'],
    sponsorsCsv: a['sponsors-csv'],
    formdDir: a['formd-dir'],
    socCsv: a['soc-csv'],
    example: a.example,
    asOf: a['as-of'],
    fundingWindowDays: a['funding-window-days'],
    fundingMissing: a['funding-missing'],
    scorer: a.scorer,
    scorerConfig: a['scorer-config'],
  };
  if (a['gate-check']) return 'gate-check';
  if (!opts.outDir) {
    process.stderr.write('--out-dir is required. Write into your own namespace, never over a tracked repo file.\n');
    return 2;
  }

  const { run, paths } = runPipeline(opts);

  process.stdout.write(`opt-start-window ${run.run_id}\n`);
  process.stdout.write(`  roles in         ${run.counts.in}\n`);
  process.stdout.write(`  scored           ${run.counts.scored}\n`);
  process.stdout.write(`  dropped (clock)  ${run.counts.dropped}\n`);
  process.stdout.write(`  needs liveness   ${run.counts.needs_liveness}\n`);
  process.stdout.write(`  network only     ${run.counts.network}\n`);
  process.stdout.write(`  pre-scorer skip  ${run.counts.skip_rate}\n`);
  const shown = (p) => relPath(process.cwd(), p);
  process.stdout.write(`  json   ${shown(paths.json)}\n`);
  process.stdout.write(`  report ${shown(paths.markdown)}\n`);
  process.stdout.write(`  roles  ${shown(paths.roles)}\n`);
  if (run.counts.scored === 0) {
    process.stdout.write('\nNothing scorable. That is a result, not an error: fix the gates it named before applying anywhere.\n');
    return 3;
  }
  process.stdout.write(`\nNext: npm run score -- ${shown(paths.roles)} --out-dir ${shown(resolve(opts.outDir))}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const outcome = main();
    if (outcome === 'gate-check') {
      const a = parseArgs(process.argv.slice(2));
      const res = gateCheck({ repoRoot: a['repo-root'], example: a.example, scorer: a.scorer });
      process.stdout.write(`gate-check against ${res.scorerPath} (CLI, --out-dir in a temp directory)\n`);
      process.stdout.write(`  probe as emitted: ${JSON.stringify(res.probe)}\n`);
      process.stdout.write(`  scorer read timeline multiplier ${res.timelineMultiplier}; arithmetic ${res.arithmetic}\n`);
      process.stdout.write(`  composite ${res.composite} <= closed-gate threshold ${res.threshold} (scorer config gate_zero); recommendation ${res.recommendation}\n`);
      process.stdout.write('  timeline behaves as a gate\n');
      process.exitCode = 0;
    } else {
      process.exitCode = outcome;
    }
  } catch (err) {
    if (err instanceof GateViolation) {
      process.stderr.write(`\nGateViolation: ${err.message}\n`);
      process.stderr.write(`${JSON.stringify(err.detail, null, 2)}\n`);
      process.exitCode = 1;
    } else
    if (err instanceof IntakeError || err instanceof SourceError || err instanceof SchemaError) {
      process.stderr.write(`\n${err.name}: ${err.message}\n`);
      const cwd = process.cwd();
      const shown = (_k, v) => (typeof v === 'string' && v.startsWith(cwd + sep) ? relPath(cwd, v) : v);
      if (err.detail) process.stderr.write(`${JSON.stringify(err.detail, shown, 2)}\n`);
      process.stderr.write('\nNo output was written. Nothing was guessed to fill the gap.\n');
      process.exitCode = 2;
    } else {
      throw err;
    }
  }
}

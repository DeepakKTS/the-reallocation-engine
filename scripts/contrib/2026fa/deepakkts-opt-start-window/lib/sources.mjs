// Source discovery and loading.
//
// Every value this module returns carries the file it came from. Nothing is
// typed into the code: if a column is not present, the loader reports the header
// it actually saw and the run stops rather than substituting a plausible number.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseCsv, findColumn, normaliseCompany } from './csv.mjs';

export class SourceError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'SourceError';
    this.detail = detail;
  }
}

export function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

function walk(dir, depth = 4) {
  if (!existsSync(dir) || depth < 0) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(full, depth - 1));
    else out.push(full);
  }
  return out;
}

const COMPANY_COLUMNS = ['employer_name', 'employer', 'company_name', 'company', 'organization', 'name'];
const TIER_COLUMNS = ['sponsorship_tier', 'tier', 'sponsor_tier', 'confidence_tier'];
const COUNT_COLUMNS = ['h1b_approvals', 'approvals', 'h1b_count', 'lca_count', 'petitions', 'certified', 'total_h1b'];
const SOC_COLUMNS = ['soc_code', 'soc', 'occupation_code', 'onet_soc_code'];
// The occupation table carries two codes. Lookups use the 6-digit BLS code; the
// O*NET code is read only to tell the .00 base row from its detailed rows.
const OCCUPATION_SOC_COLUMN = 'bls_soc_code';
const OCCUPATION_ONET_COLUMN = 'onet_soc_code';
const OCCUPATION_TITLE_COLUMN = 'title';

/**
 * Find the sponsorship CSV inside data/80-days-to-stay/ by inspecting headers,
 * not by guessing a filename. Returns the first CSV that has a company column
 * and at least one usable sponsorship-evidence column.
 */
export function discoverSponsorsCsv(repoRoot, override) {
  const candidates = override
    ? [override]
    : walk(join(repoRoot, 'data', '80-days-to-stay')).filter((f) => f.toLowerCase().endsWith('.csv'));

  if (candidates.length === 0) {
    throw new SourceError(
      'No CSV found under data/80-days-to-stay/. Pass --sponsors-csv <path> to name one explicitly.',
      { searched: join(repoRoot, 'data', '80-days-to-stay') },
    );
  }

  const rejected = [];
  for (const file of candidates) {
    const { header, rows } = parseCsv(readFileSync(file, 'utf8'));
    const companyCol = findColumn(header, COMPANY_COLUMNS);
    const tierCol = findColumn(header, TIER_COLUMNS);
    const countCol = findColumn(header, COUNT_COLUMNS);
    if (companyCol && (tierCol || countCol)) {
      return { path: file, header, rows, companyCol, tierCol, countCol, socCol: findColumn(header, SOC_COLUMNS) };
    }
    rejected.push({ file, header });
  }

  throw new SourceError(
    'No CSV under data/80-days-to-stay/ has both a company column and a sponsorship-evidence column. ' +
    'Headers observed are listed below; add the real column name to COMPANY_COLUMNS / TIER_COLUMNS / COUNT_COLUMNS in lib/sources.mjs, ' +
    'or pass --sponsors-csv with a file that has them.',
    { rejected },
  );
}

export function indexSponsors(src) {
  const byCompany = new Map();
  for (const row of src.rows) {
    const key = normaliseCompany(row[src.companyCol]);
    if (!key) continue;
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key).push(row);
  }
  return byCompany;
}

/**
 * Sponsorship evidence for one company, optionally narrowed to one SOC code.
 * Absence of a record is reported as missing. It is never reported as zero:
 * "we have no record that they sponsor" and "we have a record that they do not"
 * are different claims, and only the second one justifies a Skip.
 */
export function lookupSponsorship(index, src, company, socCode) {
  const key = normaliseCompany(company);
  const rows = index.get(key);
  if (!rows || rows.length === 0) {
    return { status: 'missing', reason: 'no-sponsor-record', company_key: key, source_file: src.path };
  }

  let matched = rows;
  let socNarrowed = false;
  if (socCode && src.socCol) {
    const narrowed = rows.filter((r) => (r[src.socCol] || '').trim() === socCode);
    if (narrowed.length > 0) { matched = narrowed; socNarrowed = true; }
  }

  const tier = src.tierCol ? (matched[0][src.tierCol] || '').trim() : '';
  // An empty approvals cell is missing evidence, never a recorded zero. Only a
  // cell that holds an explicit number counts, and a cell that holds something
  // else is reported rather than read as 0.
  let count = null;
  const unparseable = [];
  if (src.countCol) {
    for (const r of matched) {
      const raw = String(r[src.countCol] ?? '').trim();
      if (raw === '') continue;
      const n = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(n)) { unparseable.push(raw); continue; }
      count = (count ?? 0) + n;
    }
  }

  if (!tier && count === null) {
    const reason = !src.countCol ? 'no-usable-evidence-column'
      : unparseable.length > 0 ? 'unparseable-approvals-cell' : 'empty-approvals-cell';
    return { status: 'missing', reason, company_key: key, rows_matched: matched.length, unparseable, source_file: src.path };
  }

  return {
    status: 'ok',
    company_key: key,
    tier: tier || null,
    approvals: count,
    rows_matched: matched.length,
    soc_narrowed: socNarrowed,
    soc_code: socNarrowed ? socCode : null,
    source_file: src.path,
    source_columns: { company: src.companyCol, tier: src.tierCol, count: src.countCol, soc: src.socCol },
  };
}

/**
 * Tier (or approval count) -> P(sponsorship).
 *
 * The tier is a record. This mapping from a tier to a probability is NOT a
 * record: it is a stated assumption chosen by the operator, and it is labelled
 * your-input everywhere it appears. Change it here, in one place, and the audit
 * trace will say so.
 */
export const TIER_PROBABILITY = { proven: 0.9, likely: 0.6, occasional: 0.3, none: 0.0 };
export const COUNT_THRESHOLDS = [
  { min: 10, tier: 'proven' },
  { min: 3, tier: 'likely' },
  { min: 1, tier: 'occasional' },
  { min: 0, tier: 'none' },
];

export function sponsorshipProbability(evidence) {
  if (evidence.status !== 'ok') return { value: null, basis: evidence.reason };
  const named = (evidence.tier || '').toLowerCase();
  if (named && TIER_PROBABILITY[named] !== undefined) {
    return { value: TIER_PROBABILITY[named], basis: `tier:${named}`, derived_tier: named };
  }
  if (evidence.approvals !== null && evidence.approvals !== undefined) {
    const band = COUNT_THRESHOLDS.find((t) => evidence.approvals >= t.min);
    return { value: TIER_PROBABILITY[band.tier], basis: `approvals:${evidence.approvals}`, derived_tier: band.tier };
  }
  return { value: null, basis: 'no-usable-evidence-column' };
}

/** SEC Form D samples: recency of funding, or an explicit miss. */
export function discoverFormDSamples(repoRoot, override) {
  const dir = override || join(repoRoot, 'data', 'sec', 'form-d', 'processed', 'sample');
  const files = walk(dir, 2).filter((f) => f.toLowerCase().endsWith('.json'));
  return { dir, files };
}

// Form D dates in the processed samples are written like 31-MAR-2026. This parses
// exactly that form and returns null for anything else, including a well-formed
// pattern that names a day the month does not have. Nothing is coerced.
const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
export function parseFormDDate(raw) {
  const m = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec(String(raw ?? ''));
  if (!m || !MONTHS[m[2]]) return null;
  const isoDate = `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1]}`;
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== isoDate) return null;
  return isoDate;
}

/**
 * Index the processed Form D samples. Each file is { metadata, companies: [...] };
 * a record's name is company.name and its date is filing.date_filed. A record
 * whose date does not parse is kept with filing_date null and the raw value
 * recorded, so a lookup reports it instead of treating it as no filing.
 * Throws when a non-empty set of files yields zero issuers: finding nothing
 * without saying so is how the first version of this loader hid a schema miss.
 */
export function loadFormDIndex(files) {
  const index = new Map();
  const audit = { files: files.length, records: 0, unrecognised_files: [], dates_rejected: [] };
  for (const file of files) {
    let parsed;
    try { parsed = JSON.parse(readFileSync(file, 'utf8')); } catch (err) {
      audit.unrecognised_files.push({ file, reason: `not valid JSON: ${err.message}` });
      continue;
    }
    if (!parsed || !Array.isArray(parsed.companies)) {
      audit.unrecognised_files.push({ file, reason: 'no companies array', topLevelKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : typeof parsed });
      continue;
    }
    for (const rec of parsed.companies) {
      const name = rec?.company?.name;
      if (typeof name !== 'string' || !name.trim()) continue;
      audit.records++;
      const rawDate = rec?.filing?.date_filed ?? null;
      const filingDate = parseFormDDate(rawDate);
      if (!filingDate) audit.dates_rejected.push({ name, raw: rawDate, file });
      const key = normaliseCompany(name);
      const prev = index.get(key);
      if (!prev || (filingDate && (!prev.filing_date || filingDate > prev.filing_date))) {
        index.set(key, { filing_date: filingDate, raw_date: rawDate, source_file: file });
      }
    }
  }
  if (files.length > 0 && index.size === 0) {
    throw new SourceError(
      `Form D: ${files.length} file(s) scanned and zero issuers indexed. The expected shape is ` +
      '{ companies: [ { company: { name }, filing: { date_filed } } ] }; the files below did not match it.',
      audit,
    );
  }
  return { index, audit };
}

export function lookupFunding(index, company, asOfIso, windowDays) {
  const key = normaliseCompany(company);
  const hit = index.get(key);
  if (!hit) return { status: 'missing', reason: 'no-form-d-match', company_key: key };
  if (!hit.filing_date) return { status: 'missing', reason: 'form-d-date-unparseable', raw_date: hit.raw_date, company_key: key, source_file: hit.source_file };
  const age = Math.round((Date.parse(asOfIso) - Date.parse(hit.filing_date)) / 86400000);
  return {
    status: 'ok',
    filing_date: hit.filing_date,
    days_since_filing: age,
    within_window: age >= 0 && age <= windowDays,
    value: age >= 0 && age <= windowDays ? 1 : 0,
    window_days: windowDays,
    source_file: hit.source_file,
  };
}

/** BLS compact occupation table: reported to the human, weighted 0.0 by the scorer. */
export function loadSocTable(repoRoot, override) {
  const path = override || join(repoRoot, 'data', 'bls', 'compact', 'soc_occupation_compact.csv');
  if (!existsSync(path)) {
    return { status: 'missing', reason: 'soc-table-not-found', path };
  }
  const { header, rows } = parseCsv(readFileSync(path, 'utf8'));
  const socCol = header.includes(OCCUPATION_SOC_COLUMN) ? OCCUPATION_SOC_COLUMN : null;
  if (!socCol) {
    return { status: 'missing', reason: 'no-soc-column', path, header };
  }
  const onetCol = header.includes(OCCUPATION_ONET_COLUMN) ? OCCUPATION_ONET_COLUMN : null;
  // Every row for a code is kept, in file order. Choosing among them happens in
  // lookupSoc, explicitly, so no row wins by being read last.
  const byCode = new Map();
  for (const row of rows) {
    const code = (row[socCol] || '').trim();
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(row);
  }
  return { status: 'ok', path, header, socCol, onetCol, byCode };
}

export function lookupSoc(table, socCode) {
  if (table.status !== 'ok') return { status: 'missing', reason: table.reason };
  if (!socCode) return { status: 'missing', reason: 'no-soc-code-supplied' };
  const rows = table.byCode.get(socCode);
  if (!rows || rows.length === 0) return { status: 'missing', reason: 'no-occupation-row', soc_code: socCode, source_file: table.path };
  if (rows.length === 1) return { status: 'ok', soc_code: socCode, row: rows[0], detailed_rows_skipped: [], source_file: table.path };
  const isBase = (r) => table.onetCol && (r[table.onetCol] || '').trim() === `${socCode}.00`;
  const base = rows.filter(isBase);
  const describe = (r) => ({ onet_soc_code: table.onetCol ? r[table.onetCol] : null, title: r[OCCUPATION_TITLE_COLUMN] ?? null });
  if (base.length !== 1) {
    return { status: 'missing', reason: 'no-single-base-row', soc_code: socCode, candidate_rows: rows.map(describe), source_file: table.path };
  }
  return {
    status: 'ok',
    soc_code: socCode,
    row: base[0],
    detailed_rows_skipped: rows.filter((r) => !isBase(r)).map(describe),
    source_file: table.path,
  };
}

// Paths inside the repository are reported relative to its root. A path outside
// the repository is reported by filename only: a committed artifact should not
// carry somebody's home directory, and an intake file deliberately lives outside.
export function relPath(repoRoot, p) {
  try {
    const rel = relative(repoRoot, p);
    if (!rel) return p;
    if (rel.startsWith('..')) return `${p.split(/[\\/]/).pop()} (outside the repository)`;
    return rel;
  } catch { return p; }
}

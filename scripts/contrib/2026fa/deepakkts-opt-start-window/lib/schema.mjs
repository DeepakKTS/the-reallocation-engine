// Roles-file schema discovery.
//
// The scorer's input contract lives in data/examples/ch11-roles.json. Rather than
// hardcode key names this module reads that file, learns the shape, and emits
// roles in exactly that shape. If a term cannot be mapped the run stops and prints
// the keys the example actually has, so the fix is one line in CANDIDATES below
// instead of a silently malformed file.
//
// The value field is learned PER TERM. In the real example file votes carry their
// number under `p` and gates carry theirs under `factor`. A single value field
// learned from the sponsorship term wrote gates as `{p: ...}`, which the scorer
// does not read: it defaulted both gates to 1 and scored a timeline-0 role Apply.

import { readFileSync, existsSync } from 'node:fs';

export class SchemaError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'SchemaError';
    this.detail = detail;
  }
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export const CANDIDATES = {
  company: ['company', 'employer', 'companyname', 'employername', 'organization'],
  title: ['role', 'title', 'roletitle', 'jobtitle', 'position'],
  soc: ['soc', 'soccode', 'occupationcode'],
  url: ['url', 'joburl', 'postingurl', 'link'],
  sponsorship: ['sponsorship', 'psponsorship', 'sponsorshipprobability', 'sponsor'],
  fit: ['fit', 'pfit', 'fitscore'],
  liveness: ['liveness', 'livenessfactor', 'live'],
  timeline: ['timeline', 'timelinefactor', 'visatimeline'],
  funding: ['funding', 'fundingsignal', 'formd'],
  role_quality: ['rolequality', 'quality', 'rolequalityscore'],
};

// Field names that can hold a term's number, and its source label.
const VALUE_FIELDS = ['value', 'p', 'factor', 'probability', 'multiplier', 'score'];
const SOURCE_FIELDS = ['source', 'sourcetype', 'provenance', 'label'];

const REQUIRED = ['sponsorship', 'fit', 'liveness', 'timeline'];
const EVIDENCE_TERMS = ['sponsorship', 'fit', 'liveness', 'timeline', 'funding', 'role_quality'];

function matchKey(keys, candidates) {
  const pairs = keys.map((k) => [norm(k), k]);
  for (const cand of candidates) {
    const hit = pairs.find(([n]) => n === cand);
    if (hit) return hit[1];
  }
  for (const cand of candidates) {
    if (cand.length < 4) continue; // too short to match on substring safely
    const hit = pairs.find(([n]) => n.includes(cand));
    if (hit) return hit[1];
  }
  return null;
}

export function loadExampleRoles(path) {
  if (!existsSync(path)) {
    throw new SchemaError(
      `Example roles file not found at ${path}. It is the scorer's input contract; ` +
      'pass --example <path> if it lives somewhere else in your checkout.',
      { path },
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new SchemaError(`Example roles file is not valid JSON: ${err.message}`, { path });
  }

  if (Array.isArray(parsed)) return { container: 'array', containerKey: null, roles: parsed, path };
  for (const key of ['roles', 'items', 'data']) {
    if (Array.isArray(parsed[key])) return { container: 'object', containerKey: key, roles: parsed[key], path, envelope: parsed };
  }
  throw new SchemaError(
    'Example roles file is neither an array of roles nor an object with a roles array.',
    { path, topLevelKeys: Object.keys(parsed) },
  );
}

// Learn how one term is written, from the first example role that carries it.
function learnTerm(example, term, key) {
  const carrier = example.roles.find((r) => r && typeof r === 'object' && r[key] !== undefined);
  if (!carrier) return null;
  const entry = carrier[key];
  if (typeof entry === 'number') return { shape: 'scalar', valueField: null, sourceField: null };
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new SchemaError(
      `Example term "${key}" is neither a number nor an object, so its value field cannot be learned. No roles file was written.`,
      { term, observed: entry },
    );
  }
  const observedKeys = Object.keys(entry);
  const valueField = matchKey(observedKeys, VALUE_FIELDS);
  if (!valueField) {
    throw new SchemaError(
      `Could not determine which field of example term "${key}" holds its number. ` +
      'Add the real field name to VALUE_FIELDS in lib/schema.mjs and re-run. No roles file was written.',
      { term, observedKeys },
    );
  }
  return {
    shape: 'object',
    valueField,
    sourceField: matchKey(observedKeys, SOURCE_FIELDS),
    tierField: term === 'sponsorship' ? matchKey(observedKeys, ['tier']) : null,
    observedKeys,
  };
}

export function discoverRoleSchema(example) {
  const first = example.roles[0];
  if (!first || typeof first !== 'object') {
    throw new SchemaError('Example roles file contains no role object to learn from.', { path: example.path });
  }
  const keys = [...new Set(example.roles.filter((r) => r && typeof r === 'object').flatMap((r) => Object.keys(r)))];
  const mapped = {};
  for (const [term, cands] of Object.entries(CANDIDATES)) mapped[term] = matchKey(keys, cands);

  const unmapped = REQUIRED.filter((t) => !mapped[t]);
  if (unmapped.length > 0) {
    throw new SchemaError(
      `Could not map required term(s) ${unmapped.join(', ')} onto the example role. ` +
      'Add the real key name to CANDIDATES in lib/schema.mjs and re-run. No roles file was written.',
      { exampleRoleKeys: keys, mapped },
    );
  }

  const terms = {};
  for (const term of EVIDENCE_TERMS) {
    if (!mapped[term]) continue;
    const learned = learnTerm(example, term, mapped[term]);
    if (learned) terms[term] = learned;
  }

  // The tier vocabulary the scorer expects, as the example file spells it.
  const tierField = terms.sponsorship?.tierField || null;
  const tierVocabulary = tierField
    ? [...new Set(example.roles.map((r) => r?.[mapped.sponsorship]?.[tierField]).filter((t) => typeof t === 'string' && t))]
    : [];

  const sourceMapField = Object.values(terms).some((t) => t.shape === 'scalar')
    ? matchKey(keys, ['sources', 'sourcemap', 'provenance'])
    : null;

  return { keys: mapped, terms, tierVocabulary, sourceMapField, exampleRoleKeys: keys, examplePath: example.path };
}

/**
 * Translate the prototype's tier name into the scorer's own spelling of it, as
 * learned from the example file. A tier with no case-insensitive match in that
 * vocabulary is NOT forced onto the nearest one: it returns null with a reason,
 * and the emitted role carries no tier.
 */
export function mapTier(schema, tier) {
  if (!tier) return { tier: null, note: 'no tier to emit' };
  if (!schema.terms.sponsorship?.tierField) return { tier: null, note: 'the example file has no tier field, so none is emitted' };
  const hit = schema.tierVocabulary.find((t) => t.toLowerCase() === String(tier).toLowerCase());
  if (!hit) {
    return { tier: null, note: `tier "${tier}" has no match in the scorer vocabulary ${JSON.stringify(schema.tierVocabulary)}; tier omitted rather than guessed` };
  }
  return { tier: hit, note: null };
}

/**
 * Build one role in the discovered shape.
 * terms: { sponsorship: {value, source, tier?}, fit: {...}, ... } plus plain fields.
 * A term whose value is null is OMITTED, never coerced to 0, a missing record and
 * a recorded zero are different claims.
 */
export function buildRole(schema, { company, title, soc, url, terms }) {
  const role = {};
  if (schema.keys.company) role[schema.keys.company] = company;
  if (schema.keys.title && title) role[schema.keys.title] = title;
  if (schema.keys.soc && soc) role[schema.keys.soc] = soc;
  if (schema.keys.url && url) role[schema.keys.url] = url;

  const sourceMap = {};
  for (const [term, payload] of Object.entries(terms)) {
    const key = schema.keys[term];
    const learned = schema.terms[term];
    if (!key || !learned) continue;
    if (!payload || payload.value === null || payload.value === undefined) continue;
    if (learned.shape === 'object') {
      const obj = { [learned.valueField]: payload.value };
      if (learned.tierField && payload.tier) obj[learned.tierField] = payload.tier;
      if (learned.sourceField) obj[learned.sourceField] = payload.source;
      role[key] = obj;
    } else {
      role[key] = payload.value;
      sourceMap[key] = payload.source;
    }
  }
  if (schema.sourceMapField && Object.keys(sourceMap).length > 0) role[schema.sourceMapField] = sourceMap;
  return role;
}

export function wrapRoles(example, roles) {
  if (example.container === 'array') return roles;
  return { ...(example.envelope || {}), [example.containerKey]: roles };
}

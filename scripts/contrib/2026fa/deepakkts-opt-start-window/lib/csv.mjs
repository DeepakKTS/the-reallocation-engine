// Minimal RFC4180-ish CSV reader. No dependencies, no network.
// Returns { header: string[], rows: Array<Record<string,string>> }.

export function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '');
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return { header: [], rows: [] };

  const header = nonEmpty[0].map((h) => h.trim());
  const out = nonEmpty.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
  return { header, rows: out };
}

// Case- and separator-insensitive header lookup.
// Returns the ACTUAL header string, or null. Never guesses a value.
export function findColumn(header, candidates) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalised = header.map((h) => [norm(h), h]);
  for (const cand of candidates) {
    const c = norm(cand);
    const exact = normalised.find(([n]) => n === c);
    if (exact) return exact[1];
  }
  for (const cand of candidates) {
    const c = norm(cand);
    const partial = normalised.find(([n]) => n.includes(c));
    if (partial) return partial[1];
  }
  return null;
}

// Company names join badly across government datasets. This is a deliberately
// conservative normaliser: it does NOT fuzzy-match, it only strips legal suffixes
// and punctuation so that "Acme Robotics, Inc." and "ACME ROBOTICS INC" meet.
const LEGAL_SUFFIXES = [
  'incorporated', 'inc', 'llc', 'l l c', 'ltd', 'limited', 'corp', 'corporation',
  'co', 'company', 'plc', 'lp', 'llp', 'holdings', 'group', 'technologies', 'technology',
];

export function normaliseCompany(name) {
  if (!name) return '';
  let s = String(name).toLowerCase();
  s = s.replace(/&/g, ' and ');
  s = s.replace(/[^a-z0-9 ]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (s.endsWith(' ' + suffix)) { s = s.slice(0, -(suffix.length + 1)).trim(); changed = true; }
    }
  }
  return s;
}

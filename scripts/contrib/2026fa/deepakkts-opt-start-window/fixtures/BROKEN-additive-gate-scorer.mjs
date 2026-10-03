// Deliberately mutated scorer: the timeline gate is ADDED instead of multiplied.
// This is the negative control. If lib/gate.mjs cannot fail this file, the
// assertion is decoration and proves nothing about the real scorer.
// It reads the same fields the real scorer reads (p for votes, factor for gates)
// and, run as a CLI, writes role-scores.json the way the real scorer does, so the
// command-line gate check can be pointed at it with --scorer.
// Never import this outside tests.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG = { gate_zero: 0.05, _mutant: 'additive gates' };

export function scoreRole(role) {
  const vote = (t) => Number(t?.p) || 0;
  const gate = (t) => Number(t?.factor) || 0;
  const composite =
    vote(role.sponsorship) * 0.35 +
    vote(role.fit) * 0.30 +
    gate(role.timeline) * 0.20 +
    gate(role.liveness) * 0.15;
  return { composite, recommendation: composite >= 0.3 ? 'Apply' : 'Skip', mutated: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const src = args.find((a) => !a.startsWith('--'));
  const outDir = args[args.indexOf('--out-dir') + 1];
  let roles = JSON.parse(readFileSync(src, 'utf8'));
  if (!Array.isArray(roles)) roles = roles.roles || [];
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'role-scores.json'), JSON.stringify({ config: CONFIG, roles: roles.map(scoreRole) }, null, 2));
}

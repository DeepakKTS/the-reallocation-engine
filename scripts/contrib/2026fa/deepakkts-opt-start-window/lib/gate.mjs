// Gate-behaviour assertion.
//
// This never re-implements the composite (CONTRIBUTING.md: a harness that tests
// its own re-implementation tests nothing). The probe role is built with the same
// buildRole the pipeline uses, so the probe is written in exactly the shape the
// real roles file is written in. The composite comes from a scorer: the real
// scorer through its command line (run.mjs gateCheck), or a function in the
// offline tests, including the deliberately mutated BROKEN-* fixture, which is
// how we show the assertion would actually catch the bug it exists to catch.

import { buildRole } from './schema.mjs';

export class GateViolation extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'GateViolation';
    this.detail = detail;
  }
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export function extractComposite(result) {
  if (typeof result === 'number') return result;
  if (!result || typeof result !== 'object') return null;
  const wanted = ['composite', 'compositescore', 'score', 'total'];
  for (const w of wanted) {
    for (const [k, v] of Object.entries(result)) {
      if (norm(k) === w && typeof v === 'number') return v;
    }
  }
  for (const v of Object.values(result)) {
    if (v && typeof v === 'object') {
      const nested = extractComposite(v);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/** A strong-vote role with the timeline gate at 0, in the learned shape. */
export function buildGateProbe(schema) {
  return buildRole(schema, {
    company: 'Gate Probe Example Co',
    title: 'Synthetic probe role',
    terms: {
      sponsorship: { value: 0.95, source: 'your-input' },
      fit: { value: 0.95, source: 'your-input' },
      liveness: { value: 1, source: 'your-input' },
      timeline: { value: 0, source: 'your-input' },
    },
  });
}

/**
 * A zero timeline gate must hold the composite at or below the scorer's own
 * closed-gate threshold (CONFIG.gate_zero), no matter how strong the votes are.
 * The threshold is supplied by the caller from the scorer's output; there is no
 * default here, so a missing threshold cannot quietly become a lenient one.
 */
export function assertClosedGate(composite, threshold, detail) {
  if (typeof threshold !== 'number' || !Number.isFinite(threshold)) {
    throw new GateViolation('No closed-gate threshold was available from the scorer, so the gate cannot be judged.', { threshold, ...detail });
  }
  if (typeof composite !== 'number' || !Number.isFinite(composite)) {
    throw new GateViolation('Could not find a numeric composite in the scorer result.', { composite, ...detail });
  }
  if (composite > threshold) {
    throw new GateViolation(
      `Timeline is behaving as a vote, not a gate: timeline=0 with strong votes produced composite ${composite}, above the closed-gate threshold ${threshold}.`,
      { composite, threshold, ...detail },
    );
  }
  return { ok: true, composite, threshold };
}

/** In-process form, for scorer functions (the offline tests and the mutant). */
export function assertTimelineIsAGate(scoreFn, schema, { threshold } = {}) {
  const probe = buildGateProbe(schema);
  const result = scoreFn(probe);
  return { ...assertClosedGate(extractComposite(result), threshold, { probe, result }), probe };
}

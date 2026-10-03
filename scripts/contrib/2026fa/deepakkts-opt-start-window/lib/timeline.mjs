// Chapter 10 timeline factor, computed from dates, with the dates attached.
//
// The scorer (scripts/score/role-scorer.mjs) CONSUMES a timeline number labelled
// your-input. Nothing in the repo produces that number from an intake. This module
// does, and it returns the arithmetic alongside the factor, because Chapter 10's
// rule is that a factor you cannot trace to specific dates is a factor you cannot
// defend.
//
// This module never asserts STEM eligibility and never infers an unemployment
// ceiling. Both are supplied by the human (your-input) or the run stops.

export class IntakeError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'IntakeError';
    this.field = field;
  }
}

const DAY_MS = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value, field) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new IntakeError(`${field} must be an ISO date (YYYY-MM-DD); got ${JSON.stringify(value)}`, field);
  }
  const ms = Date.parse(value + 'T00:00:00Z');
  if (Number.isNaN(ms)) {
    throw new IntakeError(`${field} is not a real calendar date: ${value}`, field);
  }
  const d = new Date(ms);
  if (d.toISOString().slice(0, 10) !== value) {
    throw new IntakeError(`${field} is not a real calendar date: ${value}`, field);
  }
  return d;
}

export function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

const REQUIRED_INTAKE = [
  'as_of',
  'auth_type',
  'auth_start_date',
  'auth_end_date',
  'unemployment_days_used',
  'unemployment_ceiling_days',
  'buffer_target_days',
  'stem_eligible',
];

export function validateIntake(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new IntakeError('intake file did not contain a JSON object', 'intake');
  }
  for (const key of REQUIRED_INTAKE) {
    if (raw[key] === undefined || raw[key] === null || raw[key] === '') {
      throw new IntakeError(
        `intake is missing ${key}. This value is your-input; it is never inferred.`,
        key,
      );
    }
  }

  const asOf = parseDate(raw.as_of, 'as_of');
  const authStart = parseDate(raw.auth_start_date, 'auth_start_date');
  const authEnd = parseDate(raw.auth_end_date, 'auth_end_date');

  if (daysBetween(authStart, authEnd) <= 0) {
    throw new IntakeError('auth_end_date must be after auth_start_date', 'auth_end_date');
  }
  if (daysBetween(asOf, authEnd) <= 0) {
    throw new IntakeError(
      `auth_end_date (${raw.auth_end_date}) is on or before as_of (${raw.as_of}). ` +
      'Every role would gate to zero; confirm your dates before running.',
      'auth_end_date',
    );
  }

  const used = Number(raw.unemployment_days_used);
  const ceiling = Number(raw.unemployment_ceiling_days);
  const buffer = Number(raw.buffer_target_days);
  for (const [name, n] of [['unemployment_days_used', used], ['unemployment_ceiling_days', ceiling], ['buffer_target_days', buffer]]) {
    if (!Number.isFinite(n) || n < 0) throw new IntakeError(`${name} must be a non-negative number`, name);
  }
  if (buffer >= ceiling) {
    throw new IntakeError('buffer_target_days must be below unemployment_ceiling_days', 'buffer_target_days');
  }
  if (used > ceiling) {
    throw new IntakeError(
      'unemployment_days_used already exceeds unemployment_ceiling_days. This is a status question for your DSO, not a scoring question.',
      'unemployment_days_used',
    );
  }
  if (raw.stem_eligible !== true && raw.stem_eligible !== false) {
    throw new IntakeError(
      'stem_eligible must be an explicit true or false supplied by you. This engine does not rule on STEM eligibility; confirm it with your DSO or an immigration attorney.',
      'stem_eligible',
    );
  }

  return { asOf, authStart, authEnd, used, ceiling, buffer, authType: String(raw.auth_type), stemEligible: raw.stem_eligible };
}

/**
 * Timeline factor in [0,1] for one role.
 *
 * Unemployment days accrue only from auth_start_date onward, which is the whole
 * point for a graduate whose authorisation has not started yet: weeks spent
 * interviewing before the clock starts are free, weeks spent after it starts are not.
 *
 *   projected_start      = as_of + expected_days_to_start
 *   days_on_the_clock    = days from max(as_of, auth_start) to projected_start
 *   projected_total      = unemployment_days_used + days_on_the_clock
 *
 *   projected_start > auth_end            -> 0   (start-past-auth-end)
 *   projected_total  > ceiling            -> 0   (exceeds-unemployment-ceiling)
 *   projected_total <= buffer_target      -> 1   (inside-buffer)
 *   otherwise  factor = (ceiling - projected_total) / (ceiling - buffer_target)
 *
 * The last branch falls linearly from 1 at the buffer line to 0 at the ceiling,
 * so a role that is survivable but eats the margin is kept and penalised.
 */
export function timelineFactor(intake, expectedDaysToStart) {
  const n = Number(expectedDaysToStart);
  if (!Number.isFinite(n) || n < 0) {
    throw new IntakeError(
      `expected_days_to_start must be a non-negative number; got ${JSON.stringify(expectedDaysToStart)}`,
      'expected_days_to_start',
    );
  }

  const projectedStart = addDays(intake.asOf, n);
  const clockStart = intake.asOf.getTime() > intake.authStart.getTime() ? intake.asOf : intake.authStart;
  const daysOnClock = Math.max(0, daysBetween(clockStart, projectedStart));
  const projectedTotal = intake.used + daysOnClock;

  const trace = {
    as_of: iso(intake.asOf),
    expected_days_to_start: n,
    projected_start: iso(projectedStart),
    auth_type: intake.authType,
    auth_start_date: iso(intake.authStart),
    auth_end_date: iso(intake.authEnd),
    days_to_auth_end: daysBetween(intake.asOf, intake.authEnd),
    unemployment_days_used: intake.used,
    unemployment_days_added_by_this_process: daysOnClock,
    projected_unemployment_total: projectedTotal,
    unemployment_ceiling_days: intake.ceiling,
    buffer_target_days: intake.buffer,
    stem_eligible_as_supplied: intake.stemEligible,
  };

  if (daysBetween(projectedStart, intake.authEnd) < 0) {
    return { factor: 0, reason: 'start-past-auth-end', trace };
  }
  if (projectedTotal > intake.ceiling) {
    return { factor: 0, reason: 'exceeds-unemployment-ceiling', trace };
  }
  if (projectedTotal <= intake.buffer) {
    return { factor: 1, reason: 'inside-buffer', trace };
  }
  const raw = (intake.ceiling - projectedTotal) / (intake.ceiling - intake.buffer);
  return { factor: round3(raw), reason: 'eats-into-buffer', trace };
}

export function iso(d) { return d.toISOString().slice(0, 10); }
export function round3(x) { return Math.round(x * 1000) / 1000; }

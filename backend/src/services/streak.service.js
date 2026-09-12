import { dayKey, daysBetween } from '../utils/dates.js';

/**
 * Streak bookkeeping.
 *
 * A streak counts consecutive *user-local* days on which at least one
 * intention was completed. The interesting case is the gap: when a day is
 * missed, a Dented Thermos (streak freeze) can be spent to bridge exactly one
 * day rather than resetting to 1.
 *
 * Pure function — it reports what the streak *should* become, and the caller
 * persists it. That makes it trivial to test and impossible to half-apply.
 */
export const evaluateStreak = (streak = {}, { timezone = 'UTC', now = new Date() } = {}) => {
  const today = dayKey(now, timezone);
  const last = streak.lastActiveDay ?? null;
  const current = streak.current ?? 0;
  const longest = streak.longest ?? 0;
  const freezes = streak.freezes ?? 0;

  // Already counted today — completing more intentions doesn't inflate it.
  if (last === today) {
    return {
      changed: false,
      outcome: 'already-counted',
      streak: { current, longest, lastActiveDay: today, freezes },
    };
  }

  const gap = last ? daysBetween(last, today) : null;

  // First ever completion.
  if (!last) {
    return {
      changed: true,
      outcome: 'started',
      streak: { current: 1, longest: Math.max(longest, 1), lastActiveDay: today, freezes },
    };
  }

  // Consecutive day — the happy path.
  if (gap === 1) {
    const next = current + 1;
    return {
      changed: true,
      outcome: 'extended',
      streak: { current: next, longest: Math.max(longest, next), lastActiveDay: today, freezes },
    };
  }

  // Exactly one day missed, and a thermos is available — spend it.
  if (gap === 2 && freezes > 0) {
    const next = current + 1;
    return {
      changed: true,
      outcome: 'frozen',
      streak: {
        current: next,
        longest: Math.max(longest, next),
        lastActiveDay: today,
        freezes: freezes - 1,
      },
    };
  }

  // A clock skew or timezone change put "today" before the last active day.
  // Treat it as already counted rather than punishing the user.
  if (gap !== null && gap <= 0) {
    return {
      changed: false,
      outcome: 'already-counted',
      streak: { current, longest, lastActiveDay: last, freezes },
    };
  }

  // The fire went out.
  return {
    changed: true,
    outcome: 'broken',
    streak: { current: 1, longest: Math.max(longest, current), lastActiveDay: today, freezes },
    previous: current,
  };
};

/**
 * A streak is "at risk" once the user has not completed anything today, and
 * "cold" once the gap is wide enough that it has already lapsed. The client
 * uses this to decide whether the hearth glows or smoulders — without the
 * server having to run a nightly job.
 */
export const describeStreak = (streak = {}, { timezone = 'UTC', now = new Date() } = {}) => {
  const today = dayKey(now, timezone);
  const last = streak.lastActiveDay ?? null;
  const gap = last ? daysBetween(last, today) : null;

  let state = 'cold';
  if (last === today) state = 'lit';
  else if (gap === 1) state = 'at-risk';
  else if (gap === 2 && (streak.freezes ?? 0) > 0) state = 'at-risk';

  return {
    current: streak.current ?? 0,
    longest: streak.longest ?? 0,
    freezes: streak.freezes ?? 0,
    lastActiveDay: last,
    activeToday: last === today,
    state,
    // A lapsed streak still shows its number until the next completion resets
    // it; this flag lets the UI say so honestly.
    lapsed: state === 'cold' && (streak.current ?? 0) > 0,
  };
};

/** Milestones worth celebrating with a toast and a Logbook entry. */
export const STREAK_MILESTONES = Object.freeze([3, 7, 14, 30, 60, 100, 180, 365]);

export const milestoneFor = (streakDays) =>
  STREAK_MILESTONES.includes(streakDays) ? streakDays : null;

export default { evaluateStreak, describeStreak, milestoneFor };

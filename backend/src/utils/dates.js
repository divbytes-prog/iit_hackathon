/**
 * Day arithmetic in the *user's* timezone.
 *
 * Streaks are the one place where "what day is it" has to match what the
 * person sees on their own wall clock. Storing a UTC timestamp and dividing by
 * 86400 breaks for anyone who finishes an intention at 11pm in UTC+5:30, so we
 * resolve calendar days through Intl with the timezone captured at signup.
 */

const DEFAULT_ZONE = 'UTC';

const formatterCache = new Map();

const formatterFor = (timeZone) => {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    );
  }
  return formatterCache.get(timeZone);
};

/** True when `timeZone` is a resolvable IANA zone on this runtime. */
export const isValidTimeZone = (timeZone) => {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
};

export const safeZone = (timeZone) => (isValidTimeZone(timeZone) ? timeZone : DEFAULT_ZONE);

/**
 * The calendar day of `date` in `timeZone`, as an `YYYY-MM-DD` string.
 * en-CA is used because its short date format is already ISO-ordered.
 */
export const dayKey = (date = new Date(), timeZone = DEFAULT_ZONE) =>
  formatterFor(safeZone(timeZone)).format(date);

/** Whole days between two `YYYY-MM-DD` keys (b - a). Negative when b precedes a. */
export const daysBetween = (a, b) => {
  if (!a || !b) return null;
  const toUtc = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
};

/** Shift a `YYYY-MM-DD` key by `amount` days, returning a new key. */
export const addDays = (key, amount) => {
  const [year, month, day] = key.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return shifted.toISOString().slice(0, 10);
};

/** The last `count` day keys ending today, oldest first. Used by the Logbook chart. */
export const recentDayKeys = (count, timeZone = DEFAULT_ZONE, from = new Date()) => {
  const today = dayKey(from, timeZone);
  return Array.from({ length: count }, (_, index) => addDays(today, index - (count - 1)));
};

/** Start-of-day `Date` (UTC instant) for a day key — handy for range queries. */
export const startOfDayUtc = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export default { dayKey, daysBetween, addDays, recentDayKeys, safeZone, isValidTimeZone };

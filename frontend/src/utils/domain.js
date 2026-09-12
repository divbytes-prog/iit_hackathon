/**
 * Client-side mirror of the server's vocabulary.
 *
 * These values are for *labelling and previewing only* — the authoritative
 * copies live in the API's constants/attributes.js and every reward is
 * calculated there. Showing "worth 32 XP" before you commit is a courtesy, not
 * a promise the client can keep on its own.
 */

export const ATTRIBUTES = {
  mind: {
    key: 'mind',
    label: 'Mind',
    icon: 'mind',
    blurb: 'Study, reading, deep work, anything that sharpens you.',
    example: 'Read one chapter',
  },
  body: {
    key: 'body',
    label: 'Body',
    icon: 'body',
    blurb: 'Movement, sleep, food, the upkeep of the vessel.',
    example: 'Walk to the shops',
  },
  craft: {
    key: 'craft',
    label: 'Craft',
    icon: 'craft',
    blurb: 'Making things — code, music, writing, side quests.',
    example: 'Fix that one bug',
  },
  heart: {
    key: 'heart',
    label: 'Heart',
    icon: 'heart',
    blurb: 'People, journalling, rest, the soft and necessary.',
    example: 'Ring your mum',
  },
  order: {
    key: 'order',
    label: 'Order',
    icon: 'order',
    blurb: 'Chores, admin, inbox, the small tidyings.',
    example: 'Clear the sink',
  },
};

export const ATTRIBUTE_LIST = Object.values(ATTRIBUTES);

export const DIFFICULTIES = {
  trivial: { key: 'trivial', label: 'Trivial', xp: 8, beans: 3, hint: 'A couple of minutes' },
  easy: { key: 'easy', label: 'Easy', xp: 16, beans: 6, hint: 'A quarter of an hour' },
  medium: { key: 'medium', label: 'Medium', xp: 32, beans: 13, hint: 'A proper sitting' },
  hard: { key: 'hard', label: 'Hard', xp: 58, beans: 26, hint: 'Most of an afternoon' },
  epic: { key: 'epic', label: 'Epic', xp: 95, beans: 48, hint: 'The whole day' },
};

export const DIFFICULTY_LIST = Object.values(DIFFICULTIES);

export const CATEGORY_LABELS = {
  mug: 'Mugs',
  plant: 'Plants',
  lamp: 'Lamps',
  record: 'Records',
  badge: 'Badges',
  consumable: 'Sundries',
};

export const RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  legendary: 'Legendary',
};

export const attributeColor = (key) => `var(--attr-${key}, var(--ink-soft))`;

/**
 * Today as a `YYYY-MM-DD` key in the viewer's own timezone — the same shape
 * the API stores `lastCompletedDay` in. en-CA is used because its short date
 * format is already ISO-ordered.
 */
export const todayKey = () => new Date().toLocaleDateString('en-CA');

/**
 * Is this intention done *right now*?
 *
 * Two shapes count. A one-off becomes `completed`. A repeating one stays
 * `active` for ever and records the day it was last kept, so "done" means
 * "kept today". Always returns a boolean — returning undefined would make
 * React drop the `aria-pressed` attribute entirely, leaving the checkbox
 * stateless to a screen reader.
 */
export const isDone = (task) =>
  task.status === 'completed' ||
  (task.recurrence !== 'none' && task.lastCompletedDay === todayKey());

/** "3 days ago", "just now" — relative time without pulling in a date library. */
export const timeAgo = (value) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'a minute ago';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  if (days < 31) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? 'last week' : `${weeks} weeks ago`;
  }

  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** "Mon 12" for the activity ribbon's axis. */
export const shortDay = (dayKey) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
};

export const formatDayKey = (dayKey) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
};

/**
 * A due date's urgency, for the pill on an intention card.
 *
 * Both sides are flattened to midnight before differencing. Comparing raw
 * timestamps instead makes "due yesterday at 9pm" come out as 0.1 days, which
 * rounds to "Today" — the label has to follow the calendar, not the clock.
 */
export const dueState = (dueDate) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfDue = new Date(due);
  startOfDue.setHours(0, 0, 0, 0);

  const days = Math.round((startOfDue - startOfToday) / 86_400_000);

  if (days < 0) return { tone: 'overdue', label: days === -1 ? 'Yesterday' : `${-days} days late` };
  if (days === 0) return { tone: 'today', label: 'Today' };
  if (days === 1) return { tone: 'soon', label: 'Tomorrow' };
  if (days <= 7) return { tone: 'soon', label: `In ${days} days` };
  return {
    tone: 'later',
    label: due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  };
};

export default { ATTRIBUTES, DIFFICULTIES, timeAgo, dueState };

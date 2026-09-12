/**
 * The five facets of a Hearthlog character.
 *
 * Every intention is filed under exactly one attribute, so finishing it grows
 * that part of the character. Keys are the stable database values — never
 * rename one without a migration.
 */
export const ATTRIBUTES = Object.freeze({
  mind: {
    key: 'mind',
    label: 'Mind',
    blurb: 'Study, reading, deep work, anything that sharpens you.',
    hue: '#7D8F69',
  },
  body: {
    key: 'body',
    label: 'Body',
    blurb: 'Movement, sleep, food, the upkeep of the vessel.',
    hue: '#C97B5A',
  },
  craft: {
    key: 'craft',
    label: 'Craft',
    blurb: 'Making things — code, music, writing, side quests.',
    hue: '#D9A441',
  },
  heart: {
    key: 'heart',
    label: 'Heart',
    blurb: 'People, journalling, rest, the soft and necessary.',
    hue: '#B2707E',
  },
  order: {
    key: 'order',
    label: 'Order',
    blurb: 'Chores, admin, inbox, the small tidyings.',
    hue: '#6E8CA0',
  },
});

export const ATTRIBUTE_KEYS = Object.freeze(Object.keys(ATTRIBUTES));

/**
 * Difficulty tiers. `xp` and `beans` are the *only* source of reward values —
 * clients never send them, which is what keeps stats honest.
 */
export const DIFFICULTIES = Object.freeze({
  trivial: { key: 'trivial', label: 'Trivial', xp: 8, beans: 3, minutes: 5 },
  easy: { key: 'easy', label: 'Easy', xp: 16, beans: 6, minutes: 15 },
  medium: { key: 'medium', label: 'Medium', xp: 32, beans: 13, minutes: 45 },
  hard: { key: 'hard', label: 'Hard', xp: 58, beans: 26, minutes: 120 },
  epic: { key: 'epic', label: 'Epic', xp: 95, beans: 48, minutes: 240 },
});

export const DIFFICULTY_KEYS = Object.freeze(Object.keys(DIFFICULTIES));

export const TASK_STATUSES = Object.freeze(['active', 'completed', 'archived']);
export const RECURRENCES = Object.freeze(['none', 'daily', 'weekly']);

/**
 * Level titles. The highest entry whose `level` is <= the character level wins.
 */
export const TITLES = Object.freeze([
  { level: 1, title: 'Kettle Novice' },
  { level: 3, title: 'Margin Scribbler' },
  { level: 5, title: 'Steady Hand' },
  { level: 8, title: 'Lamp Keeper' },
  { level: 12, title: 'Quiet Adept' },
  { level: 16, title: 'Dog-Eared Scholar' },
  { level: 21, title: 'Hearthwarden' },
  { level: 27, title: 'Keeper of Small Hours' },
  { level: 34, title: 'Archivist of Ordinary Days' },
  { level: 42, title: 'Lo-fi Luminary' },
  { level: 50, title: 'Patron Saint of Tuesdays' },
]);

export const titleForLevel = (level) =>
  TITLES.reduce((best, entry) => (level >= entry.level ? entry.title : best), TITLES[0].title);

import Task from '../models/Task.js';
import { ATTRIBUTES } from '../constants/attributes.js';
import { CATALOG_BY_SLUG } from '../constants/catalog.js';
import { dayKey, recentDayKeys, startOfDayUtc } from '../utils/dates.js';
import { describeAttributes, describeCharacter } from './progression.service.js';
import { describeStreak } from './streak.service.js';

/**
 * The single object the client renders the whole desk from.
 *
 * Bundling character, attributes, streak and today's tallies into one response
 * means a page load is a single round trip — which is most of what makes the
 * app feel local rather than networked.
 */
export const buildCharacterSnapshot = async (user, { now = new Date() } = {}) => {
  const timezone = user.timezone ?? 'UTC';
  const today = dayKey(now, timezone);

  const [completedToday, activeCount] = await Promise.all([
    Task.countDocuments({ owner: user._id, lastCompletedDay: today }),
    Task.countDocuments({ owner: user._id, status: 'active' }),
  ]);

  return {
    character: describeCharacter(user.character ?? {}),
    attributes: describeAttributes(user.attributes ?? {}),
    streak: describeStreak(user.streak ?? {}, { timezone, now }),
    today: {
      day: today,
      completed: completedToday,
      activeIntentions: activeCount,
    },
    inventory: (user.inventory ?? []).map((entry) => ({
      slug: entry.slug,
      category: entry.category,
      quantity: entry.quantity,
      acquiredAt: entry.acquiredAt,
      item: CATALOG_BY_SLUG[entry.slug] ?? null,
    })),
    badges: user.badges ?? [],
    unlockedThemes: user.unlockedThemes ?? ['daylight'],
    preferences: user.preferences ?? {},
    stats: user.stats ?? { tasksCreated: 0, tasksCompleted: 0 },
  };
};

/**
 * Per-day completion counts for the last `days` days, in the user's timezone.
 * Powers the Logbook's activity ribbon.
 */
export const buildActivityRibbon = async (user, { days = 30, now = new Date() } = {}) => {
  const timezone = user.timezone ?? 'UTC';
  const keys = recentDayKeys(days, timezone, now);
  const since = startOfDayUtc(keys[0]);

  const rows = await Task.aggregate([
    {
      $match: {
        owner: user._id,
        lastCompletedDay: { $ne: null },
        completedAt: { $gte: new Date(since.getTime() - 48 * 3600 * 1000) },
      },
    },
    {
      $group: {
        _id: '$lastCompletedDay',
        count: { $sum: 1 },
        xp: { $sum: '$xpAwarded' },
      },
    },
  ]);

  const byDay = Object.fromEntries(rows.map((row) => [row._id, row]));

  return keys.map((day) => ({
    day,
    count: byDay[day]?.count ?? 0,
    xp: byDay[day]?.xp ?? 0,
  }));
};

/** Totals split by attribute — the radar/bar breakdown on the Logbook. */
export const buildAttributeBreakdown = async (user) => {
  const rows = await Task.aggregate([
    { $match: { owner: user._id, status: 'completed' } },
    { $group: { _id: '$attribute', count: { $sum: 1 }, xp: { $sum: '$xpAwarded' } } },
  ]);

  const byAttribute = Object.fromEntries(rows.map((row) => [row._id, row]));

  return Object.keys(ATTRIBUTES).map((key) => ({
    ...ATTRIBUTES[key],
    level: user.attributes?.[key]?.level ?? 1,
    totalXp: user.attributes?.[key]?.totalXp ?? 0,
    completed: byAttribute[key]?.count ?? 0,
    xpFromTasks: byAttribute[key]?.xp ?? 0,
  }));
};

export default { buildCharacterSnapshot, buildActivityRibbon, buildAttributeBreakdown };

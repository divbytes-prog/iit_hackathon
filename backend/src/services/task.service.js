import ActivityLog from '../models/ActivityLog.js';
import Task from '../models/Task.js';
import ApiError from '../utils/ApiError.js';
import { ATTRIBUTES, DIFFICULTIES, titleForLevel } from '../constants/attributes.js';
import { dayKey } from '../utils/dates.js';
import {
  applyAttributeXp,
  applyCharacterXp,
  calculateReward,
  revokeAttributeXp,
  revokeCharacterXp,
} from './progression.service.js';
import { evaluateStreak, milestoneFor } from './streak.service.js';
import { buildCharacterSnapshot } from './character.service.js';

/**
 * Completing an intention — the one write that mints XP and beans.
 *
 * The ordering here matters:
 *
 *  1. Flip the task atomically with a condition on its current state. If the
 *     condition does not match, someone already claimed it and we award
 *     nothing. This is what makes a double-click, a retried request and a
 *     replayed fetch all safe.
 *  2. Only then evaluate the streak, calculate the reward and apply XP.
 *
 * Because step 1 cannot succeed twice for the same day, no amount of client
 * retrying can farm the same task.
 */
export const completeTask = async (user, taskId, { now = new Date() } = {}) => {
  const timezone = user.timezone ?? 'UTC';
  const today = dayKey(now, timezone);

  const existing = await Task.findOne({ _id: taskId, owner: user._id });
  if (!existing) throw ApiError.notFound('That intention is not on your desk.');
  if (existing.status === 'archived') {
    throw ApiError.conflict('That intention is archived. Restore it first.');
  }

  const repeats = existing.recurrence !== 'none';

  // --- 1. Atomic claim ---------------------------------------------------
  const claim = repeats
    ? { _id: taskId, owner: user._id, lastCompletedDay: { $ne: today } }
    : { _id: taskId, owner: user._id, status: 'active' };

  const update = repeats
    ? {
        $set: { lastCompletedDay: today, completedAt: now, status: 'active' },
        $inc: { completionCount: 1 },
      }
    : {
        $set: { status: 'completed', completedAt: now, lastCompletedDay: today },
        $inc: { completionCount: 1 },
      };

  const task = await Task.findOneAndUpdate(claim, update, { new: true });

  if (!task) {
    throw ApiError.conflict(
      repeats
        ? 'You have already kept that ritual today. Come back tomorrow.'
        : 'That intention is already done.',
      { code: 'ALREADY_COMPLETED' }
    );
  }

  // --- 2. Streak ---------------------------------------------------------
  const streakResult = evaluateStreak(user.streak ?? {}, { timezone, now });
  const streakDays = streakResult.streak.current;

  // How many completions already counted today, excluding this one.
  const completionsToday = Math.max(
    0,
    (await Task.countDocuments({ owner: user._id, lastCompletedDay: today })) - 1
  );

  // --- 3. Reward ---------------------------------------------------------
  const reward = calculateReward({
    difficulty: task.difficulty,
    streakDays,
    completionsToday,
  });

  task.xpAwarded = reward.xp;
  task.beansAwarded = reward.beans;
  await task.save();

  // --- 4. Apply to the character ----------------------------------------
  const before = {
    level: user.character.level,
    attributeLevel: user.attributes?.[task.attribute]?.level ?? 1,
  };

  const character = applyCharacterXp(user.character, reward.xp);
  user.character.level = character.level;
  user.character.xp = character.xp;
  user.character.totalXp = character.totalXp;
  user.character.beans += reward.beans;
  user.character.totalBeansEarned += reward.beans;

  const attribute = applyAttributeXp(user.attributes[task.attribute] ?? {}, reward.xp);
  user.attributes[task.attribute].level = attribute.level;
  user.attributes[task.attribute].xp = attribute.xp;
  user.attributes[task.attribute].totalXp = attribute.totalXp;

  user.streak.current = streakResult.streak.current;
  user.streak.longest = streakResult.streak.longest;
  user.streak.lastActiveDay = streakResult.streak.lastActiveDay;
  user.streak.freezes = streakResult.streak.freezes;

  user.stats.tasksCompleted += 1;

  // --- 5. Receipts -------------------------------------------------------
  const logs = [
    {
      owner: user._id,
      type: 'task_completed',
      message: `Finished "${task.title}".`,
      xpDelta: reward.xp,
      beansDelta: reward.beans,
      attribute: task.attribute,
      taskId: task._id,
      day: today,
      meta: {
        difficulty: task.difficulty,
        streakBonus: reward.streakBonus,
        fatigue: reward.fatigue,
      },
    },
  ];

  const events = [];

  for (const level of character.levelsGained) {
    const title = titleForLevel(level);
    events.push({ kind: 'level_up', level, title });
    logs.push({
      owner: user._id,
      type: 'level_up',
      message: `Chapter ${level} begins — ${title}.`,
      day: today,
      meta: { level, title },
    });
  }

  for (const level of attribute.levelsGained) {
    events.push({ kind: 'attribute_level_up', attribute: task.attribute, level });
    logs.push({
      owner: user._id,
      type: 'attribute_level_up',
      message: `${ATTRIBUTES[task.attribute].label} reached level ${level}.`,
      attribute: task.attribute,
      day: today,
      meta: { level },
    });
  }

  if (streakResult.outcome === 'frozen') {
    events.push({ kind: 'streak_frozen', current: streakDays });
    logs.push({
      owner: user._id,
      type: 'streak_frozen',
      message: 'A Dented Thermos kept the hearth warm through a missed day.',
      day: today,
      meta: { current: streakDays },
    });
  } else if (streakResult.outcome === 'broken') {
    events.push({ kind: 'streak_broken', previous: streakResult.previous });
    logs.push({
      owner: user._id,
      type: 'streak_broken',
      message: `The hearth had gone cold after ${streakResult.previous} days. Relit today.`,
      day: today,
      meta: { previous: streakResult.previous },
    });
  }

  const milestone = milestoneFor(streakDays);
  if (milestone && streakResult.changed) {
    events.push({ kind: 'streak_milestone', days: milestone });
    logs.push({
      owner: user._id,
      type: 'streak_extended',
      message: `${milestone} days in a row. The fire is properly going now.`,
      day: today,
      meta: { days: milestone },
    });
  }

  await user.save();
  await ActivityLog.insertMany(logs);

  return {
    task: task.toPublicJSON(),
    reward,
    events,
    streak: { ...streakResult.streak, outcome: streakResult.outcome },
    levelUp: character.levelsGained.length > 0 ? { from: before.level, to: character.level } : null,
    attributeLevelUp:
      attribute.levelsGained.length > 0
        ? { attribute: task.attribute, from: before.attributeLevel, to: attribute.level }
        : null,
    snapshot: await buildCharacterSnapshot(user, { now }),
  };
};

/**
 * Undoing a completion.
 *
 * The exact XP and beans that were granted are clawed back — which is why the
 * amounts are stored on the task. Without that, "complete, undo, complete"
 * would be a money printer whenever the streak multiplier changed in between.
 * Beans already spent cannot go negative; the balance floors at zero.
 */
export const reopenTask = async (user, taskId, { now = new Date() } = {}) => {
  const today = dayKey(now, user.timezone);
  const task = await Task.findOne({ _id: taskId, owner: user._id });
  if (!task) throw ApiError.notFound('That intention is not on your desk.');

  // A repeating intention never becomes `completed` — it stays active and
  // records the day it was kept. Both shapes of "done" can be undone.
  const keptToday = task.recurrence !== 'none' && task.lastCompletedDay === today;

  if (task.status !== 'completed' && !keptToday) {
    throw ApiError.conflict('That intention is not marked done.', { code: 'NOT_COMPLETED' });
  }

  const xp = task.xpAwarded ?? 0;
  const beans = task.beansAwarded ?? 0;

  const character = revokeCharacterXp(user.character, xp);
  user.character.level = character.level;
  user.character.xp = character.xp;
  user.character.totalXp = character.totalXp;
  user.character.beans = Math.max(0, user.character.beans - beans);
  user.character.totalBeansEarned = Math.max(0, user.character.totalBeansEarned - beans);

  const attribute = revokeAttributeXp(user.attributes[task.attribute] ?? {}, xp);
  user.attributes[task.attribute].level = attribute.level;
  user.attributes[task.attribute].xp = attribute.xp;
  user.attributes[task.attribute].totalXp = attribute.totalXp;

  user.stats.tasksCompleted = Math.max(0, user.stats.tasksCompleted - 1);

  task.status = 'active';
  task.completedAt = null;
  task.lastCompletedDay = null;
  task.xpAwarded = 0;
  task.beansAwarded = 0;
  task.completionCount = Math.max(0, task.completionCount - 1);

  await Promise.all([task.save(), user.save()]);

  await ActivityLog.create({
    owner: user._id,
    type: 'task_reopened',
    message: `Put "${task.title}" back on the desk.`,
    xpDelta: -xp,
    beansDelta: -beans,
    attribute: task.attribute,
    taskId: task._id,
    day: dayKey(now, user.timezone),
  });

  return {
    task: task.toPublicJSON(),
    revoked: { xp, beans },
    snapshot: await buildCharacterSnapshot(user, { now }),
  };
};

/** Sort specs for the list endpoint, keyed by the `sort` query value. */
export const SORTS = Object.freeze({
  manual: { position: 1, createdAt: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  due: { dueDate: 1, createdAt: -1 },
  difficulty: { createdAt: -1 },
});

export const DIFFICULTY_RANK = Object.freeze(
  Object.fromEntries(Object.keys(DIFFICULTIES).map((key, index) => [key, index]))
);

export default { completeTask, reopenTask, SORTS, DIFFICULTY_RANK };

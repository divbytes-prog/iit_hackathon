import { ATTRIBUTES, DIFFICULTIES, titleForLevel } from '../constants/attributes.js';

/**
 * The progression engine.
 *
 * Two rules govern everything in this file:
 *
 *  1. **Non-linear.** Both curves are quadratic, so every level costs strictly
 *     more than the one before it. Level 2 is 132 XP; level 20 is 5,680.
 *  2. **Server-authoritative.** Rewards are derived from the task's difficulty
 *     and the character's own streak — never from anything in a request body.
 *     A client that POSTs `{ xp: 999999 }` changes nothing.
 */

// --- Curves ---------------------------------------------------------------

/** XP needed to go from character level `level` to `level + 1`. */
export const xpToNextLevel = (level) => 80 + 40 * level + 12 * level * level;

/** XP needed to go from attribute level `level` to `level + 1`. Gentler curve. */
export const attributeXpToNextLevel = (level) => 50 + 20 * level + 5 * level * level;

/** Cumulative XP required to *reach* `level` from scratch — used for charts. */
export const totalXpForLevel = (level) => {
  let total = 0;
  for (let current = 1; current < level; current += 1) total += xpToNextLevel(current);
  return total;
};

// --- Reward calculation ---------------------------------------------------

/** Streak bonus: +1% per consecutive day, capped at +30%. */
export const streakMultiplier = (streakDays) => 1 + Math.min(Math.max(streakDays, 0), 30) * 0.01;

/**
 * Diminishing returns past a generous daily allowance.
 *
 * This is the anti-farming valve: the first 12 completions of a day are worth
 * full value, after which each further one is worth 10% less, never dropping
 * below a quarter. Someone genuinely having a heroic day still gets rewarded;
 * someone clicking "add task / complete task" in a loop stops profiting.
 */
export const fatigueMultiplier = (completionsToday) => {
  const FREE_ALLOWANCE = 12;
  if (completionsToday < FREE_ALLOWANCE) return 1;
  return Math.max(0.25, 1 - (completionsToday - FREE_ALLOWANCE + 1) * 0.1);
};

/**
 * What finishing this task is worth, right now, for this character.
 * Returns whole numbers — no fractional XP ever reaches the database.
 */
export const calculateReward = ({ difficulty, streakDays = 0, completionsToday = 0 }) => {
  const tier = DIFFICULTIES[difficulty] ?? DIFFICULTIES.easy;
  const streakBonus = streakMultiplier(streakDays);
  const fatigue = fatigueMultiplier(completionsToday);
  const multiplier = streakBonus * fatigue;

  return {
    xp: Math.max(1, Math.round(tier.xp * multiplier)),
    beans: Math.max(1, Math.round(tier.beans * multiplier)),
    baseXp: tier.xp,
    baseBeans: tier.beans,
    streakBonus: Number(streakBonus.toFixed(2)),
    fatigue: Number(fatigue.toFixed(2)),
  };
};

// --- Applying XP ----------------------------------------------------------

/**
 * Pour `amount` XP into a { level, xp, totalXp } progress object.
 *
 * Handles multi-level gains in one go (an Epic intention can carry a level-1
 * character through two levels), and mutates nothing — the caller decides
 * what to persist.
 */
const applyXp = (progress, amount, costFor) => {
  let level = progress.level ?? 1;
  let xp = (progress.xp ?? 0) + amount;
  const totalXp = (progress.totalXp ?? 0) + amount;
  const levelsGained = [];

  // Guard against a pathological loop if a curve ever returns <= 0.
  let safety = 0;
  while (xp >= costFor(level) && safety < 1000) {
    xp -= costFor(level);
    level += 1;
    levelsGained.push(level);
    safety += 1;
  }

  return { level, xp, totalXp, levelsGained, xpToNext: costFor(level) };
};

export const applyCharacterXp = (character, amount) => applyXp(character, amount, xpToNextLevel);

export const applyAttributeXp = (attribute, amount) =>
  applyXp(attribute, amount, attributeXpToNextLevel);

/** Removing XP (when a completion is undone). Never drops below level 1 / 0 XP. */
export const revokeCharacterXp = (character, amount) => {
  const totalXp = Math.max(0, (character.totalXp ?? 0) - amount);
  return { ...levelFromTotalXp(totalXp, xpToNextLevel), totalXp };
};

export const revokeAttributeXp = (attribute, amount) => {
  const totalXp = Math.max(0, (attribute.totalXp ?? 0) - amount);
  return { ...levelFromTotalXp(totalXp, attributeXpToNextLevel), totalXp };
};

/** Re-derive { level, xp } from lifetime XP — the canonical reconstruction. */
const levelFromTotalXp = (totalXp, costFor) => {
  let level = 1;
  let remaining = totalXp;
  let safety = 0;
  while (remaining >= costFor(level) && safety < 1000) {
    remaining -= costFor(level);
    level += 1;
    safety += 1;
  }
  return { level, xp: remaining };
};

// --- Presentation helpers -------------------------------------------------

/** Everything the client needs to draw a progress ring, in one object. */
export const describeProgress = (progress, costFor = xpToNextLevel) => {
  const level = progress.level ?? 1;
  const xp = progress.xp ?? 0;
  const xpToNext = costFor(level);
  return {
    level,
    xp,
    xpToNext,
    totalXp: progress.totalXp ?? 0,
    percent: xpToNext > 0 ? Math.min(100, Math.round((xp / xpToNext) * 100)) : 0,
  };
};

export const describeCharacter = (character) => ({
  ...describeProgress(character, xpToNextLevel),
  beans: character.beans ?? 0,
  totalBeansEarned: character.totalBeansEarned ?? 0,
  title: titleForLevel(character.level ?? 1),
  equipped: character.equipped ?? {},
});

export const describeAttributes = (attributes = {}) =>
  Object.fromEntries(
    Object.keys(ATTRIBUTES).map((key) => [
      key,
      {
        ...describeProgress(attributes[key] ?? {}, attributeXpToNextLevel),
        ...ATTRIBUTES[key],
      },
    ])
  );

export default {
  xpToNextLevel,
  attributeXpToNextLevel,
  calculateReward,
  applyCharacterXp,
  applyAttributeXp,
  revokeCharacterXp,
  revokeAttributeXp,
  describeCharacter,
  describeAttributes,
  describeProgress,
};

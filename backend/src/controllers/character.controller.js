import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import { safeZone } from '../utils/dates.js';
import { ATTRIBUTES, DIFFICULTIES } from '../constants/attributes.js';
import { xpToNextLevel, attributeXpToNextLevel } from '../services/progression.service.js';
import { buildCharacterSnapshot } from '../services/character.service.js';

// GET /character
export const getCharacter = asyncHandler(async (req, res) =>
  ok(res, await buildCharacterSnapshot(req.user))
);

// PATCH /character/preferences
export const updatePreferences = asyncHandler(async (req, res) => {
  const { user } = req;
  const { theme, reducedMotion, soundEnabled, timezone, username } = req.body;

  if (theme !== undefined) {
    // A theme has to have been unlocked on The Shelf first — otherwise the
    // rewards economy means nothing.
    if (!user.unlockedThemes.includes(theme)) {
      throw ApiError.forbidden('That record is still on the shelf, unbought.', {
        code: 'THEME_LOCKED',
      });
    }
    user.preferences.theme = theme;
  }

  if (reducedMotion !== undefined) user.preferences.reducedMotion = reducedMotion;
  if (soundEnabled !== undefined) user.preferences.soundEnabled = soundEnabled;
  if (timezone !== undefined) user.timezone = safeZone(timezone);
  if (username !== undefined) user.username = username;

  await user.save();

  return ok(res, {
    user: user.toPublicJSON(),
    snapshot: await buildCharacterSnapshot(user),
  }, { message: 'Saved.' });
});

/**
 * GET /character/rules
 *
 * The progression tables, served to the client so the UI can show "this is
 * worth 32 XP" *before* the user commits — and so the rules are inspectable
 * rather than hidden. The numbers are still only ever applied server-side.
 */
export const getRules = asyncHandler(async (_req, res) =>
  ok(res, {
    attributes: Object.values(ATTRIBUTES),
    difficulties: Object.values(DIFFICULTIES),
    curve: {
      description:
        'Each chapter costs more than the last: 80 + 40L + 12L². Attributes use a gentler 50 + 20L + 5L².',
      characterLevels: Array.from({ length: 20 }, (_, index) => ({
        level: index + 1,
        xpToNext: xpToNextLevel(index + 1),
      })),
      attributeLevels: Array.from({ length: 20 }, (_, index) => ({
        level: index + 1,
        xpToNext: attributeXpToNextLevel(index + 1),
      })),
    },
    bonuses: {
      streak: 'Up to +30% XP and beans, one percent per consecutive day.',
      fatigue:
        'After twelve completions in a day, each further one is worth 10% less, never below 25%.',
    },
  })
);

export default { getCharacter, updatePreferences, getRules };

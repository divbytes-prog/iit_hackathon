import ActivityLog from '../models/ActivityLog.js';
import Task from '../models/Task.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import { dayKey } from '../utils/dates.js';
import {
  buildActivityRibbon,
  buildAttributeBreakdown,
  buildCharacterSnapshot,
} from '../services/character.service.js';

/**
 * GET /stats/summary
 *
 * Everything the Logbook page draws, in one request: the 30-day ribbon, the
 * attribute breakdown, lifetime totals and the current snapshot.
 */
export const getSummary = asyncHandler(async (req, res) => {
  const { user } = req;

  const [ribbon, breakdown, snapshot, totals] = await Promise.all([
    buildActivityRibbon(user, { days: 30 }),
    buildAttributeBreakdown(user),
    buildCharacterSnapshot(user),
    Task.aggregate([
      { $match: { owner: user._id } },
      {
        $group: {
          _id: null,
          created: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          xpEarned: { $sum: '$xpAwarded' },
          beansEarned: { $sum: '$beansAwarded' },
        },
      },
    ]),
  ]);

  const aggregate = totals[0] ?? { created: 0, completed: 0, xpEarned: 0, beansEarned: 0 };

  const busiest = ribbon.reduce(
    (best, entry) => (entry.count > (best?.count ?? 0) ? entry : best),
    null
  );

  return ok(res, {
    snapshot,
    ribbon,
    attributes: breakdown,
    totals: {
      created: aggregate.created,
      completed: aggregate.completed,
      xpEarned: aggregate.xpEarned,
      beansEarned: aggregate.beansEarned,
      completionRate:
        aggregate.created > 0 ? Math.round((aggregate.completed / aggregate.created) * 100) : 0,
      activeDays: ribbon.filter((entry) => entry.count > 0).length,
      busiestDay: busiest?.count > 0 ? busiest : null,
    },
  });
});

/**
 * GET /stats/activity
 *
 * The Logbook feed — paginated, newest first. This is the historical record
 * the progression totals are derived from.
 */
export const getActivity = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const skip = (page - 1) * limit;

  const filter = { owner: req.user._id };
  if (req.query.type) filter.type = req.query.type;

  const [rows, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  return ok(
    res,
    {
      entries: rows.map((row) => row.toPublicJSON()),
      today: dayKey(new Date(), req.user.timezone),
    },
    { meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } }
  );
});

export default { getSummary, getActivity };

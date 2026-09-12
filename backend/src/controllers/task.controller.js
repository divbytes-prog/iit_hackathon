import Task from '../models/Task.js';
import ActivityLog from '../models/ActivityLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { created, ok } from '../utils/ApiResponse.js';
import { dayKey } from '../utils/dates.js';
import { DIFFICULTY_RANK, SORTS, completeTask, reopenTask } from '../services/task.service.js';
import { buildCharacterSnapshot } from '../services/character.service.js';

/**
 * Every query in this file starts from `{ owner: req.user._id }`. There is no
 * code path that reads or writes a task without that filter, which is what
 * makes one account's desk invisible to another.
 */
const ownerScope = (req, extra = {}) => ({ owner: req.user._id, ...extra });

// GET /tasks
export const listTasks = asyncHandler(async (req, res) => {
  const { status, attribute, difficulty, q, sort, page, limit } = req.validatedQuery;

  const filter = ownerScope(req);
  if (status !== 'all') filter.status = status;
  if (attribute) filter.attribute = attribute;
  if (difficulty) filter.difficulty = difficulty;
  if (q) {
    // Escape the user's text so a stray "(" cannot break the regex.
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ title: new RegExp(safe, 'i') }, { tags: new RegExp(safe, 'i') }];
  }

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Task.find(filter).sort(SORTS[sort] ?? SORTS.manual).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  let tasks = rows.map((task) => task.toPublicJSON());

  // Difficulty ordering is a display concern, not an index — sort in memory
  // on the already-paged slice rather than storing a redundant rank field.
  if (sort === 'difficulty') {
    tasks = tasks.sort(
      (a, b) => (DIFFICULTY_RANK[b.difficulty] ?? 0) - (DIFFICULTY_RANK[a.difficulty] ?? 0)
    );
  }

  return ok(res, { tasks }, {
    meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// GET /tasks/:id
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne(ownerScope(req, { _id: req.params.id }));
  if (!task) throw ApiError.notFound('That intention is not on your desk.');
  return ok(res, { task: task.toPublicJSON() });
});

// POST /tasks
export const createTask = asyncHandler(async (req, res) => {
  const { user } = req;

  // New intentions land at the top of the manual order.
  const first = await Task.findOne(ownerScope(req)).sort({ position: 1 }).select('position').lean();
  const position = (first?.position ?? 0) - 1;

  const task = await Task.create({
    ...req.body,
    owner: user._id,
    position,
  });

  user.stats.tasksCreated += 1;
  await user.save();

  await ActivityLog.create({
    owner: user._id,
    type: 'task_created',
    message: `Wrote down "${task.title}".`,
    attribute: task.attribute,
    taskId: task._id,
    day: dayKey(new Date(), user.timezone),
  });

  return created(res, { task: task.toPublicJSON() }, { message: 'Added to the desk.' });
});

// PATCH /tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne(ownerScope(req, { _id: req.params.id }));
  if (!task) throw ApiError.notFound('That intention is not on your desk.');

  // A completed task keeps its rewards; editing it does not re-run scoring.
  Object.assign(task, req.body);
  await task.save();

  return ok(res, { task: task.toPublicJSON() }, { message: 'Updated.' });
});

// DELETE /tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete(ownerScope(req, { _id: req.params.id }));
  if (!task) throw ApiError.notFound('That intention is not on your desk.');

  await ActivityLog.create({
    owner: req.user._id,
    type: 'task_deleted',
    message: `Crossed out "${task.title}".`,
    attribute: task.attribute,
    day: dayKey(new Date(), req.user.timezone),
    // Deleting a done task does not claw back XP — the work still happened.
    meta: { wasCompleted: task.status === 'completed' },
  });

  return ok(res, { id: task._id.toString() }, { message: 'Removed from the desk.' });
});

// POST /tasks/:id/complete
export const complete = asyncHandler(async (req, res) => {
  const result = await completeTask(req.user, req.params.id);
  return ok(res, result, { message: 'Well done.' });
});

// POST /tasks/:id/reopen
export const reopen = asyncHandler(async (req, res) => {
  const result = await reopenTask(req.user, req.params.id);
  return ok(res, result, { message: 'Back on the desk.' });
});

// POST /tasks/reorder
export const reorder = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  // Scope the bulk write to the caller's own tasks, so a forged id in the
  // list silently matches nothing instead of reordering someone else's desk.
  const operations = ids.map((id, index) => ({
    updateOne: {
      filter: { _id: id, owner: req.user._id },
      update: { $set: { position: index } },
    },
  }));

  const result = await Task.bulkWrite(operations, { ordered: false });

  return ok(res, {
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
  });
});

// GET /tasks/today — the Desk view: what is live right now.
export const today = asyncHandler(async (req, res) => {
  const { user } = req;
  const day = dayKey(new Date(), user.timezone);

  const [active, doneToday, snapshot] = await Promise.all([
    // A repeating intention stays `active` after it is kept, so it has to be
    // excluded by day as well — otherwise a daily ritual shows up as both
    // outstanding and finished at the same time.
    Task.find(ownerScope(req, { status: 'active', lastCompletedDay: { $ne: day } }))
      .sort(SORTS.manual)
      .limit(100),
    Task.find(ownerScope(req, { lastCompletedDay: day })).sort({ completedAt: -1 }).limit(50),
    buildCharacterSnapshot(user),
  ]);

  return ok(res, {
    day,
    active: active.map((task) => task.toPublicJSON()),
    completedToday: doneToday.map((task) => task.toPublicJSON()),
    snapshot,
  });
});

export default {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  complete,
  reopen,
  reorder,
  today,
};

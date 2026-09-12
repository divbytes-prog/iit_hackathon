import { z } from 'zod';
import {
  ATTRIBUTE_KEYS,
  DIFFICULTY_KEYS,
  RECURRENCES,
  TASK_STATUSES,
} from '../constants/attributes.js';

/**
 * Note what is absent from every schema below: xp, beans, level, completedAt,
 * xpAwarded, status-jump-to-completed. Those are outcomes the server decides.
 *
 * All schemas are `.strict()`, so a request carrying them is rejected outright
 * rather than silently ignored — a cheater gets a 422, not a quiet no-op.
 */

const title = z
  .string({ required_error: 'Give the intention a name.' })
  .trim()
  .min(1, 'Give the intention a name.')
  .max(140, 'Keep the name under 140 characters.');

const notes = z.string().trim().max(2000, 'Notes top out at 2000 characters.').optional();

const attribute = z.enum(ATTRIBUTE_KEYS, {
  errorMap: () => ({ message: `Pick one of: ${ATTRIBUTE_KEYS.join(', ')}.` }),
});

const difficulty = z.enum(DIFFICULTY_KEYS, {
  errorMap: () => ({ message: `Pick one of: ${DIFFICULTY_KEYS.join(', ')}.` }),
});

const tags = z
  .array(z.string().trim().min(1).max(24))
  .max(8, 'Eight tags is plenty.')
  .optional();

/**
 * "No due date" has to be listed *before* the coercion.
 *
 * `z.coerce.date()` happily accepts null — `new Date(null)` is the 1970 epoch,
 * not an error — so a union that tries coercion first turns every cleared due
 * date into "20,708 days overdue". Order matters here.
 */
const dueDate = z
  .union([
    z.null(),
    z.literal('').transform(() => null),
    z.coerce
      .date()
      .refine((value) => value.getFullYear() > 1970, 'That due date is not valid.')
      .refine((value) => value.getFullYear() < 2200, 'That due date is implausibly far away.'),
  ])
  .optional();

export const createTaskSchema = z
  .object({
    title,
    notes,
    attribute,
    difficulty: difficulty.optional().default('easy'),
    recurrence: z.enum(RECURRENCES).optional().default('none'),
    dueDate,
    tags,
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    notes,
    attribute: attribute.optional(),
    difficulty: difficulty.optional(),
    recurrence: z.enum(RECURRENCES).optional(),
    dueDate,
    tags,
    // Only archiving/restoring is a client decision. Completion goes through
    // POST /tasks/:id/complete so rewards are always calculated.
    status: z.enum(['active', 'archived']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.');

export const listTasksSchema = z
  .object({
    status: z.enum([...TASK_STATUSES, 'all']).optional().default('active'),
    attribute: z.enum(ATTRIBUTE_KEYS).optional(),
    difficulty: difficulty.optional(),
    q: z.string().trim().max(80).optional(),
    sort: z.enum(['manual', 'newest', 'oldest', 'difficulty', 'due']).optional().default('manual'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

export const reorderSchema = z
  .object({
    // Ordered list of task ids; index becomes the new position.
    ids: z
      .array(z.string().regex(/^[a-f\d]{24}$/i, 'Not a valid id.'))
      .min(1, 'Nothing to reorder.')
      .max(200),
  })
  .strict();

export const objectIdParamSchema = z
  .object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Not a valid id.') })
  .strict();

export default {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
  reorderSchema,
  objectIdParamSchema,
};

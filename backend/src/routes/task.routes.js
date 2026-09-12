import { Router } from 'express';
import {
  complete,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  reopen,
  reorder,
  today,
  updateTask,
} from '../controllers/task.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { writeLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  createTaskSchema,
  listTasksSchema,
  objectIdParamSchema,
  reorderSchema,
  updateTaskSchema,
} from '../validators/task.validator.js';

const router = Router();

// Everything below belongs to the signed-in character.
router.use(requireAuth);

// Static segments must be declared before "/:id", or "today" would be parsed
// as an object id and 404 on a cast error.
router.get('/today', today);
router.post('/reorder', writeLimiter, validate(reorderSchema), reorder);

router.get('/', validate(listTasksSchema, 'query'), listTasks);
router.post('/', writeLimiter, validate(createTaskSchema), createTask);

router.get('/:id', validate(objectIdParamSchema, 'params'), getTask);
router.patch(
  '/:id',
  writeLimiter,
  validate(objectIdParamSchema, 'params'),
  validate(updateTaskSchema),
  updateTask
);
router.delete('/:id', writeLimiter, validate(objectIdParamSchema, 'params'), deleteTask);

router.post('/:id/complete', writeLimiter, validate(objectIdParamSchema, 'params'), complete);
router.post('/:id/reopen', writeLimiter, validate(objectIdParamSchema, 'params'), reopen);

export default router;

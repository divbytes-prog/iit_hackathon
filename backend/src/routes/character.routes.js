import { Router } from 'express';
import {
  getCharacter,
  getRules,
  updatePreferences,
} from '../controllers/character.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { preferencesSchema } from '../validators/auth.validator.js';

const router = Router();

// The rules table is public — the scoring system is not a secret.
router.get('/rules', getRules);

router.use(requireAuth);
router.get('/', getCharacter);
router.patch('/preferences', validate(preferencesSchema), updatePreferences);

export default router;

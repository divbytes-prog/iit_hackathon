import { Router } from 'express';
import { getActivity, getSummary } from '../controllers/stats.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', getSummary);
router.get('/activity', getActivity);

export default router;

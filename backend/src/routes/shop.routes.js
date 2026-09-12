import { Router } from 'express';
import { equip, getInventory, getItems, purchase } from '../controllers/shop.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { writeLimiter } from '../middlewares/rateLimit.middleware.js';
import { equipSchema, listItemsSchema, purchaseSchema } from '../validators/shop.validator.js';

const router = Router();

router.use(requireAuth);

router.get('/items', validate(listItemsSchema, 'query'), getItems);
router.get('/inventory', getInventory);
router.post('/purchase', writeLimiter, validate(purchaseSchema), purchase);
router.post('/equip', writeLimiter, validate(equipSchema), equip);

export default router;

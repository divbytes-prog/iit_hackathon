import { z } from 'zod';
import { COSMETIC_SLOTS, ITEM_CATEGORIES } from '../constants/catalog.js';

export const purchaseSchema = z
  .object({
    slug: z
      .string({ required_error: 'Which item?' })
      .trim()
      .min(1, 'Which item?')
      .max(64),
  })
  .strict();

export const equipSchema = z
  .object({
    slot: z.enum(COSMETIC_SLOTS, {
      errorMap: () => ({ message: `Slot must be one of: ${COSMETIC_SLOTS.join(', ')}.` }),
    }),
    // `null` unequips the slot.
    slug: z.union([z.string().trim().min(1).max(64), z.null()]),
  })
  .strict();

export const listItemsSchema = z
  .object({
    category: z.enum(ITEM_CATEGORIES).optional(),
    affordable: z.enum(['true', 'false']).optional(),
  })
  .strict();

export default { purchaseSchema, equipSchema, listItemsSchema };

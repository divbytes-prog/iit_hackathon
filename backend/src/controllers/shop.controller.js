import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import { CATALOG_BY_SLUG } from '../constants/catalog.js';
import { equipItem, listItemsForUser, purchaseItem } from '../services/shop.service.js';

// GET /shop/items
export const getItems = asyncHandler(async (req, res) => {
  const { category, affordable } = req.validatedQuery ?? {};
  let items = await listItemsForUser(req.user);

  if (category) items = items.filter((item) => item.category === category);
  if (affordable === 'true') items = items.filter((item) => item.affordable);

  return ok(res, {
    items,
    beans: req.user.character.beans,
    level: req.user.character.level,
  });
});

// POST /shop/purchase
export const purchase = asyncHandler(async (req, res) => {
  const result = await purchaseItem(req.user, req.body.slug);
  return ok(res, result, { message: `${result.item.name} is yours.` });
});

// GET /shop/inventory
export const getInventory = asyncHandler(async (req, res) =>
  ok(res, {
    inventory: (req.user.inventory ?? []).map((entry) => ({
      slug: entry.slug,
      category: entry.category,
      quantity: entry.quantity,
      acquiredAt: entry.acquiredAt,
      item: CATALOG_BY_SLUG[entry.slug] ?? null,
    })),
    equipped: req.user.character.equipped ?? {},
    badges: req.user.badges ?? [],
    unlockedThemes: req.user.unlockedThemes ?? [],
  })
);

// POST /shop/equip
export const equip = asyncHandler(async (req, res) => {
  const result = await equipItem(req.user, req.body);
  return ok(res, result, { message: 'Arranged.' });
});

export default { getItems, purchase, getInventory, equip };

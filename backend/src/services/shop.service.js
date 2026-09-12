import ActivityLog from '../models/ActivityLog.js';
import Item from '../models/Item.js';
import ApiError from '../utils/ApiError.js';
import { CATALOG, CATALOG_BY_SLUG } from '../constants/catalog.js';
import { dayKey } from '../utils/dates.js';
import { buildCharacterSnapshot } from './character.service.js';

/**
 * Reads the catalog from the database, falling back to the in-repo constant.
 *
 * The fallback matters: if someone deploys without running the seed script,
 * The Shelf still renders instead of showing an empty room.
 */
export const listItems = async () => {
  const rows = await Item.find({ isActive: true }).lean();
  if (rows.length === 0) return CATALOG.map((item) => ({ ...item }));
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    rarity: row.rarity,
    requiresLevel: row.requiresLevel,
    glyph: row.glyph,
    effect: row.effect,
  }));
};

/** Annotates each item with what this particular character can do with it. */
export const listItemsForUser = async (user) => {
  const items = await listItems();
  const owned = new Set((user.inventory ?? []).map((entry) => entry.slug));
  const level = user.character?.level ?? 1;
  const beans = user.character?.beans ?? 0;

  return items.map((item) => {
    const isConsumable = item.effect?.kind === 'streakFreeze';
    const alreadyOwned = owned.has(item.slug) && !isConsumable;
    return {
      ...item,
      owned: owned.has(item.slug),
      // Consumables can be re-bought; everything else is a one-time purchase.
      repeatable: isConsumable,
      locked: level < item.requiresLevel,
      affordable: beans >= item.price,
      canBuy: !alreadyOwned && level >= item.requiresLevel && beans >= item.price,
    };
  });
};

/**
 * Spending beans.
 *
 * The price is read from the catalog, never from the request — the client
 * sends a slug and nothing else. Every failure mode (unknown item, too poor,
 * under-levelled, already owned) is checked before a single bean moves.
 */
export const purchaseItem = async (user, slug, { now = new Date() } = {}) => {
  const fromDb = await Item.findOne({ slug, isActive: true }).lean();
  const item = fromDb ?? CATALOG_BY_SLUG[slug];

  if (!item) throw ApiError.notFound('The Shelf has nothing by that name.');

  const isConsumable = item.effect?.kind === 'streakFreeze';
  const existing = (user.inventory ?? []).find((entry) => entry.slug === slug);

  if (existing && !isConsumable) {
    throw ApiError.conflict('That is already on your shelf.', { code: 'ALREADY_OWNED' });
  }

  if ((user.character?.level ?? 1) < item.requiresLevel) {
    throw ApiError.forbidden(
      `That unlocks at chapter ${item.requiresLevel}. Keep going.`,
      { code: 'LEVEL_LOCKED' }
    );
  }

  const beans = user.character?.beans ?? 0;
  if (beans < item.price) {
    throw ApiError.badRequest(
      `That costs ${item.price} beans and you have ${beans}.`,
      { code: 'INSUFFICIENT_FUNDS', details: [{ field: 'beans', message: 'Not enough beans.' }] }
    );
  }

  // --- Debit and grant --------------------------------------------------
  user.character.beans = beans - item.price;

  if (existing) {
    existing.quantity += 1;
  } else {
    user.inventory.push({ slug: item.slug, category: item.category, quantity: 1 });
  }

  const effects = [];

  switch (item.effect?.kind) {
    case 'streakFreeze':
      user.streak.freezes += item.effect.charges ?? 1;
      effects.push({ kind: 'streakFreeze', freezes: user.streak.freezes });
      break;

    case 'theme':
      if (!user.unlockedThemes.includes(item.effect.theme)) {
        user.unlockedThemes.push(item.effect.theme);
      }
      effects.push({ kind: 'theme', theme: item.effect.theme });
      break;

    case 'badge':
      if (!user.badges.includes(item.effect.badge)) {
        user.badges.push(item.effect.badge);
      }
      effects.push({ kind: 'badge', badge: item.effect.badge });
      break;

    case 'cosmetic':
      // Buying a cosmetic equips it straight away — one less click, and the
      // reward is visible immediately.
      user.character.equipped = { ...(user.character.equipped ?? {}), [item.effect.slot]: item.slug };
      user.markModified('character.equipped');
      effects.push({ kind: 'cosmetic', slot: item.effect.slot, slug: item.slug });
      break;

    default:
      break;
  }

  await user.save();

  const logs = [
    {
      owner: user._id,
      type: 'purchase',
      message: `Brought home the ${item.name}.`,
      beansDelta: -item.price,
      day: dayKey(now, user.timezone),
      meta: { slug: item.slug, price: item.price, category: item.category },
    },
  ];

  if (item.effect?.kind === 'badge') {
    logs.push({
      owner: user._id,
      type: 'badge_earned',
      message: `Pinned the ${item.name} badge to the corkboard.`,
      day: dayKey(now, user.timezone),
      meta: { badge: item.effect.badge },
    });
  }

  await ActivityLog.insertMany(logs);

  return {
    item: {
      slug: item.slug,
      name: item.name,
      category: item.category,
      price: item.price,
      rarity: item.rarity,
      glyph: item.glyph,
    },
    effects,
    snapshot: await buildCharacterSnapshot(user, { now }),
  };
};

/** Equip or unequip a cosmetic the user actually owns. */
export const equipItem = async (user, { slot, slug }, { now = new Date() } = {}) => {
  if (slug === null) {
    user.character.equipped = { ...(user.character.equipped ?? {}), [slot]: null };
    user.markModified('character.equipped');
    await user.save();
    return { snapshot: await buildCharacterSnapshot(user, { now }) };
  }

  const owns = (user.inventory ?? []).some((entry) => entry.slug === slug);
  if (!owns) throw ApiError.forbidden('That is not on your shelf yet.');

  const item = CATALOG_BY_SLUG[slug] ?? (await Item.findOne({ slug }).lean());
  if (!item) throw ApiError.notFound('The Shelf has nothing by that name.');

  if (item.effect?.slot !== slot) {
    throw ApiError.badRequest(`${item.name} does not belong in the ${slot} slot.`);
  }

  user.character.equipped = { ...(user.character.equipped ?? {}), [slot]: slug };
  user.markModified('character.equipped');
  await user.save();

  return { snapshot: await buildCharacterSnapshot(user, { now }) };
};

export default { listItems, listItemsForUser, purchaseItem, equipItem };

/**
 * The Shelf — everything a character can buy with beans.
 *
 * This array is the source of truth; `npm run seed` upserts it into the
 * `items` collection by slug, so editing here and re-seeding is safe and
 * idempotent.
 *
 * effect.kind:
 *   cosmetic    — purely decorative, equippable into a slot
 *   theme       — unlocks a palette for the whole interface
 *   badge       — a permanent mark on the profile
 *   streakFreeze— consumable; protects the streak for one missed day
 */
export const CATALOG = Object.freeze([
  // ---- Mugs -------------------------------------------------------------
  {
    slug: 'chipped-mug',
    name: 'Chipped Mug',
    description: 'It leaks a little. You keep it anyway.',
    category: 'mug',
    price: 40,
    rarity: 'common',
    requiresLevel: 1,
    glyph: 'mug',
    effect: { kind: 'cosmetic', slot: 'mug' },
  },
  {
    slug: 'thermos',
    name: 'Dented Thermos',
    description: 'Keeps the hearth warm through one missed day. Consumed on use.',
    category: 'consumable',
    price: 120,
    rarity: 'rare',
    requiresLevel: 2,
    glyph: 'thermos',
    effect: { kind: 'streakFreeze', charges: 1 },
  },
  {
    slug: 'kiln-mug',
    name: 'Kiln-Fired Mug',
    description: 'Someone made this by hand. You can feel the thumbprint.',
    category: 'mug',
    price: 260,
    rarity: 'rare',
    requiresLevel: 6,
    glyph: 'mug-glazed',
    effect: { kind: 'cosmetic', slot: 'mug' },
  },

  // ---- Plants -----------------------------------------------------------
  {
    slug: 'desk-succulent',
    name: 'Desk Succulent',
    description: 'Survives neglect. Aspirational, really.',
    category: 'plant',
    price: 75,
    rarity: 'common',
    requiresLevel: 1,
    glyph: 'succulent',
    effect: { kind: 'cosmetic', slot: 'plant' },
  },
  {
    slug: 'trailing-pothos',
    name: 'Trailing Pothos',
    description: 'Grows toward the lamp. So do you.',
    category: 'plant',
    price: 210,
    rarity: 'rare',
    requiresLevel: 5,
    glyph: 'pothos',
    effect: { kind: 'cosmetic', slot: 'plant' },
  },
  {
    slug: 'window-fern',
    name: 'Window Fern',
    description: 'Fussy, humid, worth it. A small green weather system.',
    category: 'plant',
    price: 480,
    rarity: 'legendary',
    requiresLevel: 11,
    glyph: 'fern',
    effect: { kind: 'cosmetic', slot: 'plant' },
  },

  // ---- Lamps ------------------------------------------------------------
  {
    slug: 'clip-lamp',
    name: 'Clip Lamp',
    description: 'Clamped to the shelf at a slightly wrong angle. Perfect.',
    category: 'lamp',
    price: 90,
    rarity: 'common',
    requiresLevel: 2,
    glyph: 'clip-lamp',
    effect: { kind: 'cosmetic', slot: 'lamp' },
  },
  {
    slug: 'brass-banker',
    name: 'Brass Banker’s Lamp',
    description: 'Green glass shade. Makes 11pm feel like a decision, not a mistake.',
    category: 'lamp',
    price: 340,
    rarity: 'rare',
    requiresLevel: 8,
    glyph: 'banker-lamp',
    effect: { kind: 'cosmetic', slot: 'lamp' },
  },
  {
    slug: 'paper-moon',
    name: 'Paper Moon',
    description: 'A rice-paper globe that turns the whole room the colour of milk.',
    category: 'lamp',
    price: 620,
    rarity: 'legendary',
    requiresLevel: 14,
    glyph: 'paper-moon',
    effect: { kind: 'cosmetic', slot: 'lamp' },
  },

  // ---- Records (themes) -------------------------------------------------
  {
    slug: 'record-dusk',
    name: 'Dusk Sessions (LP)',
    description: 'Warms the room to amber and long shadows.',
    category: 'record',
    price: 300,
    rarity: 'rare',
    requiresLevel: 4,
    glyph: 'record',
    effect: { kind: 'theme', theme: 'dusk' },
  },
  {
    slug: 'record-rain',
    name: 'Rain On The Window (LP)',
    description: 'Cools everything to slate, sage and wet stone.',
    category: 'record',
    price: 300,
    rarity: 'rare',
    requiresLevel: 7,
    glyph: 'record',
    effect: { kind: 'theme', theme: 'rain' },
  },
  {
    slug: 'record-midnight',
    name: 'Midnight Oil (LP)',
    description: 'The whole desk goes dark. Only the lamp survives.',
    category: 'record',
    price: 550,
    rarity: 'legendary',
    requiresLevel: 10,
    glyph: 'record',
    effect: { kind: 'theme', theme: 'midnight' },
  },

  // ---- Badges -----------------------------------------------------------
  {
    slug: 'badge-early-riser',
    name: 'Early Riser',
    description: 'Pinned to the corkboard. You were up before the kettle.',
    category: 'badge',
    price: 150,
    rarity: 'common',
    requiresLevel: 3,
    glyph: 'sunrise',
    effect: { kind: 'badge', badge: 'early-riser' },
  },
  {
    slug: 'badge-marginalia',
    name: 'Marginalia',
    description: 'For those who write in books. Monsters. Beloved monsters.',
    category: 'badge',
    price: 400,
    rarity: 'rare',
    requiresLevel: 9,
    glyph: 'quill',
    effect: { kind: 'badge', badge: 'marginalia' },
  },
  {
    slug: 'badge-hearthkeeper',
    name: 'Hearthkeeper',
    description: 'Awarded to anyone stubborn enough to keep the fire lit.',
    category: 'badge',
    price: 900,
    rarity: 'legendary',
    requiresLevel: 15,
    glyph: 'hearth',
    effect: { kind: 'badge', badge: 'hearthkeeper' },
  },
]);

export const CATALOG_BY_SLUG = Object.freeze(
  Object.fromEntries(CATALOG.map((item) => [item.slug, item]))
);

export const ITEM_CATEGORIES = Object.freeze([
  'mug',
  'plant',
  'lamp',
  'record',
  'badge',
  'consumable',
]);

export const COSMETIC_SLOTS = Object.freeze(['mug', 'plant', 'lamp']);

/** Themes every account has from the start, without buying a record. */
export const DEFAULT_THEMES = Object.freeze(['daylight']);

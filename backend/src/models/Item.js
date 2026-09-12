import mongoose from 'mongoose';
import { ITEM_CATEGORIES } from '../constants/catalog.js';

const { Schema, model } = mongoose;

/**
 * A purchasable item on The Shelf. Seeded from `constants/catalog.js` via
 * `npm run seed`; the collection is the runtime source so prices can be tuned
 * without a redeploy.
 */
const itemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ITEM_CATEGORIES, required: true },
    price: { type: Number, required: true, min: 0 },
    rarity: { type: String, enum: ['common', 'rare', 'legendary'], default: 'common' },
    requiresLevel: { type: Number, default: 1, min: 1 },
    glyph: { type: String, default: 'box' },
    effect: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

itemSchema.index({ category: 1, price: 1 });

itemSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    slug: this.slug,
    name: this.name,
    description: this.description,
    category: this.category,
    price: this.price,
    rarity: this.rarity,
    requiresLevel: this.requiresLevel,
    glyph: this.glyph,
    effect: this.effect,
  };
};

export default model('Item', itemSchema);

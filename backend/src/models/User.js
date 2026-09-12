import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ATTRIBUTE_KEYS, titleForLevel } from '../constants/attributes.js';
import { COSMETIC_SLOTS, DEFAULT_THEMES } from '../constants/catalog.js';

const { Schema, model } = mongoose;

const PROGRESS_DEFAULT = () => ({ level: 1, xp: 0, totalXp: 0 });

/** One sub-document per attribute: mind, body, craft, heart, order. */
const progressSchema = new Schema(
  {
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    totalXp: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const attributesSchema = new Schema(
  Object.fromEntries(
    ATTRIBUTE_KEYS.map((key) => [key, { type: progressSchema, default: PROGRESS_DEFAULT }])
  ),
  { _id: false }
);

const inventoryItemSchema = new Schema(
  {
    slug: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 0 },
    acquiredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'An email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: [true, 'A name is required.'],
      trim: true,
      minlength: 2,
      maxlength: 32,
    },
    // `select: false` keeps the hash out of every query result by default.
    passwordHash: { type: String, required: true, select: false },

    timezone: { type: String, default: 'UTC' },

    character: {
      level: { type: Number, default: 1, min: 1 },
      xp: { type: Number, default: 0, min: 0 },
      totalXp: { type: Number, default: 0, min: 0 },
      beans: { type: Number, default: 30, min: 0 },
      totalBeansEarned: { type: Number, default: 30, min: 0 },
      equipped: {
        type: Object,
        default: () => Object.fromEntries(COSMETIC_SLOTS.map((slot) => [slot, null])),
      },
    },

    attributes: { type: attributesSchema, default: () => ({}) },

    streak: {
      current: { type: Number, default: 0, min: 0 },
      longest: { type: Number, default: 0, min: 0 },
      lastActiveDay: { type: String, default: null }, // YYYY-MM-DD in user's zone
      freezes: { type: Number, default: 0, min: 0 },
    },

    inventory: { type: [inventoryItemSchema], default: [] },
    badges: { type: [String], default: [] },
    unlockedThemes: { type: [String], default: () => [...DEFAULT_THEMES] },

    stats: {
      tasksCreated: { type: Number, default: 0, min: 0 },
      tasksCompleted: { type: Number, default: 0, min: 0 },
    },

    preferences: {
      theme: { type: String, default: 'daylight' },
      reducedMotion: { type: Boolean, default: false },
      soundEnabled: { type: Boolean, default: true },
    },

    // Hash of the active refresh token, so logout can truly revoke a session.
    refreshTokenHash: { type: String, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

userSchema.virtual('title').get(function title() {
  return titleForLevel(this.character?.level ?? 1);
});

/** Hash the password whenever it is set through the `password` setter. */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

/**
 * The shape the client is allowed to see. Anything sensitive — the password
 * hash, the refresh token hash, internal ids — is dropped here rather than
 * being filtered ad hoc in each controller.
 */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    username: this.username,
    timezone: this.timezone,
    title: titleForLevel(this.character?.level ?? 1),
    character: {
      level: this.character.level,
      xp: this.character.xp,
      totalXp: this.character.totalXp,
      beans: this.character.beans,
      totalBeansEarned: this.character.totalBeansEarned,
      equipped: this.character.equipped ?? {},
    },
    attributes: Object.fromEntries(
      ATTRIBUTE_KEYS.map((key) => [
        key,
        {
          level: this.attributes?.[key]?.level ?? 1,
          xp: this.attributes?.[key]?.xp ?? 0,
          totalXp: this.attributes?.[key]?.totalXp ?? 0,
        },
      ])
    ),
    streak: {
      current: this.streak.current,
      longest: this.streak.longest,
      lastActiveDay: this.streak.lastActiveDay,
      freezes: this.streak.freezes,
    },
    inventory: this.inventory.map((entry) => ({
      slug: entry.slug,
      category: entry.category,
      quantity: entry.quantity,
      acquiredAt: entry.acquiredAt,
    })),
    badges: this.badges,
    unlockedThemes: this.unlockedThemes,
    stats: this.stats,
    preferences: this.preferences,
    createdAt: this.createdAt,
  };
};

export default model('User', userSchema);

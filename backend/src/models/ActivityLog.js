import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const ACTIVITY_TYPES = Object.freeze([
  'task_created',
  'task_completed',
  'task_reopened',
  'task_deleted',
  'level_up',
  'attribute_level_up',
  'streak_extended',
  'streak_broken',
  'streak_frozen',
  'purchase',
  'badge_earned',
  'account_created',
]);

/**
 * The Logbook: an append-only history of everything that changed a character.
 *
 * This is what makes progression auditable — the totals on the user document
 * are a cache, and these entries are the receipts behind them.
 */
const activityLogSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    message: { type: String, required: true, maxlength: 240 },

    xpDelta: { type: Number, default: 0 },
    beansDelta: { type: Number, default: 0 },

    attribute: { type: String, default: null },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },

    // The user-local day this happened on, so the Logbook can group without
    // re-deriving timezones on every read.
    day: { type: String, index: true },

    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

activityLogSchema.index({ owner: 1, createdAt: -1 });
activityLogSchema.index({ owner: 1, type: 1, createdAt: -1 });

activityLogSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    type: this.type,
    message: this.message,
    xpDelta: this.xpDelta,
    beansDelta: this.beansDelta,
    attribute: this.attribute,
    taskId: this.taskId ? this.taskId.toString() : null,
    day: this.day,
    meta: this.meta,
    createdAt: this.createdAt,
  };
};

export default model('ActivityLog', activityLogSchema);

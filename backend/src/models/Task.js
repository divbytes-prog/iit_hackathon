import mongoose from 'mongoose';
import {
  ATTRIBUTE_KEYS,
  DIFFICULTY_KEYS,
  RECURRENCES,
  TASK_STATUSES,
} from '../constants/attributes.js';

const { Schema, model } = mongoose;

/**
 * An "intention" — one thing the user means to do.
 *
 * Reward fields (`xpAwarded`, `beansAwarded`) are written by the server at
 * completion time and are never accepted from a request body. They exist so
 * the Logbook can show what a past completion was actually worth even after
 * the difficulty table changes.
 */
const taskSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Give the intention a name.'],
      trim: true,
      minlength: [1, 'Give the intention a name.'],
      maxlength: [140, 'Keep the name under 140 characters.'],
    },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },

    attribute: {
      type: String,
      enum: { values: ATTRIBUTE_KEYS, message: '"{VALUE}" is not one of the five attributes.' },
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: { values: DIFFICULTY_KEYS, message: '"{VALUE}" is not a known difficulty.' },
      default: 'easy',
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'active',
      index: true,
    },
    recurrence: { type: String, enum: RECURRENCES, default: 'none' },

    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    // Recorded at completion — an audit trail, not an input.
    xpAwarded: { type: Number, default: 0, min: 0 },
    beansAwarded: { type: Number, default: 0, min: 0 },

    // For repeating intentions: how many times it has been carried out.
    completionCount: { type: Number, default: 0, min: 0 },
    lastCompletedDay: { type: String, default: null },

    position: { type: Number, default: 0 },
    tags: {
      type: [String],
      default: [],
      validate: [(value) => value.length <= 8, 'Eight tags is plenty.'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

// The list view is always "my tasks, by status, newest first".
taskSchema.index({ owner: 1, status: 1, position: 1, createdAt: -1 });
// The Logbook and streak checks scan completions in a date range.
taskSchema.index({ owner: 1, completedAt: -1 });

taskSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    notes: this.notes,
    attribute: this.attribute,
    difficulty: this.difficulty,
    status: this.status,
    recurrence: this.recurrence,
    dueDate: this.dueDate,
    completedAt: this.completedAt,
    xpAwarded: this.xpAwarded,
    beansAwarded: this.beansAwarded,
    completionCount: this.completionCount,
    lastCompletedDay: this.lastCompletedDay,
    position: this.position,
    tags: this.tags,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default model('Task', taskSchema);

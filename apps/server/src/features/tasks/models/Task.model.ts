import mongoose, { Document, Schema, Types } from 'mongoose';
import { TaskStatus, TaskPriority, RecurrenceFrequency } from '@lifeos/shared';

export interface ITaskDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  // Core
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;

  // Dates
  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;
  reminderAt?: Date;

  // Organization
  labelIds: Types.ObjectId[];

  // Time tracking
  estimatedDuration?: number;
  actualDuration?: number;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: {
    frequency: RecurrenceFrequency;
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
    endDate?: Date;
    count?: number;
  };
  recurrenceParentId?: Types.ObjectId;

  // Hierarchy
  parentTaskId?: Types.ObjectId;
  subTaskIds: Types.ObjectId[];

  // Dependencies
  blockedBy: Types.ObjectId[];
  blocks: Types.ObjectId[];
  relatedTasks: Types.ObjectId[];

  // Collaboration (future-ready)
  assignedTo?: Types.ObjectId;
  watchers: Types.ObjectId[];

  // Integration stubs (future modules)
  goalRef?: { goalId: Types.ObjectId };
  projectRef?: { projectId: Types.ObjectId };
  calendarEventRef?: { calendarEventId: Types.ObjectId };
  habitRef?: { habitId: Types.ObjectId };

  // Flags
  isFavorite: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isDeleted: boolean;
  deletedAt?: Date;

  // Sorting
  sortOrder: number;

  // Future extensibility
  customMetadata: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const RecurrenceRuleSchema = new Schema(
  {
    frequency: { type: String, enum: Object.values(RecurrenceFrequency), required: true },
    interval: { type: Number, default: 1, min: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    dayOfMonth: { type: Number, min: 1, max: 31 },
    monthOfYear: { type: Number, min: 1, max: 12 },
    endDate: { type: Date },
    count: { type: Number, min: 1 },
  },
  { _id: false },
);

const TaskSchema = new Schema<ITaskDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 500 },
    description: { type: String, default: '', maxlength: 10000 },
    notes: { type: String, default: '', maxlength: 50000 },
    status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.INBOX },
    priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.NONE },
    progress: { type: Number, default: 0, min: 0, max: 100 },

    startDate: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },
    reminderAt: { type: Date },

    labelIds: [{ type: Schema.Types.ObjectId, ref: 'Label' }],

    estimatedDuration: { type: Number, min: 0 },
    actualDuration: { type: Number, min: 0 },

    isRecurring: { type: Boolean, default: false },
    recurrenceRule: { type: RecurrenceRuleSchema },
    recurrenceParentId: { type: Schema.Types.ObjectId, ref: 'Task' },

    parentTaskId: { type: Schema.Types.ObjectId, ref: 'Task', index: true },
    subTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],

    blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    blocks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    relatedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    goalRef: { goalId: { type: Schema.Types.ObjectId, ref: 'Goal' } },
    projectRef: { projectId: { type: Schema.Types.ObjectId, ref: 'Project' } },
    calendarEventRef: { calendarEventId: { type: Schema.Types.ObjectId, ref: 'CalendarEvent' } },
    habitRef: { habitId: { type: Schema.Types.ObjectId, ref: 'Habit' } },

    isFavorite: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isTrashed: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    sortOrder: { type: Number, default: 0 },
    customMetadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, isDeleted: 1, isArchived: 1, isTrashed: 1 });
TaskSchema.index({ userId: 1, isFavorite: 1 });
TaskSchema.index({ userId: 1, labelIds: 1 });
TaskSchema.index({ userId: 1, 'goalRef.goalId': 1 });
TaskSchema.index({ userId: 1, 'projectRef.projectId': 1 });
TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ userId: 1, sortOrder: 1 });
TaskSchema.index({ title: 'text', description: 'text', notes: 'text' });

export const TaskModel = mongoose.model<ITaskDocument>('Task', TaskSchema);

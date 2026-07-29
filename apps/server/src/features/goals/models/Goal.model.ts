import mongoose, { Document, Schema } from 'mongoose';

export interface IGoalDocument extends Document {
  title: string;
  targetDate?: Date;
  progress: number;
  userId: mongoose.Types.ObjectId;
  isCompleted: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoalDocument>(
  {
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    targetDate: {
      type: Date,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

export const GoalModel = mongoose.model<IGoalDocument>('Goal', GoalSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IHabitDocument extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  streak: number;
  history: Date[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HabitSchema = new Schema<IHabitDocument>(
  {
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    streak: {
      type: Number,
      default: 0,
    },
    history: {
      type: [Date],
      default: [],
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

export const HabitModel = mongoose.model<IHabitDocument>('Habit', HabitSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IEventDocument extends Document {
  title: string;
  startTime: Date;
  endTime: Date;
  userId: mongoose.Types.ObjectId;
  calendarSource: string;
  reminderStatus: 'none' | 'scheduled' | 'sent';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEventDocument>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    calendarSource: {
      type: String,
      default: 'local',
    },
    reminderStatus: {
      type: String,
      enum: ['none', 'scheduled', 'sent'],
      default: 'none',
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

export const EventModel = mongoose.model<IEventDocument>('Event', EventSchema);

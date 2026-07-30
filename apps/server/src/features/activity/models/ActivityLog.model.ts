import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  details: Schema.Types.Map | Record<string, any>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Activity action is required'],
      index: true,
    },
    details: {
      type: Schema.Types.Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
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

export const ActivityLogModel =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLogDocument>('ActivityLog', ActivityLogSchema);


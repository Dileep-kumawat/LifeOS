import mongoose, { Document, Schema, Types } from 'mongoose';
import { ActivityAction } from '@lifeos/shared';

export interface IActivityLogDocument extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  action: ActivityAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLogDocument>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: Object.values(ActivityAction), required: true },
    field: { type: String },
    oldValue: { type: String },
    newValue: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

ActivityLogSchema.index({ taskId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });

export const ActivityLogModel =
  mongoose.models.TaskActivityLog ||
  mongoose.model<IActivityLogDocument>('TaskActivityLog', ActivityLogSchema);


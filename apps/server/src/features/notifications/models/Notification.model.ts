import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationDocument extends Document {
  title: string;
  content: string;
  userId: mongoose.Types.ObjectId;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  module: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    module: {
      type: String,
      required: true,
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

export const NotificationModel = mongoose.model<INotificationDocument>('Notification', NotificationSchema);

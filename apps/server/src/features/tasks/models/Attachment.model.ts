import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttachmentDocument extends Document {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  storageKey: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachmentDocument>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
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

AttachmentSchema.index({ taskId: 1, isDeleted: 1 });
AttachmentSchema.index({ userId: 1, isDeleted: 1 });

export const AttachmentModel = mongoose.model<IAttachmentDocument>('Attachment', AttachmentSchema);

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILabelDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  color: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabelSchema = new Schema<ILabelDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Label name is required'], trim: true, maxlength: 50 },
    color: { type: String, required: [true, 'Label color is required'], match: /^#[0-9A-Fa-f]{6}$/ },
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

LabelSchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });
LabelSchema.index({ userId: 1, isDeleted: 1 });

export const LabelModel = mongoose.model<ILabelDocument>('Label', LabelSchema);

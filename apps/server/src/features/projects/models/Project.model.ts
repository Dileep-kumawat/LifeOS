import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectDocument extends Document {
  name: string;
  color: string;
  userId: mongoose.Types.ObjectId;
  isCompleted: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    color: {
      type: String,
      default: '#787774', // Default to muted gray
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

export const ProjectModel = mongoose.model<IProjectDocument>('Project', ProjectSchema);

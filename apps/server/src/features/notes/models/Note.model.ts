import mongoose, { Document, Schema } from 'mongoose';

export interface INoteDocument extends Document {
  title: string;
  content: string;
  folder: string;
  tags: string[];
  isPinned: boolean;
  userId: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INoteDocument>(
  {
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    folder: {
      type: String,
      default: 'Inbox',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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

export const NoteModel = mongoose.model<INoteDocument>('Note', NoteSchema);

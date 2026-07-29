import mongoose, { Document, Schema } from 'mongoose';

export interface IFavoriteDocument extends Document {
  userId: mongoose.Types.ObjectId;
  targetType: 'Project' | 'Note' | 'Page' | 'File' | 'Dashboard';
  targetId: string; // The ID of the project, note, file, or a custom string identifier
  title: string;
  url: string; // Navigational URL in the application
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema = new Schema<IFavoriteDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['Project', 'Note', 'Page', 'File', 'Dashboard'],
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
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

// Compound index to prevent duplicate favorites of the same target per user
FavoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const FavoriteModel = mongoose.model<IFavoriteDocument>('Favorite', FavoriteSchema);

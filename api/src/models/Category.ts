import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// Compound index for user categories lookup
categorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });

export type CategoryDoc = InferSchemaType<typeof categorySchema> & Document;

export const Category = model<CategoryDoc>("Category", categorySchema);

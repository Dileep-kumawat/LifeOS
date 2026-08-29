import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const subjectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    color: { type: String, required: true, default: "#0075de" },
    examDate: { type: Date, default: null }
  },
  { timestamps: true }
);

subjectSchema.index({ userId: 1, createdAt: -1 });

export type SubjectDoc = InferSchemaType<typeof subjectSchema> & Document;

export const Subject = model<SubjectDoc>("Subject", subjectSchema);

import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const flashcardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", default: null, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", default: null, index: true },
    front: { type: String, required: true, trim: true, maxlength: 2000 },
    back: { type: String, required: true, trim: true, maxlength: 5000 },

    // SM-2 Spaced Repetition State Fields
    easeFactor: { type: Number, required: true, default: 2.5 },
    intervalDays: { type: Number, required: true, default: 0 },
    repetitions: { type: Number, required: true, default: 0 },
    nextReviewDate: { type: Date, required: true, default: () => new Date(), index: true }
  },
  { timestamps: true }
);

flashcardSchema.index({ userId: 1, nextReviewDate: 1 });
flashcardSchema.index({ userId: 1, topicId: 1, createdAt: -1 });

export type FlashcardDoc = InferSchemaType<typeof flashcardSchema> & Document;

export const Flashcard = model<FlashcardDoc>("Flashcard", flashcardSchema);

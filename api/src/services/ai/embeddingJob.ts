import type { Job } from "bullmq";
import { enqueueJob } from "../queue.js";
import { Embedding, type SourceType } from "../../models/Embedding.js";
import { Note } from "../../models/Note.js";
import { Goal } from "../../models/Goal.js";
import { Habit } from "../../models/Habit.js";
import { Event } from "../../models/Event.js";
import { Transaction } from "../../models/Transaction.js";
import { Budget } from "../../models/Budget.js";
import { generateEmbedding } from "./embeddings.js";
import { formatSourceRecordForEmbedding } from "./ragText.js";
import { logger } from "../../logger.js";

export interface EmbeddingJobData {
  type?: string;
  sourceType: SourceType;
  sourceId: string;
  userId: string;
}

/**
 * Default debounce window (30 seconds) to prevent re-embedding on every keystroke autosave.
 */
export const DEFAULT_EMBEDDING_DEBOUNCE_MS = 30000;

/**
 * Enqueues an embedding job via the single application queue (`enqueueJob`).
 * Debounces rapid edits using a `dedupeKey` of `embedding_${sourceType}_${sourceId}`.
 */
export async function enqueueEmbeddingJob(
  sourceType: SourceType,
  sourceId: string | object,
  userId: string | object,
  opts: { delay?: number; immediate?: boolean } = {}
) {
  const idStr = sourceId.toString();
  const userStr = userId.toString();
  const dedupeKey = `embedding_${sourceType}_${idStr}`;

  // In test environment or when immediate is requested, override delay to 0
  const isTest = process.env.NODE_ENV === "test";
  const delay = opts.immediate || isTest ? 0 : (opts.delay ?? DEFAULT_EMBEDDING_DEBOUNCE_MS);

  try {
    return await enqueueJob(
      "embedding",
      { sourceType, sourceId: idStr, userId: userStr },
      { dedupeKey, delay }
    );
  } catch (err: any) {
    if (isTest) {
      return { queued: false, duplicate: false, jobId: dedupeKey };
    }
    throw err;
  }
}

/**
 * Deletes the embedding document associated with a source record immediately on source deletion.
 */
export async function deleteEmbedding(
  sourceType: SourceType,
  sourceId: string | object
): Promise<void> {
  const idStr = sourceId.toString();
  await Embedding.deleteOne({ sourceType, sourceId: idStr });
  logger.info({ sourceType, sourceId: idStr }, "Embedding record deleted");
}

/**
 * Model map for source lookup
 */
const SOURCE_MODELS: Record<SourceType, any> = {
  note: Note,
  goal: Goal,
  habit: Habit,
  event: Event,
  transaction: Transaction,
  budget: Budget
};

/**
 * Job worker processor for `type: "embedding"`.
 */
export async function processEmbeddingJob(job: Job<EmbeddingJobData>): Promise<void> {
  const { sourceType, sourceId, userId } = job.data;
  if (!sourceType || !sourceId || !userId) {
    logger.warn({ data: job.data }, "embedding job missing required fields — skipping");
    return;
  }

  const model = SOURCE_MODELS[sourceType];
  if (!model) {
    logger.warn({ sourceType }, "unknown sourceType in embedding job — skipping");
    return;
  }

  const doc = await model.findOne({ _id: sourceId, userId });
  if (!doc) {
    // Source document was deleted before job executed — remove any stale embedding
    await Embedding.deleteOne({ sourceType, sourceId });
    logger.info(
      { sourceType, sourceId },
      "embedding job: source document missing — cleaned up embedding"
    );
    return;
  }

  const { title, embeddedText } = formatSourceRecordForEmbedding(sourceType, doc);
  const vector = await generateEmbedding(embeddedText);

  // Upsert embedding: replace existing embedding for edited content (no stale duplicates)
  await Embedding.findOneAndUpdate(
    { sourceType, sourceId },
    {
      userId,
      sourceType,
      sourceId,
      embeddedText,
      title,
      vector
    },
    { upsert: true, new: true, runValidators: true }
  );

  logger.info({ sourceType, sourceId, userId }, "embedding updated successfully");
}

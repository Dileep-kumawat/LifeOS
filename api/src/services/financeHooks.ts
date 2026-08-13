import type { TransactionDoc } from "../models/Transaction.js";
import { recalculateBudgetSpend } from "./budgetService.js";
import { enqueueEmbeddingJob, deleteEmbedding } from "./ai/embeddingJob.js";
import { logger } from "../logger.js";

export interface TransactionPreviousState {
  category?: string;
  amount?: number;
  type?: string;
  date?: Date;
}

type TransactionCreatedListener = (transaction: TransactionDoc) => void | Promise<void>;
type TransactionDeletedListener = (transaction: TransactionDoc) => void | Promise<void>;
type TransactionUpdatedListener = (
  transaction: TransactionDoc,
  previous?: TransactionPreviousState
) => void | Promise<void>;

const deletionListeners: TransactionDeletedListener[] = [];
const creationListeners: TransactionCreatedListener[] = [];
const updateListeners: TransactionUpdatedListener[] = [];

/**
 * Default internal listener: budget spend recalculation and embedding job on transaction creation.
 */
creationListeners.push(async (transaction: TransactionDoc) => {
  try {
    await enqueueEmbeddingJob("transaction", transaction._id, transaction.userId);
  } catch (err) {
    logger.error({ err, transactionId: transaction._id }, "Error enqueuing transaction embedding");
  }

  if (transaction.type === "expense") {
    try {
      await recalculateBudgetSpend(transaction.userId, transaction.category, transaction.date);
    } catch (err) {
      logger.error({ err, transactionId: transaction._id }, "Error recalculating budget on transaction creation");
    }
  }
});

/**
 * Default internal listener: budget spend recalculation and embedding deletion on transaction deletion.
 */
deletionListeners.push(async (transaction: TransactionDoc) => {
  try {
    await deleteEmbedding("transaction", transaction._id);
  } catch (err) {
    logger.error({ err, transactionId: transaction._id }, "Error deleting transaction embedding");
  }

  if (transaction.type === "expense") {
    try {
      await recalculateBudgetSpend(transaction.userId, transaction.category, transaction.date);
    } catch (err) {
      logger.error({ err, transactionId: transaction._id }, "Error recalculating budget on transaction deletion");
    }
  }
});

/**
 * Default internal listener: budget spend recalculation and embedding update on transaction update.
 */
updateListeners.push(async (transaction: TransactionDoc, previous?: TransactionPreviousState) => {
  try {
    await enqueueEmbeddingJob("transaction", transaction._id, transaction.userId);
  } catch (err) {
    logger.error({ err, transactionId: transaction._id }, "Error enqueuing transaction embedding on update");
  }

  try {
    // Recalculate for current category
    if (transaction.type === "expense" || previous?.type === "expense") {
      await recalculateBudgetSpend(transaction.userId, transaction.category, transaction.date);
    }

    // If category changed or type changed, recalculate for previous category as well
    if (previous?.category && previous.category !== transaction.category) {
      await recalculateBudgetSpend(
        transaction.userId,
        previous.category,
        previous.date || transaction.date
      );
    }
  } catch (err) {
    logger.error({ err, transactionId: transaction._id }, "Error recalculating budget on transaction update");
  }
});

export function registerOnTransactionDeleted(listener: TransactionDeletedListener): () => void {
  deletionListeners.push(listener);
  return () => {
    const idx = deletionListeners.indexOf(listener);
    if (idx !== -1) deletionListeners.splice(idx, 1);
  };
}

export function registerOnTransactionCreated(listener: TransactionCreatedListener): () => void {
  creationListeners.push(listener);
  return () => {
    const idx = creationListeners.indexOf(listener);
    if (idx !== -1) creationListeners.splice(idx, 1);
  };
}

export function registerOnTransactionUpdated(listener: TransactionUpdatedListener): () => void {
  updateListeners.push(listener);
  return () => {
    const idx = updateListeners.indexOf(listener);
    if (idx !== -1) updateListeners.splice(idx, 1);
  };
}

export async function onTransactionDeleted(transaction: TransactionDoc): Promise<void> {
  for (const listener of deletionListeners) {
    try {
      await listener(transaction);
    } catch (err) {
      console.error("Error in onTransactionDeleted listener:", err);
    }
  }
}

export async function onTransactionCreated(transaction: TransactionDoc): Promise<void> {
  for (const listener of creationListeners) {
    try {
      await listener(transaction);
    } catch (err) {
      console.error("Error in onTransactionCreated listener:", err);
    }
  }
}

export async function onTransactionUpdated(
  transaction: TransactionDoc,
  previous?: TransactionPreviousState
): Promise<void> {
  for (const listener of updateListeners) {
    try {
      await listener(transaction, previous);
    } catch (err) {
      console.error("Error in onTransactionUpdated listener:", err);
    }
  }
}

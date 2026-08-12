import type { TransactionDoc } from "../models/Transaction.js";

type TransactionEventListener = (transaction: TransactionDoc) => void | Promise<void>;

const deletionListeners: TransactionEventListener[] = [];
const creationListeners: TransactionEventListener[] = [];
const updateListeners: TransactionEventListener[] = [];

/**
 * Register a listener to be called when a transaction is deleted.
 * Prompt 2 (Budget recalculation) & Prompt 3 (Embedding removal) will hook into this.
 */
export function registerOnTransactionDeleted(listener: TransactionEventListener): () => void {
  deletionListeners.push(listener);
  return () => {
    const idx = deletionListeners.indexOf(listener);
    if (idx !== -1) deletionListeners.splice(idx, 1);
  };
}

export function registerOnTransactionCreated(listener: TransactionEventListener): () => void {
  creationListeners.push(listener);
  return () => {
    const idx = creationListeners.indexOf(listener);
    if (idx !== -1) creationListeners.splice(idx, 1);
  };
}

export function registerOnTransactionUpdated(listener: TransactionEventListener): () => void {
  updateListeners.push(listener);
  return () => {
    const idx = updateListeners.indexOf(listener);
    if (idx !== -1) updateListeners.splice(idx, 1);
  };
}

/**
 * Dispatch event when a transaction is deleted.
 */
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

export async function onTransactionUpdated(transaction: TransactionDoc): Promise<void> {
  for (const listener of updateListeners) {
    try {
      await listener(transaction);
    } catch (err) {
      console.error("Error in onTransactionUpdated listener:", err);
    }
  }
}

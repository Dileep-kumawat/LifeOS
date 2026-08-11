import mongoose from "mongoose";
import { Embedding, type SourceType } from "../../models/Embedding.js";
import { generateEmbedding } from "./embeddings.js";
import { logger } from "../../logger.js";

export interface RetrievedItem {
  id: string;
  sourceType: SourceType;
  sourceId: string;
  title: string;
  embeddedText: string;
  snippet: string;
  score: number;
}

export interface RetrieveOptions {
  topK?: number;
  minScore?: number;
  sourceType?: SourceType;
}

export interface RetrievalResult {
  results: RetrievedItem[];
  total: number;
  query: string;
}

/** Default minimum confidence score threshold to reject garbage/unrelated matches */
export const DEFAULT_MIN_SCORE = 0.15;
export const DEFAULT_TOP_K = 5;

/**
 * Calculates cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Creates a clean snippet of embedded text for attribution and prompt injection.
 */
function createSnippet(text: string, maxLen = 250): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen).trim() + "...";
}

/**
 * Standalone RAG Retriever service.
 * Embeds query, performs per-user scoped vector search, and returns top-K relevant records.
 *
 * CRITICAL SECURITY GUARANTEE:
 * Retrieval MUST be strictly filtered by `userId`. A user's query can NEVER return another user's content.
 */
export async function retrieveContext(
  userId: string | object,
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievalResult> {
  const userIdStr = userId.toString();
  const cleanQuery = query?.trim() ?? "";
  const topK = options.topK ?? DEFAULT_TOP_K;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  // Empty query guard
  if (!cleanQuery) {
    return { results: [], total: 0, query: cleanQuery };
  }

  // Generate embedding for user query
  const queryVector = await generateEmbedding(cleanQuery);

  let candidateResults: RetrievedItem[] = [];

  // Try Atlas $vectorSearch first
  try {
    const userObjectId = new mongoose.Types.ObjectId(userIdStr);
    const filter: Record<string, any> = { userId: userObjectId };
    if (options.sourceType) {
      filter.sourceType = options.sourceType;
    }

    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: process.env.MONGO_VECTOR_INDEX || "vector_index",
          path: "vector",
          queryVector,
          numCandidates: topK * 10,
          limit: topK,
          filter
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          sourceType: 1,
          sourceId: 1,
          title: 1,
          embeddedText: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    const atlasDocs = await Embedding.aggregate(pipeline);
    if (Array.isArray(atlasDocs) && atlasDocs.length > 0) {
      candidateResults = atlasDocs.map((doc) => ({
        id: doc._id.toString(),
        sourceType: doc.sourceType,
        sourceId: doc.sourceId.toString(),
        title: doc.title || "",
        embeddedText: doc.embeddedText || "",
        snippet: createSnippet(doc.embeddedText || ""),
        score: doc.score ?? 0
      }));
    }
  } catch (err: any) {
    logger.debug(
      { err: err.message },
      "Atlas $vectorSearch unavailable — falling back to local cosine similarity search"
    );
  }

  // Fallback if $vectorSearch is not supported (e.g. local Docker Mongo / Vitest) or returned no results
  if (candidateResults.length === 0) {
    const filter: Record<string, any> = { userId: userIdStr };
    if (options.sourceType) filter.sourceType = options.sourceType;

    const docs = await Embedding.find(filter).lean();
    if (docs.length === 0) {
      return { results: [], total: 0, query: cleanQuery };
    }

    const scored = docs.map((doc) => {
      const score = cosineSimilarity(queryVector, doc.vector);
      return {
        id: doc._id.toString(),
        sourceType: doc.sourceType as SourceType,
        sourceId: doc.sourceId.toString(),
        title: doc.title || "",
        embeddedText: doc.embeddedText || "",
        snippet: createSnippet(doc.embeddedText || ""),
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);
    candidateResults = scored.slice(0, topK);
  }

  // Apply minScore threshold for uncertainty/low-confidence signalling
  const filteredResults = candidateResults.filter((r) => r.score >= minScore);

  return {
    results: filteredResults,
    total: filteredResults.length,
    query: cleanQuery
  };
}

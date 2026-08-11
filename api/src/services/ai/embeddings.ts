import { MistralAIEmbeddings } from "@langchain/mistralai";
import { env } from "../../config/env.js";
import { logger } from "../../logger.js";

/**
 * EMBEDDING MODEL CHOICE & RATIONALE:
 * We use Mistral Embed (`mistral-embed` via `@langchain/mistralai`, 1024 dimensions).
 *
 * Rationale:
 * 1. Consistency: LifeOS already uses `@langchain/mistralai` with `MISTRAL_API_KEY`
 *    as a primary LLM provider in `callAI()`. Reusing Mistral avoids adding a fourth
 *    vendor relationship (e.g. OpenAI / Cohere) just for embeddings.
 * 2. Performance: `mistral-embed` generates 1024-dimensional dense vectors with high
 *    semantic quality and low latency.
 * 3. Fallback: If `MISTRAL_API_KEY` is not present (or during unit tests), a deterministic
 *    fallback vector generator creates a normalized 1024d embedding so tests and offline
 *    dev work seamlessly.
 */

export const EMBEDDING_DIMENSION = 1024;
export const EMBEDDING_MODEL_NAME = "mistral-embed";

/**
 * Creates a deterministic 1024-dimensional normalized vector from text hash
 * for offline development, fallback mode, and unit testing.
 */
export function generateMockEmbedding(text: string, dim: number = EMBEDDING_DIMENSION): number[] {
  const vec = new Array(dim).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i * 17);
    vec[i] = val;
  }
  // Normalize vector to unit length (L2 norm = 1.0)
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

let embeddingsInstance: MistralAIEmbeddings | null = null;

function getEmbeddingsClient(): MistralAIEmbeddings | null {
  const apiKey = env.MISTRAL_API_KEY ?? process.env.MISTRAL_API_KEY;
  if (!apiKey || apiKey.startsWith("placeholder")) {
    return null;
  }
  if (!embeddingsInstance) {
    embeddingsInstance = new MistralAIEmbeddings({
      apiKey,
      model: EMBEDDING_MODEL_NAME
    });
  }
  return embeddingsInstance;
}

/**
 * Generates vector embedding for a given text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return generateMockEmbedding("empty", EMBEDDING_DIMENSION);
  }

  if (process.env.NODE_ENV === "test") {
    return generateMockEmbedding(cleanText, EMBEDDING_DIMENSION);
  }

  const client = getEmbeddingsClient();
  if (!client) {
    logger.debug("MISTRAL_API_KEY not configured — using fallback mock embedding");
    return generateMockEmbedding(cleanText, EMBEDDING_DIMENSION);
  }

  try {
    const vector = await client.embedQuery(cleanText);
    return vector;
  } catch (err: any) {
    logger.warn({ err: err.message }, "Embedding API call failed — using fallback mock vector");
    return generateMockEmbedding(cleanText, EMBEDDING_DIMENSION);
  }
}

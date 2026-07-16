import type { Env, MemoryApiRecord } from "../types";
import { readNumber } from "../utils/request";
import { searchVectorMemories } from "./vectorStore";

export interface SimilarHit {
  memory: MemoryApiRecord;
  score: number;
}

function isActiveNonSuperseded(memory: MemoryApiRecord): boolean {
  if (memory.status !== "active") return false;
  if (memory.version_status === "superseded") return false;
  return true;
}

export async function findSimilarActiveMemory(
  env: Env,
  input: { namespace: string; content: string; excludeIds?: string[] }
): Promise<SimilarHit | null> {
  try {
    const threshold = readNumber(env.DEDUP_COSINE, 0.9);
    const exclude = new Set(input.excludeIds ?? []);
    const hits = await searchVectorMemories(env, {
      namespace: input.namespace,
      query: input.content,
      topK: 5
    });

    let best: SimilarHit | null = null;
    for (const memory of hits) {
      if (exclude.has(memory.id)) continue;
      if (!isActiveNonSuperseded(memory)) continue;
      const score = memory.score ?? 0;
      if (score < threshold) continue;
      if (!best || score > best.score) {
        best = { memory, score };
      }
    }
    return best;
  } catch (error) {
    console.warn("dedup_gate: search failed (fail-open)", {
      reason: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
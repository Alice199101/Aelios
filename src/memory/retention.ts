import {
  deleteOldMessages,
  deleteOldUsageLogs,
  deleteOldMemoryEvents,
  deleteOldIdempotencyKeys,
  expireOldMemories,
  listHardDeletableMemories,
  hardDeleteMemoriesBatched,
  readCursor,
  writeCursor,
  RETENTION_BATCH_SIZE,
} from "../db/retention";
import type { Env } from "../types";
import { readPositiveInt } from "../utils/request";

// ---------------------------------------------------------------------------
// Retention windows — messages via MESSAGES_RETENTION_DAYS; rest hardcoded
// ---------------------------------------------------------------------------

function messagesRetentionDays(env: Env): number {
  return readPositiveInt(env.MESSAGES_RETENTION_DAYS, 7, 365);
}
const USAGE_LOGS_RETENTION_DAYS = 30;
const MEMORY_EVENTS_RETENTION_DAYS = 30;
const IDEMPOTENCY_KEYS_RETENTION_DAYS = 7;
const MEMORY_ACTIVE_EXPIRY_DAYS = 180;
const MEMORY_HARD_DELETE_DAYS = 30;
const THROTTLE_HOURS = 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function hoursAgoMs(hours: number): number {
  return Date.now() - hours * 3_600_000;
}

/**
 * Delete Vectorize vectors in batches of RETENTION_BATCH_SIZE.
 * Returns total number of IDs passed in. Errors are logged, not thrown,
 * so caller can decide how to degrade.
 */
async function deleteVectorizeBatched(
  vectorize: Vectorize | VectorizeIndex,
  vectorIds: string[]
): Promise<void> {
  for (let i = 0; i < vectorIds.length; i += RETENTION_BATCH_SIZE) {
    const batch = vectorIds.slice(i, i + RETENTION_BATCH_SIZE);
    await vectorize.deleteByIds(batch);
  }
}

// ---------------------------------------------------------------------------
// runMemoryRetention
//
// Called from background tasks after chat. Uses processing_cursors for 24h
// per-namespace throttling so it doesn't run on every request.
// ---------------------------------------------------------------------------

export async function runMemoryRetention(
  env: Env,
  namespace: string
): Promise<{ ran: boolean; stats?: Record<string, number> }> {
  // --- Throttle: only run once per 24h per namespace ---
  const cursorName = `retention:${namespace}`;
  const lastRun = await readCursor(env.DB, cursorName);

  if (lastRun) {
    const lastRunMs = new Date(lastRun).getTime();
    if (lastRunMs > hoursAgoMs(THROTTLE_HOURS)) {
      return { ran: false };
    }
  }

  const now = new Date().toISOString();
  const stats: Record<string, number> = {};

  // 1. Delete old messages
  stats.messages = await deleteOldMessages(env.DB, namespace, daysAgo(messagesRetentionDays(env)));

  // 2. Delete old usage_logs
  stats.usageLogs = await deleteOldUsageLogs(env.DB, namespace, daysAgo(USAGE_LOGS_RETENTION_DAYS));

  // 3. Delete old memory_events
  stats.memoryEvents = await deleteOldMemoryEvents(env.DB, namespace, daysAgo(MEMORY_EVENTS_RETENTION_DAYS));

  // 4. Delete old idempotency_keys (namespace-agnostic)
  stats.idempotencyKeys = await deleteOldIdempotencyKeys(env.DB, daysAgo(IDEMPOTENCY_KEYS_RETENTION_DAYS));

  // 5. Expire old active memories and sync Vectorize
  const expireResult = await expireOldMemories(env.DB, namespace, daysAgo(MEMORY_ACTIVE_EXPIRY_DAYS));
  stats.expiredMemories = expireResult.count;

  // 5a. Sync Vectorize: remove vectors for newly expired memories
  if (env.VECTORIZE && expireResult.expired.length > 0) {
    const expiredVectorIds = expireResult.expired
      .map((m) => m.vector_id)
      .filter((v): v is string => v !== null);

    if (expiredVectorIds.length > 0) {
      try {
        await deleteVectorizeBatched(env.VECTORIZE, expiredVectorIds);
      } catch (error) {
        // Non-fatal: search layer already filters by status=active in D1,
        // so expired memories won't be injected even if Vectorize vectors linger.
        console.error("retention: failed to delete expired vectors from Vectorize", error);
      }
    }
  }

  // 6. Hard delete terminal memories (deleted/superseded/expired > 30 days)
  const hardCutoff = daysAgo(MEMORY_HARD_DELETE_DAYS);
  const deletable = await listHardDeletableMemories(env.DB, namespace, hardCutoff);

  if (deletable.length > 0) {
    const vectorIds = deletable
      .map((m) => m.vector_id)
      .filter((v): v is string => v !== null);

    // 6a. Delete Vectorize vectors first (if available)
    if (env.VECTORIZE && vectorIds.length > 0) {
      try {
        await deleteVectorizeBatched(env.VECTORIZE, vectorIds);
      } catch (error) {
        // Vectorize delete failed — only hard-delete records without vector_id
        // to avoid D1/Vectorize mismatch
        console.error("retention: vectorize delete failed, skipping vector-backed memories", error);
        const noVectorIds = deletable
          .filter((m) => m.vector_id === null)
          .map((m) => m.id);
        stats.hardDeletedMemories = await hardDeleteMemoriesBatched(env.DB, namespace, noVectorIds);
        stats.hardDeleteSkipped = deletable.length - noVectorIds.length;
        await writeCursor(env.DB, cursorName, now);
        return { ran: true, stats };
      }
    }

    // 6b. If no VECTORIZE, only delete records that have no vector_id
    if (!env.VECTORIZE) {
      const safeIds = deletable
        .filter((m) => m.vector_id === null)
        .map((m) => m.id);
      stats.hardDeletedMemories = await hardDeleteMemoriesBatched(env.DB, namespace, safeIds);
      stats.hardDeleteSkipped = deletable.length - safeIds.length;
    } else {
      // Vectorize delete succeeded — safe to hard-delete all
      const allIds = deletable.map((m) => m.id);
      stats.hardDeletedMemories = await hardDeleteMemoriesBatched(env.DB, namespace, allIds);
    }
  } else {
    stats.hardDeletedMemories = 0;
  }

  // 7. Write throttle cursor
  await writeCursor(env.DB, cursorName, now);

  // Phase 3: 遗忘曲线衰减
  try {
    const decayResult = await runDecayCurve(env, namespace);
    stats.decayProcessed = decayResult.processed;
    stats.decayArchived = decayResult.decayed;
  } catch (err) {
    console.error("retention: decay curve failed", err);
  }

  return { ran: true, stats };
}

// ============================================================
// Phase 3: 遗忘曲线衰减 — 在凌晨 Dream 之后串行执行
// 设计原则：不在请求热路径计算，每天凌晨离线执行一次。
// 衰减只影响 D1 中的 decay_score 字段和 status。
// ============================================================

interface DecayResult {
  score: number;
  shouldArchive: boolean;
}

export function computeDecayScore(memory: { importance: number; confidence: number; pinned: number; last_recalled_at: string | null; created_at: string; recall_count: number; tags: string | null }): DecayResult {
  const now = Date.now();
  const daysSinceRecall = memory.last_recalled_at
    ? (now - new Date(memory.last_recalled_at).getTime()) / 86400000
    : (now - new Date(memory.created_at).getTime()) / 86400000;

  let halfLifeDays = 14;
  if (memory.importance >= 0.8) halfLifeDays *= 2;
  else if (memory.importance >= 0.6) halfLifeDays *= 1.5;
  if (memory.recall_count >= 5) halfLifeDays *= 2;
  else if (memory.recall_count >= 3) halfLifeDays *= 1.5;
  if (memory.pinned === 1) return { score: 1.0, shouldArchive: false };

  const timeDecay = Math.pow(0.5, daysSinceRecall / halfLifeDays);

  let arousal = 0;
  try {
    const parsedTags: string[] = JSON.parse(memory.tags || "[]");
    for (const tag of parsedTags) {
      const match = tag.match(/^emotion:v=([-\d.]+),a=([-\d.]+)$/);
      if (match) { arousal = parseFloat(match[2]); break; }
    }
  } catch { /* ignore */ }
  const emotionMod = 1 + Math.min(Math.max(arousal, 0), 1) * 0.3;

  const baseScore = memory.importance * memory.confidence;
  const score = Math.min(baseScore * timeDecay * emotionMod, 1);
  const shouldArchive = score < 0.1;
  return { score: Math.round(score * 10000) / 10000, shouldArchive };
}

async function runDecayCurve(env: Env, namespace: string): Promise<{ processed: number; decayed: number }> {
  let processed = 0;
  let decayed = 0;
  const now = new Date().toISOString();
  const BATCH = 200;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let rows: Array<{ id: string; importance: number; confidence: number; pinned: number; last_recalled_at: string | null; created_at: string; recall_count: number; tags: string | null }>;
    try {
      const result = await env.DB
        .prepare("SELECT id, importance, confidence, pinned, last_recalled_at, created_at, recall_count, tags FROM memories WHERE namespace = ? AND status = 'active' ORDER BY id LIMIT ? OFFSET ?")
        .bind(namespace, BATCH, offset)
        .all<{ id: string; importance: number; confidence: number; pinned: number; last_recalled_at: string | null; created_at: string; recall_count: number; tags: string | null }>();
      rows = result.results ?? [];
    } catch (error) {
      console.error("retention: decay batch fetch failed", { namespace, offset, error });
      break;
    }
    if (rows.length === 0) { hasMore = false; break; }

    for (const memory of rows) {
      processed += 1;
      const { score, shouldArchive } = computeDecayScore(memory);
      try {
        if (shouldArchive) {
          await env.DB
            .prepare("UPDATE memories SET decay_score = ?, status = 'decayed', updated_at = ? WHERE namespace = ? AND id = ?")
            .bind(score, now, namespace, memory.id)
            .run();
          decayed += 1;
        } else {
          await env.DB
            .prepare("UPDATE memories SET decay_score = ?, updated_at = ? WHERE namespace = ? AND id = ?")
            .bind(score, now, namespace, memory.id)
            .run();
        }
      } catch (error) {
        console.error("retention: decay update failed", { id: memory.id, error });
      }
    }
    offset += rows.length;
    if (rows.length < BATCH) hasMore = false;
  }
  console.log("retention: decay curve complete", { namespace, processed, decayed });
  return { processed, decayed };
}

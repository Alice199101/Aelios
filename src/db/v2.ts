// Aelios 记忆库 v2 数据访问层 (母帖 #11 第 2 步)
// digest / precious / glossary / longtail 的 CRUD + memories 的 fact_key upsert / supersede。
// 调用方负责 MEMORY_LIFECYCLE_ENABLED 总闸；本层只管读写，不判断开关。
//
// v2 写路径 (upsert/supersede/archive) 同时写 D1 和 Vectorize：
// D1 是本体，Vectorize 是检索镜像 (母帖 L6)。只写 D1 不写向量 → recall 召不到。
// 同步用 embedding.ts 的 upsertMemoryEmbedding / deleteMemoryEmbedding (已带 kind:"memory")。

import { deleteMemoryEmbedding, upsertMemoryEmbedding } from "../memory/embedding";
import type { Env, MemoryRecord } from "../types";
import { newId } from "../utils/ids";
import { nowIso } from "../utils/time";

// 读取一条完整 MemoryRecord 用于向量同步。v2 写完 D1 后用它拿全字段。
async function fetchMemoryForSync(
  db: D1Database,
  input: { namespace: string; id: string }
): Promise<MemoryRecord | null> {
  const row = await db
    .prepare("SELECT * FROM memories WHERE namespace = ? AND id = ?")
    .bind(input.namespace, input.id)
    .first<MemoryRecord>();
  return row ?? null;
}

// =====================================================================
// L1 摘要 digest (单行覆盖，每 namespace 一行)
// =====================================================================

export interface DigestRow {
  namespace: string;
  content: string;
  updated_at: string;
}

export async function getDigest(db: D1Database, namespace: string): Promise<DigestRow | null> {
  const row = await db
    .prepare("SELECT namespace, content, updated_at FROM digest WHERE namespace = ?")
    .bind(namespace)
    .first<DigestRow>();
  return row ?? null;
}

// 覆盖式重写：永远小、永不重复 (母帖 L1)。
export async function upsertDigest(
  db: D1Database,
  input: { namespace: string; content: string }
): Promise<DigestRow> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO digest (namespace, content, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(namespace) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
    )
    .bind(input.namespace, input.content, now)
    .run();
  return { namespace: input.namespace, content: input.content, updated_at: now };
}

// =====================================================================
// L3 珍贵记录 precious (打标，含上下文，豁免去重/衰减/删)
// =====================================================================

export interface PreciousRow {
  id: string;
  namespace: string;
  content: string;
  context_message_ids: string | null;
  source: string;
  pinned: number;
  created_at: string;
  last_injected_at: string | null;
}

export interface CreatePreciousInput {
  namespace: string;
  content: string;
  contextMessageIds?: string[];
  source?: string;
}

export async function createPrecious(db: D1Database, input: CreatePreciousInput): Promise<PreciousRow> {
  const id = newId("pcz");
  const now = nowIso();
  const record: PreciousRow = {
    id,
    namespace: input.namespace,
    content: input.content,
    context_message_ids: JSON.stringify(input.contextMessageIds ?? []),
    source: input.source ?? "human",
    pinned: 1,
    created_at: now,
    last_injected_at: null
  };

  await db
    .prepare(
      `INSERT INTO precious (id, namespace, content, context_message_ids, source, pinned, created_at, last_injected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id,
      record.namespace,
      record.content,
      record.context_message_ids,
      record.source,
      record.pinned,
      record.created_at,
      record.last_injected_at
    )
    .run();

  return record;
}

export async function getPreciousById(
  db: D1Database,
  input: { namespace: string; id: string }
): Promise<PreciousRow | null> {
  const row = await db
    .prepare("SELECT * FROM precious WHERE namespace = ? AND id = ?")
    .bind(input.namespace, input.id)
    .first<PreciousRow>();
  return row ?? null;
}

export async function listPrecious(
  db: D1Database,
  input: { namespace: string; limit: number }
): Promise<PreciousRow[]> {
  const limit = Math.min(Math.max(Math.floor(input.limit), 1), 200);
  const result = await db
    .prepare(
      `SELECT * FROM precious WHERE namespace = ? AND pinned = 1
       ORDER BY created_at DESC LIMIT ?`
    )
    .bind(input.namespace, limit)
    .all<PreciousRow>();
  return result.results ?? [];
}

export async function deletePrecious(
  db: D1Database,
  input: { namespace: string; id: string }
): Promise<boolean> {
  const r = await db
    .prepare("DELETE FROM precious WHERE namespace = ? AND id = ?")
    .bind(input.namespace, input.id)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

// 闸三：记 last_injected_at，近期注入过的降权 (不动 importance/pinned)。
export async function markPreciousInjected(
  db: D1Database,
  input: { namespace: string; ids: string[] }
): Promise<void> {
  if (input.ids.length === 0) return;
  const placeholders = input.ids.map(() => "?").join(", ");
  await db
    .prepare(
      `UPDATE precious SET last_injected_at = ? WHERE namespace = ? AND id IN (${placeholders})`
    )
    .bind(nowIso(), input.namespace, ...input.ids)
    .run();
}

// =====================================================================
// L5 黑话 glossary (词面召回，不进向量库)
// 第 1 步精确匹配；BM25/FTS5 留到第 3 步。
// =====================================================================

export interface GlossaryRow {
  id: string;
  namespace: string;
  term: string;
  aliases: string | null;
  definition: string;
  examples: string | null;
  status: string;
  updated_at: string;
  last_seen_at: string | null;
  seen_count: number;
}

export interface UpsertGlossaryInput {
  namespace: string;
  term: string;
  aliases?: string[];
  definition: string;
  examples?: string[];
}

// upsert by (namespace, term)：同一个 term 改定义不新增。
export async function upsertGlossary(db: D1Database, input: UpsertGlossaryInput): Promise<GlossaryRow> {
  const now = nowIso();
  const existing = await db
    .prepare("SELECT * FROM glossary WHERE namespace = ? AND term = ?")
    .bind(input.namespace, input.term)
    .first<GlossaryRow>();

  if (existing) {
    await db
      .prepare(
        `UPDATE glossary SET aliases = ?, definition = ?, examples = ?, updated_at = ?
         WHERE namespace = ? AND id = ?`
      )
      .bind(
        JSON.stringify(input.aliases ?? []),
        input.definition,
        JSON.stringify(input.examples ?? []),
        now,
        input.namespace,
        existing.id
      )
      .run();
    return { ...existing, aliases: JSON.stringify(input.aliases ?? []), definition: input.definition, examples: JSON.stringify(input.examples ?? []), updated_at: now };
  }

  const id = newId("glo");
  const record: GlossaryRow = {
    id,
    namespace: input.namespace,
    term: input.term,
    aliases: JSON.stringify(input.aliases ?? []),
    definition: input.definition,
    examples: JSON.stringify(input.examples ?? []),
    status: "active",
    updated_at: now,
    last_seen_at: null,
    seen_count: 0
  };
  await db
    .prepare(
      `INSERT INTO glossary (id, namespace, term, aliases, definition, examples, status, updated_at, last_seen_at, seen_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(record.id, record.namespace, record.term, record.aliases, record.definition, record.examples, record.status, record.updated_at, record.last_seen_at, record.seen_count)
    .run();
  return record;
}

export async function listGlossary(
  db: D1Database,
  input: { namespace: string; status?: string }
): Promise<GlossaryRow[]> {
  const status = input.status ?? "active";
  const result = await db
    .prepare("SELECT * FROM glossary WHERE namespace = ? AND status = ? ORDER BY term")
    .bind(input.namespace, status)
    .all<GlossaryRow>();
  return result.results ?? [];
}

// 词面命中查询：term 或 任一 alias 作为子串出现在 query 里即命中。
// 母帖第二节："消息里一出现 term / alias 就静默注入 definition"——
// 不是要求整条 query 等于 term，而是 term 出现在 query 文本里。
// term 长度 < 2 的跳过 (避免单字符误命中)。
export async function matchGlossary(
  db: D1Database,
  input: { namespace: string; query: string }
): Promise<GlossaryRow[]> {
  const query = input.query.trim();
  if (!query) return [];

  const all = await listGlossary(db, { namespace: input.namespace });
  const lowered = query.toLowerCase();
  const hits: GlossaryRow[] = [];

  for (const row of all) {
    const termLower = row.term.toLowerCase();
    if (termLower.length >= 2 && lowered.includes(termLower)) {
      hits.push(row);
      continue;
    }

    let aliases: string[] = [];
    try {
      const parsed = JSON.parse(row.aliases ?? "[]") as unknown;
      if (Array.isArray(parsed)) aliases = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      aliases = [];
    }
    if (aliases.some((a) => a.length >= 2 && lowered.includes(a.toLowerCase()))) {
      hits.push(row);
    }
  }

  return hits;
}

// =====================================================================
// L6 长尾收容所 longtail (raw 删除前遗物，只在前面全空时兜底)
// =====================================================================

export interface LongtailRow {
  id: string;
  namespace: string;
  content: string;
  ts: string;
  source_message_ids: string | null;
}

export async function createLongtail(
  db: D1Database,
  input: { namespace: string; content: string; sourceMessageIds?: string[] }
): Promise<LongtailRow> {
  const id = newId("lt");
  const now = nowIso();
  const record: LongtailRow = {
    id,
    namespace: input.namespace,
    content: input.content,
    ts: now,
    source_message_ids: JSON.stringify(input.sourceMessageIds ?? [])
  };
  await db
    .prepare("INSERT INTO longtail (id, namespace, content, ts, source_message_ids) VALUES (?, ?, ?, ?, ?)")
    .bind(record.id, record.namespace, record.content, record.ts, record.source_message_ids)
    .run();
  return record;
}

// =====================================================================
// memories v2: fact_key upsert + supersede
// =====================================================================

export interface MemoryV2Patch {
  type?: string;
  content?: string;
  summary?: string | null;
  importance?: number;
  confidence?: number;
  status?: string;
  pinned?: boolean;
  tags?: string[];
  source?: string | null;
  sourceMessageIds?: string[];
  expiresAt?: string | null;
  factKey?: string | null;
  validAsOf?: string | null;
}

// 按 fact_key upsert：同 namespace + fact_key 已有 active 就更新，否则新增。
// 唯一性靠 0003 的 partial unique index 兜底；这里先查再写，减少冲突。
// 同时写 D1 (本体) 和 Vectorize (检索镜像)，设 vector_id，否则 recall 召不到。
export async function upsertMemoryByFactKey(
  env: Env,
  input: { namespace: string; factKey: string; content: string; type?: string; importance?: number; confidence?: number; tags?: string[]; source?: string | null; sourceMessageIds?: string[]; validAsOf?: string | null }
): Promise<{ id: string; created: boolean }> {
  const db = env.DB;
  const now = nowIso();
  const existing = await db
    .prepare(
      `SELECT id FROM memories WHERE namespace = ? AND fact_key = ? AND status = 'active'`
    )
    .bind(input.namespace, input.factKey)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE memories SET content = ?, type = ?, importance = ?, confidence = ?,
          tags = ?, source = ?, source_message_ids = ?, valid_as_of = ?,
          last_seen_at = ?, seen_count = seen_count + 1, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        input.content,
        input.type ?? "fact",
        input.importance ?? 0.6,
        input.confidence ?? 0.8,
        JSON.stringify(input.tags ?? []),
        input.source ?? null,
        JSON.stringify(input.sourceMessageIds ?? []),
        input.validAsOf ?? null,
        now,
        now,
        existing.id
      )
      .run();
    // 同步 Vectorize (镜像)。失败不阻断 D1 写入，只记日志。
    await syncMemoryVector(env, { namespace: input.namespace, id: existing.id });
    return { id: existing.id, created: false };
  }

  const id = newId("mem");
  const vectorId = `mem_${id}`;
  await db
    .prepare(
      `INSERT INTO memories (
        id, namespace, type, content, importance, confidence, status, pinned,
        tags, source, source_message_ids, fact_key, valid_as_of, vector_id,
        last_seen_at, seen_count, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, null)`
    )
    .bind(
      id,
      input.namespace,
      input.type ?? "fact",
      input.content,
      input.importance ?? 0.6,
      input.confidence ?? 0.8,
      JSON.stringify(input.tags ?? []),
      input.source ?? null,
      JSON.stringify(input.sourceMessageIds ?? []),
      input.factKey,
      input.validAsOf ?? null,
      vectorId,
      now,
      now,
      now
    )
    .run();
  await syncMemoryVector(env, { namespace: input.namespace, id });
  return { id, created: true };
}

// 同步一条 memory 到 Vectorize。读 D1 全字段后 upsert embedding。
// 失败不抛错——D1 是本体，向量是镜像；向量失败不该阻断 D1 写入。
async function syncMemoryVector(
  env: Env,
  input: { namespace: string; id: string }
): Promise<void> {
  try {
    const record = await fetchMemoryForSync(env.DB, input);
    if (record) await upsertMemoryEmbedding(env, record);
  } catch (error) {
    console.error("v2 vector sync failed", { id: input.id, error });
  }
}

// supersede: 把 oldId 标 superseded，挂 supersedes_id / superseded_by_id 链，新条目进 active。
// 同时同步 Vectorize：新条目 upsert 向量，旧条目 (superseded) 从向量下架 (向量库只索引 active)。
export async function supersedeMemory(
  env: Env,
  input: { namespace: string; oldId: string; newContent: string; newType?: string; newFactKey?: string | null; validAsOf?: string | null; reason?: string | null }
): Promise<{ oldStatus: string; newId: string }> {
  const db = env.DB;
  const now = nowIso();
  const old = await db
    .prepare("SELECT id, status, vector_id FROM memories WHERE namespace = ? AND id = ?")
    .bind(input.namespace, input.oldId)
    .first<{ id: string; status: string; vector_id: string | null }>();
  if (!old) throw new Error("memory to supersede not found");

  const nextId = newId("mem");
  const nextVectorId = `mem_${nextId}`;
  const newFactKey = input.newFactKey ?? null;

  // 顺序很重要：先把 old 标 superseded，再插新 active。
  // 否则若 newFactKey 与 old 的 fact_key 相同，partial unique index
  // (WHERE status='active') 会因为 old 还 active 而挡住新条目插入。
  await db
    .prepare(
      `UPDATE memories SET status = 'superseded', superseded_by_id = ?, review_reason = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(nextId, input.reason ?? null, now, old.id)
    .run();

  // 插新条目 (active)，挂 supersedes_id 指向 old，设 vector_id。
  await db
    .prepare(
      `INSERT INTO memories (
        id, namespace, type, content, importance, confidence, status, pinned,
        tags, source, source_message_ids, fact_key, valid_as_of, vector_id,
        supersedes_id, review_reason,
        last_seen_at, seen_count, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, 0.6, 0.8, 'active', 0, '[]', 'supersede', '[]', ?, ?, ?, ?, ?, ?, 0, ?, ?, null)`
    )
    .bind(
      nextId,
      input.namespace,
      input.newType ?? "world_fact",
      input.newContent,
      newFactKey,
      input.validAsOf ?? null,
      nextVectorId,
      old.id,
      input.reason ?? null,
      now,
      now,
      now
    )
    .run();

  // 同步向量：新条目 upsert，旧条目下架 (向量库只索引 active)。
  await syncMemoryVector(env, { namespace: input.namespace, id: nextId });
  if (old.vector_id) {
    try {
      await env.VECTORIZE?.deleteByIds([old.vector_id]);
    } catch (error) {
      console.error("v2 vector delete (supersede old) failed", { id: old.id, error });
    }
  }

  return { oldStatus: old.status, newId: nextId };
}

// archive: 软下架，status='archived'，不动 supersede 链。
// 同时从 Vectorize 下架 (向量库只索引 active)。
export async function archiveMemory(
  env: Env,
  input: { namespace: string; id: string }
): Promise<boolean> {
  const db = env.DB;
  const now = nowIso();
  const existing = await db
    .prepare("SELECT id, vector_id FROM memories WHERE namespace = ? AND id = ?")
    .bind(input.namespace, input.id)
    .first<{ id: string; vector_id: string | null }>();
  if (!existing) return false;

  await db
    .prepare("UPDATE memories SET status = 'archived', updated_at = ? WHERE namespace = ? AND id = ?")
    .bind(now, input.namespace, input.id)
    .run();

  if (existing.vector_id) {
    try {
      await env.VECTORIZE?.deleteByIds([existing.vector_id]);
    } catch (error) {
      console.error("v2 vector delete (archive) failed", { id: input.id, error });
    }
  }
  return true;
}

// hard delete: D1 + 向量都删 (区别于 archive 软下架)。memory_delete 在 v2 开时用。
export async function deleteMemoryV2(
  env: Env,
  input: { namespace: string; id: string }
): Promise<boolean> {
  const db = env.DB;
  const existing = await db
    .prepare("SELECT id, vector_id FROM memories WHERE namespace = ? AND id = ?")
    .bind(input.namespace, input.id)
    .first<{ id: string; vector_id: string | null }>();
  if (!existing) return false;

  // 先下架向量再删 D1：向量删除失败时保留 D1 作 tombstone，
  // 否则 searchWithVectorize 会把 stale vector 当 legacy 记录放回召回（删除后复活）。
  if (existing.vector_id && env.VECTORIZE) {
    try {
      await env.VECTORIZE.deleteByIds([existing.vector_id]);
    } catch (error) {
      console.error("v2 vector delete (hard) failed, keeping D1 tombstone", { id: input.id, error });
      return false;
    }
  }

  await db
    .prepare("DELETE FROM memories WHERE namespace = ? AND id = ?")
    .bind(input.namespace, input.id)
    .run();
  return true;
}

// =====================================================================
// memories v2: 闸三 last_injected_at 降权记账
// =====================================================================

export async function markMemoriesInjected(
  db: D1Database,
  input: { namespace: string; ids: string[] }
): Promise<void> {
  if (input.ids.length === 0) return;
  const placeholders = input.ids.map(() => "?").join(", ");
  await db
    .prepare(
      `UPDATE memories SET last_injected_at = ? WHERE namespace = ? AND id IN (${placeholders})`
    )
    .bind(nowIso(), input.namespace, ...input.ids)
    .run();
}

export async function listActiveMemories(
  db: D1Database,
  input: { namespace: string; type?: string; limit: number }
): Promise<Array<{ id: string; content: string; type: string; fact_key: string | null; importance: number; last_injected_at: string | null }>> {
  const limit = Math.min(Math.max(Math.floor(input.limit), 1), 200);
  let sql = "SELECT id, content, type, fact_key, importance, last_injected_at FROM memories WHERE namespace = ? AND status = 'active'";
  const binds: unknown[] = [input.namespace];
  if (input.type) {
    sql += " AND type = ?";
    binds.push(input.type);
  }
  sql += " ORDER BY pinned DESC, importance DESC, updated_at DESC LIMIT ?";
  binds.push(limit);
  const result = await db.prepare(sql).bind(...binds).all();
  return (result.results ?? []) as Array<{ id: string; content: string; type: string; fact_key: string | null; importance: number; last_injected_at: string | null }>;
}

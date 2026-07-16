import { nowIso } from "../utils/time";
import type { Env, MemoryRecord } from "../types";

// ============================================================
// Handoff — 跨窗口连续性上下文
// 每天凌晨 Dream + Retention 之后刷新快照，
// 新对话首轮注入一次，后续轮次不重复。
// ============================================================

const HANDOFF_CACHE_KEY = "handoff:snapshot";
const HANDOFF_CACHE_NAMESPACE = "system";

interface HandoffContext {
  self: string;
  currentFocus: string;
  userPortrait: string;
  relationshipNote: string;
  recentEvents: string[];
  pendingCommitments: string[];
}

async function fetchActiveMemories(
  env: Env,
  namespace: string,
  options: { type?: string; limit: number; minImportance?: number; sinceDays?: number }
): Promise<MemoryRecord[]> {
  let sql = "SELECT * FROM memories WHERE namespace = ? AND status = 'active'";
  const binds: unknown[] = [namespace];

  if (options.type) {
    sql += " AND type = ?";
    binds.push(options.type);
  }

  if (options.minImportance !== undefined) {
    sql += " AND importance >= ?";
    binds.push(options.minImportance);
  }

  if (options.sinceDays !== undefined) {
    const since = new Date(Date.now() - options.sinceDays * 86400000).toISOString();
    sql += " AND created_at >= ?";
    binds.push(since);
  }

  sql += " ORDER BY importance DESC, created_at DESC LIMIT ?";
  binds.push(options.limit);

  try {
    const result = await env.DB
      .prepare(sql)
      .bind(...binds)
      .all<MemoryRecord>();
    return result.results ?? [];
  } catch (error) {
    console.error("handoff: failed to fetch memories", { namespace, options, error });
    return [];
  }
}

function buildSelfDescription(identities: MemoryRecord[]): string {
  if (identities.length === 0) return "我是 Aelios，一个智能助手。";

  const fragments = identities
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map((m) => m.content.trim())
    .filter(Boolean);

  if (fragments.length === 0) return "我是 Aelios，一个智能助手。";
  return fragments.join(" ").slice(0, 200);
}

function buildCurrentFocus(recentMemories: MemoryRecord[]): string {
  const projectLike = recentMemories.filter(
    (m) => m.type === "project" || m.type === "memory" || m.type === "fact"
  );

  if (projectLike.length === 0) {
    // fallback: 用最近高重要性记忆的摘要
    const top = recentMemories.slice(0, 3);
    if (top.length === 0) return "暂无特定焦点。";
    return `最近涉及：${top.map((m) => m.summary || m.content.slice(0, 40)).join("；")}`.slice(
      0,
      100
    );
  }

  return projectLike
    .slice(0, 3)
    .map((m) => m.summary || m.content.slice(0, 50))
    .join("；")
    .slice(0, 100);
}

function buildUserPortrait(memories: MemoryRecord[]): string {
  // 初期模板，后续 P2 画像系统替换
  const preferenceLike = memories.filter(
    (m) => m.type === "preference" || (m.tags && m.tags.includes("user_profile"))
  );

  if (preferenceLike.length === 0) return "（用户画像尚未建立）";

  return preferenceLike
    .slice(0, 4)
    .map((m) => m.content.trim())
    .join(" ")
    .slice(0, 150);
}

function buildRelationshipNote(): string {
  // 初期模板，后续关系天气系统替换
  return "关系融洽，合作稳定。";
}

function buildRecentEvents(memories: MemoryRecord[]): string[] {
  return memories
    .slice(0, 5)
    .map((m) => m.summary || m.content.slice(0, 80))
    .filter(Boolean);
}

function buildPendingCommitments(commitments: MemoryRecord[]): string[] {
  return commitments
    .slice(0, 5)
    .map((m) => m.content.trim())
    .filter((c) => c.length > 10);
}

export async function buildHandoffContext(
  env: Env,
  namespace: string
): Promise<HandoffContext> {
  // 1. 自我认知（identity 类型）
  const identities = await fetchActiveMemories(env, namespace, {
    type: "identity",
    limit: 5,
    minImportance: 0.5
  });

  // 2. 最近 7 天高重要性记忆（用于 currentFocus + recentEvents）
  const recentHighImportance = await fetchActiveMemories(env, namespace, {
    limit: 30,
    minImportance: 0.5,
    sinceDays: 7
  });

  // 3. 用户偏好
  const preferences = await fetchActiveMemories(env, namespace, {
    type: "preference",
    limit: 10,
    minImportance: 0.4
  });

  // 4. 未完成承诺
  const commitments = await fetchActiveMemories(env, namespace, {
    type: "memory",
    limit: 20,
    minImportance: 0.6,
    sinceDays: 14
  });

  const context: HandoffContext = {
    self: buildSelfDescription(identities),
    currentFocus: buildCurrentFocus(recentHighImportance),
    userPortrait: buildUserPortrait(preferences),
    relationshipNote: buildRelationshipNote(),
    recentEvents: buildRecentEvents(recentHighImportance),
    pendingCommitments: buildPendingCommitments(
      commitments.filter((m) =>
        /承诺|约定|答应|需要|计划|后续|待办|下次/.test(m.content)
      )
    )
  };

  return context;
}

function formatHandoffContext(context: HandoffContext): string {
  const lines: string[] = [
    `【自我认知】${context.self}`,
    `【当前焦点】${context.currentFocus}`,
    `【用户画像】${context.userPortrait}`,
    `【关系温度】${context.relationshipNote}`
  ];

  if (context.recentEvents.length > 0) {
    lines.push(`【近期事件】${context.recentEvents.map((e, i) => `${i + 1}. ${e}`).join("；")}`);
  }

  if (context.pendingCommitments.length > 0) {
    lines.push(
      `【待办承诺】${context.pendingCommitments.map((c, i) => `${i + 1}. ${c}`).join("；")}`
    );
  }

  return lines.join("\n");
}

export async function refreshHandoffSnapshot(
  env: Env,
  namespace: string
): Promise<string> {
  const context = await buildHandoffContext(env, namespace);
  const text = formatHandoffContext(context);

  // 存入 D1 cache_entries 表（利用现有基础设施）
  const now = nowIso();
  try {
    await env.DB
      .prepare(
        `INSERT INTO cache_entries (id, namespace, key, value_text, content_type, size_bytes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(namespace, key) DO UPDATE SET
           value_text = excluded.value_text,
           size_bytes = excluded.size_bytes,
           updated_at = excluded.updated_at`
      )
      .bind(
        `handoff_${namespace}`,
        HANDOFF_CACHE_NAMESPACE,
        HANDOFF_CACHE_KEY,
        text,
        "text/plain; charset=utf-8",
        text.length,
        now,
        now
      )
      .run();

    console.log("handoff: snapshot refreshed", {
      namespace,
      chars: text.length,
      events: context.recentEvents.length,
      commitments: context.pendingCommitments.length
    });
  } catch (error) {
    console.error("handoff: failed to persist snapshot", { namespace, error });
    throw error;
  }

  return text;
}

export async function getHandoffSnapshot(
  env: Env,
  namespace: string
): Promise<string | null> {
  try {
    const row = await env.DB
      .prepare(
        `SELECT value_text FROM cache_entries
         WHERE namespace = ? AND key = ?
         ORDER BY updated_at DESC LIMIT 1`
      )
      .bind(HANDOFF_CACHE_NAMESPACE, HANDOFF_CACHE_KEY)
      .first<{ value_text: string | null }>();

    return row?.value_text ?? null;
  } catch (error) {
    console.error("handoff: failed to read snapshot", { namespace, error });
    return null;
  }
}
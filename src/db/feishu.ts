// 飞书消息桥 D1 访问层 (SPEC-FEISHU.md)
// feishu_events 去重；feishu_inbox 审计与补投。

import { nowIso } from "../utils/time";

export interface FeishuInboxRow {
  message_id: string;
  sender: string;
  text: string;
  created_at: string;
  relayed: number;
}

/**
 * 写入 event_id 去重表。
 * @returns true = 新事件（首次）；false = 重复（已存在）
 */
export async function tryInsertFeishuEvent(db: D1Database, eventId: string): Promise<boolean> {
  const result = await db
    .prepare(`INSERT OR IGNORE INTO feishu_events (event_id, created_at) VALUES (?, ?)`)
    .bind(eventId, nowIso())
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

/** 写入/覆盖 inbox 审计行（成功 relayed=1，失败 relayed=0） */
export async function upsertFeishuInbox(
  db: D1Database,
  input: {
    messageId: string;
    sender: string;
    text: string;
    relayed: 0 | 1;
  }
): Promise<void> {
  const createdAt = nowIso();
  await db
    .prepare(
      `INSERT INTO feishu_inbox (message_id, sender, text, created_at, relayed)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(message_id) DO UPDATE SET
         sender = excluded.sender,
         text = excluded.text,
         relayed = excluded.relayed`
    )
    .bind(input.messageId, input.sender, input.text, createdAt, input.relayed)
    .run();
}

export async function markFeishuInboxRelayed(db: D1Database, messageId: string): Promise<void> {
  await db
    .prepare(`UPDATE feishu_inbox SET relayed = 1 WHERE message_id = ?`)
    .bind(messageId)
    .run();
}

/** 最近 inbox 记录，按 created_at 降序 */
export async function listFeishuInbox(
  db: D1Database,
  input: { limit: number }
): Promise<FeishuInboxRow[]> {
  const result = await db
    .prepare(
      `SELECT message_id, sender, text, created_at, relayed
       FROM feishu_inbox
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(input.limit)
    .all<FeishuInboxRow>();
  return result.results ?? [];
}

/**
 * 待补投：relayed=0 且 created_at 在 sinceIso 之后，最多 limit 条。
 */
export async function listUnrelayedFeishuInbox(
  db: D1Database,
  input: { sinceIso: string; limit: number }
): Promise<FeishuInboxRow[]> {
  const result = await db
    .prepare(
      `SELECT message_id, sender, text, created_at, relayed
       FROM feishu_inbox
       WHERE relayed = 0 AND created_at >= ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .bind(input.sinceIso, input.limit)
    .all<FeishuInboxRow>();
  return result.results ?? [];
}

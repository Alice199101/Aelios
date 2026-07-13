-- 飞书消息桥 (SPEC-FEISHU.md)
-- 1) feishu_events: 事件去重（event_id PK）
-- 2) feishu_inbox: 中继审计与失败补投（relayed 0/1）
--
-- 回滚说明 (D1 / SQLite):
--   DROP TABLE IF EXISTS feishu_inbox;
--   DROP TABLE IF EXISTS feishu_events;

CREATE TABLE IF NOT EXISTS feishu_events (
  event_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feishu_inbox (
  message_id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  relayed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_feishu_inbox_relayed_created
ON feishu_inbox(relayed, created_at);

CREATE INDEX IF NOT EXISTS idx_feishu_inbox_created
ON feishu_inbox(created_at DESC);

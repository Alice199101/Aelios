-- Aelios 记忆库 v2 (母帖 #11 第 1 步)
-- 给现有 memories 表加 v2 列 + 新建四张表 (digest / precious / glossary / longtail)。
-- 只建表/加列，不动 v1 行为：新列默认 NULL/0，新表空着。
-- 代码层只有 MEMORY_LIFECYCLE_ENABLED=true 才读写这些 (见第 0 步开关)。
--
-- L2 raw_messages 的口径：复用现有 messages 表 (0001 已建)。它是 raw 对话本体，
-- chatCompletions 已在写、dream 已在读。母帖第六节写的 ts 字段即 messages.created_at。
-- 不新建 raw_messages，避免双写 900+ 条历史 + 改所有读写调用方。
--
-- Vectorize 复用现有 memo-kb 索引，用 metadata.kind 区分: memory | precious | longtail。
-- 配套在 scripts/setup-cloudflare.mjs 给 kind 建 metadata index，否则 kind 过滤走不上索引。

-- =====================================================================
-- L4 + L6 大库本体: 给现有 memories 加 v2 列
-- =====================================================================
-- fact_key: 同一件事按 key upsert，从源头止增 (L4)
-- supersedes_id / superseded_by_id: world_fact 推翻链 (L6)
-- review_reason: doctor/patrol 提案理由
-- valid_as_of: world_fact 有效时点
-- last_seen_at / seen_count: 命中计数 (闸三降权用)
-- last_injected_at: 闸三节奏，近期注入过的降权 (不动 importance)

ALTER TABLE memories ADD COLUMN fact_key TEXT;
ALTER TABLE memories ADD COLUMN supersedes_id TEXT;
ALTER TABLE memories ADD COLUMN superseded_by_id TEXT;
ALTER TABLE memories ADD COLUMN review_reason TEXT;
ALTER TABLE memories ADD COLUMN valid_as_of TEXT;
ALTER TABLE memories ADD COLUMN last_seen_at TEXT;
ALTER TABLE memories ADD COLUMN seen_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE memories ADD COLUMN last_injected_at TEXT;

-- fact_key upsert 唯一性：同 namespace + fact_key 只能有一条 active。
-- partial unique index 真约束，并发/重试下也挡住重复 active 同 key。
-- (fact_key IS NULL 的 v1 老行不进索引，不影响。)
CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_namespace_factkey
ON memories(namespace, fact_key) WHERE fact_key IS NOT NULL AND status = 'active';

-- supersede 链查询用
CREATE INDEX IF NOT EXISTS idx_memories_supersedes
ON memories(supersedes_id) WHERE supersedes_id IS NOT NULL;

-- world_fact 每日 supersede 检查用
CREATE INDEX IF NOT EXISTS idx_memories_namespace_type_status
ON memories(namespace, type, status);

-- =====================================================================
-- L1 摘要 (单行覆盖，每 namespace 一行)
-- =====================================================================
CREATE TABLE IF NOT EXISTS digest (
  namespace TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- =====================================================================
-- L3 珍贵记录 (打标，含上下文，豁免去重/衰减/删)
-- =====================================================================
CREATE TABLE IF NOT EXISTS precious (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'default',
  content TEXT NOT NULL,
  context_message_ids TEXT,          -- JSON 数组，单拎一句以后看不懂
  source TEXT NOT NULL DEFAULT 'human',  -- human | secretary
  pinned INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_injected_at TEXT              -- 闸三节奏，珍贵也记，防复读
);

CREATE INDEX IF NOT EXISTS idx_precious_namespace_created
ON precious(namespace, created_at);

CREATE INDEX IF NOT EXISTS idx_precious_pinned
ON precious(pinned);

-- =====================================================================
-- L5 黑话 glossary (词面召回，不进向量库)
-- 第 1 步先做精确词面匹配 (term 精确 + 应用层遍历 aliases JSON)。
-- BM25/FTS5 留到第 3 步召回管线时再升级，那时才需要分词和 rank。
-- =====================================================================
CREATE TABLE IF NOT EXISTS glossary (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'default',
  term TEXT NOT NULL,
  aliases TEXT,                      -- JSON 数组
  definition TEXT NOT NULL,
  examples TEXT,                     -- JSON 数组
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TEXT NOT NULL,
  last_seen_at TEXT,
  seen_count INTEGER NOT NULL DEFAULT 0
);

-- 词面命中查 term 用 (精确匹配，第 1 步)；aliases 是 JSON 数组，
-- 第 3 步如上 FTS5 时再拍平进 FTS，现阶段应用层遍历 JSON 匹配。
CREATE INDEX IF NOT EXISTS idx_glossary_namespace_status
ON glossary(namespace, status);

CREATE INDEX IF NOT EXISTS idx_glossary_term
ON glossary(namespace, term);

-- =====================================================================
-- L6 长尾收容所 (raw 删除前的遗物，只在前面全空时兜底)
-- =====================================================================
CREATE TABLE IF NOT EXISTS longtail (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'default',
  content TEXT NOT NULL,
  ts TEXT NOT NULL,
  source_message_ids TEXT            -- JSON 数组
);

CREATE INDEX IF NOT EXISTS idx_longtail_namespace_ts
ON longtail(namespace, ts);

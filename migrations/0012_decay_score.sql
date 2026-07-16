-- Aelios Phase 3: 遗忘曲线衰减分数
-- 在 memories 表添加 decay_score 字段
ALTER TABLE memories ADD COLUMN decay_score REAL NOT NULL DEFAULT 1.0;

-- 索引：按 namespace + status + decay_score 排序，加速检索时过滤低分记忆
CREATE INDEX IF NOT EXISTS idx_memories_decay
ON memories(namespace, status, decay_score);

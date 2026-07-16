-- Aelios Phase 3: 遗忘曲线衰减分数
-- 注意：decay_score 列已在前序部署中通过 ALTER TABLE 添加
-- 本 migration 仅创建配套索引
-- 索引：按 namespace + status + decay_score 排序，加速检索时过滤低分记忆
CREATE INDEX IF NOT EXISTS idx_memories_decay
ON memories(namespace, status, decay_score);

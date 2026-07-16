CREATE TABLE IF NOT EXISTS diaries (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL DEFAULT 'default',
  date_label TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  sections_json TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  memory_changes_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diaries_namespace_date
ON diaries(namespace, date_label DESC);

-- Message idempotency: make client_message_hash unique (partial index for non-NULL).
-- Retries of the same user message must not create duplicate rows that pollute digests.

-- Keep the earliest row per non-NULL hash (created_at ASC, tie-break id ASC).
DELETE FROM messages
WHERE client_message_hash IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM messages AS older
    WHERE older.client_message_hash = messages.client_message_hash
      AND (
        older.created_at < messages.created_at
        OR (older.created_at = messages.created_at AND older.id < messages.id)
      )
  );

DROP INDEX IF EXISTS idx_messages_hash;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_hash_unique
ON messages(client_message_hash)
WHERE client_message_hash IS NOT NULL;

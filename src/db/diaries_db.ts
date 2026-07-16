import { newId } from "../utils/ids";
import { nowIso } from "../utils/time";

export interface DiaryMemoryChanges {
  added: number;
  updated: number;
  deleted: number;
  excerpts: number;
  cleaned: number;
}

export interface DiarySection {
  heading?: string;
  content?: string;
}

export interface DiaryEntry {
  id: string;
  namespace: string;
  date_label: string;
  title: string | null;
  summary: string | null;
  sections: DiarySection[];
  message_count: number;
  memory_changes: DiaryMemoryChanges | null;
  created_at: string;
}

interface DiaryRow {
  id: string;
  namespace: string;
  date_label: string;
  title: string | null;
  summary: string | null;
  sections_json: string | null;
  message_count: number;
  memory_changes_json: string | null;
  created_at: string;
}

function rowToEntry(row: DiaryRow): DiaryEntry {
  let sections: DiarySection[] = [];
  let memory_changes: DiaryMemoryChanges | null = null;

  try {
    if (row.sections_json) sections = JSON.parse(row.sections_json) as DiarySection[];
  } catch { /* ignore malformed JSON */ }

  try {
    if (row.memory_changes_json) memory_changes = JSON.parse(row.memory_changes_json) as DiaryMemoryChanges;
  } catch { /* ignore malformed JSON */ }

  return {
    id: row.id,
    namespace: row.namespace,
    date_label: row.date_label,
    title: row.title,
    summary: row.summary,
    sections,
    message_count: row.message_count,
    memory_changes,
    created_at: row.created_at
  };
}

export async function createDiary(
  db: D1Database,
  input: {
    namespace: string;
    dateLabel: string;
    title: string | null;
    summary: string | null;
    sections: DiarySection[];
    messageCount: number;
    memoryChanges: DiaryMemoryChanges;
  }
): Promise<DiaryEntry> {
  const id = newId("diy");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO diaries (id, namespace, date_label, title, summary, sections_json, message_count, memory_changes_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.namespace,
      input.dateLabel,
      input.title,
      input.summary,
      JSON.stringify(input.sections),
      input.messageCount,
      JSON.stringify(input.memoryChanges),
      now
    )
    .run();

  return {
    id,
    namespace: input.namespace,
    date_label: input.dateLabel,
    title: input.title,
    summary: input.summary,
    sections: input.sections,
    message_count: input.messageCount,
    memory_changes: input.memoryChanges,
    created_at: now
  };
}

export async function listDiaries(
  db: D1Database,
  input: { namespace: string; limit?: number; offset?: number }
): Promise<{ entries: DiaryEntry[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const result = await db
    .prepare("SELECT * FROM diaries WHERE namespace = ? ORDER BY date_label DESC LIMIT ? OFFSET ?")
    .bind(input.namespace, limit + 1, offset)
    .all<DiaryRow>();

  const rows = result.results ?? [];
  const entries = rows.slice(0, limit).map(rowToEntry);

  return {
    entries,
    hasMore: rows.length > limit
  };
}

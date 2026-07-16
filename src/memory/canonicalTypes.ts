// Phase 3 定制类型（11种）+ v2 上游类型（fact/event/habit/decision）
// 写入边界全部收敛到此枚举
export const CANONICAL_MEMORY_TYPES = [
  "note",
  "preference",
  "boundary",
  "relationship",
  "project",
  "identity",
  "moment",
  "whisper",
  "excerpt",
  "diary",
  "debug",
  "fact",
  "event",
  "habit",
  "decision"
] as const;
export type CanonicalMemoryType = (typeof CANONICAL_MEMORY_TYPES)[number];
const CANONICAL_SET = new Set<string>(CANONICAL_MEMORY_TYPES);
/**
 * 把任意 type 收敛到固定枚举。非空但不在枚举里的 → fallback。
 * 大小写无关。写入层调用，保证库里不会出现自由类型。
 */
export function clampMemoryType(
  type: string | null | undefined,
  fallback: CanonicalMemoryType = "note"
): CanonicalMemoryType {
  const trimmed = (type || "").trim().toLowerCase();
  if (trimmed && CANONICAL_SET.has(trimmed)) return trimmed as CanonicalMemoryType;
  return fallback;
}

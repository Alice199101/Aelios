let passed = 0, failed = 0;
const errors = [];

function assert(condition, label) {
  if (condition) { passed++; console.log('  PASS  ' + label); }
  else { failed++; errors.push(label); console.log('  FAIL  ' + label); }
}
function assertEq(actual, expected, label) {
  if (actual === expected) { passed++; console.log('  PASS  ' + label); }
  else { failed++; errors.push(label + ' - expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); console.log('  FAIL  ' + label); }
}
function assertApprox(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) <= tolerance) { passed++; console.log('  PASS  ' + label); }
  else { failed++; errors.push(label + ' - expected ≈' + expected + ', got ' + actual); console.log('  FAIL  ' + label); }
}
function daysAgo(days) { return new Date(Date.now() - days * 86400000).toISOString(); }

console.log("\n--- D1: 遗忘曲线衰减 ---");

function computeDecayScore(m) {
  const now = Date.now();
  const daysSinceRecall = m.last_recalled_at
    ? (now - new Date(m.last_recalled_at).getTime()) / 86400000
    : (now - new Date(m.created_at).getTime()) / 86400000;
  let halfLifeDays = 14;
  if (m.importance >= 0.8) halfLifeDays *= 2;
  else if (m.importance >= 0.6) halfLifeDays *= 1.5;
  if (m.recall_count >= 5) halfLifeDays *= 2;
  else if (m.recall_count >= 3) halfLifeDays *= 1.5;
  if (m.pinned === 1) return { score: 1.0, shouldArchive: false };
  const timeDecay = Math.pow(0.5, daysSinceRecall / halfLifeDays);
  let arousal = 0;
  try {
    const tags = JSON.parse(m.tags || "[]");
    for (const t of tags) {
      const match = t.match(/^emotion:v=([-\d.]+),a=([-\d.]+)$/);
      if (match) { arousal = parseFloat(match[2]); break; }
    }
  } catch (e) {}
  const emotionMod = 1 + Math.min(Math.max(arousal, 0), 1) * 0.3;
  const baseScore = m.importance * m.confidence;
  const score = Math.min(baseScore * timeDecay * emotionMod, 1);
  const shouldArchive = score < 0.1;
  return { score: Math.round(score * 10000) / 10000, shouldArchive };
}

// fresh
{
  const r = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: null, created_at: daysAgo(0), recall_count: 0, tags: null });
  assertApprox(r.score, 0.595, 0.05, "fresh memory keeps high score");
  assert(!r.shouldArchive, "fresh should NOT archive");
}
// 180d old
{
  const r = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: null, created_at: daysAgo(180), recall_count: 0, tags: null });
  assert(r.score < 0.1, "180d score < 0.1");
  assert(r.shouldArchive, "180d should archive");
}
// pinned
{
  const r = computeDecayScore({ importance: 0.3, confidence: 0.3, pinned: 1, last_recalled_at: null, created_at: daysAgo(500), recall_count: 0, tags: null });
  assertEq(r.score, 1.0, "pinned score=1.0");
  assertEq(r.shouldArchive, false, "pinned never archives");
}
// high importance
{
  const rHigh = computeDecayScore({ importance: 0.9, confidence: 0.9, pinned: 0, last_recalled_at: null, created_at: daysAgo(30), recall_count: 0, tags: null });
  const rNorm = computeDecayScore({ importance: 0.5, confidence: 0.9, pinned: 0, last_recalled_at: null, created_at: daysAgo(30), recall_count: 0, tags: null });
  assert(rHigh.score > rNorm.score, "high importance decays slower");
}
// high recall
{
  const rRec = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: daysAgo(1), created_at: daysAgo(60), recall_count: 10, tags: null });
  const rNot = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: null, created_at: daysAgo(60), recall_count: 0, tags: null });
  assert(rRec.score > rNot.score, "high recall slows decay");
}
// arousal
{
  const rAro = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: null, created_at: daysAgo(10), recall_count: 0, tags: JSON.stringify(["emotion:v=0.5,a=1.0"]) });
  const rFlat = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: null, created_at: daysAgo(10), recall_count: 0, tags: null });
  assertApprox(rAro.score / rFlat.score, 1.3, 0.05, "arousal ~1.3x boost");
}
// recent recall
{
  const rNow = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: daysAgo(0), created_at: daysAgo(90), recall_count: 3, tags: null });
  const rOld = computeDecayScore({ importance: 0.7, confidence: 0.85, pinned: 0, last_recalled_at: null, created_at: daysAgo(90), recall_count: 0, tags: null });
  assert(rNow.score > rOld.score, "recent recall refreshes");
}
// bounds
{
  const max = computeDecayScore({ importance: 1, confidence: 1, pinned: 0, last_recalled_at: daysAgo(0), created_at: daysAgo(0), recall_count: 10, tags: JSON.stringify(["emotion:v=1,a=1"]) });
  assert(max.score <= 1, "score ≤ 1");
}
{
  const zero = computeDecayScore({ importance: 0, confidence: 0.9, pinned: 0, last_recalled_at: null, created_at: daysAgo(0), recall_count: 0, tags: null });
  assertEq(zero.score, 0, "importance=0 → score=0");
  assertEq(zero.shouldArchive, true, "zero archives");
}

console.log("\n--- D3: Handoff ---");

function formatHandoffContext(ctx) {
  const lines = ['【自我认知】' + ctx.self, '【当前焦点】' + ctx.currentFocus, '【用户画像】' + ctx.userPortrait, '【关系温度】' + ctx.relationshipNote];
  if (ctx.recentEvents.length > 0) lines.push('【近期事件】' + ctx.recentEvents.map(function(e,i) { return (i+1)+'. '+e; }).join('；'));
  if (ctx.pendingCommitments.length > 0) lines.push('【待办承诺】' + ctx.pendingCommitments.map(function(c,i) { return (i+1)+'. '+c; }).join('；'));
  return lines.join('\n');
}

{
  const full = { self: '我是Aelios', currentFocus: '三期开发', userPortrait: '理性内向', relationshipNote: '合作稳定', recentEvents: ['完成编码', '推送GitHub'], pendingCommitments: ['测试', '部署'] };
  const f = formatHandoffContext(full);
  assert(f.includes('【自我认知】'), 'handoff: 自我认知');
  assert(f.includes('【当前焦点】'), 'handoff: 当前焦点');
  assert(f.includes('【用户画像】'), 'handoff: 用户画像');
  assert(f.includes('【关系温度】'), 'handoff: 关系温度');
  assert(f.includes('【近期事件】'), 'handoff: 近期事件');
  assert(f.includes('【待办承诺】'), 'handoff: 待办承诺');
  assert(f.includes('1. 完成编码'), 'handoff: numbered');
}
{
  const empty = { self: 'Aelios', currentFocus: '无', userPortrait: '无', relationshipNote: '融洽', recentEvents: [], pendingCommitments: [] };
  const f = formatHandoffContext(empty);
  assert(!f.includes('【近期事件】'), 'handoff: no events empty');
  assert(!f.includes('【待办承诺】'), 'handoff: no commitments empty');
}

console.log("\n--- D5: 记忆门卫 ---");

const MIN_LEN = 8, MIN_IMP = 0.3;
const BLOCKED = [/^(嗯|哦|好|ok|OK|好的|是的|对|对的|没错)\s*$/i, /^(谢谢|thanks|thank you|多谢)\s*$/i, /^(再见|拜拜|bye|bye bye)\s*$/i, /^[，。！？,.!?\s]+$/, /^\d{1,2}$/];

function gatekeeper(m) {
  const t = m.content.trim();
  if (t.length < MIN_LEN) return { passed: false };
  if (m.importance < MIN_IMP) return { passed: false };
  for (const p of BLOCKED) { if (p.test(t)) return { passed: false }; }
  return { passed: true };
}

assertEq(gatekeeper({ content: 'Alice正在开发Aelios三期功能', importance: 0.85 }).passed, true, 'normal passes');
assertEq(gatekeeper({ content: '嗯', importance: 0.8 }).passed, false, "blocks '嗯'");
assertEq(gatekeeper({ content: '好的', importance: 0.8 }).passed, false, "blocks '好的'");
assertEq(gatekeeper({ content: '今天天气不错挺风和日丽的', importance: 0.2 }).passed, false, 'blocks low imp');
assertEq(gatekeeper({ content: '42', importance: 0.7 }).passed, false, 'blocks digits');
assertEq(gatekeeper({ content: '？！', importance: 0.7 }).passed, false, 'blocks punct');
assertEq(gatekeeper({ content: '12345678', importance: 0.3 }).passed, true, 'borderline passes');

console.log('\n--- Results: ' + passed + ' passed, ' + failed + ' failed ---');
if (failed > 0) { console.log('Failures:'); errors.forEach(function(e) { console.log('  ' + e); }); process.exit(1); }
process.exit(0);

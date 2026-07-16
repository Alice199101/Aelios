const ADMIN_HTML = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Aelios Memory Admin</title>
<style>
:root {
  --bg:#0d0e10; --panel:#15171b; --panel2:#1b1e24; --panel3:#22262d;
  --line:#292d35; --line2:#3a3f49; --text:#e9eaec; --muted:#a8acb5; --faint:#737884;
  --accent:#e0aa55; --accent2:rgba(224,170,85,.16); --good:#74c799; --bad:#e27663; --warn:#dfb85d; --info:#6ca8d9;
  --radius:7px; --mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;
  color-scheme:dark;
}
[data-theme="light"] {
  --bg:#f6f5f1; --panel:#fff; --panel2:#f1eee8; --panel3:#e6e2d9;
  --line:#ded9ce; --line2:#c5beb1; --text:#17191d; --muted:#626872; --faint:#8d9199;
  --accent:#b87924; --accent2:rgba(184,121,36,.12); --good:#2d9362; --bad:#c54332; --warn:#a87912; --info:#286fa5;
  color-scheme:light;
}
*{box-sizing:border-box} html,body{height:100%} body{margin:0;background:var(--bg);color:var(--text);font:13px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;overflow:hidden}
button,input,textarea,select{font:inherit;color:inherit} button{cursor:pointer} .mono{font-family:var(--mono);font-size:12px}
.app{height:100dvh;display:grid;grid-template-rows:48px 1fr}
.top{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);background:var(--panel);backdrop-filter:blur(12px)}
.brand{display:flex;align-items:center;gap:9px;min-width:138px}.mark{width:24px;height:24px;border-radius:6px;background:var(--accent);color:#111;display:grid;place-items:center;font-weight:800}.brand b{display:block;font-size:13px}.brand span{display:block;font:10px var(--mono);letter-spacing:.14em;color:var(--faint)}
.tabs{display:flex;gap:5px}.tab{height:32px;border:1px solid transparent;background:transparent;color:var(--muted);border-radius:6px;padding:0 10px}.tab.active{background:var(--panel2);color:var(--text);border-color:var(--line)}
.cred{display:flex;gap:8px;flex:1;min-width:0}.input{height:32px;border:1px solid var(--line);background:var(--panel);border-radius:6px;padding:0 9px;outline:none;min-width:0}.input:focus,.textarea:focus,select:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent2)}.worker{flex:1}.key{width:260px}
.btn{height:32px;border:1px solid var(--line);background:var(--panel2);border-radius:6px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;justify-content:center;white-space:nowrap}.btn:hover{border-color:var(--line2)}.btn.primary{background:var(--accent);border-color:var(--accent);color:#111;font-weight:650}.btn.danger{background:rgba(226,118,99,.13);border-color:rgba(226,118,99,.45);color:var(--bad)}.btn.ghost{background:transparent}.btn:disabled{opacity:.55;cursor:not-allowed}
.status{display:flex;align-items:center;gap:7px;color:var(--muted);white-space:nowrap}.dot{width:8px;height:8px;border-radius:999px;background:var(--faint)}.dot.good{background:var(--good)}.dot.bad{background:var(--bad)}.dot.warn{background:var(--warn)}
.main{min-height:0;display:grid;grid-template-columns:280px minmax(360px,1fr) 420px;position:relative}.side,.list,.detail{min-height:0;overflow:auto;border-right:1px solid var(--line)}.detail{border-right:0}.side{background:var(--panel);padding:13px}.section{margin-bottom:18px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;color:var(--muted);font-size:12px}.label{font-size:11px;color:var(--muted);margin:0 0 5px}.searchbox{display:grid;gap:8px}.textarea{width:100%;border:1px solid var(--line);background:var(--panel);border-radius:6px;padding:9px;resize:vertical;outline:none}
.seg{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:6px;overflow:hidden}.seg button{height:30px;border:0;background:var(--panel2);color:var(--muted)}.seg button.active{background:var(--accent2);color:var(--accent)}
.checkgrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.check{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px}.check input{accent-color:var(--accent)}
.hint{padding:10px;border:1px solid var(--line);background:var(--panel2);border-radius:6px;color:var(--muted);font-size:12px}
.toolbar{height:48px;display:flex;align-items:center;gap:9px;padding:8px 14px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:2}.toolbar h2{font-size:14px;margin:0}.meta{color:var(--faint);font-family:var(--mono);font-size:12px}.grow{flex:1}
.cards{padding:10px}.card{border:1px solid var(--line);background:var(--panel);border-radius:7px;margin-bottom:8px;padding:10px;display:grid;gap:7px}.card.active{border-color:var(--accent);background:linear-gradient(0deg,var(--accent2),transparent 70%),var(--panel)}.card-top{display:flex;align-items:center;gap:7px}.type{font:11px var(--mono);padding:2px 6px;border-radius:4px;background:var(--accent2);color:var(--accent)}.source{font:11px var(--mono);color:var(--muted)}.date{margin-left:auto;color:var(--faint);font-size:12px}.content{white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.tags{display:flex;flex-wrap:wrap;gap:5px}.tag{font-size:11px;padding:2px 6px;border:1px solid var(--line);background:var(--panel2);border-radius:4px;color:var(--muted)}.scores{margin-left:auto;color:var(--muted);font:11px var(--mono)}
.empty{height:100%;min-height:260px;display:grid;place-items:center;color:var(--muted);text-align:center;padding:24px}.empty b{display:block;color:var(--text);margin-bottom:5px}
.detail-head{height:48px;display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:2}.detail-body{padding:14px;display:grid;gap:13px}.row{display:grid;grid-template-columns:110px 1fr;gap:9px;align-items:center;border-bottom:1px solid var(--line);padding:6px 0}.row label{font:11px var(--mono);color:var(--muted)}.field{display:grid;gap:5px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.slider{accent-color:var(--accent);width:100%}.actions{position:sticky;bottom:0;background:var(--bg);border-top:1px solid var(--line);padding:10px 14px;display:flex;gap:8px;justify-content:flex-end}
.debug{overflow:auto;padding:22px;max-width:1040px;margin:0 auto;width:100%}.debug h1{font-size:18px;margin:0 0 5px}.debug-card{border:1px solid var(--line);background:var(--panel);border-radius:8px;margin:16px 0;overflow:hidden}.debug-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}.kv{display:grid;grid-template-columns:220px 1fr auto;border-bottom:1px solid var(--line);padding:8px 12px;gap:10px}.kv span:first-child{color:var(--muted);font-family:var(--mono);font-size:11px}.badge{font:11px var(--mono);border-radius:4px;padding:2px 6px;background:var(--panel3);color:var(--muted)}.badge.good{background:rgba(116,199,153,.12);color:var(--good)}.badge.bad{background:rgba(226,118,99,.13);color:var(--bad)}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));border-bottom:1px solid var(--line)}.stat{padding:11px;border-right:1px solid var(--line)}.stat small{display:block;color:var(--muted);font:11px var(--mono);text-transform:uppercase}.stat b{display:block;font-size:18px;margin-top:3px}.toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:20;padding:10px 13px;border:1px solid var(--line2);background:var(--panel2);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.mobile-filter,.mobile-close{display:none}
@media(max-width:980px){.main{grid-template-columns:1fr}.side{display:none}.side.mobile-open{display:block;position:absolute;inset:0 auto 0 0;width:min(86vw,320px);z-index:12;box-shadow:0 20px 60px rgba(0,0,0,.45)}.detail{position:absolute;inset:0;background:var(--bg);z-index:5}.detail.empty-detail{display:none}.mobile-filter,.mobile-close{display:inline-flex}.cred .key{width:150px}.brand span{display:none}}
@media(max-width:640px){.app{grid-template-rows:auto minmax(0,1fr)}.top{height:auto;display:grid;grid-template-columns:1fr auto auto;gap:7px}.brand{grid-column:1/4}.cred{grid-column:1/4}.status{grid-column:1/2}.tabs{display:none}.main{height:auto}.key{width:110px!important}#test-conn{grid-column:2/3}#theme-toggle{grid-column:3/4}.toolbar{height:auto;flex-wrap:wrap}.content{-webkit-line-clamp:5}.grid2{grid-template-columns:1fr}.kv{grid-template-columns:1fr}.row{grid-template-columns:1fr}.debug{padding:12px}.debug-head{flex-wrap:wrap}}
</style>
</head>
<body>
<div id="app" class="app"></div>
<script>
const TYPES = ["note","preference","boundary","relationship","project","identity","moment","whisper","excerpt","diary","debug","fact","event","habit","decision"];
const $ = (sel, root=document) => root.querySelector(sel);
const app = $("#app");
const state = {
  tab:"memories",
  workerUrl: localStorage.getItem("aelios.admin.workerUrl") || location.origin,
  apiKey: localStorage.getItem("aelios.admin.apiKey") || "",
  theme: localStorage.getItem("aelios.admin.theme") || "dark",
  status:"idle",
  memories:[],
  active:null,
  paging:{ cursor:null, has_more:false, total_count:null, count:0 },
  loading:false,
  saving:false,
  error:"",
  toast:"",
  filters:{ query:"", top_k:20, filter:true, types:[], source:"", tags:"", pinned:false },
  sortOrder:"newest",
  health:null,
  reindex:null,
  reindexCursor:null,
  debugLoading:null,
  showFilters:false,
  diaries:[],
  diaryPaging:{offset:0, hasMore:false},
  emotionMap:[],
  emotionMapLoading:false,
  emotionMapHover:null,
  emotionMapSelected:null,
  _emotionPoints:[],
};
document.documentElement.dataset.theme = state.theme;

function esc(value){ return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function fmtDate(value){ if(!value) return "—"; const d = new Date(value); if(Number.isNaN(d.getTime())) return value; return d.toISOString().replace("T"," ").replace(/\.\d+Z$/,"Z"); }
function shortDate(value){ if(!value) return "—"; const t = Date.now() - new Date(value).getTime(); if(t < 86400000) return Math.max(1, Math.round(t/3600000)) + " 小时前"; if(t < 86400000*14) return Math.round(t/86400000) + " 天前"; return value.slice(0,10); }
function scorePct(v){ return Math.round(Number(v || 0) * 100) + "%"; }
function toast(text){ state.toast = text; render(); setTimeout(() => { if(state.toast === text){ state.toast = ""; render(); } }, 2400); }
function savePrefs(){ localStorage.setItem("aelios.admin.workerUrl", state.workerUrl); localStorage.setItem("aelios.admin.apiKey", state.apiKey); localStorage.setItem("aelios.admin.theme", state.theme); }
function authHeaders(extra={}){ return { ...extra, Authorization: "Bearer " + state.apiKey }; }
function apiBase(){ return state.workerUrl.replace(/\/+$/,""); }
function readError(payload, fallback){ return payload?.error?.message || payload?.error || fallback; }
async function request(path, options={}){
  if(!state.apiKey.trim()) throw new Error("请先填写 API Key");
  const headers = authHeaders(options.body ? { "content-type":"application/json" } : {});
  const response = await fetch(apiBase() + path, { ...options, headers:{ ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw:text }; }
  if(!response.ok) throw new Error(readError(payload, response.status + " " + response.statusText));
  return payload;
}
async function testConnection(){
  state.status = "testing"; state.error = ""; savePrefs(); render();
  try { await request("/v1/memory?limit=1"); state.status = "connected"; toast("连接成功"); await loadList(); loadDiaries(); }
  catch(e){ state.status = "error"; state.error = e.message; render(); }
}
function setFilter(key, value){ state.filters[key] = value; render(); }
function toggleType(type){ const xs = state.filters.types; state.filters.types = xs.includes(type) ? xs.filter(x=>x!==type) : [...xs,type]; render(); }
function buildClientFiltered(items){
  const types = state.filters.types;
  const source = state.filters.source.trim().toLowerCase();
  const tagText = state.filters.tags.trim();
  const tags = tagText ? tagText.split(/[,\s，]+/).map(s=>s.trim()).filter(Boolean) : [];
  return items.filter(m => {
    if(types.length && !types.includes(m.type)) return false;
    if(source && !(m.source || "").toLowerCase().includes(source)) return false;
    if(tags.length && !tags.every(t => (m.tags || []).includes(t))) return false;
    if(state.filters.pinned && !m.pinned) return false;
    return true;
  });
}
async function loadList(cursor=null, append=false){
  state.loading = true; state.error = ""; if(!append) state.memories = []; render(append);
  try {
    const data = await request("/v1/memory?limit=100" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
    const incoming = data.data || [];
    state.memories = append ? [...state.memories, ...incoming] : incoming;
    state.paging = data.paging || { cursor:null, has_more:false, count:incoming.length };
    state.status = "connected";
  } catch(e) { state.error = e.message; state.status = state.status === "idle" ? "error" : state.status; }
  state.loading = false; render(append);
}
async function searchMemories(){
  if(!state.filters.query.trim()){ await loadList(); return; }
  state.loading = true; state.error = ""; state.memories = []; render(false);
  try {
    const body = {
      query: state.filters.query,
      top_k: state.filters.top_k,
      filter: state.filters.filter,
      include_filter_debug: true,
      ...(state.filters.types.length ? { types: state.filters.types } : {})
    };
    const data = await request("/v1/memory/search", { method:"POST", body:JSON.stringify(body) });
    state.memories = data.data || [];
    state.paging = { cursor:null, has_more:false, count:data.meta?.count || state.memories.length, total_count:data.meta?.raw_count, meta:data.meta };
    state.status = "connected";
  } catch(e) { state.error = e.message; }
  state.loading = false; render(false);
}
async function saveMemory(){
  const form = collectForm();
  if(!form.content.trim()) return;
  state.saving = true; render();
  try {
    const body = {
      namespace: form.namespace || "default",
      type: form.type,
      content: form.content,
      summary: form.summary || null,
      importance: Number(form.importance),
      confidence: Number(form.confidence),
      pinned: Boolean(form.pinned),
      tags: form.tags,
      source: form.source || null,
      source_message_ids: form.source_message_ids,
      expires_at: form.expires_at || null
    };
    const data = form.id
      ? await request("/v1/memory/" + encodeURIComponent(form.id), { method:"PATCH", body:JSON.stringify(body) })
      : await request("/v1/memory", { method:"POST", body:JSON.stringify(body) });
    state.memories = form.id
      ? state.memories.map(m => m.id === form.id ? data.data : m)
      : [data.data, ...state.memories];
    state.active = data.data;
    toast(form.id ? "已保存" : "已新增");
  } catch(e) { toast("保存失败: " + e.message); }
  state.saving = false; render();
}
function createMemory(){
  const now = new Date().toISOString();
  state.active = {
    id:"",
    vector_id:"",
    namespace:"default",
    type:"note",
    source:"admin",
    tags:["admin"],
    importance:0.5,
    confidence:0.8,
    pinned:false,
    content:"",
    summary:"",
    source_message_ids:[],
    created_at:now,
    updated_at:now,
    expires_at:null
  };
  render();
}
async function deleteMemory(id){
  if(!id || !confirm("确认删除这条记忆？这个操作会删除 Vectorize 里的向量。")) return;
  try {
    await request("/v1/memory/" + encodeURIComponent(id), { method:"DELETE" });
    state.memories = state.memories.filter(m => m.id !== id);
    state.active = null;
    toast("已删除");
  } catch(e) { toast("删除失败: " + e.message); }
  render();
}
function collectForm(){
  const root = $(".detail-body");
  const tags = ($("#edit-tags")?.value || "").split(/[,\s，]+/).map(s=>s.trim()).filter(Boolean);
  const msgIds = ($("#edit-message-ids")?.value || "").split(/[,\s，]+/).map(s=>s.trim()).filter(Boolean);
  return {
    id: $("#edit-id")?.value || "",
    vector_id: $("#edit-vector-id")?.value || "",
    namespace: $("#edit-namespace")?.value || "default",
    type: $("#edit-type")?.value || "note",
    source: $("#edit-source")?.value || "",
    content: $("#edit-content")?.value || "",
    summary: $("#edit-summary")?.value || "",
    tags,
    source_message_ids: msgIds,
    importance: $("#edit-importance")?.value || 0.5,
    confidence: $("#edit-confidence")?.value || 0.8,
    pinned: $("#edit-pinned")?.checked || false,
    expires_at: $("#edit-expires")?.value || null
  };
}
async function runHealth(){
  state.debugLoading = "health"; state.health = null; render();
  try { state.health = await request("/v1/debug/vector_health"); }
  catch(e){ state.health = { ok:false, error:e.message }; }
  state.debugLoading = null; render();
}
async function runReindex(dryRun=true, cursor=state.reindexCursor){
  if(!dryRun && !confirm("确认重嵌当前页？会消耗 embedding 配额并重写向量。")) return;
  state.debugLoading = dryRun ? "dry" : "run"; render();
  try {
    const body = { namespace:"default", limit:50, dry_run:dryRun, ...(cursor ? { cursor } : {}) };
    const data = await request("/v1/debug/vector_reindex", { method:"POST", body:JSON.stringify(body) });
    state.reindex = data;
    state.reindexCursor = data.data?.cursor || null;
    toast(dryRun ? "Dry run 完成" : "重嵌当前页完成");
  } catch(e){ state.reindex = { ok:false, error:e.message }; }
  state.debugLoading = null; render();
}
function statusDot(){
  const cls = state.status === "connected" ? "good" : state.status === "testing" ? "warn" : state.status === "error" ? "bad" : "";
  const text = state.status === "connected" ? "已连接" : state.status === "testing" ? "测试中" : state.status === "error" ? "连接错误" : "未连接";
  return '<span class="status"><span class="dot '+cls+'"></span>'+text+'</span>';
}
function renderTop(){
  return '<div class="top">'+
    '<div class="brand"><div class="mark">A</div><div><b>Aelios</b><span>MEMORY · ADMIN</span></div></div>'+
    '<div class="tabs"><button class="tab '+(state.tab==="memories"?"active":"")+'" data-tab="memories">记忆库</button><button class="tab '+(state.tab==="diaries"?"active":"")+'" data-tab="diaries">日记</button><button class="tab '+(state.tab==="emotion"?"active":"")+'" data-tab="emotion">情感地图</button><button class="tab '+(state.tab==="debug"?"active":"")+'" data-tab="debug">调试 · 维护</button></div>'+
    '<div class="cred"><input class="input worker mono" id="worker-url" placeholder="Worker URL" value="'+esc(state.workerUrl)+'"><input class="input key mono" id="api-key" type="password" placeholder="API Key" value="'+esc(state.apiKey)+'"></div>'+
    statusDot()+
    '<button class="btn primary" id="test-conn">测试连接</button>'+
    '<button class="btn ghost" id="theme-toggle">'+(state.theme === "dark" ? "浅色" : "深色")+'</button>'+
  '</div>';
}
function renderFilters(){
  return '<aside class="side '+(state.showFilters ? "mobile-open" : "")+'">'+
    '<div class="section"><div class="section-head"><b>搜索 · 筛选</b><span><button class="btn ghost mobile-close" id="close-filter">关闭</button> <button class="btn ghost" id="clear-filters">清空</button></span></div><div class="searchbox">'+
    '<input class="input" id="query" placeholder="搜索内容、标签、称呼、规则、触发点" value="'+esc(state.filters.query)+'">'+
    '<button class="btn primary" id="search-btn">搜索</button></div></div>'+
    '<div class="section"><div class="label">top_k</div><div class="seg">'+[10,20,50].map(n=>'<button class="'+(state.filters.top_k===n?"active":"")+'" data-topk="'+n+'">'+n+'</button>').join("")+'</div></div>'+
    '<div class="section"><label class="check"><input type="checkbox" id="filter-toggle" '+(state.filters.filter?"checked":"")+'>启用小秘书重排</label><div class="hint" style="margin-top:8px">搜索使用 <span class="mono">POST /v1/memory/search</span>；空 query 则按列表分页读取。</div></div>'+
    '<div class="section"><div class="label">type</div><div class="checkgrid">'+TYPES.map(t=>'<label class="check"><input type="checkbox" data-type="'+t+'" '+(state.filters.types.includes(t)?"checked":"")+'><span class="type">'+t+'</span></label>').join("")+'</div></div>'+
    '<div class="section"><div class="label">source</div><input class="input" id="source-filter" placeholder="daily_digest / mcp / admin" value="'+esc(state.filters.source)+'"></div>'+
    '<div class="section"><div class="label">tags</div><input class="input" id="tags-filter" placeholder="逗号或空格分隔" value="'+esc(state.filters.tags)+'"></div>'+
    '<div class="section"><label class="check"><input type="checkbox" id="pinned-filter" '+(state.filters.pinned?"checked":"")+'>仅显示 pinned</label></div>'+
  '</aside>';
}
function memoryCard(m){
  const tags = (m.tags || []).slice(0,8).map(t=>'<span class="tag">'+esc(t)+'</span>').join("");
  const score = typeof m.score === "number" ? '<span class="scores">score '+Number(m.score).toFixed(3)+'</span>' : "";
  return '<article class="card '+(state.active?.id===m.id?"active":"")+'" data-id="'+esc(m.id)+'">'+
    '<div class="card-top"><span class="type">'+esc(m.type || "note")+'</span><span class="source">'+esc(m.source || "—")+'</span><span class="date">'+shortDate(m.updated_at || m.created_at)+'</span></div>'+
    '<div class="content">'+esc(m.content)+'</div>'+
    '<div class="tags">'+tags+'<span class="scores">imp '+scorePct(m.importance)+' · conf '+scorePct(m.confidence)+'</span>'+score+'</div>'+
  '</article>';
}
function renderList(){
  let items = [...state.memories];
  if(state.sortOrder === "newest") items.sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  else if(state.sortOrder === "oldest") items.sort((a,b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  const visible = buildClientFiltered(items);
  const meta = state.paging.meta;
  const subtitle = meta ? (meta.raw_count + " raw · " + meta.count + " kept · " + (meta.filtered ? "rerank" : "raw")) : ((state.paging.total_count ?? visible.length) + " total · vectorize");
  return '<main class="list">'+
    '<div class="toolbar"><button class="btn mobile-filter" id="show-filter">筛选</button><h2>记忆</h2><span class="meta">'+esc(subtitle)+'</span><select class="input" id="sort-order" style="width:auto;min-width:70px"><option value="newest" '+(state.sortOrder==="newest"?"selected":"")+'>最新</option><option value="oldest" '+(state.sortOrder==="oldest"?"selected":"")+'>最早</option><option value="default" '+(state.sortOrder==="default"?"selected":"")+'>默认</option></select><span class="grow"></span><button class="btn" id="refresh">刷新</button><button class="btn primary" id="new-memory">新增记忆</button></div>'+
    (state.error ? '<div class="hint" style="margin:12px;border-color:rgba(226,118,99,.5);color:var(--bad)">'+esc(state.error)+'</div>' : '')+
    (state.loading ? '<div class="empty"><div><b>加载中</b><span class="mono">fetching memory vectors...</span></div></div>' :
      visible.length ? '<div class="cards">'+visible.map(memoryCard).join("")+(state.paging.has_more && !state.filters.query.trim() ? '<button class="btn" style="width:100%" id="load-more">继续加载 cursor</button>' : '')+'</div>' :
      '<div class="empty"><div><b>没有记忆</b><span>搜索无结果，或还没有连接到 Worker。</span></div></div>')+
  '</main>';
}
function renderDetail(){
  const m = state.active;
  if(!m) return '<aside class="detail empty-detail"><div class="empty"><div><b>未选择记忆</b><span>在列表点一条记忆，可以查看、编辑或删除。</span></div></div></aside>';
  const isNew = !m.id;
  return '<aside class="detail"><div class="detail-head"><span class="type">'+esc(m.type || "note")+'</span><span class="mono">'+esc(isNew ? "new memory" : m.id)+'</span><span class="grow"></span><button class="btn ghost" id="close-detail">关闭</button></div>'+
    '<div class="detail-body">'+
      '<input type="hidden" id="edit-id" value="'+esc(m.id)+'">'+
      '<div class="row"><label>id</label><span class="mono">'+esc(isNew ? "创建后生成" : m.id)+'</span></div>'+
      '<div class="row"><label>vector_id</label><input class="input mono" id="edit-vector-id" disabled value="'+esc(m.vector_id || "")+'"></div>'+
      '<div class="grid2"><div class="field"><div class="label">namespace</div><input class="input mono" id="edit-namespace" value="'+esc(m.namespace || "default")+'"></div><div class="field"><div class="label">type</div><select class="input mono" id="edit-type">'+TYPES.map(t=>'<option '+(m.type===t?"selected":"")+'>'+t+'</option>').join("")+'</select></div></div>'+
      '<div class="grid2"><div class="field"><div class="label">source</div><input class="input mono" id="edit-source" value="'+esc(m.source || "")+'"></div><label class="check" style="align-self:end"><input id="edit-pinned" type="checkbox" '+(m.pinned?"checked":"")+'> pinned</label></div>'+
      '<div class="grid2"><div class="field"><div class="label">importance <span id="imp-val">'+Number(m.importance || 0).toFixed(2)+'</span></div><input class="slider" id="edit-importance" type="range" min="0" max="1" step="0.01" value="'+esc(m.importance ?? 0.5)+'"></div><div class="field"><div class="label">confidence <span id="conf-val">'+Number(m.confidence || 0).toFixed(2)+'</span></div><input class="slider" id="edit-confidence" type="range" min="0" max="1" step="0.01" value="'+esc(m.confidence ?? 0.8)+'"></div></div>'+
      '<div class="row"><label>decay_score</label><span class="mono" style="display:flex;align-items:center;gap:8px">' + (typeof m.decay_score === 'number' ? '<span style="display:inline-block;height:6px;border-radius:3px;width:' + Math.max(4, Math.round((m.decay_score ?? 0) * 100)) + 'px;background:' + ((m.decay_score ?? 0) >= 0.7 ? 'var(--good)' : (m.decay_score ?? 0) >= 0.4 ? 'var(--warn)' : 'var(--bad)') + '"></span>' + (m.decay_score ?? 0).toFixed(4) : '<span style="color:var(--faint)">— 未计算（需触发 cron）</span>') + '</span></div>'+
      '<div class="field"><div class="label">tags</div><input class="input" id="edit-tags" value="'+esc((m.tags || []).join(", "))+'"></div>'+
      '<div class="field"><div class="label">content</div><textarea class="textarea" id="edit-content" rows="8">'+esc(m.content || "")+'</textarea></div>'+
      '<div class="field"><div class="label">summary</div><textarea class="textarea" id="edit-summary" rows="3">'+esc(m.summary || "")+'</textarea></div>'+
      '<div class="field"><div class="label">source_message_ids</div><input class="input mono" id="edit-message-ids" value="'+esc((m.source_message_ids || []).join(", "))+'"></div>'+
      '<div class="grid2"><div class="field"><div class="label">created_at</div><input class="input mono" disabled value="'+esc(fmtDate(m.created_at))+'"></div><div class="field"><div class="label">updated_at</div><input class="input mono" disabled value="'+esc(fmtDate(m.updated_at))+'"></div></div>'+
      '<div class="field"><div class="label">expires_at</div><input class="input mono" id="edit-expires" value="'+esc(m.expires_at || "")+'"></div>'+
    '</div><div class="actions">'+(isNew ? "" : '<button class="btn danger" id="delete-memory">删除</button>')+'<span class="grow"></span><button class="btn" id="reset-detail">取消</button><button class="btn primary" id="save-memory">'+(state.saving?"保存中":(isNew?"创建记忆":"保存修改"))+'</button></div></aside>';
}
function healthRows(){
  const h = state.health;
  if(!h) return '<div class="empty"><div><b>尚未运行</b><span>点击按钮运行健康检查。</span></div></div>';
  if(h.error) return '<div class="hint" style="margin:12px;color:var(--bad)">'+esc(h.error)+'</div>';
  const config = h.config || {};
  const checks = h.checks || {};
  const emb = checks.embedding || {};
  const result = checks.result || {};
  const get = checks.get || {};
  const rows = [
    ["ok", String(h.ok), h.ok],
    ["embedding_model", config.embedding_model],
    ["embedding_provider", config.embedding_provider],
    ["dimensions", emb.dimensions],
    ["norm", emb.norm],
    ["vectorize_index_name", config.vectorize_index_name],
    ["has_ai_binding", String(config.has_ai_binding), config.has_ai_binding],
    ["has_vectorize_binding", String(config.has_vectorize_binding), config.has_vectorize_binding],
    ["canary.reason", result.reason, result.ok],
    ["canary.attempts", get.attempts],
    ["api_search.count", checks.api_search?.count]
  ];
  return rows.map(([k,v,ok])=>'<div class="kv"><span>'+esc(k)+'</span><b class="mono">'+esc(v ?? "—")+'</b>'+(ok===undefined?'<span></span>':'<span class="badge '+(ok?"good":"bad")+'">'+(ok?"ok":"fail")+'</span>')+'</div>').join("");
}
function reindexRows(){
  const r = state.reindex;
  if(!r) return '<div class="empty"><div><b>尚未运行</b><span>先 Dry run，再决定是否重嵌当前页。</span></div></div>';
  if(r.error) return '<div class="hint" style="margin:12px;color:var(--bad)">'+esc(r.error)+'</div>';
  const d = r.data || {};
  return '<div class="stats">'+
    '<div class="stat"><small>mode</small><b>'+esc(d.dry_run ? "DRY" : "RUN")+'</b></div>'+
    '<div class="stat"><small>total</small><b>'+esc(d.total_count ?? "—")+'</b></div>'+
    '<div class="stat"><small>rewritten</small><b>'+esc(d.rewritten_count ?? 0)+'</b></div>'+
    '<div class="stat"><small>failed</small><b>'+esc(d.failed_count ?? 0)+'</b></div>'+
    '<div class="stat"><small>has_more</small><b>'+esc(String(d.has_more))+'</b></div>'+
  '</div>'+
  [["embedding_model",d.embedding_model],["listed_ids",d.listed_ids],["matched_memories",d.matched_memories],["cursor",d.cursor || "—"],["failed[0]",d.failed?.[0]?.error || "—"]].map(([k,v])=>'<div class="kv"><span>'+esc(k)+'</span><b class="mono">'+esc(v)+'</b><span></span></div>').join("");
}
function renderDebug(){
  return '<main class="debug"><h1>调试 · 维护</h1><div class="meta">对向量链路做巡检，必要时按页重嵌。</div>'+
    '<section class="debug-card"><div class="debug-head"><b>Vector Health</b><span class="meta">GET /v1/debug/vector_health</span><span class="grow"></span><button class="btn primary" id="run-health">'+(state.debugLoading==="health"?"运行中":"运行向量健康检查")+'</button></div>'+healthRows()+'</section>'+
    '<section class="debug-card"><div class="debug-head"><b>Vector Reindex</b><span class="meta">POST /v1/debug/vector_reindex</span><span class="grow"></span><button class="btn" id="run-dry">'+(state.debugLoading==="dry"?"统计中":"Dry run")+'</button><button class="btn danger" id="run-reindex">'+(state.debugLoading==="run"?"重嵌中":"重嵌当前页")+'</button></div>'+reindexRows()+(state.reindex?.data?.has_more?'<div style="padding:12px"><button class="btn" id="reindex-next">下一页 cursor</button></div>':'')+'</section></main>';
}
async function loadDiaries(offset=0, append=false){
  state.loading = true; state.error = ""; if(!append) state.diaries = []; render(append);
  try {
    const data = await request("/v1/diaries?namespace=default&limit=30&offset=" + offset);
    const incoming = data.entries || [];
    state.diaries = append ? [...state.diaries, ...incoming] : incoming;
    state.diaryPaging = { offset: offset + incoming.length, hasMore: data.hasMore || false };
    state.status = "connected";
  } catch(e) { state.error = e.message; }
  state.loading = false; render(append);
}
function diaryCard(d){
  const changes = d.memory_changes || {};
  const badges = [];
  if(changes.added) badges.push('<span class="badge good">+'+changes.added+'</span>');
  if(changes.updated) badges.push('<span class="badge">~'+changes.updated+'</span>');
  if(changes.deleted) badges.push('<span class="badge bad">-'+changes.deleted+'</span>');
  if(changes.excerpts) badges.push('<span class="badge">excerpts '+changes.excerpts+'</span>');
  if(changes.cleaned) badges.push('<span class="badge">cleaned '+changes.cleaned+'</span>');
  const sections = Array.isArray(d.sections) ? d.sections : [];
  const sectionPreviews = sections.slice(0,3).map(s=>'<div class="tag">'+esc((s.heading||"").slice(0,48) || "—")+'</div>').join("");
  return '<article class="card">'+
    '<div class="card-top"><span class="type">diary</span><span class="source">'+esc(d.date_label || d.created_at?.slice(0,10) || "—")+'</span><span class="date">'+shortDate(d.created_at)+'</span></div>'+
    '<div class="content"><b>'+esc(d.title || "—")+'</b>\n'+esc((d.summary || "").slice(0,300))+'</div>'+
    '<div class="tags">'+sectionPreviews+badges.join("")+'</div>'+
  '</article>';
}
function renderDiaries(){
  return '<main class="debug">'+
    '<div class="debug-head"><h1>日记</h1><span class="meta">GET /v1/diaries · 每日 digest 归档</span><span class="grow"></span><button class="btn" id="refresh-diaries">刷新</button></div>'+
    (state.error ? '<div class="hint" style="margin:12px;border-color:rgba(226,118,99,.5);color:var(--bad)">'+esc(state.error)+'</div>' : '')+
    (state.loading && !state.diaries.length ? '<div class="empty"><div><b>加载中</b><span class="mono">fetching diaries...</span></div></div>' :
      state.diaries.length ? '<div class="cards">'+state.diaries.map(diaryCard).join("")+(state.diaryPaging.hasMore ? '<button class="btn" style="width:100%" id="load-more-diaries">继续加载 offset='+state.diaryPaging.offset+'</button>' : '')+'</div>' :
      '<div class="empty"><div><b>暂无日记</b><span>dailyDigest 运行后会自动生成日记条目。</span></div></div>')+
  '</main>';
}
async function loadEmotionMap(){
  state.emotionMapLoading = true; state.emotionMap = []; state.error = ""; render();
  try {
    const data = await request("/v1/memory/emotion-map?namespace=default");
    state.emotionMap = data.data || [];
    state.status = "connected";
  } catch(e) { state.error = e.message; }
  state.emotionMapLoading = false; render();
}
function renderEmotionMap(){
  return '<main class="list">'+
    '<div class="toolbar"><h2>情感地图</h2><span class="meta">'+state.emotionMap.length+' 条情感记忆</span><span class="grow"></span><button class="btn" id="refresh-emotion">刷新</button></div>'+
    (state.error ? '<div class="hint" style="margin:12px;border-color:rgba(226,118,99,.5);color:var(--bad)">'+esc(state.error)+'</div>' : '')+
    (state.emotionMapLoading ? '<div class="empty"><div><b>加载中</b><span class="mono">fetching emotion vectors...</span></div></div>' :
      state.emotionMap.length ? '<div style="position:relative;flex:1;min-height:0;display:grid;grid-template-columns:1fr 320px"><div style="position:relative;min-height:0;padding:12px"><canvas id="emotion-canvas" style="width:100%;height:100%;display:block;background:var(--panel);border-radius:var(--radius);border:1px solid var(--line)"></canvas></div><aside class="detail" id="emotion-detail"><div class="detail-head"><span class="type">记忆详情</span><span class="grow"></span></div><div class="detail-body" id="emotion-detail-body"><div class="empty"><div><b>悬停或点击散点</b><span>查看情感记忆的详细信息。</span></div></div></div></aside></div>' :
      '<div class="empty"><div><b>暂无情感数据</b><span>记忆需包含 emotion:v=...,a=... 格式的 tag 才会出现。</span></div></div>')+
  '</main>';
}
function drawEmotionCanvas(points){
  const canvas = document.getElementById("emotion-canvas");
  if(!canvas || !points.length) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width, H = rect.height;
  const pad = 52, graphW = W - pad * 2, graphH = H - pad * 2;
  ctx.clearRect(0, 0, W, H);
  const style = getComputedStyle(document.documentElement);
  const lineColor = style.getPropertyValue("--line").trim() || "#292d35";
  const textColor = style.getPropertyValue("--muted").trim() || "#a8acb5";
  const accentColor = style.getPropertyValue("--accent").trim() || "#e0aa55";
  const faintColor = style.getPropertyValue("--faint").trim() || "#737884";
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 0.5;
  for(let i = 0; i <= 8; i++){
    const x = pad + graphW * i / 8;
    ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + graphH); ctx.stroke();
    const y = pad + graphH * i / 8;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + graphW, y); ctx.stroke();
  }
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 1;
  const zeroX = pad + graphW / 2;
  ctx.beginPath(); ctx.moveTo(zeroX, pad); ctx.lineTo(zeroX, pad + graphH); ctx.stroke();
  const zeroY = pad + graphH / 2;
  ctx.beginPath(); ctx.moveTo(pad, zeroY); ctx.lineTo(pad + graphW, zeroY); ctx.stroke();
  ctx.fillStyle = faintColor;
  ctx.font = "11px ui-sans-serif,system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("消极", pad + 12, pad - 8);
  ctx.fillText("积极", pad + graphW - 12, pad - 8);
  ctx.textAlign = "right";
  ctx.fillText("高唤醒", pad - 8, pad + 14);
  ctx.fillText("低唤醒", pad - 8, pad + graphH - 4);
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.3;
  ctx.font = "12px ui-sans-serif,system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("紧张", pad + graphW * 0.25, pad + graphH * 0.25);
  ctx.fillText("兴奋", pad + graphW * 0.75, pad + graphH * 0.25);
  ctx.fillText("平静", pad + graphW * 0.75, pad + graphH * 0.75);
  ctx.fillText("忧郁", pad + graphW * 0.25, pad + graphH * 0.75);
  ctx.globalAlpha = 1;
  const typeColors = {
    identity: "#e0aa55", note: "#c8ccd0", preference: "#74c799",
    boundary: "#e27663", moment: "#6ca8d9", whisper: "#c5a3d5", diary: "#dfb85d"
  };
  const rendered = [];
  for(const p of points){
    const v = Math.max(-1, Math.min(1, p.valence ?? 0));
    const a = Math.max(-1, Math.min(1, p.arousal ?? 0));
    const imp = Math.max(0, Math.min(1, p.importance ?? 0));
    const cx = pad + graphW * (v + 1) / 2;
    const cy = pad + graphH * (1 - a) / 2;
    const radius = imp * 14 + 4;
    const color = typeColors[p.type] || "#888";
    const isHovered = state.emotionMapHover === p.id;
    ctx.beginPath();
    ctx.arc(cx, cy, isHovered ? radius + 4 : radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = isHovered ? 1 : 0.55 + imp * 0.45;
    ctx.fill();
    ctx.globalAlpha = 1;
    if(isHovered){
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    rendered.push({ id: p.id, x: cx, y: cy, radius, record: p });
  }
  state._emotionPoints = rendered;
}
function captureScroll(){
  return {
    list: $(".list")?.scrollTop || 0,
    detail: $(".detail")?.scrollTop || 0,
    side: $(".side")?.scrollTop || 0,
    debug: $(".debug")?.scrollTop || 0
  };
}
function restoreScroll(pos){
  if(!pos) return;
  const list = $(".list"); if(list) list.scrollTop = pos.list || 0;
  const detail = $(".detail"); if(detail) detail.scrollTop = pos.detail || 0;
  const side = $(".side"); if(side) side.scrollTop = pos.side || 0;
  const debug = $(".debug"); if(debug) debug.scrollTop = pos.debug || 0;
}
function render(preserveScroll=true){
  const scroll = preserveScroll ? captureScroll() : null;
  app.innerHTML = renderTop() + (state.tab === "debug" ? renderDebug() : state.tab === "diaries" ? renderDiaries() : state.tab === "emotion" ? renderEmotionMap() : '<div class="main">'+renderFilters()+renderList()+renderDetail()+'</div>') + (state.toast ? '<div class="toast">'+esc(state.toast)+'</div>' : "");
  bind();
  restoreScroll(scroll);
}
function bind(){
  $("#worker-url")?.addEventListener("input", e=>{ state.workerUrl=e.target.value; savePrefs(); });
  $("#api-key")?.addEventListener("input", e=>{ state.apiKey=e.target.value; savePrefs(); });
  $("#test-conn")?.addEventListener("click", testConnection);
  $("#theme-toggle")?.addEventListener("click", ()=>{ state.theme = state.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = state.theme; savePrefs(); render(); });
  document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{ state.tab=b.dataset.tab; if(state.tab==="diaries" && !state.diaries.length) loadDiaries(); if(state.tab==="emotion" && !state.emotionMap.length && !state.emotionMapLoading) loadEmotionMap(); render(); }));
  $("#query")?.addEventListener("input", e=>setFilter("query", e.target.value));
  $("#query")?.addEventListener("keydown", e=>{ if(e.key==="Enter") searchMemories(); });
  $("#search-btn")?.addEventListener("click", searchMemories);
  $("#clear-filters")?.addEventListener("click", ()=>{ state.filters={ query:"", top_k:20, filter:true, types:[], source:"", tags:"", pinned:false }; render(); });
  $("#sort-order")?.addEventListener("change", e=>{ state.sortOrder = e.target.value; render(); });
  document.querySelectorAll("[data-topk]").forEach(b=>b.addEventListener("click",()=>setFilter("top_k", Number(b.dataset.topk))));
  document.querySelectorAll("[data-type]").forEach(i=>i.addEventListener("change",()=>toggleType(i.dataset.type)));
  $("#filter-toggle")?.addEventListener("change", e=>setFilter("filter", e.target.checked));
  $("#source-filter")?.addEventListener("input", e=>setFilter("source", e.target.value));
  $("#tags-filter")?.addEventListener("input", e=>setFilter("tags", e.target.value));
  $("#pinned-filter")?.addEventListener("change", e=>setFilter("pinned", e.target.checked));
  $("#refresh")?.addEventListener("click", ()=> state.filters.query.trim() ? searchMemories() : loadList());
  $("#new-memory")?.addEventListener("click", createMemory);
  $("#load-more")?.addEventListener("click", ()=>loadList(state.paging.cursor, true));
  document.querySelectorAll(".card").forEach(c=>c.addEventListener("click",()=>{ state.active = state.memories.find(m=>m.id===c.dataset.id) || null; render(); }));
  $("#close-detail")?.addEventListener("click", ()=>{ state.active=null; render(); });
  $("#reset-detail")?.addEventListener("click", ()=>render());
  $("#save-memory")?.addEventListener("click", saveMemory);
  $("#delete-memory")?.addEventListener("click", ()=>deleteMemory(state.active?.id));
  $("#edit-importance")?.addEventListener("input", e=>{ $("#imp-val").textContent = Number(e.target.value).toFixed(2); });
  $("#edit-confidence")?.addEventListener("input", e=>{ $("#conf-val").textContent = Number(e.target.value).toFixed(2); });
  $("#run-health")?.addEventListener("click", runHealth);
  $("#run-dry")?.addEventListener("click", ()=>runReindex(true, null));
  $("#run-reindex")?.addEventListener("click", ()=>runReindex(false, state.reindexCursor));
  $("#reindex-next")?.addEventListener("click", ()=>runReindex(true, state.reindexCursor));
  $("#show-filter")?.addEventListener("click", ()=>{ state.showFilters = true; render(); });
  $("#close-filter")?.addEventListener("click", ()=>{ state.showFilters = false; render(); });
  $("#refresh-diaries")?.addEventListener("click", ()=>loadDiaries());
  $("#load-more-diaries")?.addEventListener("click", ()=>loadDiaries(state.diaryPaging.offset, true));
  // emotion map canvas events
  const ec = document.getElementById("emotion-canvas");
  if(ec){
    ec.addEventListener("mousemove", (e)=>{
      const rect = ec.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const pts = state._emotionPoints || [];
      let found = null;
      for(const p of pts){
        const dx = mx - p.x, dy = my - p.y;
        if(Math.sqrt(dx*dx + dy*dy) < p.radius + 8){ found = p; break; }
      }
      const prev = state.emotionMapHover;
      state.emotionMapHover = found ? found.id : null;
      if(prev !== state.emotionMapHover) drawEmotionCanvas(state.emotionMap);
      const detailBody = document.getElementById("emotion-detail-body");
      if(detailBody){
        if(found){
          const r = found.record;
          detailBody.innerHTML = '<div class="row"><label>id</label><span class="mono">'+esc(r.id)+'</span></div>'+
            '<div class="row"><label>type</label><span class="type">'+esc(r.type)+'</span></div>'+
            '<div class="row"><label>importance</label><span class="mono">'+Number(r.importance||0).toFixed(2)+'</span></div>'+
            '<div class="row"><label>valence</label><span class="mono">'+(r.valence>0?"+":"")+Number(r.valence||0).toFixed(2)+'</span></div>'+
            '<div class="row"><label>arousal</label><span class="mono">'+(r.arousal>0?"+":"")+Number(r.arousal||0).toFixed(2)+'</span></div>'+
            '<div class="field"><div class="label">content</div><div class="content" style="-webkit-line-clamp:10">'+esc(r.content||"")+'</div></div>';
        } else {
          detailBody.innerHTML = '<div class="empty"><div><b>悬停或点击散点</b><span>查看情感记忆的详细信息。</span></div></div>';
        }
      }
    });
    ec.addEventListener("click", (e)=>{
      const rect = ec.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const pts = state._emotionPoints || [];
      for(const p of pts){
        const dx = mx - p.x, dy = my - p.y;
        if(Math.sqrt(dx*dx + dy*dy) < p.radius + 6){
          state.emotionMapSelected = p.id;
          state.emotionMapHover = p.id;
          drawEmotionCanvas(state.emotionMap);
          break;
        }
      }
    });
    // draw after DOM settles
    setTimeout(()=>drawEmotionCanvas(state.emotionMap), 50);
  }
  $("#refresh-emotion")?.addEventListener("click", ()=>loadEmotionMap());
}
render();
if(state.apiKey) { loadList(); loadDiaries(); }
window.addEventListener("resize", ()=>{ if(state.tab === "emotion" && state.emotionMap.length) drawEmotionCanvas(state.emotionMap); });
</script>
</body>
</html>`;
export { ADMIN_HTML };

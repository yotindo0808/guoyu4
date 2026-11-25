const SEAL = {"s": "q166CUyLyJeXnTYRj648+g==", "n": 150000}; const TESTBUILD = true;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* ── 四年級設定 ── */
const GRADE = "四年級", GSHORT = "四上", VER = "KH115-7";
/* 作答紀錄後端與老師帳號三個年級共用（同一󠇡個󠇡 Apps Script） */
const API = "https://script.google.com/macros/s/AKfycbxDRZhEAgQvZL2FETluemCGKP3EH82X6QkyndxUEi8kdCjt-UMWH5Xg1Dwa2y8lZ1HPiw/exec";
/* 各課資料放在 lessons/課次/，進入哪一󠇡課才載入 */
const LBASE = (document.documentElement.dataset.lbase || "lessons/");
let LIST = [];
const LESSONS = {};
const TABS = [
  ["text", "課文", "背景知識、分段讀、課文結構、段落大意、閱讀理解"], ["chars", "生字", "寫國字、注音、部首、造詞"], ["words", "語詞", "詞義、情境判斷、選詞填入"],
  ["zx", "字音字形", "形近字、多音字、部首歸類"], ["jx", "句子󠇡", "看示範 → 仿寫 → 替換 → 自己造句"], ["zyrz", "注音與認字", "聽音選注音、拼讀、認讀"], ["review", "綜合練習", "整課重點複習"]
];
/* 只有基礎層（和投影上課）有的分頁 */
const BASE_ONLY = new Set(["zyrz"]);
/* 組別名稱標明年級：四年級網站只列出、建立「四年級｜」開頭的組別 */
const GPREFIX = /^四年級[｜|：:\s]*/;
function isMyGrade(n) { return /^(四年級|四上|四下)/.test(String(n || "").trim()); }
function gradeName(n) { n = String(n || "").trim().replace(GPREFIX, ""); return `${GRADE}｜${n}`; }
/* 分頁要不󠇡要出現：「注音與認字」只給基礎層和投影上課 */
function tabAllowed(id) { return !BASE_ONLY.has(id) || tier() !== "std"; }
/* ── 課次資料：進入哪一󠇡課才載入（資料、字型、彩色生字圖） ── */
let LIST_META = [], onLessonLoaded = async () => {};
const LOADING = {};
async function loadList() {
  const j = await (await fetch(`${LBASE}index.json`, { cache: "no-cache" })).json();
  LIST_META = j.lessons; LIST = j.lessons.map(x => [x.id, `${x.no}　${x.title}`]); return LIST;
}
function ensureLesson(id) {
  if (LESSONS[id]) return Promise.resolve(LESSONS[id]);
  if (LOADING[id]) return LOADING[id];
  const meta = LIST_META.find(x => x.id === id); if (!meta) return Promise.reject(new Error("nolesson"));
  return LOADING[id] = (async () => {
    const t0 = performance.now();
    const [d] = await Promise.all([fetch(`${LBASE}${id}/data.json?v=${meta.v}`).then(r => r.json()), lessonFonts(id, meta)]);
    d.v = meta.v; LESSONS[id] = d; await onLessonLoaded(id);
    window.LOADMS = window.LOADMS || {}; window.LOADMS[id] = Math.round(performance.now() - t0);
    /* 網址加 ?perf 顯示載入時間（檢查學生平板第一次開啟與切換課次用） */
    if (/[?&]perf\b/.test(location.search)) setTimeout(() => toast(`開網頁到可以用：${(performance.now() / 1000).toFixed(1)} 秒；載入${plainText((LIST.find(x => x[0] === id) || [, id])[1]).split(/\s+/)[0]}：${(window.LOADMS[id] / 1000).toFixed(1)} 秒`), 300);
    return d;
  })().finally(() => { delete LOADING[id]; });
}
/* 字型依課次做子集：L課次＝芫荽體，Z課次＝注音芫荽體（多音字用異體選擇器標讀音） */
async function lessonFonts(id, meta) {
  if (!window.FontFace) return;
  const faces = [new FontFace(`L${id}`, `url(${LBASE}${id}/l.woff2?v=${meta.v})`), new FontFace(`Z${id}`, `url(${LBASE}${id}/z.woff2?v=${meta.v})`)];
  await Promise.all(faces.map(f => f.load().then(x => document.fonts.add(x)).catch(() => {})));
}
function useLessonFont(id) { const r = document.documentElement.style; r.setProperty("--lf", `"L${id}"`); r.setProperty("--zf", `"Z${id}"`); }
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, html = "") => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "class") e.className = v; else e.setAttribute(k, v); } if (html) e.innerHTML = html; return e; };
const plainText = h => h.replace(/<[^>]+>/g, "").replace(/[\u{E0100}-\u{E01EF}]/gu, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let L, cur = { lesson: "8", tab: "text" };
const proj = () => document.documentElement.classList.contains("proj");
function store(k, v) { try { localStorage.setItem("l4g-" + k, v); } catch (e) {} }
function load(k) { try { return localStorage.getItem("l4g-" + k); } catch (e) { return null; } }

/* ── 作答紀錄 ── */
let REC = {}, QN = 0;
const recKey = () => `${cur.lesson}-${cur.tab}`;
function qid(label) { QN++; return { id: QN, label }; }
function logAns(q, ok, val) {
  if (proj()) return;
  const r = REC[recKey()] || (REC[recKey()] = {});
  const e = r[q.id] || (r[q.id] = { label: q.label, tries: 0, first: null, last: "", sec: curSec() });
  e.tries++; if (e.first === null) e.first = ok; e.last = val; e.done = e.done || ok; beep(ok);
}
function logText(q, val) { if (proj()) return; const r = REC[recKey()] || (REC[recKey()] = {}); r[q.id] = { label: q.label, text: val, sec: curSec() }; }
/* 目前所在的小節名稱（向度） */
function curSec() { try { const p = DPOS[recKey()]; return CUR && CUR.sections && p ? CUR.sections[p.s].name : ""; } catch (e) { return ""; } }

/* ── 分層提示：同一󠇢題答錯兩次後出現「提示」，每按一󠇡次刪去一󠇡個󠇡錯的選項 ── */
function hintBtn(host, buttons, ansIdx) {
  if (host.querySelector(":scope > .hintbtn") || proj()) return;
  const b = el("button", { type: "button", class: "btn hintbtn only-stu" }, "提示");
  b.onclick = () => {
    const left = buttons.filter((x, k) => k !== ansIdx && !x.classList.contains("elim"));
    if (left.length <= 1) { b.disabled = true; b.textContent = "只剩兩個了，再想想"; return; }
    left[Math.floor(Math.random() * left.length)].classList.add("elim");
    if (left.length - 1 <= 1) { b.disabled = true; b.textContent = "只剩兩個了，再想想"; }
  };
  host.append(b);
}

function firstCharTip(blank) {
  if (proj() || !blank.dataset.ans) return;
  blank.wrong = (blank.wrong || 0) + 1;
  if (blank.wrong < 2 || (blank.nextSibling && blank.nextSibling.classList && blank.nextSibling.classList.contains("tipch"))) return;
  blank.after(el("span", { class: "tipch only-stu" }, `提示：第一個󠇡字是「${[...blank.dataset.ans][0]}」`));
}

/* ── 共用元件 ── */
function revealBtn(container, fn, label = "公布答案") {
  const b = el("button", { type: "button", class: "btn solid only-proj" }, label);
  b.onclick = () => { fn(); container.classList.add("revealed"); };
  return b;
}
function tools(...btns) { const d = el("div", { class: "tools" }); btns.forEach(b => d.append(b)); return d; }

function choiceQ(stem, opts, ans, label) {
  const id = qid(label || plainText(stem));
  const q = el("div", { class: "q qs" });
  q.append(el("div", { class: "stem" }, stem));
  const box = el("div", { class: "opts" }); const btns = [];
  const LET = "ABCDEFGH";
  const face = (i, mark) => `<span class="olab">${LET[i]}</span><span class="otx">${opts[i]}</span>${mark ? '<span class="ock">✓</span>' : ""}`;
  opts.forEach((o, i) => {
    const row = el("div", { class: "optrow" });
    const b = el("button", { type: "button", class: "opt" }, face(i)); btns.push(b);
    row.append(b, sayBtn(() => `${LET[i]}，${plainText(o)}`, `唸選項 ${LET[i]}`));
    row.lastChild.classList.add("optsay");
    b.onclick = () => {
      if (proj()) { btns.forEach(x => x.classList.remove("sel")); b.classList.add("sel"); return; }
      if (q.classList.contains("answered")) return;
      logAns(id, i === ans, LET[i]);
      if (i === ans) { b.classList.add("ok"); b.innerHTML = face(i, true); q.classList.add("answered"); }
      else { b.classList.add("no", "shake"); setTimeout(() => b.classList.remove("shake"), 400); if (++wrong >= 2) hintBtn(q, btns, ans); }
    };
    box.append(row);
  });
  let wrong = 0;
  q.append(box);
  q.reveal = () => { const b = btns[ans]; b.classList.add("ok"); b.innerHTML = face(ans, true); q.classList.add("revealed"); };
  return q;
}
/* 小按鈕選擇題（字音字形、句子󠇡關係、○╳） */
function pickRow(labels, ans, label, cls = "ab") {
  const id = qid(label);
  const r = el("span", { class: "row2", style: "display:inline-flex" });
  const bs = labels.map((t, k) => { const b = el("button", { type: "button", class: cls }, t); b.onclick = () => {
    bs.forEach(x => x.classList.remove("ok", "no", "sel"));
    if (proj()) { b.classList.add("sel"); return; }
    logAns(id, k === ans, plainText(t)); b.classList.add(k === ans ? "ok" : "no"); if (k !== ans && ++wrong >= 2) hintBtn(r, bs, ans); }; r.append(b); return b; });
  let wrong = 0;
  r.reveal = () => bs[ans].classList.add("ok");
  return r;
}

/* 填空󠇡：有詞庫時按空󠇡格再按詞卡；無詞庫時直接打字 */
function fillLine(parts, answers, ctx, label) {
  const span = el("span"); let k = 0; const blanks = [];
  parts.forEach(p => {
    if (typeof p === "number" || (p && p.ans !== undefined)) {
      const a = typeof p === "number" ? answers[k] : p.ans; k++;
      const id = qid((label || "") + "（第" + k + "空）");
      let b;
      if (ctx.typing) {
        b = el("input", { class: "blank", type: "text", "aria-label": "填寫答案", size: String(Math.max(3, (a || "").length + 2)) });
        b.onchange = () => {
          const v = b.value.trim();
          if (!a) { if (v) logText(id, v); return; }
          if (proj()) return; b.classList.remove("ok", "no"); if (v) { b.classList.add(v === a ? "ok" : "no"); logAns(id, v === a, v); }
        };
        /* 打字之外也可以用說的（老師在後台關掉口說時不出現） */
        if (!proj() && typeof SR !== "undefined" && SR && allowedModes().includes("say")) {
          const mic = el("button", { type: "button", class: "bmic", title: "用說的填這一󠇢格", "aria-label": "用說的填這一󠇢格" }, "🎤");
          mic.onclick = () => listenOnce((t, alts) => {
            const pick = (a && (alts || []).find(x => x === a)) || t; b.value = pick; b.onchange();
          }, (st, msg) => { mic.classList.toggle("on", st === "start" || st === "hear"); if (st === "err") mic.title = msg; });
          span.append(b, mic); b.dataset.ans = a || ""; blanks.push(b); return;
        }
      } else {
        b = el("button", { type: "button", class: "blank", "aria-label": "空󠇡格" }, "　".repeat(Math.max(2, a.length)));
        b.onclick = () => { ctx.sel && ctx.sel.classList.remove("sel"); ctx.sel = b; b.classList.add("sel"); };
        b.rid = id;
      }
      b.dataset.ans = a || ""; blanks.push(b); span.append(b);
    } else span.insertAdjacentHTML("beforeend", p);
  });
  span.blanks = blanks; return span;
}
function bankBox(items, ctx) {
  const d = el("div", { class: "bank", "aria-label": "詞庫" });
  
  items.forEach(it => {
    const c = el("button", { type: "button", class: "chip" }, it.h);
    c.onclick = () => {
      const b = ctx.sel; if (!b) return;
      b.innerHTML = it.h; b.classList.remove("sel", "ok", "no");
      if (!proj()) { const ok = it.t === b.dataset.ans; b.classList.add(ok ? "ok" : "no"); logAns(b.rid, ok, it.t); if (!ok) firstCharTip(b); else if (b.nextSibling && b.nextSibling.classList && b.nextSibling.classList.contains("tipch")) b.nextSibling.remove(); }
      ctx.sel = null;
      const nb = (ctx.slideBlanks || []).find(x => x !== b && !x.classList.contains("ok")); if (nb) nb.click();
    };
    d.append(c);
  });
  return d;
}
function revealBlanks(blanks, lookup) {
  blanks.forEach(b => { const a = b.dataset.ans; if (!a) return; if (b.tagName === "INPUT") { b.value = a; } else { b.innerHTML = lookup && lookup[a] ? lookup[a] : a; } b.classList.add("ok"); });
}
function writeBox(label) {
  const id = qid(label);
  const t = el("textarea", { "aria-label": "寫下你的句子󠇡", rows: "2" });
  t.onchange = () => logText(id, t.value.trim());
  const w = el("div", { class: "wbox only-stu" }); w.append(t);
  /* 打字之外也可以用說的（老師在後台關掉口說時不出現）；說的內容接在已寫的文字後面，可以再修改 */
  if (!proj() && typeof SR !== "undefined" && SR && allowedModes().includes("say")) {
    const mic = el("button", { type: "button", class: "btn wmic" }, "🎤 用說的");
    mic.onclick = () => listenOnce(tx => { if (!tx) return; t.value = t.value.trim() + tx + "。"; t.onchange(); },
      (st, msg) => { mic.classList.toggle("on", st === "start" || st === "hear"); mic.textContent = (st === "start" || st === "hear") ? "🎤 聽你說…" : "🎤 用說的"; if (st === "err") mic.title = msg; });
    w.append(mic);
  }
  return w;
}
function refBox(html, label = "看參考答案") {
  const wrap = el("div"); const r = el("div", { class: "ref" }, html);
  const b = el("button", { type: "button", class: "btn" }, label); b.onclick = () => r.classList.toggle("show");
  wrap.append(tools(b), r); return wrap;
}
function checklist(items) {
  const ul = el("ul", { class: "checklist" });
  items.forEach(t => { const li = el("li"); const id = "ck" + Math.random().toString(36).slice(2); li.innerHTML = `<label for="${id}"><input type="checkbox" id="${id}">${t}</label>`; ul.append(li); });
  return ul;
}
function card(title, step, intro, cls = "") {
  const s = el("section", { class: "card " + cls });
  if (step) s.append(el("span", { class: "step" }, step));
  s.append(el("h2", {}, title));
  if (intro) s.append(el("p", { class: "hint" }, intro));
  return s;
}
function cols(cls, ...cards) { const d = el("div", { class: "cols " + (cls || "") }); cards.forEach(c => d.append(c)); return d; }
function wordLookup() { const m = {}; L.words.forEach(w => m[w.w] = Object.assign({ wh: w.w }, w)); (L.ctx || []).forEach(x => m[x.w] = { w: x.w, wh: x.wh, def: `「${x.c}」在這裡的意思󠇢：${x.m}`, ex: "", ctx: true }); return m; }
function wordHTML(w) {
  const m = wordLookup()[w]; if (!m) return "";
  const zs = [...new Set([...w].filter(c => cardOf(c)))];
  return `<div class="w2">${m.wh}</div><div>${m.def}</div>${m.ex ? `<div class="hint">例：${m.ex}</div>` : ""}${zs.length && !m.ctx ? `<div class="hint">本課生字：${zs.join("、")}</div>` : ""}`;
}
function cardOf(ch) { return L && L.cards ? L.cards.find(x => x.c === ch) : null; }
function showInfo(html, speech, btn) {
  const sl = btn && btn.closest(".slide"); const panel = sl && sl.querySelector(".panel");
  const fill = box => { box.innerHTML = ""; box.append(sayBtn(speech, "唸出來")); box.insertAdjacentHTML("beforeend", html); };
  if (panel && panel.offsetParent && innerWidth >= 820) { fill(panel); return; }
  fill($("#popc"));
  const hb = $("#bar"); const p = $("#pop");
  p.style.top = ((hb ? Math.max(0, hb.getBoundingClientRect().bottom) : 0) + 10) + "px";
  p.classList.add("show");
}
function showWord(w, btn) {
  document.querySelectorAll(".w[aria-pressed]").forEach(b => b.setAttribute("aria-pressed", String(!b.dataset.c && b.dataset.w === w))); document.querySelectorAll(".zi.on").forEach(z => z.classList.remove("on"));
  const html = wordHTML(w); if (html) showInfo(html, () => wordSpeech(w), btn);
}
function showChar(ch, btn) {
  const c = cardOf(ch); if (!c) return;
  document.querySelectorAll(".w[aria-pressed]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.c === ch)));
  document.querySelectorAll(".zi.on").forEach(z => z.classList.remove("on")); if (btn && btn.classList.contains("zi")) btn.classList.add("on");
  const ws = [c.word, ...(c.zc || [])];
  const html = `<div class="cinfo">${c.img ? `<img src="${c.img}" alt="">` : `<span class="cglyph nozy">${c.c}</span>`}<div><div class="w2">${c.c}<span class="hint" style="margin-left:.6em">${c.rad}</span></div><div>${ws.join("、")}</div></div></div>`;
  showInfo(html, () => `${c.c}。${ws.join("，")}`, btn);
}
function wordSpeech(w) { const m = wordLookup()[w]; return m ? `${w}。${plainText(m.def)}` : w; }

function zyBox(rd) {
  const b = el("button", { type: "button", class: "zb hide", "aria-label": "注音框，按一󠇡下顯示或隱藏" });
  let s = rd || ""; let light = false, tone = "";
  if (s.startsWith("˙")) { light = true; s = s.slice(1); }
  if (/[ˊˇˋ]$/.test(s)) { tone = s.slice(-1); s = s.slice(0, -1); }
  const sy = [...s]; let row = 1;
  if (light) { const d = el("span", { class: "lt" }, "˙"); d.style.gridRow = row++; b.append(d); }
  sy.forEach(ch => { const d = el("span", {}, ch); d.style.gridRow = row++; b.append(d); });
  if (tone) { const d = el("span", { class: "tn" }, tone); d.style.gridRow = String(Math.max(1, row - 1)); b.append(d); }
  b.style.gridTemplateRows = `repeat(${Math.max(row - 1, 1)}, .62em)`;
  b.onclick = () => b.classList.toggle("hide");
  return b;
}
function wordMenu(blank, words, id) {
  document.querySelectorAll(".menu").forEach(m => m.remove());
  const m = el("div", { class: "menu", role: "listbox" });
  words.forEach(w => { const o = el("button", { type: "button", class: "chip" }, w.t); o.onclick = () => {
    blank.textContent = w.t; blank.classList.remove("ok", "no");
    if (!proj()) { const ok = w.t === blank.dataset.ans; blank.classList.add(ok ? "ok" : "no"); logAns(id, ok, w.t); if (!ok) firstCharTip(blank); else if (blank.nextSibling && blank.nextSibling.classList && blank.nextSibling.classList.contains("tipch")) blank.nextSibling.remove(); }
    m.remove(); }; m.append(o); });
  const r = blank.getBoundingClientRect();
  m.style.left = (r.left + scrollX) + "px"; m.style.top = (r.bottom + scrollY + 4) + "px";
  document.body.append(m);
  setTimeout(() => document.addEventListener("click", function h(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener("click", h); } }), 0);
}

/* ── 核心詞情境連續圖（原創簡筆畫，三格）── */
const SND = { on: true };
let VOICE = null;
const HAS_TTS = "speechSynthesis" in window;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  VOICE = vs.find(v => /zh[-_]TW/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang) && /Taiwan|台|臺|Mei-Jia|Hanhan/i.test(v.name)) || vs.find(v => /^zh/i.test(v.lang) && !/HK|yue/i.test(v.lang)) || null;
}
if (HAS_TTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function stopSpeak() { if (HAS_TTS) speechSynthesis.cancel(); document.querySelectorAll(".say.on").forEach(b => b.classList.remove("on")); if (window.CSS && CSS.highlights) CSS.highlights.delete("reading"); }
/* 語音合成容易唸錯的破音字，用同音字代替（字數相同，不影響逐句標示） */
const TTSFIX = [["比比皆是", "必必皆是"], ["嗯", "恩"], ["呢絨", "泥絨"]];
function speak(text, opt = {}) {
  if (!HAS_TTS || !text) return;
  speechSynthesis.cancel();
  text = TTSFIX.reduce((t, [a, b]) => t.split(a).join(b), String(text));
  const u = new SpeechSynthesisUtterance(text); u.lang = "zh-TW"; if (VOICE) u.voice = VOICE; u.rate = opt.rate || 0.85;
  u.onend = () => opt.onend && opt.onend(); u.onerror = () => opt.onend && opt.onend();
  speechSynthesis.speak(u);
}
const SPK = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
function sayBtn(getText, label = "唸給我聽") {
  const b = el("button", { type: "button", class: "say", "aria-label": label, title: label }, SPK);
  if (!HAS_TTS) b.hidden = true;
  b.onclick = e => { e.stopPropagation(); const on = b.classList.contains("on"); stopSpeak(); if (on) return; b.classList.add("on"); speak(typeof getText === "function" ? getText() : getText, { onend: () => b.classList.remove("on") }); };
  return b;
}
/* 唸出含空󠇡格的句子󠇡：空󠇡格唸成「什麼」 */
function speechOf(node) {
  const c = node.cloneNode(true);
  c.querySelectorAll(".say, .zb, .hint, .qno, .kicker, .tnote, .ref, .tools, .src, .rolekey, .scenebox, .selfck, .prod, textarea, .opts").forEach(x => x.remove());
  c.querySelectorAll(".blank").forEach(b => { const v = b.tagName === "INPUT" ? b.value : b.textContent.trim(); b.replaceWith(v || "什麼"); });
  return plainText(c.innerHTML);
}
/* 逐句朗讀並用螢光標示正在唸的句子󠇡 */
function readAloud(container, btn) {
  if (btn.classList.contains("on")) { stopSpeak(); return; }
  stopSpeak();
  const map = []; let txt = "";
  const walk = n => { if (n.nodeType === 3) { for (let k = 0; k < n.data.length; k++) { const cp = n.data.codePointAt(k); if (cp > 0xffff) { if (cp >= 0xE0100 && cp <= 0xE01EF) { k++; continue; } txt += n.data.substr(k, 2); map.push([n, k]); map.push([n, k + 1]); k++; continue; } txt += n.data[k]; map.push([n, k]); } } else if (!(n.classList && (n.classList.contains("say") || n.classList.contains("zb")))) n.childNodes.forEach(walk); };
  walk(container);
  const sents = []; let st = 0;
  for (let k = 0; k < txt.length; k++) { if ("。！？；".includes(txt[k]) || k === txt.length - 1) { let e = k + 1; while (e < txt.length && "」』）".includes(txt[e])) e++; if (txt.slice(st, e).trim()) sents.push([st, e]); st = e; k = e - 1; } }
  let i = 0; btn.classList.add("on");
  const hl = (a, b) => { if (!(window.CSS && CSS.highlights && window.Highlight)) return; try { const r = new Range(); r.setStart(map[a][0], map[a][1]); const z = map[b - 1]; r.setEnd(z[0], z[1] + 1); CSS.highlights.set("reading", new Highlight(r)); } catch (e) {} };
  const nextS = () => {
    if (!btn.classList.contains("on") || i >= sents.length) { stopSpeak(); return; }
    const [a, b] = sents[i++]; hl(a, b);
    speak(txt.slice(a, b), { onend: () => { if (btn.classList.contains("on")) nextS(); } });
  };
  nextS();
}
let ACtx;
function beep(ok) {
  if (!SND.on || proj()) return;
  try {
    ACtx = ACtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ACtx.currentTime; const notes = ok ? [523, 784] : [330, 262];
    notes.forEach((f, i) => { const o = ACtx.createOscillator(), g = ACtx.createGain(); const t = t0 + i * .12; o.type = ok ? "sine" : "triangle"; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .2); o.connect(g).connect(ACtx.destination); o.start(t); o.stop(t + .22); });
  } catch (e) {}
}
/* 手寫描字：淡色範字＋米字格，用手指或觸控筆描寫 */
function traceDialog(c) {
  stopSpeak();
  const box = $("#rbox"); box.innerHTML = ""; box.classList.add("trace");
  box.append(el("h2", { id: "rtitle", class: "ui", style: "margin:0 0 6px;color:var(--accent);font-size:20px" }, `寫寫看：${c.c}`));
  const size = Math.min(380, innerWidth - 80, innerHeight - 260);
  const cv = el("canvas", { width: String(size * 2), height: String(size * 2), "aria-label": "描字區，用手指或觸控筆描寫" });
  cv.style.width = cv.style.height = size + "px";
  const g = cv.getContext("2d"); g.scale(2, 2);
  const sk = document.createElement("canvas"); sk.width = sk.height = size; const sg = sk.getContext("2d");
  let guide = true, ink = [], stroke = null, t0 = 0;
  const base = () => {
    g.clearRect(0, 0, size, size); g.fillStyle = "#fff"; g.fillRect(0, 0, size, size);
    g.strokeStyle = "#e3b9b2"; g.lineWidth = 1; g.setLineDash([6, 6]); g.beginPath();
    g.moveTo(size / 2, 0); g.lineTo(size / 2, size); g.moveTo(0, size / 2); g.lineTo(size, size / 2); g.moveTo(0, 0); g.lineTo(size, size); g.moveTo(size, 0); g.lineTo(0, size); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "#c97a6d"; g.lineWidth = 2; g.strokeRect(1, 1, size - 2, size - 2);
    if (guide) { g.fillStyle = "#d6dcda"; g.font = `${size * .82}px "L${cur.lesson}", "IansuiUI", serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(c.c, size / 2, size / 2 + size * .03); }
  };
  const clearAll = () => { ink = []; t0 = 0; sg.clearRect(0, 0, size, size); base(); res.innerHTML = ""; };
  base();
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
  cv.style.touchAction = "none";
  const lw = Math.max(6, size / 34);
  cv.onpointerdown = e => { e.stopPropagation(); if (!t0) t0 = Date.now(); const [x, y] = pt(e); stroke = [[x], [y], [Date.now() - t0]]; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!stroke) return; const [x, y] = pt(e); const n = stroke[0].length - 1;
    [g, sg].forEach(k => { k.strokeStyle = "#1f6560"; k.lineWidth = lw; k.lineCap = k.lineJoin = "round"; k.beginPath(); k.moveTo(stroke[0][n], stroke[1][n]); k.lineTo(x, y); k.stroke(); });
    stroke[0].push(x); stroke[1].push(y); stroke[2].push(Date.now() - t0); };
  cv.onpointerup = cv.onpointercancel = e => { e.stopPropagation(); if (stroke && stroke[0].length > 1) ink.push(stroke); stroke = null; };
  const wrap = el("div", { style: "display:flex;justify-content:center" }); wrap.append(cv); box.append(wrap);
  const res = el("div", { class: "gcres", "aria-live": "polite", style: "min-height:1.6em" }); box.append(res);
  /* 離線比對：範字與筆跡的重疊比例 */
  const overlap = () => {
    const N = 32, cell = size / N;
    const t = document.createElement("canvas"); t.width = t.height = size; const tg = t.getContext("2d");
    tg.fillStyle = "#000"; tg.font = `${size * .82}px "L${cur.lesson}", "IansuiUI", serif`; tg.textAlign = "center"; tg.textBaseline = "middle"; tg.fillText(c.c, size / 2, size / 2 + size * .03);
    const grid = (cx) => { const d = cx.getImageData(0, 0, size, size).data; const out = new Uint8Array(N * N); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (d[(y * size + x) * 4 + 3] > 60) out[Math.min(N - 1, Math.floor(y / cell)) * N + Math.min(N - 1, Math.floor(x / cell))] = 1; return out; };
    const T = grid(tg), S = grid(sg); const near = (G, i) => { const y = Math.floor(i / N), x = i % N; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < N && xx >= 0 && xx < N && G[yy * N + xx]) return true; } return false; };
    let tn = 0, tc = 0, sn = 0, sc = 0; for (let i = 0; i < N * N; i++) { if (T[i]) { tn++; if (near(S, i)) tc++; } if (S[i]) { sn++; if (near(T, i)) sc++; } }
    return { cover: tn ? tc / tn : 0, prec: sn ? sc / sn : 0 };
  };
  let tries = 0;
  const check = async () => {
    if (!ink.length) { res.innerHTML = '<span class="nomsg">先在格子󠇡裡寫字。</span>'; return; }
    res.innerHTML = '<span class="hint">檢查中……</span>'; tries++;
    let ok = null, how = "";
    try { const list = await hwRecognize(ink, size, size); ok = list.slice(0, 5).includes(c.c); how = ok ? "" : (list[0] ? `看起來像「${list[0]}」` : ""); }
    catch (e) { const o = overlap(); ok = o.cover >= .55 && o.prec >= .7; how = ok ? "" : (o.cover < .55 ? "有些筆畫好像沒寫到" : "有些筆畫寫到格子󠇡外面了"); }
    if (!proj()) logAns(qid(`生字寫寫看：${c.c}`), ok, ok ? c.c : how || "寫錯");
    res.innerHTML = ok ? `<span class="okmsg">√ 寫對了！${guide ? "試試看拿掉範字再寫一󠇡次。" : "你不󠇡看範字也寫得󠇡出來！"}</span>` : `<span class="nomsg">還不󠇡太對${how ? "：" + how : ""}。擦掉再寫一󠇡次。</span>` + (tries >= 2 && !guide ? '<div class="tipch">提示：可以先打開範字描一󠇡次。</div>' : "");
  };
  const chk = el("button", { type: "button", class: "btn solid" }, "檢查"); chk.onclick = check;
  const clr = el("button", { type: "button", class: "btn" }, "擦掉重󠇡寫"); clr.onclick = clearAll;
  const gd = el("button", { type: "button", class: "btn" }, "拿掉範字"); gd.onclick = () => { guide = !guide; gd.textContent = guide ? "拿掉範字" : "顯示範字"; clearAll(); };
  const say = el("button", { type: "button", class: "btn" }, "唸一󠇡次"); say.onclick = () => speak(`${c.c}，${c.words.map(w => w.t).join("，")}`);
  const close = el("button", { type: "button", class: "btn" }, "關閉"); close.onclick = () => { $("#result").classList.remove("show"); box.classList.remove("trace"); };
  box.append(tools(chk, clr, gd, say, close)); $("#result").classList.add("show");
}


/* 手寫輸入：在米字格寫字，送到 Google 手寫辨識取得候選字；連不󠇡上時改用鍵盤或平板內建手寫輸入 */
const HW_URL = "https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8";
async function hwRecognize(ink, w, h) {
  const res = await fetch(HW_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ options: "enable_pre_space", requests: [{ writing_guide: { writing_area_width: w, writing_area_height: h }, ink, language: "zh_TW" }] }) });
  const j = await res.json(); return (j[1] && j[1][0] && j[1][0][1]) || [];
}
function handwritePad(onPick, ho = {}) {
  const wrap = el("div", { class: "hwpad" });
  const size = Math.max(140, Math.min(220, Math.floor(innerHeight * .26)));
  const cv = el("canvas", { width: String(size * 2), height: String(size * 2), "aria-label": "手寫區" });
  const g = cv.getContext("2d"); g.scale(2, 2);
  let ink = [], stroke = null, t0 = 0, timer = null;
  const base = () => {
    g.clearRect(0, 0, size, size); g.fillStyle = "#fff"; g.fillRect(0, 0, size, size);
    g.strokeStyle = "#e7c6c0"; g.lineWidth = 1; g.setLineDash([5, 5]); g.beginPath();
    g.moveTo(size / 2, 0); g.lineTo(size / 2, size); g.moveTo(0, size / 2); g.lineTo(size, size / 2); g.moveTo(0, 0); g.lineTo(size, size); g.moveTo(size, 0); g.lineTo(0, size); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "#c97a6d"; g.lineWidth = 2; g.strokeRect(1, 1, size - 2, size - 2);
  };
  base();
  const cands = el("div", { class: "cands", "aria-live": "polite" }, '<span class="hint">寫完會出現候選字</span>');
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
  cv.style.touchAction = "none";
  cv.onpointerdown = e => { e.stopPropagation(); clearTimeout(timer); if (!t0) t0 = Date.now(); const [x, y] = pt(e); stroke = [[x], [y], [Date.now() - t0]]; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!stroke) return; const [x, y] = pt(e); const n = stroke[0].length - 1; g.strokeStyle = "#1f6560"; g.lineWidth = 7; g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(stroke[0][n], stroke[1][n]); g.lineTo(x, y); g.stroke(); stroke[0].push(x); stroke[1].push(y); stroke[2].push(Date.now() - t0); };
  cv.onpointerup = cv.onpointercancel = e => { e.stopPropagation(); if (stroke && stroke[0].length) ink.push(stroke); stroke = null; clearTimeout(timer); timer = setTimeout(recog, 700); };
  async function recog() {
    if (!ink.length) return;
    cands.innerHTML = '<span class="hint">辨識中……</span>';
    try {
      const list = await hwRecognize(ink, size, size);
      cands.innerHTML = "";
      if (!list.length) { cands.innerHTML = '<span class="hint">認不出來，擦掉再寫一󠇡次。</span>'; return; }
      list.filter(c => [...c].length === 1).slice(0, 6).forEach(c => { const b = el("button", { type: "button", class: "chip" }, c); b.onclick = () => onPick(c); cands.append(b); });
    } catch (e) { cands.innerHTML = '<span class="hint">連不󠇡上手寫辨識，請用下面的輸入框。</span>'; }
  }
  const clr = el("button", { type: "button", class: "btn" }, "擦掉"); clr.onclick = () => { ink = []; t0 = 0; base(); cands.innerHTML = '<span class="hint">寫完會出現候選字</span>'; };
  const inp = el("input", { type: "text", class: "hwin", maxlength: "2", "aria-label": "或直接輸入正確的字", placeholder: "打字" });
  const ok = el("button", { type: "button", class: "btn" }, "確定"); ok.onclick = () => { const c = inp.value.trim(); if (c) onPick([...c][0]); };
  inp.onkeydown = e => { if (e.key === "Enter") ok.click(); };
  const left = el("div", { class: "hwcv" }); left.append(cv, tools(clr));
  const right = el("div", { class: "hwr" }); right.append(cands); const row = el("div", { class: "row2" }); row.append(inp, ok); if (!ho.noType) right.append(row);
  wrap.append(left, right);
  wrap.reset = () => clr.click();
  wrap.pick = onPick;
  return wrap;
}


/* ── 投影上課工具：全螢幕、畫筆、逐步揭示、抽籤、計時、列印 ── */
const VEIL = { on: false };
function applyVeil(sl) {
  if (!proj() || !VEIL.on || sl.veiled) return; sl.veiled = true;
  sl.querySelectorAll(".opts .opt, .pickwrap .ab, .pickwrap .yn, .czpool .czchip").forEach(b => b.classList.add("veil"));
}
function revealNext(sl) { const b = sl && sl.querySelector(".veil"); if (!b) return false; b.classList.remove("veil"); return true; }
function penLayer(stage) {
  const cv = el("canvas", { class: "pen", "aria-hidden": "true" }); stage.append(cv);
  const g = cv.getContext("2d"); const P = { on: false, color: "#ffd84d" }; let last = null;
  const fit = () => { const r = stage.getBoundingClientRect(); const d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0); };
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = e => { if (!P.on) return; last = pt(e); cv.setPointerCapture(e.pointerId); e.stopPropagation(); };
  cv.onpointermove = e => { if (!P.on || !last) return; const p = pt(e); g.strokeStyle = P.color; g.lineWidth = 5; g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke(); last = p; };
  cv.onpointerup = cv.onpointercancel = e => { last = null; e.stopPropagation(); };
  P.set = on => { P.on = on; cv.classList.toggle("on", on); if (on) fit(); };
  P.clear = () => g.clearRect(0, 0, cv.width, cv.height);
  addEventListener("resize", () => { if (P.on) fit(); });
  stage.pen = P; return P;
}
function teacherTools(box, sl, root) {
  const pen = root.querySelector(".dstage").pen;
  const mk = (t, title, fn, on) => { const b = el("button", { type: "button", class: "tbtn" + (on ? " on" : ""), title }, t); b.onclick = fn; box.append(b); return b; };
  mk("全螢幕", "全螢幕（再按一󠇡次離開）", () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} });
  const pb = mk("畫筆", "在卡片上圈畫；換下一󠇢張會自動清掉", () => { pen.set(!pen.on); pb.classList.toggle("on", pen.on); pc.hidden = !pen.on; }, pen.on);
  const pc = el("span", { class: "pcolors" }); pc.hidden = !pen.on;
  [["#ffd84d", "黃"], ["#ff7a6b", "紅"], ["#ffffff", "白"]].forEach(([c, n]) => { const b = el("button", { type: "button", class: "pc", title: n + "色", style: `background:${c}` }); b.onclick = () => { pen.color = c; }; pc.append(b); });
  const clr = el("button", { type: "button", class: "pc x", title: "擦掉" }, "✕"); clr.onclick = () => pen.clear(); pc.append(clr); box.append(pc);
  const canVeil = !!sl.querySelector(".opts .opt, .pickwrap .ab, .pickwrap .yn, .czpool .czchip");
  const vb = mk("遮住選項", "先把選項遮起來，讓學生自己想答案；再按「翻開一󠇡個󠇡」或空󠇡白鍵，一󠇡個󠇡一󠇡個󠇡打開", () => { VEIL.on = !VEIL.on; store("veil", VEIL.on ? "1" : "0"); vb.classList.toggle("on", VEIL.on); if (VEIL.on) { sl.veiled = false; applyVeil(sl); } else sl.querySelectorAll(".veil").forEach(x => x.classList.remove("veil")); nx.hidden = !VEIL.on; }, VEIL.on);
  const nx = mk("翻開一󠇡個󠇡 ▸", "打開下一󠇡個󠇡選項（也可以按空󠇡白鍵）", () => revealNext(sl)); nx.hidden = !VEIL.on || !canVeil;
  if (!canVeil) { vb.disabled = true; vb.title = "這一󠇢張沒有選項可以遮"; }
  mk("抽籤", "抽一󠇡位同學回答", openLots);
  if (typeof TD !== "undefined" && TD.me && !TD.me.owner && (TD.me.groups || []).length) mk("開放給學生", "把這個󠇡小節開放給學生練習（今日任務）", () => openTaskQuick()); if (typeof TD !== "undefined" && TD.me && !TD.me.owner && (TD.me.groups || []).length) mk("暫停學生", "暫停學生平板的練習，請學生看老師講解", () => pauseQuick());
  mk("計時", "倒數計時", openTimer);
}
/* 抽籤：輸入學生名字，名字卡快速輪轉後停下 */
/* 抽籤名單：存在這台電腦，可以有好幾份（每組一󠇡份），每份最多 30 人 */
const LOT_MAX = 30;
function lotSets() {
  try { const o = JSON.parse(localStorage.getItem("l4g-lotsets") || "null"); if (o && o.sets && Object.keys(o.sets).length) { if (!o.sets[o.cur]) o.cur = Object.keys(o.sets)[0]; return o; } } catch (e) {}
  let old = []; try { old = JSON.parse(localStorage.getItem("l4g-lots") || "[]"); } catch (e) {}
  return { cur: "我的名單", sets: { "我的名單": old } };
}
function saveLotSets(o) { try { localStorage.setItem("l4g-lotsets", JSON.stringify(o)); } catch (e) {} }
function lotNames() { const o = lotSets(); return o.sets[o.cur] || []; }
function setLotList(name, list) { const o = lotSets(); if (o.cur === "我的名單" && !(o.sets["我的名單"] || []).length) delete o.sets["我的名單"]; o.sets[name] = list.slice(0, LOT_MAX); o.cur = name; saveLotSets(o); }
function openLots() {
  const box = $("#rbox"); box.innerHTML = ""; box.className = "box lots";
  const sets = lotSets();
  let names = lotNames(); if (!names.length) names = ["第一位", "第二位", "第三位", "第四位", "第五位", "第六位"];
  let used = [];
  box.append(el("h2", { id: "rtitle" }, "抽籤：誰來回答？"));
  const lsel = el("select", { class: "tsel", "aria-label": "選擇名單" }); Object.keys(sets.sets).forEach(k => lsel.append(el("option", { value: k }, `${k}（${sets.sets[k].length} 人）`))); lsel.value = sets.cur;
  lsel.onchange = () => { sets.cur = lsel.value; saveLotSets(sets); openLots(); };
  const addl = el("button", { type: "button", class: "btn" }, "＋新增名單");
  addl.onclick = () => { let n = "新名單", k = 2; while (sets.sets[n]) n = "新名單" + k++; sets.sets[n] = []; sets.cur = n; saveLotSets(sets); openLots(); setTimeout(() => { const e = $("#rbox .lotedit-open"); if (e) e.click(); }, 0); };
  box.append(tools(el("span", { class: "ui hint" }, "名單"), lsel, addl));
  const stage = el("div", { class: "lotstage" }); const card = el("div", { class: "lotcard" }, "？"); stage.append(card); box.append(stage);
  const chips = el("div", { class: "lotchips" }); box.append(chips);
  const paint = () => { chips.innerHTML = ""; names.forEach(n => chips.append(el("span", { class: "lotchip" + (used.includes(n) ? " used" : "") }, n))); };
  paint();
  const go = el("button", { type: "button", class: "btn warm big" }, "抽！");
  const nore = el("label", { class: "ui" }); const nr = el("input", { type: "checkbox", checked: "" }); nore.append(nr, " 抽過的先不󠇡重󠇡複");
  const edit = el("button", { type: "button", class: "btn lotedit-open" }, "編輯名單");
  const close = el("button", { type: "button", class: "btn" }, "關閉"); close.onclick = () => { $("#result").classList.remove("show"); box.className = "box"; };
  const COLORS = ["#e9a23b", "#5bb5a2", "#e2735f", "#7d9be0", "#c48ad6", "#9cc65a"];
  go.onclick = () => {
    let pool = nr.checked ? names.filter(n => !used.includes(n)) : names.slice(); if (!pool.length) { used = []; pool = names.slice(); paint(); }
    const pick = pool[Math.floor(Math.random() * pool.length)]; go.disabled = true; card.classList.remove("win");
    let t = 0, k = 0; const steps = 22 + Math.floor(Math.random() * 6);
    const tick = () => {
      const n = k < steps ? names[k % names.length] : pick; card.textContent = n; card.style.background = COLORS[names.indexOf(n) % COLORS.length];
      if (SND.on) { try { ACtx = ACtx || new (window.AudioContext || window.webkitAudioContext)(); const o = ACtx.createOscillator(), g = ACtx.createGain(); o.frequency.value = 600 + (k % 5) * 60; g.gain.value = .05; o.connect(g).connect(ACtx.destination); o.start(); o.stop(ACtx.currentTime + .04); } catch (e) {} }
      if (k >= steps) { card.classList.add("win"); used.push(pick); paint(); go.disabled = false; beepWin(); return; }
      k++; t = 40 + Math.pow(k / steps, 3) * 360; setTimeout(tick, t);
    };
    tick();
  };
  edit.onclick = () => {
    if (box.querySelector(".lotedit")) return;
    const nm = el("input", { type: "text", class: "tkey", "aria-label": "名單名稱", placeholder: "名單名稱，例：週三抽離組" }); nm.value = sets.cur;
    const ta = el("textarea", { rows: "10", "aria-label": "學生名單，一󠇢行一󠇡位" }); ta.value = lotNames().join("\n");
    const cnt = el("span", { class: "hint" });
    const list = () => [...new Set(ta.value.split(/\n/).map(s => s.trim()).filter(Boolean))];
    const upd = () => { const n = list().length; cnt.textContent = `${n} / ${LOT_MAX} 人` + (n > LOT_MAX ? `，超過的不󠇡會存` : ""); cnt.style.color = n > LOT_MAX ? "var(--no)" : ""; };
    ta.oninput = upd; upd();
    const save = el("button", { type: "button", class: "btn solid" }, "儲存名單");
    save.onclick = () => {
      const newName = nm.value.trim() || sets.cur; const l = list().slice(0, LOT_MAX);
      if (newName !== sets.cur) delete sets.sets[sets.cur];
      sets.sets[newName] = l; sets.cur = newName; saveLotSets(sets); openLots();
    };
    const del = el("button", { type: "button", class: "btn" }, "刪除這份名單");
    del.onclick = () => { delete sets.sets[sets.cur]; sets.cur = Object.keys(sets.sets)[0] || "我的名單"; if (!sets.sets[sets.cur]) sets.sets[sets.cur] = []; saveLotSets(sets); openLots(); };
    const wrap = el("div", { class: "lotedit" }); wrap.append(el("div", { class: "hint" }, `一󠇢行一󠇡位，可以用名字或暱稱，每份最多 ${LOT_MAX} 人。名單只存在這台電腦。`), nm, ta, tools(cnt, save, del)); box.append(wrap);
  };
  box.append(tools(go, nore, edit, close)); $("#result").classList.add("show");
}
function beepWin() { if (!SND.on) return; try { ACtx = ACtx || new (window.AudioContext || window.webkitAudioContext)(); [523, 659, 784, 1046].forEach((f, i) => { const o = ACtx.createOscillator(), g = ACtx.createGain(); const t = ACtx.currentTime + i * .1; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.14, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .25); o.connect(g).connect(ACtx.destination); o.start(t); o.stop(t + .3); }); } catch (e) {} }
/* 計時：倒數結束時響鈴並閃爍 */
let TIMER = null;
function openTimer() {
  const box = $("#rbox"); box.innerHTML = ""; box.className = "box";
  box.append(el("h2", { id: "rtitle" }, "倒數計時"));
  const row = el("div", { class: "tools" });
  [[30, "30 秒"], [60, "1 分"], [120, "2 分"], [180, "3 分"], [300, "5 分"]].forEach(([s, t]) => { const b = el("button", { type: "button", class: "btn" }, t); b.onclick = () => { startTimer(s); $("#result").classList.remove("show"); }; row.append(b); });
  const close = el("button", { type: "button", class: "btn" }, "關閉"); close.onclick = () => $("#result").classList.remove("show"); row.append(close);
  box.append(row); $("#result").classList.add("show");
}
function startTimer(sec) {
  stopTimer(); const chip = el("button", { type: "button", class: "timer", title: "按一󠇡下停止" }); document.body.append(chip);
  const end = Date.now() + sec * 1000;
  const tick = () => { const left = Math.max(0, Math.round((end - Date.now()) / 1000)); chip.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; chip.classList.toggle("warn", left <= 10); if (!left) { chip.classList.add("end"); chip.textContent = "時間到！"; beepWin(); setTimeout(beepWin, 500); clearInterval(TIMER.iv); } };
  TIMER = { chip, iv: setInterval(tick, 250) }; tick(); chip.onclick = stopTimer;
}
function stopTimer() { if (TIMER) { clearInterval(TIMER.iv); TIMER.chip.remove(); TIMER = null; } }
/* 列印：把目前分頁的所有卡片排成紙本學習單 */
function printDeck(root) {
  const area = $("#printArea"); area.innerHTML = "";
  area.append(el("h1", {}, `${plainText(L.no)}　${plainText(L.title)}｜${TABS.find(t => t[0] === cur.tab)[1]}<small>姓名：＿＿＿＿＿＿＿＿</small>`));
  root.sections.forEach(s => {
    if (s.slides.every(x => x.classList.contains("finish"))) return;
    const sec = el("section"); sec.append(el("h2", {}, s.name + (s.hint ? `<small>${s.hint}</small>` : "")));
    s.slides.forEach((x, i) => {
      if (x.classList.contains("finish")) return;
      const c = x.firstChild.cloneNode(true);
      c.querySelectorAll(".say, .hintbtn, .tipch, .hwr, .gcres, .tools, details, .only-proj, .menu").forEach(n => n.remove());
      c.querySelectorAll("canvas").forEach(n => n.replaceWith(el("div", { class: "pbox" })));
      c.querySelectorAll("textarea").forEach(n => n.replaceWith(el("div", { class: "plines" }, "<i></i><i></i>")));
      c.querySelectorAll("input.blank").forEach(n => n.replaceWith(el("span", { class: "blank" }, "　".repeat(Math.max(4, +n.size || 4)))));
      c.querySelectorAll(".ok, .no, .sel, .veil, .elim, .found, .fixed").forEach(n => n.classList.remove("ok", "no", "sel", "veil", "elim", "found", "fixed"));
      c.querySelectorAll(".gcarea").forEach(n => { n.hidden = false; });
      const item = el("div", { class: "pitem" }); item.append(el("span", { class: "pno" }, String(i + 1)), c); sec.append(item);
    });
    area.append(sec);
  });
  document.documentElement.classList.add("printing");
  setTimeout(() => { window.print(); }, 50);
}
addEventListener("afterprint", () => { document.documentElement.classList.remove("printing"); $("#printArea").innerHTML = ""; });


/* ── 學生自己產出答案：口說、寫字、打字（老師可依學生鎖定可用的方式）── */
const MODE_NAMES = { say: "口說", write: "寫字", type: "打字", pick: "口說後改用選的" };
const CFG = { default: ["say", "write", "type"], students: {} };
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let WHOK = "";   /* 學生姓名的不可逆代號，用來查作答方式 */
async function updWhoKey() { const n = String(load("who") || "").trim(); try { WHOK = n && CLS.code && window.crypto && crypto.subtle ? await nameKey(CLS.code, n) : ""; } catch (e) { WHOK = ""; } }
function allowedModes() {
  const s = String(load("who") || "").trim(); let m = (WHOK && CFG.students[WHOK]) || (s && CFG.students[s]) || CFG.default;
  m = m.filter(x => (x !== "say" || SR) && x !== "nott"); return m.length ? m : ["type"];
}
/* 老師可以在後台關掉某位學生的語音報讀（存成 "nott"） */
function ttsLocked() {
  if (proj()) return false;
  const s = String(load("who") || "").trim(); const m = (WHOK && CFG.students[WHOK]) || (s && CFG.students[s]) || CFG.default || [];
  return m.includes("nott");
}
/* 班級：學生用老師給的班級連結（?c=代碼）打開，作答就送到那個󠇡班 */
const CLS = { code: "", name: "", pub: "" };
/* 學生連結（?c=班級代碼 或 ?s）會把這台裝置鎖成學生練習；老師連結（?t）解除 */
const LOCK = (() => { try { const q = new URLSearchParams(location.search); if (q.has("t")) { localStorage.removeItem("l4g-lock"); localStorage.removeItem("l4g-cls"); } else if (q.has("c") || q.has("s")) localStorage.setItem("l4g-lock", "1"); return localStorage.getItem("l4g-lock") === "1"; } catch (e) { return false; } })();
(() => { try { const q = new URLSearchParams(location.search).get("c"); if (q) { localStorage.setItem("l4g-cls", q.toUpperCase().trim()); } CLS.code = localStorage.getItem("l4g-cls") || ""; } catch (e) {} })();
/* ── 今日任務：老師指定開放的小節與題數（只作用在學生平板）── */
let DRY = null;
const isQSlide = sl => !!sl.querySelector(".opt, .ab, .yn, .blank, .gc, .czchip, .prod, .combo, .segq, .cpr, .zkb, .popt, .lopt, .asm, .ipad, .rchip, .ord");
const TASKMODE = () => LOCK && !proj() && Array.isArray(CFG.tasks) && CFG.tasks.length > 0;
const dayOf = s => { const d = new Date(s); return isNaN(d) ? "" : `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function todayTasks() { const ts = CFG.tasks || []; if (!ts.length) return []; const latest = ts.reduce((a, t) => (t.at > a ? t.at : a), ""); return ts.filter(t => dayOf(t.at) === dayOf(latest)); }
function tabOpen(lesson, tab) { return (CFG.tasks || []).some(t => t.lesson === lesson && t.tab === tab); }
function sampleIdx(key, at, total, n, fresh) {
  let m = {}; try { m = JSON.parse(localStorage.getItem("l4g-samp") || "{}"); } catch (e) {}
  const o = m[key];
  if (!fresh && o && o.at === at && o.total === total && o.idx.length === n) return o.idx;
  const prev = o ? o.idx : [];
  let pool = [...Array(total).keys()]; const notPrev = pool.filter(k => !prev.includes(k));
  pool = shuffle(notPrev.length >= n ? notPrev : pool);
  const idx = pool.slice(0, n).sort((a, b) => a - b);
  m[key] = { at, total, idx }; try { localStorage.setItem("l4g-samp", JSON.stringify(m)); } catch (e) {}
  return idx;
}
let RESAMPLE = false;
function applyTasks(sections) {
  const ts = (CFG.tasks || []).filter(t => t.lesson === cur.lesson && t.tab === cur.tab); const today = todayTasks();
  if (!ts.length) return [];
  const out = [];
  sections.forEach((s, i) => {
    if (s.slides.every(x => x.classList.contains("finish"))) { out.push(s); return; }
    const t = ts.find(x => x.name === s.name); if (!t) return;
    const qk = s.slides.map((x, k) => isQSlide(x) ? k : -1).filter(k => k >= 0);
    let keep = s.slides.map((x, k) => k);
    if (!s.seq && t.n && t.n < qk.length) { const pick = sampleIdx(`${cur.lesson}|${cur.tab}|${i}`, t.at, qk.length, t.n, RESAMPLE).map(j => qk[j]); keep = keep.filter(k => !isQSlide(s.slides[k]) || pick.includes(k)); }
    out.push(Object.assign({}, s, { slides: keep.map(k => s.slides[k]), dotChars: s.dotChars ? keep.map(k => s.dotChars[k]) : null, today: today.includes(t), sampled: !!(!s.seq && t.n && t.n < qk.length) }));
  });
  RESAMPLE = false;
  return out;
}
function lockedPage() {
  const c = card("🔒 這個󠇡部分老師還沒開放", "", "先完成老師開放的練習。");
  const list = el("div", { class: "tools" }); const today = todayTasks();
  const seen = new Set();
  [...today, ...(CFG.tasks || [])].forEach(t => { const k = t.lesson + "|" + t.tab; if (seen.has(k)) return; seen.add(k); const tab = TABS.find(x => x[0] === t.tab); const ln = (LIST.find(x => x[0] === t.lesson) || [0, ""])[1]; const isT = today.includes(t);
    list.append(el("a", { href: `#l${t.lesson}-${t.tab}`, class: "btn" + (isT ? " solid" : "") }, `${isT ? "★ 今天：" : ""}${plainText(ln).split(/\s+/)[0]} ${tab ? tab[1] : t.tab}`)); });
  c.append(list); return c;
}
/* 給後台用：不顯示畫面，只取得某一󠇡課某分頁的小節與題數 */
function sectionMetaT(lesson, tab, t) {
  const root = document.documentElement, wasProj = root.classList.contains("proj"), keepL = L, keepCur = Object.assign({}, cur), keepQN = QN;
  try { L = LESSONS[lesson]; if (!L || !VIEWS[tab] || (L.ready && !L.ready.includes(tab))) return []; if (t === "std" && BASE_ONLY.has(tab)) return []; cur.lesson = lesson; cur.tab = tab; root.classList.remove("proj"); FORCE_TIER = t; DRY = {}; VIEWS[tab](); return DRY.out || []; }
  catch (e) { console.warn(e); return []; }
  finally { DRY = null; FORCE_TIER = null; L = keepL; Object.assign(cur, keepCur); root.classList.toggle("proj", wasProj); QN = keepQN; }
}
let FORCE_TIER = null;
/* 兩種層級的小節依名稱合併；i 是合併後的固定編號，today 任務用名稱對應 */
function sectionMeta(lesson, tab) {
  const out = [];
  ["std", "base"].forEach(t => sectionMetaT(lesson, tab, t).forEach(m => { let o = out.find(x => x.name === m.name); if (!o) { o = Object.assign({}, m, { tiers: [] }); out.push(o); } o.tiers.push(t); o.nq = Math.max(o.nq, m.nq); o.seq = o.seq || m.seq; }));
  out.forEach((m, k) => { m.i = k; m.tag = m.tiers.length === 2 ? "" : (m.tiers[0] === "base" ? "基礎層" : "標準層"); });
  return out;
}
/* 小節所屬的大類（例如「造句」底下的六個詞），給今日任務、作答紀錄收攏用；key 是「分頁名稱｜小節名稱」 */
let SECG = null;
function secGroups() {
  if (SECG) return SECG; SECG = {};
  Object.keys(LESSONS).filter(l => LESSONS[l]).forEach(l => TABS.forEach(([tid, tname]) => { let g = ""; sectionMeta(l, tid).forEach(m => { if (m.group) g = m.group; if (g && m.seq) SECG[`${tname}｜${m.name}`] = g; }); }));
  return SECG;
}
/* 依大類分組：只有同一󠇡類有 3 個以上小節才收攏 */
function groupRuns(items, keyOf) {
  const out = []; items.forEach(x => { const g = keyOf(x) || ""; const last = out[out.length - 1]; if (g && last && last.g === g) last.items.push(x); else out.push({ g, items: [x] }); });
  return out.flatMap(r => r.g && r.items.length >= 3 ? [r] : r.items.map(x => ({ g: "", items: [x] })));
}
/* 學生平板（學生連結）打開時，先輸入名字再開始 */
function nameGate(force) {
  if (!LOCK || $("#namegate")) return;
  const who = $("#who"); const cur = String(load("who") || "").trim();
  if (cur && !force && ssGet2("named")) return;
  const g = el("div", { id: "namegate", role: "dialog", "aria-modal": "true", "aria-labelledby": "ngt" }); const box = el("div", { class: "ng" }); g.append(box);
  const start = n => { who.value = n; store("who", n); try { sessionStorage.setItem("named", "1"); } catch (e) {} g.remove();
    updWhoKey().then(() => { const t = todayTasks()[0]; if (TASKMODE() && t && !(t.lesson === cur.lesson && t.tab === cur.tab)) location.hash = `l${t.lesson}-${t.tab}`; else if (!proj()) render(); }); };
  const ask = () => {
    box.innerHTML = "";
    const inp = el("input", { type: "text", placeholder: "例：小明", "aria-label": "你的名字", autocomplete: "off" });
    const go = el("button", { type: "button", class: "btn solid" }, "開始"); const msg = el("div", { class: "hint", role: "status" });
    go.onclick = () => { const n = inp.value.trim(); if (!n) { msg.textContent = "請先寫上你的名字。"; inp.focus(); return; } start(n); };
    inp.onkeydown = e => { if (e.key === "Enter") go.click(); };
    box.append(el("h2", { id: "ngt" }, "你好！"), el("div", {}, "先寫上你的名字，再開始練習。"), inp, el("div", { class: "nbtns" }, ""), msg); box.querySelector(".nbtns").append(go);
    setTimeout(() => inp.focus(), 50);
  };
  if (cur) {
    const yes = el("button", { type: "button", class: "btn solid" }, `我是${cur}`), no = el("button", { type: "button", class: "btn" }, "不󠇡是，換我寫名字");
    yes.onclick = () => start(cur); no.onclick = ask;
    box.append(el("h2", { id: "ngt" }, "你好！"), el("div", { style: "font-size:1.2em;margin:10px 0 16px" }, `你是「${esc(cur)}」嗎？`), el("div", { class: "nbtns" }, "")); box.querySelector(".nbtns").append(yes, no);
  } else ask();
  document.body.append(g);
}
function ssGet2(k) { try { return sessionStorage.getItem(k) || ""; } catch (e) { return ""; } }
/* 後端呼叫一󠇡律用 POST（純文字內容，不󠇡會觸發預檢），回傳 JSON */
async function apiCall(o) {
  let res; try { res = await fetch(API, { method: "POST", body: JSON.stringify(o) }); } catch (e) { const x = new Error("net"); x.kind = "net"; throw x; }
  const t = await res.text();
  try { return JSON.parse(t); } catch (e) { const x = new Error(t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)); x.kind = "html"; throw x; }
}
async function fetchConfig(c) { try { const j = await apiCall({ action: "getconfig", c: c || "" }); return j.ok ? j.config : null; } catch (e) { return null; } }
async function loadConfig() {
  if (!API || API.startsWith("__")) return;
  if (CLS.code) { try { const j = await apiCall({ action: "classinfo", c: CLS.code }); if (j.ok) { CLS.name = j.name; CLS.pub = j.pub || ""; showClass(); } else { CLS.name = ""; CLS.pub = ""; showClass(true); } } catch (e) {} }
  await updWhoKey();
  const c = await fetchConfig(CLS.code); if (c) { applyConfig(c, true); }
  if (LOCK && CLS.code && !POLL) POLL = setInterval(pollConfig, 15000);
}
/* 學生平板每 15 秒看一󠇡次老師的設定：今日任務改了就自動更新（不󠇡用重󠇡新整理），老師按「暫停」就蓋住畫面 */
let POLL = null, CFGSIG = "";
function applyConfig(c, first) {
  const sig = JSON.stringify([c.default, c.students, c.tasks, c.tiers, c.ttsLv]); const changed = sig !== CFGSIG; CFGSIG = sig;
  CFG.default = c.default || CFG.default; CFG.students = c.students || {}; CFG.tasks = c.tasks || []; CFG.tiers = c.tiers || {}; CFG.ttsLv = c.ttsLv || {};
  CFG.pause = !!(c.pause && c.pause.on); pauseVeil();
  if (first || changed) { renderTabs(); if (!proj() && page() === "lesson") { render(); if (!first) toast("老師更新了練習內容"); } }
}
async function pollConfig() { if (document.hidden) return; const c = await fetchConfig(CLS.code); if (c) applyConfig(c, false); }
document.addEventListener("visibilitychange", () => { if (!document.hidden && LOCK && CLS.code) pollConfig(); });
function pauseVeil() {
  let v = $("#pauseveil"); const on = LOCK && !proj() && CFG.pause;
  if (!on) { if (v) v.remove(); return; }
  if (!v) { v = el("div", { id: "pauseveil", role: "alertdialog", "aria-modal": "true" }, `<div class="pv"><div class="pvi">👀</div><div class="pvt">請看老師這裡</div><div class="pvs">老師講完就會打開練習</div></div>`); document.body.append(v); }
}
function toast(t) { const d = el("div", { class: "toast", role: "status" }, t); document.body.append(d); setTimeout(() => d.remove(), 3500); }
function showClass(bad) { const b = $("#clsbadge"); if (!b) return; b.hidden = !CLS.code || !LOCK; b.textContent = bad ? `組別代碼 ${CLS.code} 不存在` : (CLS.name || CLS.code); b.classList.toggle("bad", !!bad); }
function listenOnce(onText, onState) {
  if (!SR) { onState("err", "這台裝置不支援語音輸入"); return null; }
  const r = new SR(); r.lang = "zh-TW"; r.interimResults = true; r.maxAlternatives = 5; r.continuous = false;
  let finalT = "", alts = [];
  const clean = t => (t || "").replace(/[。，、！？.,!?\s]/g, "");
  r.onresult = e => {
    let t = ""; for (const x of e.results) t += x[0].transcript; finalT = t; onState("hear", t);
    const last = e.results[e.results.length - 1];
    if (last && last.isFinal) { const pre = [...e.results].slice(0, -1).map(x => x[0].transcript).join(""); alts = [...last].map(a => pre + a.transcript); }
  };
  r.onerror = e => onState("err", e.error === "not-allowed" ? "沒有開啟麥克風權限" : "沒有聽清楚，再說一󠇡次");
  r.onend = () => { onState("end"); if (finalT) onText(clean(finalT), [...new Set([finalT, ...alts].map(clean).filter(Boolean))]); };
  try { r.start(); onState("start"); } catch (e) { onState("err", "語音輸入無法啟動"); }
  return r;
}
/* produce({ id, label, check(text) → { st: "ok" | "no" | "check", msg }, size }) */
function produce(o) {
  const box = el("div", { class: "prod" });
  const modes = o.modes || allowedModes();
  const tabs = el("div", { class: "pmodes" }); const area = el("div", { class: "parea" });
  const res = el("div", { class: "gcres", "aria-live": "polite" });
  const q = qid(o.label); let solved = false, wrong = 0;
  const submit = (text, how) => {
    text = (text || "").trim(); if (!text || solved) return;
    const r = o.check(text, how);
    if (r.st === "ok") { solved = true; box.classList.remove("pending", "no"); box.classList.add("answered"); res.innerHTML = `<span class="okmsg">√ ${r.msg || "答對了！"}</span>　<span class="hint">（${MODE_NAMES[how]}：${text}）</span>`; logAns(q, true, `${text}（${MODE_NAMES[how]}）`); }
    else if (r.st === "check") { box.classList.remove("no"); box.classList.add("answered", "pending"); res.innerHTML = `<span class="pendmsg">已記下「${text}」，${r.msg || "老師會再確認"}。</span>` + (how === "say" ? '<div class="hint">不󠇡是你要說的詞？可以再說一󠇡次，或按上面的詞改選。</div>' : ""); logText(q, `${text}（${MODE_NAMES[how]}，待老師確認）`); }
    else { if (!box.classList.contains("answered")) box.classList.add("no"); res.innerHTML = `<span class="nomsg">「${text}」${r.msg || "不󠇡太對，再想想看"}。</span>`; logAns(q, false, `${text}（${MODE_NAMES[how]}）`); if (++wrong >= 2 && o.hint && !proj()) res.insertAdjacentHTML("beforeend", `<div class="tipch">提示：${o.hint}</div>`); }
  };
  const show = m => {
    tabs.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
    area.innerHTML = ""; store("pmode", m);
    if (m === "type") {
      const inp = el("input", { type: "text", class: "ptype", placeholder: "在這裡打字", "aria-label": "打字作答" });
      const ok = el("button", { type: "button", class: "btn solid" }, "送出"); ok.onclick = () => submit(inp.value, "type"); inp.onkeydown = e => { if (e.key === "Enter") ok.click(); };
      area.append(el("div", { class: "row2" }, ""), ""); area.firstChild.append(inp, ok);
    } else if (m === "write") {
      const ans = el("span", { class: "pans", "aria-live": "polite" }); let cur = "";
      const paint = () => ans.textContent = cur || "　";
      const pad = handwritePad(ch => { cur += ch; paint(); pad.reset(); }, { noType: !!o.modes && !o.modes.includes("type") });
      const back = el("button", { type: "button", class: "btn" }, "退一󠇡字"); back.onclick = () => { cur = [...cur].slice(0, -1).join(""); paint(); };
      const ok = el("button", { type: "button", class: "btn solid" }, "送出"); ok.onclick = () => submit(cur, "write");
      const row = el("div", { class: "row2" }); row.append(el("span", { class: "hint" }, "一󠇡次寫一󠇡個󠇡字，按候選字放進來："), ans, back, ok);
      paint(); area.append(row, pad);
    } else {
      const mic = el("button", { type: "button", class: "btn mic" }, "🎤 按一󠇡下開始說"); const heard = el("div", { class: "heard" });
      const cand = el("div", { class: "cand" }); const pickBox = el("div", { class: "cand" });
      const showPick = () => {
        pickBox.innerHTML = ""; if (!o.choices) return;
        pickBox.append(el("span", { class: "hint" }, "選出你要說的答案："));
        o.choices().forEach(t => { const b = el("button", { type: "button", class: "chip" }, t); b.onclick = () => { if (solved) return; pickBox.querySelectorAll(".chip").forEach(x => x.classList.remove("ok", "no")); const before = solved; submit(t, "pick"); b.classList.add(solved && !before ? "ok" : "no"); }; pickBox.append(b); });
      };
      mic.onclick = () => listenOnce((t, alts) => {
        if (solved) return;
        alts = alts && alts.length ? alts : [t];
        const hit = alts.find(a => o.check(a, "say").st === "ok");
        cand.innerHTML = "";
        if (hit) { submit(hit, "say"); return; }
        submit(alts[0], "say");
        if (solved) return;
        if (alts.length > 1) { cand.append(el("span", { class: "hint" }, "電腦聽到的可能是：")); alts.slice(0, 4).forEach(a => { const b = el("button", { type: "button", class: "chip" }, a); b.onclick = () => submit(a, "say"); cand.append(b); }); }
        if (o.choices && !pickBox.childNodes.length) { const pb = el("button", { type: "button", class: "chip alt" }, "說不清楚？改用選的"); pb.onclick = () => { pb.remove(); showPick(); }; cand.append(pb); }
      }, (st, t) => {
        if (st === "start") { mic.classList.add("on"); mic.textContent = "聽你說……"; }
        if (st === "hear") heard.textContent = "聽到：" + t;
        if (st === "end") { mic.classList.remove("on"); mic.textContent = "🎤 再說一󠇡次"; }
        if (st === "err") { mic.classList.remove("on"); mic.textContent = "🎤 再說一󠇡次"; heard.textContent = t; }
      });
      area.append(mic, heard, cand, pickBox);
    }
  };
  if (modes.length > 1) { modes.forEach(m => { const b = el("button", { type: "button", "data-m": m }, MODE_NAMES[m]); b.onclick = () => show(m); tabs.append(b); }); box.append(el("span", { class: "hint" }, "作答方式："), tabs); }
  box.append(area, res);
  const pref = load("pmode"); show(modes.includes(pref) ? pref : modes[0]);
  box.reveal = () => { if (o.answer) res.innerHTML = `<span class="okmsg">參考答案：${o.answer}</span>`; };
  return box;
}


/* 看意思󠇢說出／寫出詞語（學生練習用） */
function recallSlide(o) {
  const n = [...o.word].length;
  const boxes = el("div", { class: "wboxes", "aria-label": `${n} 個字` }, "□".repeat(n));
  const p = produce({ label: o.label, answer: o.word, hint: `第一個󠇡字是「${[...o.word][0]}」`,
    check: (t, how) => t === o.word || (t.includes(o.word) && t.length <= n + 2) ? { st: "ok" } : (how === "say" ? { st: "check", msg: "老師會再確認你說的詞" } : { st: "no", msg: "不󠇡是這個󠇡詞，再想想看" }),
    choices: o.pool ? () => shuffle([o.word, ...shuffle(o.pool.filter(w => w !== o.word)).slice(0, 2)]) : null });
  const d = el("div", { class: "flash" }); d.append(el("span", { class: "tag" }, o.tag), el("div", { class: "def" }, o.def), boxes);
  const s = slide("", d, el("div", { class: "hint", style: "text-align:center" }, "看意思󠇢，說出、寫出或打出這個󠇡詞語。"), p);
  s.reveal = p.reveal; return s;
}
/* 朗讀挑戰：學生唸一󠇡段課文，比對唸對的字數 */
function readChallenge(para, label) {
  const btn = el("button", { type: "button", class: "btn mic only-stu" }, "🎤 我來唸這段");
  const out = el("div", { class: "gcres" });
  if (!SR) { btn.disabled = true; btn.title = "這台裝置不支援語音輸入"; }
  let rec = null, text = "";
  btn.onclick = () => {
    if (rec) { rec.stop(); return; }
    const target = plainText(para.innerHTML).replace(/[^一-鿿]/g, "");
    rec = new SR(); rec.lang = "zh-TW"; rec.continuous = true; rec.interimResults = true; text = "";
    rec.onresult = e => { let t = ""; for (const x of e.results) t += x[0].transcript; text = t; out.innerHTML = `<span class="hint">聽到：${t}</span>`; };
    rec.onend = () => {
      rec = null; btn.classList.remove("on"); btn.textContent = "🎤 再唸一󠇡次";
      const said = text.replace(/[^一-鿿]/g, ""); if (!said) { out.innerHTML = '<span class="nomsg">沒有聽到聲音，再試一󠇡次。</span>'; return; }
      const A = [...target], B = [...said]; const dp = Array(B.length + 1).fill(0);
      for (let i = 1; i <= A.length; i++) { let prev = 0; for (let j = 1; j <= B.length; j++) { const tmp = dp[j]; dp[j] = A[i - 1] === B[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]); prev = tmp; } }
      const pct = Math.round(dp[B.length] / A.length * 100);
      out.innerHTML = pct >= 85 ? `<span class="okmsg">√ 唸得󠇡很流暢！大約唸對 ${pct}%。</span>` : `<span class="pendmsg">大約唸對 ${pct}%，可以再唸一󠇡次。語音辨識有時會聽錯，老師會再聽你唸。</span>`;
      logText(qid(label), `朗讀約 ${pct}%`);
    };
    try { rec.start(); btn.classList.add("on"); btn.textContent = "■ 唸完了，按這裡"; out.innerHTML = '<span class="hint">開始唸吧……</span>'; } catch (e) { rec = null; }
  };
  const d = el("div", { class: "rchal" }); d.append(btn, out); return d;
}

/* 依畫面大小自動調整卡片字級：同一󠇡個󠇡小節用同一󠇡個󠇡字級（取最擠的那一󠇢張能放下的大小），塞不󠇡下才縮小 */
let FIT_BUSY = false; const FIT_HI = 2.4;
function fitInfo(sl) {
  const inner = sl && sl.querySelector(":scope > .inner"); if (!inner || !sl.isConnected) return null;
  const cs = getComputedStyle(sl); const avail = sl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  return avail < 120 ? null : { inner, avail };
}
/* 字級下限：投影約 21px、學生約 19px；再小就寧可讓卡片捲動 */
function fitLo(sl) { if (sl.querySelector(".zkb, canvas")) return .74; /* 有注音鍵盤、寫字格的作答卡維持可整頁看到 */ const b = parseFloat(getComputedStyle(sl).fontSize) || 16; return Math.max(.74, (proj() ? 21 : 19) / b); }
function fitValue(sl, lo, hi = proj() ? 3.6 : FIT_HI) {
  const f = fitInfo(sl); if (!f || sl.dataset.nofit) return null; const old = f.inner.style.fontSize; if (lo == null) lo = fitLo(sl);
  const fits = k => { f.inner.style.fontSize = k + "em"; return f.inner.offsetHeight <= f.avail * .97; };
  let v;
  if (!fits(lo)) v = lo;   /* 放到字級下限還是放不󠇡下：用下限字級，讓卡片捲動 */
  else if (fits(hi)) v = hi;
  else { for (let k = 0; k < 7; k++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } v = Math.floor(lo * 100) / 100; }
  f.inner.style.fontSize = old; return v;
}
/* 同一󠇢小節中「同一󠇢種版面」的卡片用同一󠇡個󠇡字級（題目卡、教學卡各自一󠇢組） */
function fitGroup(sl) { if (sl.dataset.fg) return sl.dataset.fg; const inner = sl.querySelector(":scope > .inner"); return inner ? [...inner.children].map(c => (c.className || c.tagName).split(" ")[0]).join("|") : ""; }
function setFit(sl, v) { const f = sl && sl.querySelector(":scope > .inner"); if (f) f.style.fontSize = v ? v + "em" : ""; }
function shrinkIfNeeded(sl) {
  const f = fitInfo(sl); if (!f || f.inner.offsetHeight <= f.avail * .97) return;
  FIT_BUSY = true; const cur = parseFloat(f.inner.style.fontSize) || 1; const lo = fitLo(sl); const v = cur > lo ? fitValue(sl, lo, cur) : null; if (v) setFit(sl, v); else if (cur > Math.max(1, lo)) setFit(sl, null); setTimeout(() => { FIT_BUSY = false; }, 0);
}
/* ── 卡片組：一󠇡次一󠇢張，用按鈕、左右鍵或滑動切換 ── */
const DPOS = {}; let CUR = null;
function slide(cls, ...nodes) {
  const s = el("div", { class: "slide " + (cls || "") }); const inner = el("div", { class: "inner" });
  nodes.flat().forEach(n => { if (n == null) return; if (typeof n === "string") inner.insertAdjacentHTML("beforeend", n); else inner.append(n); });
  s.append(inner); return s;
}
function kick(t) { return el("span", { class: "kicker" }, t); }
/* 橫式畫面左右兩欄、直式畫面上下排列 */
function splitBox(left, right) { const d = el("div", { class: "split" }); const a = el("div", { class: "sL" }), b = el("div", { class: "sR" }); left.filter(Boolean).forEach(x => a.append(x)); right.filter(Boolean).forEach(x => b.append(x)); d.append(a, b); return d; }
function sayRow(node, label) { const d = el("div", { class: "sayrow" }); d.append(sayBtn(() => speechOf(node), label || "唸題目")); return d; }
function deck(sections, o = {}) {
  if (DRY) { DRY.out = sections.map((s, i) => ({ i, name: s.name, group: s.group || "", seq: !!s.seq, nq: s.slides.filter(isQSlide).length, fin: s.slides.every(x => x.classList.contains("finish")) })).filter(x => !x.fin); return el("div"); }
  if (TASKMODE()) sections = applyTasks(sections);
  if (proj()) sections = sections.filter(s => !s.slides.every(x => x.classList.contains("finish")));
  const key = recKey(); const pos = DPOS[key] || (DPOS[key] = { s: 0, i: 0 });
  if (pos.s >= sections.length) pos.s = 0;
  const root = el("div", { class: "deck" });
  const top = el("div", { class: "dtop" }), secs = el("div", { class: "dsec", role: "tablist", "aria-label": "小節" }), hint = el("div", { class: "dhint" }), extra = el("div", { class: "dextra" });
  top.append(secs, hint, extra);
  const stage = el("div", { class: "dstage" }); const host = el("div", { class: "dhost" }); stage.append(host);
  const pen = penLayer(stage);
  const prog = el("div", { class: "prog only-stu" }, '<div class="pbar"><i></i></div><span></span>');
  const bot = el("div", { class: "dbot" });
  const prev = el("button", { type: "button", class: "nav", "aria-label": "上一󠇡個󠇡" }, "‹ 上一󠇡個󠇡"), next = el("button", { type: "button", class: "nav", "aria-label": "下一󠇡個󠇡" }, "下一󠇡個󠇡 ›");
  const dots = el("div", { class: "dots" }), dtools = el("div", { class: "dtools" });
  dots.addEventListener("wheel", e => { if (dots.scrollWidth > dots.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { dots.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  const ptools = el("div", { class: "ptools only-proj" });
  /* 學生畫面：「上一󠇡個󠇡」放在「交給老師」左邊 */
  if (proj()) bot.append(prev, ptools, dots, dtools, next); else { prev.classList.add("prevr"); bot.append(ptools, dots, prev, dtools, next); }
  root.append(top, prog, stage, bot);
  root.sections = sections;
  const seen = new Set();
  sections.forEach((s, si) => { if (s.group && (si === 0 || sections[si - 1].group !== s.group)) secs.append(el("span", { class: "dgrp" }, s.group)); const b = el("button", { type: "button", role: "tab", class: s.today ? "today" : "" }, (s.today ? "★ " : "") + s.name); if (s.tip) b.title = s.tip; b.onclick = () => go(si, 0); secs.append(b); s.btn = b; });
  if (sections.length < 2) secs.hidden = true;
  const status = sl => sl.querySelector(".no") ? "no" : sl.querySelector(".pending") ? "pend" : (sl.querySelector(".ok, .answered") ? "ok" : "");
  const isQ = sl => !!sl.querySelector(".opt, .ab, .yn, .blank, .gc, .czchip, .prod, .combo, .segq, .cpr, .zkb, .popt, .lopt, .asm, .ipad, .rchip, .ord");
  function paintSum(sl) {
    const box = sl.querySelector(".fsum"); if (!box) return; box.innerHTML = "";
    sections.forEach((x, si) => {
      const qs = x.slides.map((v, k) => [v, k]).filter(([v]) => isQ(v)); if (!qs.length) return;
      const row = el("div", { class: "frow" }); row.append(el("span", { class: "fname" }, x.name));
      const ds = el("div", { class: "fdots" });
      qs.forEach(([v, k], n) => { const st = status(v); const d = el("button", { type: "button", class: "dot" + (x.dotChars ? " char" : "") + (st ? " " + st : ""), "aria-label": `${x.name}第${n + 1}題` }, x.dotChars ? x.dotChars[k] : String(n + 1)); d.onclick = () => go(si, k); ds.append(d); });
      row.append(ds); box.append(row);
    });
  }
  function paintDots() {
    const all = sections.flatMap(x => x.slides).filter(isQ); const done = all.filter(x => status(x) === "ok").length;
    prog.hidden = !all.length; prog.querySelector("i").style.width = (all.length ? done / all.length * 100 : 0) + "%"; prog.querySelector("span").textContent = `已完成 ${done} / ${all.length} 題`;
    const s = sections[pos.s];
    const cd = dots.children[pos.i]; if (cd && dots.scrollWidth > dots.clientWidth) dots.scrollLeft = cd.offsetLeft - dots.clientWidth / 2;
    [...dots.children].forEach((d, i) => { const sl = s.slides[i]; const st = status(sl); d.className = "dot" + (s.dotChars ? " char" : "") + (st ? " " + st : (seen.has(sl) ? " seen" : "")); d.setAttribute("aria-current", String(i === pos.i)); });
  }
  function go(si, i) {
    { const ep = document.querySelector(".expop"); if (ep) ep.remove(); }
    stopSpeak(); document.querySelectorAll(".menu").forEach(m => m.remove()); $("#pop").classList.remove("show");
    pos.s = si; pos.i = i; const s = sections[si]; const sl = s.slides[i];
    sections.forEach((x, k) => x.btn.setAttribute("aria-selected", String(k === si))); try { const bb = s.btn; if (secs.scrollWidth > secs.clientWidth) secs.scrollLeft = bb.offsetLeft - secs.clientWidth / 2 + bb.offsetWidth / 2; } catch (e) {}
    hint.innerHTML = ""; if (s.hint) { hint.append(sayBtn(() => plainText(s.hint), "唸說明")); hint.insertAdjacentHTML("beforeend", " " + s.hint); }
    extra.innerHTML = ""; if (s.extra) [].concat(s.extra).forEach(x => extra.append(x));
    dots.innerHTML = "";
    if (s.slides.length > 1) s.slides.forEach((x, k) => { const d = el("button", { type: "button", class: "dot", "aria-label": `第${k + 1}個` }, s.dotChars ? s.dotChars[k] : String(k + 1)); d.onclick = () => go(si, k); dots.append(d); });
    const wbase = innerWidth + "x" + innerHeight + document.documentElement.className;
    bot.classList.toggle("wide", s._wideAt === wbase && !!s._wide);
    const fkey = wbase + (bot.classList.contains("wide") ? "|w" : "");
    if (!host.isConnected) requestAnimationFrame(() => { if (host.isConnected && pos.s === si && pos.i === i) go(si, i); });
    else if (s._fitKey !== fkey) {
      FIT_BUSY = true; const g = {};
      s.slides.forEach(x => { host.innerHTML = ""; host.append(x); const v = fitValue(x); const k = fitGroup(x); if (v) g[k] = Math.min(g[k] || 9, v); });
      s._fit = g; s._fitKey = fkey; host.innerHTML = ""; setTimeout(() => { FIT_BUSY = false; }, 0);
    }
    host.innerHTML = ""; sl.classList.remove("in"); void sl.offsetWidth; sl.classList.add("in"); host.append(sl); sl.scrollTop = 0; seen.add(sl);
    setFit(sl, fitValue(sl) === null || !s._fit ? null : (s._fit[fitGroup(sl)] || null));
    pen.clear(); applyVeil(sl); ptools.innerHTML = ""; teacherTools(ptools, sl, root);
    dtools.innerHTML = "";
    if (sl.reveal) { const b = el("button", { type: "button", class: "btn warm only-proj" }, "公布答案"); b.onclick = () => { sl.reveal(); sl.classList.add("revealed"); paintDots(); }; dtools.append(b); }
    if (o.submit && !sl.classList.contains("finish")) { const b = el("button", { type: "button", class: "btn only-stu" }, "交給老師"); b.onclick = openResult; dtools.append(b); }
    const first = si === 0 && i === 0, last = si === sections.length - 1 && i === s.slides.length - 1;
    prev.disabled = first; next.disabled = last;
    next.textContent = (i === s.slides.length - 1 && !last) ? `${sections[si + 1].name} ›` : "下一󠇡個󠇡 ›";
    if (sl.onshow) sl.onshow();
    if (sl.classList.contains("finish")) { paintSum(sl); const rb = sl.querySelector(".resample"); if (rb) rb.hidden = !sections.some(x => x.sampled); }
    paintDots();
    /* 圓點太多、被兩旁按鈕擠到看不完整時，圓點改成獨立一󠇡列 */
    if (s._wideAt !== wbase && host.isConnected) {
      s._wideAt = wbase; const kd = dots.children, need = kd.length ? kd[kd.length - 1].offsetLeft + kd[kd.length - 1].offsetWidth - kd[0].offsetLeft : 0;
      s._wide = kd.length > 0 && need > dots.clientWidth - (sl.reveal ? 24 : 170);
      if (s._wide) return go(si, i);
    }
    shrinkIfNeeded(sl);
    if (fitObs) fitObs.disconnect();
    if (window.MutationObserver) { let tm = 0; fitObs = new MutationObserver(() => { if (FIT_BUSY) return; clearTimeout(tm); tm = setTimeout(() => shrinkIfNeeded(sl), 180); }); fitObs.observe(sl, { childList: true, subtree: true, characterData: true }); }
  }
  let fitObs = null, rzT = 0;
  const refit = () => { if (host.isConnected && sections[pos.s]) go(pos.s, pos.i); };
  let rzW = innerWidth; window.addEventListener("resize", () => { clearTimeout(rzT); /* 平板浮動鍵盤跳出或收起只改變高度：卡片有作答框時不󠇡重畫，避免鍵盤縮回、打好的字被清掉 */ const wChg = Math.abs(innerWidth - rzW) > 40; rzW = innerWidth; const ae = document.activeElement; const typing = ae && (ae.matches("input, textarea, [contenteditable]") && !ae.matches("[type=button],[type=radio],[type=checkbox]")); if (!wChg && (typing || host.querySelector("input:not([type=button]):not([type=radio]):not([type=checkbox]), textarea, [contenteditable=true]"))) return; rzT = setTimeout(refit, 250); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { sections.forEach(x => x._fitKey = null); });
  prev.onclick = () => { if (pos.i > 0) go(pos.s, pos.i - 1); else if (pos.s > 0) go(pos.s - 1, sections[pos.s - 1].slides.length - 1); };
  next.onclick = () => { const s = sections[pos.s]; if (pos.i < s.slides.length - 1) go(pos.s, pos.i + 1); else if (pos.s < sections.length - 1) go(pos.s + 1, 0); };
  stage.addEventListener("click", () => setTimeout(paintDots, 0)); stage.addEventListener("change", () => setTimeout(paintDots, 0));
  let sx = null, sy = 0;
  stage.addEventListener("pointerdown", e => { if (e.pointerType === "mouse" || pen.on || e.target.closest("button, input, textarea, canvas")) { sx = null; return; } sx = e.clientX; sy = e.clientY; });
  stage.addEventListener("pointerup", e => { if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev).click(); });
  root.keyNav = e => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || $("#result").classList.contains("show")) return; if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next.click(); } else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev.click(); } else if ((e.key === " " || e.key === "ArrowDown") && proj() && VEIL.on) { if (revealNext(host.firstChild)) e.preventDefault(); } };
  root.current = () => host.firstChild;
  root.todo = () => { const all = []; sections.forEach((x, si) => { let n = 0; x.slides.forEach((v, k) => { if (!isQ(v)) return; n++; all.push({ si, k, name: x.name, n, st: status(v) }); }); }); return all; };
  root.go = go;
  go(pos.s, Math.min(pos.i, sections[pos.s].slides.length - 1));
  return root;
}
function finishSlide(text) {
  const s = slide("finish");
  const d = el("div", { class: "done" });
  d.append(el("div", { class: "big" }, "這一󠇡部分做完了！"), el("div", { class: "hint" }, text || "下面是每一󠇢題的結果。按圓點可以回去改。"),
    el("div", { class: "flegend" }, '<span><i class="dot ok"></i>答對</span><span><i class="dot no"></i>再想想</span><span><i class="dot pend"></i>老師會確認</span><span><i class="dot"></i>還沒做</span>'), el("div", { class: "fsum" }));
  const b = el("button", { type: "button", class: "btn solid only-stu", style: "font-size:20px;padding:12px 28px" }, "交給老師"); b.onclick = openResult; d.append(b);
  const again = el("button", { type: "button", class: "btn only-stu resample", hidden: "" }, "再來一󠇢組新題目（記得󠇡先交給老師）"); again.onclick = () => { RESAMPLE = true; const p = DPOS[recKey()]; if (p) { p.s = 0; p.i = 0; } render(); }; d.append(again);
  s.firstChild.append(d); return s;
}
/* 例句按鈕＋浮動視窗 */
function exPop(label, html, w) {
  const b = el("button", { type: "button", class: "btn exbtn" }, label);
  b.onclick = e => {
    e.stopPropagation(); const old = document.querySelector(".expop"); if (old) { const same = old.dataset.k === label + w; old.remove(); if (same) return; }
    const p = el("div", { class: "expop", role: "dialog", "aria-label": label }); p.dataset.k = label + w;
    const x = el("button", { type: "button", class: "btn expx", "aria-label": "關閉" }, "✕"); x.onclick = () => p.remove();
    p.append(el("div", { class: "exh" }, `<span class="exlab">${label}</span>`), el("div", { class: "exbody" }, html), sayBtn(() => plainText(html), "唸例句"), x);
    document.body.append(p);
    const r = b.getBoundingClientRect(), W = Math.min(innerWidth * .62, 900); p.style.width = W + "px";
    const left = Math.max(12, Math.min(innerWidth - W - 12, r.left + r.width / 2 - W / 2)); p.style.left = left + "px";
    const ph = p.offsetHeight; let top = r.bottom + 12; if (top + ph > innerHeight - 12) top = Math.max(12, r.top - ph - 12); p.style.top = top + "px";
  };
  return b;
}
document.addEventListener("click", e => { const p = document.querySelector(".expop"); if (p && !p.contains(e.target)) p.remove(); });
addEventListener("hashchange", () => { document.querySelectorAll(".expop, .fpop").forEach(p => p.remove()); });
const toggleBtn = (label, on, off, fn) => { const b = el("button", { type: "button", class: "btn" }, label); let st = false; b.onclick = () => { st = !st; b.textContent = st ? off : on; fn(st); }; b.textContent = on; return b; };

/* ── 依解釋填詞（考卷題型）：每頁最多 6 題，詞庫多放 2 個干擾詞，用按的作答 ── */
function defBankSlides(items, o) {
  const per = o.per || 6, extra = o.extra === undefined ? 2 : o.extra; const out = [];
  for (let g = 0; g < items.length; g += per) {
    const grp = items.slice(g, g + per); const others = items.filter(x => !grp.includes(x));
    const bank = shuffle([...grp, ...shuffle(others).slice(0, extra)]);
    const list = el("ol", { class: "dblist" }); const rows = []; let sel = null;
    const pick = r => { rows.forEach(x => x.b.classList.remove("sel")); sel = r; if (r) r.b.classList.add("sel"); };
    grp.forEach((it, k) => {
      const li = el("li"); const q = qid(`${o.label}：${it.t}`);
      const b = el("button", { type: "button", class: "blank dbb", "aria-label": "空󠇡格，按一󠇡下再選詞" }, "　".repeat(Math.max(2, [...it.t].length)));
      b.dataset.ans = it.t; const r = { b, it, q, done: false }; b.onclick = () => pick(r); rows.push(r);
      li.append(b, el("span", { class: "dbdef" }, it.def)); list.append(li);
    });
    const chips = el("div", { class: "bank dbank", "aria-label": "詞庫" });
    bank.forEach(w => { const c = el("button", { type: "button", class: "chip" }, w.h); c.onclick = () => {
      const r = sel || rows.find(x => !x.done); if (!r) return; const ok = w.t === r.it.t;
      r.b.innerHTML = w.h; r.b.classList.remove("sel", "ok", "no"); r.b.classList.add(ok ? "ok" : "no");
      if (!proj() && !r.done) logAns(r.q, ok, w.t);
      if (ok) { r.done = true; c.classList.add("used"); } pick(rows.find(x => !x.done) || null); }; chips.append(c); });
    const s = slide("", el("div", { class: "hint" }, `先按空󠇡格，再從${o.noun || "詞"}庫選出符合解釋的${o.noun || "詞語"}。${o.noun || "詞"}庫裡有用不󠇡到的${o.noun || "詞"}。`), chips, list); s.classList.add("dbslide");
    s.onshow = () => { if (!sel) pick(rows.find(x => !x.done) || null); };
    s.reveal = () => rows.forEach(r => { r.b.innerHTML = r.it.h; r.b.classList.add("ok"); r.done = true; });
    out.push(s);
  }
  return out;
}

/* ── 生字學生練習：寫國字、拼注音、選部首（同一󠇡頁完成）── */
function inkOverlap(ch, sg, size) {
  const N = 32, cell = size / N;
  const t = document.createElement("canvas"); t.width = t.height = size; const tg = t.getContext("2d");
  tg.fillStyle = "#000"; tg.font = `${size * .82}px "L${cur.lesson}", "IansuiUI", serif`; tg.textAlign = "center"; tg.textBaseline = "middle"; tg.fillText(ch, size / 2, size / 2 + size * .03);
  const grid = (cx) => { const d = cx.getImageData(0, 0, size, size).data; const out = new Uint8Array(N * N); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (d[(y * size + x) * 4 + 3] > 60) out[Math.min(N - 1, Math.floor(y / cell)) * N + Math.min(N - 1, Math.floor(x / cell))] = 1; return out; };
  const T = grid(tg), S = grid(sg); const near = (G, i) => { const y = Math.floor(i / N), x = i % N; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < N && xx >= 0 && xx < N && G[yy * N + xx]) return true; } return false; };
  let tn = 0, tc = 0, sn = 0, sc = 0; for (let i = 0; i < N * N; i++) { if (T[i]) { tn++; if (near(S, i)) tc++; } if (S[i]) { sn++; if (near(T, i)) sc++; } }
  return { cover: tn ? tc / tn : 0, prec: sn ? sc / sn : 0 };
}
function writeTask(c, onDone, o = {}) {
  const q = qid(`寫國字：${c.c}`); const box = el("div", { class: "ptask" });
  const size = o.size || Math.max(160, Math.min(240, Math.floor(innerHeight * .27)));
  const cv = el("canvas", { width: String(size * 2), height: String(size * 2), "aria-label": "寫字格，用手指或觸控筆寫" }); cv.style.width = cv.style.height = size + "px"; cv.style.touchAction = "none";
  const g = cv.getContext("2d"); g.scale(2, 2); const sk = document.createElement("canvas"); sk.width = sk.height = size; const sg = sk.getContext("2d");
  let guide = false, ink = [], stroke = null, t0 = 0, done = false;
  const base = () => { g.clearRect(0, 0, size, size); g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.strokeStyle = "#e3b9b2"; g.lineWidth = 1; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(size / 2, 0); g.lineTo(size / 2, size); g.moveTo(0, size / 2); g.lineTo(size, size / 2); g.moveTo(0, 0); g.lineTo(size, size); g.moveTo(size, 0); g.lineTo(0, size); g.stroke(); g.setLineDash([]); g.strokeStyle = "#c97a6d"; g.lineWidth = 2; g.strokeRect(1, 1, size - 2, size - 2);
    if (guide) { g.fillStyle = "#d6dcda"; g.font = `${size * .82}px "L${cur.lesson}", "IansuiUI", serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(c.c, size / 2, size / 2 + size * .03); } };
  const res = el("div", { class: "pres", "aria-live": "polite" });
  const clearAll = () => { ink = []; t0 = 0; sg.clearRect(0, 0, size, size); base(); };
  base();
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
  const lw = Math.max(6, size / 30);
  cv.onpointerdown = e => { e.stopPropagation(); if (!t0) t0 = Date.now(); const [x, y] = pt(e); stroke = [[x], [y], [Date.now() - t0]]; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!stroke) return; const [x, y] = pt(e); const n = stroke[0].length - 1; [g, sg].forEach(k => { k.strokeStyle = "#1f6560"; k.lineWidth = lw; k.lineCap = k.lineJoin = "round"; k.beginPath(); k.moveTo(stroke[0][n], stroke[1][n]); k.lineTo(x, y); k.stroke(); }); stroke[0].push(x); stroke[1].push(y); stroke[2].push(Date.now() - t0); };
  cv.onpointerup = cv.onpointercancel = e => { e.stopPropagation(); if (stroke && stroke[0].length > 1) ink.push(stroke); stroke = null; };
  let wrong = 0;
  const check = async () => {
    if (done) return; if (!ink.length) { res.innerHTML = '<span class="nomsg">先在格子󠇡裡寫字。</span>'; return; }
    res.innerHTML = '<span class="hint">檢查中……</span>';
    let ok = null, how = "";
    try { const list = await hwRecognize(ink, size, size); ok = list.slice(0, 5).includes(c.c); how = ok ? "" : (list[0] ? `看起來像「${list[0]}」` : ""); }
    catch (e) { const o = inkOverlap(c.c, sg, size); ok = o.cover >= .55 && o.prec >= .7; how = ok ? "" : (o.cover < .55 ? "有些筆畫好像沒寫到" : "有些筆畫寫到格子󠇡外面了"); }
    if (guide) { res.innerHTML = ok ? '<span class="okmsg">描對了！</span>關掉範字，自己再寫一󠇡次。' : `<span class="nomsg">還不󠇡太對${how ? "：" + how : ""}。</span>擦掉再描一󠇡次。`; return; }
    logAns(q, ok, ok ? c.c : how || "寫錯");
    if (ok) { done = true; box.classList.add("pdone"); res.innerHTML = '<span class="okmsg">√ 寫對了！</span>'; onDone(); }
    else { wrong++; res.innerHTML = `<span class="nomsg">還不󠇡太對${how ? "：" + how : ""}。</span>擦掉再寫一󠇡次。` + (wrong >= 2 ? '<div class="tipch">可以按「看範字」描一󠇡次，再自己寫。</div>' : ""); clearAll(); }
  };
  const chk = el("button", { type: "button", class: "btn solid" }, "檢查"); chk.onclick = check;
  const clr = el("button", { type: "button", class: "btn" }, "擦掉"); clr.onclick = () => { clearAll(); res.innerHTML = ""; };
  const gd = el("button", { type: "button", class: "btn" }, "看範字"); gd.onclick = () => { guide = !guide; gd.textContent = guide ? "關掉範字" : "看範字"; clearAll(); res.innerHTML = guide ? '<span class="hint">描完後要關掉範字，自己寫一󠇡次才算完成。</span>' : ""; };
  box.append(el("div", { class: "phead" }, "① 寫國字"), cv, tools(chk, clr, gd), res); return box;
}
const ZY_KEYS = [["ㄅ", "ㄆ", "ㄇ", "ㄈ", "ㄉ", "ㄊ", "ㄋ", "ㄌ"], ["ㄍ", "ㄎ", "ㄏ", "ㄐ", "ㄑ", "ㄒ", "ㄓ", "ㄔ"], ["ㄕ", "ㄖ", "ㄗ", "ㄘ", "ㄙ", "ㄧ", "ㄨ", "ㄩ"], ["ㄚ", "ㄛ", "ㄜ", "ㄝ", "ㄞ", "ㄟ", "ㄠ", "ㄡ"], ["ㄢ", "ㄣ", "ㄤ", "ㄥ", "ㄦ"]];
const ZY_TONES = [["ˉ", "一聲"], ["ˊ", "二聲"], ["ˇ", "三聲"], ["ˋ", "四聲"], ["˙", "輕聲"]];
function zhuyinTask(c, onDone, o = {}) {
  const q = qid(o.q || `拼注音：${c.c}`); const box = el("div", { class: "ptask" });
  let syms = [], tone = "", done = false, wrong = 0;
  const ans = el("div", { class: "zans", "aria-live": "polite" }); const res = el("div", { class: "pres", "aria-live": "polite" });
  const paint = () => { ans.innerHTML = ""; if (tone === "˙") ans.append(el("span", { class: "zt" }, "˙")); syms.forEach(x => ans.append(el("span", {}, x))); if (tone && tone !== "˙") ans.append(el("span", { class: "zt" }, tone === "ˉ" ? "ˉ" : tone)); if (!syms.length && !tone) ans.innerHTML = '<span class="hint">按下面的符號</span>'; };
  const kb = el("div", { class: "zkb" });
  ZY_KEYS.forEach(row => { const r = el("div", { class: "zrow" }); row.forEach(k => { const b = el("button", { type: "button", class: "zk" }, k); b.onclick = () => { if (done || syms.length >= 3) return; syms.push(k); paint(); res.innerHTML = ""; }; r.append(b); }); kb.append(r); });
  const tr = el("div", { class: "zrow ztones" }); ZY_TONES.forEach(([t, n]) => { const b = el("button", { type: "button", class: "zk zkt", title: n, "aria-label": n }, `${t}<small>${n}</small>`); b.onclick = () => { if (done) return; tone = t; paint(); res.innerHTML = ""; }; tr.append(b); }); kb.append(tr);
  const back = el("button", { type: "button", class: "btn" }, "退一󠇢格"); back.onclick = () => { if (done) return; if (tone) tone = ""; else syms.pop(); paint(); };
  const target = c.cz;
  const norm = (sy, t) => (t === "˙" ? "˙" : "") + sy.join("") + (t && t !== "ˉ" && t !== "˙" ? t : "");
  const bare = z => z.replace(/[ˊˇˋ˙]/g, "");
  const ok = el("button", { type: "button", class: "btn solid" }, "檢查"); ok.onclick = () => {
    if (done) return; if (!syms.length) { res.innerHTML = '<span class="nomsg">先拼出注音。</span>'; return; }
    if (!tone) { res.innerHTML = '<span class="nomsg">還沒選聲調󠇡（一聲也要按 ˉ）。</span>'; return; }
    const v = norm(syms, tone), right = v === target;
    logAns(q, right, (tone === "˙" ? "˙" : "") + syms.join("") + (tone !== "˙" ? tone : ""));
    if (right) { done = true; box.classList.add("pdone"); res.innerHTML = '<span class="okmsg">√ 拼對了！</span>'; onDone(); return; }
    wrong++; const sameSym = bare(v) === bare(target);
    res.innerHTML = `<span class="nomsg">${sameSym ? "符號對了，聲調󠇡再聽聽看。" : "拼音不󠇡太對，再聽一󠇡次。"}</span>` + (wrong >= 2 && !sameSym ? `<div class="tipch">提示：有 ${[...bare(target)].length} 個符號。</div>` : "");
  };
  paint(); const top = el("div", { class: "zansrow" }); top.append(ans, back, ok); if (o.head !== "") box.append(el("div", { class: "phead" }, o.head || "② 拼注音")); box.append(top, kb, res); box.reveal = () => { done = true; box.classList.add("pdone"); ans.innerHTML = target.startsWith("˙") ? `<span class="zt">˙</span>${target.slice(1)}` : target; }; return box;
}
function radicalTask(c, onDone) {
  const q = qid(`選部首：${c.c}`); const box = el("div", { class: "ptask" }); const res = el("div", { class: "pres", "aria-live": "polite" });
  const wrap = el("div", { class: "ropts" }); let done = false;
  shuffle(c.ropts.map((o, k) => [o, k])).forEach(([o, k]) => {
    const b = el("button", { type: "button", class: "ropt" }, `<span class="rg">${o.g}</span><small>${o.n}</small>`);
    b.onclick = () => { if (done) return; logAns(q, k === 0, o.n);
      if (k === 0) { done = true; b.classList.add("good"); box.classList.add("pdone"); res.innerHTML = `<span class="okmsg">√ 對！「${c.c}」是${o.n}。</span>`; onDone(); }
      else { b.classList.add("bad"); setTimeout(() => b.classList.remove("bad"), 600); res.innerHTML = `<span class="nomsg">「${o.g}」在字裡面，但不󠇡是部首。</span>再想想看。`; } };
    wrap.append(b);
  });
  box.append(el("div", { class: "phead" }, "③ 選部首"), wrap, res); return box;
}
function charPractice(c, i) {
  const wrap = el("div", { class: "cpr" }); let n = 0;
  const fin = () => { if (++n >= 3) wrap.classList.add("answered"); };
  const say = () => `${c.pw.replace(/[，。！？]/g, "")}的${c.c}`;
  const head = el("div", { class: "cphead" });
  const sb = sayBtn(say, "唸給我聽"); sb.classList.add("bigsay");
  head.append(sb, el("span", { class: "cpw" }, c.pwh.replace("□", '<span class="cpb">□</span>')), el("span", { class: "hint" }, "聽一󠇢聽，寫出□裡的字。"));
  if (GRADE === "四年級") {
    /* 四年級：寫國字＋拼注音放同一󠇡頁，部首另一󠇡頁；畫面太矮時（10 吋平板）國字、注音再分開，一󠇡次做一󠇡件 */
    wrap.classList.add("cp2"); let tight = null, cur = 0, groups = [];
    const zt = zhuyinTask(c, () => mark()); let wt = null;
    const rt = radicalTask(c, () => mark());
    const p1 = el("div", { class: "cpp1" }), p2 = el("div", { class: "cpp2" }); p2.append(rt);
    const steps = el("span", { class: "cpsteps" }); head.append(steps);
    const done = t => t && t.classList.contains("pdone");
    function mark() { fin(); paintSteps(); const g = groups[cur]; if (g && g.every(done) && cur < groups.length - 1) setTimeout(() => go(cur + 1), 900); }
    function paintSteps() { [...steps.children].forEach((b, k) => { b.classList.toggle("on", k === cur); b.classList.toggle("ok", groups[k].every(done)); }); }
    function go(k) { cur = k; const g = groups[k]; [wt, zt].forEach(t => { if (t) t.hidden = !g.includes(t); }); p1.hidden = !g.some(t => t === wt || t === zt); p2.hidden = !g.includes(rt); p1.classList.toggle("one", g.length === 1); paintSteps(); }
    const lay = () => { const st = wrap.closest(".dstage"); if (!st) return;
      const top = (p1.hidden ? p2 : p1).getBoundingClientRect().top;
      const av = Math.max(200, st.getBoundingClientRect().bottom - top - 10);
      const t = av < 360;
      if (t !== tight) { tight = t; groups = t ? [[null], [zt], [rt]] : [[null, zt], [rt]]; steps.innerHTML = "";
        (t ? ["① 國字", "② 注音", "③ 部首"] : ["① 國字＋注音", "② 部首"]).forEach((n, k) => { const b = el("button", { type: "button", class: "cpstep" }, n); b.onclick = () => go(k); steps.append(b); }); }
      const sz = Math.max(180, Math.min(440, Math.floor(Math.min(av - 90, innerWidth * (t ? .6 : .36)))));
      if (!wt || (wt._sz !== sz && !done(wt))) { const nw = writeTask(c, () => mark(), { size: sz }); nw._sz = sz; if (wt) wt.replaceWith(nw); else p1.prepend(nw); wt = nw; }
      groups[0][0] = wt;
      const rows = t ? 7.2 : 6.3, extra = t ? 40 : 110;
      wrap.style.setProperty("--kh", Math.max(26, Math.min(70, Math.floor((av - extra) / rows - 6))) + "px");
      go(Math.min(cur, groups.length - 1)); };
    p1.append(zt); wrap.append(head, p1, p2);
    const sl = slide("cps", wrap); sl.dataset.nofit = "1"; sl.onshow = () => requestAnimationFrame(lay); addEventListener("resize", () => { if (wrap.isConnected) { tight = null; lay(); } }); return sl;
  }
  const tasks = el("div", { class: "cptasks" }); tasks.append(writeTask(c, fin), zhuyinTask(c, fin), radicalTask(c, fin));
  wrap.append(head, tasks);
  return slide("cps", wrap);
}

/* ── 語句練習：詞卡組句 ── */
function cardPeek(cards, label) {
  const d = el("div", { class: "ideas" }); d.hidden = true; cards.forEach(c => d.append(el("span", { class: "wchip" }, c.h)));
  const b = el("button", { type: "button", class: "btn" }, label); b.onclick = () => { d.hidden = !d.hidden; };
  const w = el("div"); w.append(tools(b), d); return w;
}
function comboSlide(p) {
  const NEED = 3, P = proj();
  const qs = [...Array(NEED)].map((x, k) => qid(`${p.name}：組句${k + 1}`));
  const root = el("div", { class: "combo stepf" });
  const colF = el("div", { class: "ccol cf" }), colB = el("div", { class: "ccol cb" });
  colF.append(el("div", { class: "chead" }, '<span class="cnum">1</span>先選前半句'));
  colB.append(el("div", { class: "chead" }, '<span class="cnum">2</span>再選後半句'));
  const K0 = p.keys[0], IVS = "[\\u{E0100}-\\u{E01EF}]?";
  const markF = h => h.replace(new RegExp("^(" + K0 + ")"), '<b class="kw">$1</b>');
  const markB = h => h.replace(new RegExp("(都|就|也)(" + IVS + ")", "u"), '<b class="kw">$1$2</b>');
  const EMPTY = '<span class="slot sf">前半句</span><span class="cpunc">，</span><span class="slot sb">後半句</span><span class="cpunc">。</span>';
  const line = el("div", { class: "cline", "aria-live": "polite" }, EMPTY);
  const msg = el("div", { class: "segmsg", "aria-live": "polite" }); const got = el("ol", { class: "cgot" });
  const cnt = el("div", { class: "ccnt only-stu" }); let n = 0, pend = false, selF = null, selB = null; const used = new Set();
  const paintCnt = () => { cnt.textContent = n >= NEED ? `完成了！組出 ${n} 句。` : `已組好 ${n} / ${NEED} 句`; };
  const step = () => { root.classList.toggle("stepf", selF === null); root.classList.toggle("stepb", selF !== null && selB === null); };
  const mkCard = (c, k, side) => { const b = el("button", { type: "button", class: "ccard" }, side === "f" ? markF(c.h) : markB(c.h)); b.onclick = () => pick(side, k, b); return b; };
  const fBtns = shuffle(p.fronts.map((c, k) => [c, k])).map(([c, k]) => { const b = mkCard(c, k, "f"); colF.append(b); return b; });
  const bBtns = shuffle(p.backs.map((c, k) => [c, k])).map(([c, k]) => { const b = mkCard(c, k, "b"); colB.append(b); return b; });
  function clearSel() { [...fBtns, ...bBtns].forEach(x => x.classList.remove("sel")); selF = selB = null; step(); }
  function sentence(f, b) { return `${markF(f.h)}，${markB(b.h)}。`; }
  function plainS(f, b) { return `${f.t}，${b.t}。`; }
  function paintLine(f, b) {
    line.innerHTML = `<span class="slot sf${f ? " on" : ""}">${f ? markF(f.h) : "前半句"}</span><span class="cpunc">，</span><span class="slot sb${b ? " on" : ""}">${b ? markB(b.h) : "後半句"}</span><span class="cpunc">。</span>`;
  }
  function pick(side, k, btn) {
    if (side === "f") { fBtns.forEach(x => x.classList.remove("sel")); selF = k; } else { bBtns.forEach(x => x.classList.remove("sel")); selB = k; }
    btn.classList.add("sel"); msg.innerHTML = ""; line.classList.remove("good"); step();
    const f = selF !== null ? p.fronts[selF] : null, b = selB !== null ? p.backs[selB] : null;
    paintLine(f, b);
    if (!f || !b) return;
    line.prepend(sayBtn(() => plainS(f, b), "唸句子󠇡"));
    const key = selF + "-" + selB; const q = qs[Math.min(n, NEED - 1)];
    if (f.ok.includes(selB)) {
      if (used.has(key)) { msg.innerHTML = '<span class="hint">這一󠇡句已經組過了，換別的卡片試試。</span>'; clearSel(); return; }
      used.add(key); line.classList.add("good"); setTimeout(() => line.classList.remove("good"), 900);
      msg.innerHTML = '<span class="okmsg">√ 通順！前後說的是同一󠇡件事。</span>';
      if (n < NEED) { logAns(q, true, plainS(f, b)); }
      n++; got.append(el("li", {}, sentence(f, b))); paintCnt(); if (n >= NEED) root.classList.add("answered"); clearSel(); return;
    }
    const hint = f.hint || b.hint;
    if (hint) { if (n < NEED) logAns(q, false, plainS(f, b)); msg.innerHTML = `<span class="nomsg">不󠇡太對。</span>${hint}`; return; }
    msg.innerHTML = '<span class="pendmsg">唸唸看：前面和後面是在說同一󠇡件事嗎？</span>';
    const again = el("button", { type: "button", class: "btn" }, "換一󠇢張再試"); again.onclick = () => { clearSel(); msg.innerHTML = ""; paintLine(null, null); };
    const ask = el("button", { type: "button", class: "btn only-stu" }, "我覺得󠇡通順，請老師看");
    ask.onclick = () => { if (used.has(key)) return; used.add(key); if (n < NEED) logText(q, `${plainS(f, b)}（學生覺得󠇡通順，待老師確認）`); n++; pend = true; root.classList.add("pending"); got.append(el("li", { class: "pend" }, sentence(f, b) + ' <small>老師會確認</small>')); paintCnt(); if (n >= NEED) root.classList.add("answered"); clearSel(); msg.innerHTML = ""; };
    msg.append(el("div", { class: "tools" }, "")); msg.lastChild.append(again, ask);
  }
  paintCnt();
  const cols = el("div", { class: "ccols" }); cols.append(colF, colB);
  const res = el("div", { class: "cres" }); res.append(cnt, got);
  root.append(line, msg, cols, res);
  const sl = slide("", kick("③ 詞卡組句"), el("div", { class: "hint" }, P ? "請同學選一󠇢張前半句、一󠇢張後半句，唸唸看通不通。" : `選一󠇢張前半句、一󠇢張後半句，組出 ${NEED} 句通順的句子󠇡。`), root);
  sl.reveal = () => { got.innerHTML = ""; p.fronts.forEach(f => f.ok.slice(0, 1).forEach(k => got.append(el("li", {}, sentence(f, p.backs[k]))))); };
  return sl;
}


/* ══════════ 四年級：標準層／基礎層兩條路徑 ══════════
   投影上課：同一󠇡套卡片，提問分基礎（👆）與標準（💬）兩種圖示。
   學生練習：老師在後台設定層級，學生畫面不顯示層級名稱。 */

/* ── 層級與報讀 ── */
function tier() {
  if (FORCE_TIER) return FORCE_TIER;
  if (proj()) return "proj";
  if (!LOCK) return load("demotier") === "base" ? "base" : "std";   /* 老師電腦示範時可切換 */
  const s = String(load("who") || "").trim();
  const t = CFG.tiers || {}; const v = (WHOK && t[WHOK]) || (s && t[s]) || t._default;
  return v === "base" ? "base" : "std";
}
/* 報讀等級：all 全部報讀；q 題目報讀、必學字不󠇡報讀；none 不󠇡報讀（老師在後台逐步關閉） */
function ttsLevel() {
  if (proj() || !LOCK) return load("demotts") || "all";
  if (ttsLocked()) return "none";
  const s = String(load("who") || "").trim(); const t = CFG.ttsLv || {};
  return (WHOK && t[WHOK]) || (s && t[s]) || t._default || "all";
}
const MUST = () => new Set((L && L.must) || []);
/* 資料字串轉 HTML：【字】必學字標橘色 */
function mk(t) { return String(t).replace(/【([^】]+)】/g, '<span class="must">$1</span>'); }
const unmark = t => String(t).replace(/[【】]/g, "");
/* 報讀文字：必學字不󠇡報讀時，把橘色字換成停頓，讓學生自己讀 */
function sayText(t) {
  let s = plainText(String(t).replace(/<span class="must">([^<]+)<\/span>/g, "【$1】"));
  if (ttsLevel() === "q") s = s.replace(/【[^】]+】/g, "，，");
  return s.replace(/[【】]/g, "");
}
/* 填空󠇡字串 "…{答案}…" → fillLine 用的 parts */
function bparts(t) { const out = []; String(t).split(/(\{[^}]*\})/).forEach(p => { if (!p) return; const m = p.match(/^\{([^}|]*)(?:\|([^}]*))?\}$/); if (m) out.push({ ans: m[1], h: m[2] || m[1] }); else out.push(mk(p)); }); return out; }
const blankless = t => String(t).replace(/\{([^}|]*)(?:\|[^}]*)?\}/g, "$1");
const IMG = n => `${LBASE}${cur.lesson}/img/${n}.svg`;
function pic(n, alt) { return `<img class="pic" src="${IMG(n)}" alt="${esc(alt || "")}" loading="lazy" draggable="false">`; }
/* 不顯示注音的字（題目在考讀音或寫字時用） */
const nz = t => `<span class="nozy">${t}</span>`;
const ICON_B = '<span class="qi qb" title="基礎提問" aria-label="基礎提問">👆</span>', ICON_S = '<span class="qi qs2" title="標準提問" aria-label="標準提問">💬</span>';

/* ── 自讀成功次數（學生按「我讀完了」）── */
function selfRead(label) { const q = qid(`自讀：${label}`); const r = REC[recKey()] || (REC[recKey()] = {}); const e = r[q.id] || (r[q.id] = { label: q.label, sec: curSec(), selfread: 0 }); return () => { e.selfread++; e.text = `自己讀完 ${e.selfread} 次`; }; }

/* ── 我會的字：看詞寫字累積答對三次，存在這台裝置（依學生名字分開）── */
const KNOWN_N = 3;
function knownKey() { return "known-" + (String(load("who") || "").trim() || "_"); }
function knownGet() { try { return JSON.parse(load(knownKey()) || "{}"); } catch (e) { return {}; } }
function knownHit(ch, word, wh) {
  if (proj()) return null; const k = knownGet(); const o = k[ch] || (k[ch] = { n: 0, w: word, wh, l: cur.lesson });
  o.n++; o.w = word; o.wh = wh; store(knownKey(), JSON.stringify(k)); return o;
}

/* ── 共用題型 ── */
/* 選擇題：選項可配圖；o.auto 題目出現時自動報讀；o.self 自讀挑戰（先按「我讀完了」才能聽） */
function picQ(stem, opts, ans, label, o = {}) {
  const id = qid(label); const q = el("div", { class: "q qs picq" + (o.self ? " selfq" : "") });
  const st = el("div", { class: "stem" }, mk(stem)); const LET = "ABC"; const btns = []; let wrong = 0;
  const say = sayBtn(() => o.say ? o.say : sayText(mk(stem)), "唸題目"); const head = el("div", { class: "stemrow" }); head.append(say, st);
  if (o.self) {
    say.hidden = true; const done = selfRead(label);
    const b = el("button", { type: "button", class: "btn solid readdone only-stu" }, "我讀完了"); b.onclick = () => { done(); b.remove(); say.hidden = false; say.click(); };
    head.append(b);
  }
  const box = el("div", { class: "popts" + (opts.some(x => x[1]) ? " withpic" : "") });
  const order = o.keep ? opts.map((x, k) => k) : shuffle(opts.map((x, k) => k));
  order.forEach((k, i) => {
    const [t, p] = opts[k];
    const b = el("button", { type: "button", class: "popt" }, `<span class="olab">${LET[i]}</span>${p ? pic(p, unmark(t)) : ""}<span class="otx">${mk(t)}</span>`); btns.push([b, k]);
    const cell = el("div", { class: "pcell" }); cell.append(b, sayBtn(() => `${LET[i]}，${sayText(mk(t))}`, `唸選項 ${LET[i]}`)); box.append(cell);
    b.onclick = () => {
      if (proj()) { btns.forEach(([x]) => x.classList.remove("sel")); b.classList.add("sel"); return; }
      if (q.classList.contains("answered")) return;
      logAns(id, k === ans, `${LET[i]} ${unmark(t)}`);
      if (k === ans) { b.classList.add("ok"); q.classList.add("answered"); }
      else { b.classList.add("no", "shake"); setTimeout(() => b.classList.remove("shake"), 400); if (++wrong >= 2) { const r = btns.find(([x, kk]) => kk !== ans && !x.classList.contains("no")); if (r) r[0].classList.add("elim"); } }
    };
  });
  if (o.lead || o.after) { const lc = el("div", { class: "qlead" }); [].concat(o.lead || []).forEach(n => lc.append(n)); lc.append(head); [].concat(o.after || []).forEach(n => lc.append(n)); q.append(lc, box); } else q.append(head, box);
  q.reveal = () => { const r = btns.find(([, k]) => k === ans); r[0].classList.add("ok"); q.classList.add("revealed"); };
  q.autoSay = () => { if (o.auto && !proj() && ttsLevel() !== "none" && !o.self) setTimeout(() => { if (q.isConnected) say.click(); }, 350); };
  return q;
}
function picSlide(stem, opts, ans, label, o) { const q = picQ(stem, opts, ans, label, o); const s = slide("", q); s.reveal = q.reveal; s.onshow = q.autoSay; return s; }
/* 聽一󠇢聽再選：大喇叭＋三個字／詞卡 */
function listenQ(sayWhat, opts, ans, label, o = {}) {
  const id = qid(label); const q = el("div", { class: "q lq" }); let wrong = 0;
  const big = sayBtn(() => sayWhat, "再聽一󠇡次"); big.classList.add("bigsay");
  const row = el("div", { class: "lqhead" }); row.append(big, el("span", { class: "hint" }, o.hint || "聽一󠇢聽，按出正確的答案。"));
  const box = el("div", { class: "lopts" }); const btns = [];
  shuffle(opts.map((x, k) => k)).forEach(k => {
    const b = el("button", { type: "button", class: "lopt" + (o.cls ? " " + o.cls : "") }, o.html ? o.html(opts[k]) : nz(opts[k])); btns.push([b, k]); box.append(b);
    b.onclick = () => { if (proj()) { btns.forEach(([x]) => x.classList.remove("sel")); b.classList.add("sel"); return; } if (q.classList.contains("answered")) return; logAns(id, k === ans, typeof opts[k] === "string" ? opts[k] : opts[k][0]);
      if (k === ans) { b.classList.add("ok"); q.classList.add("answered"); } else { b.classList.add("no", "shake"); setTimeout(() => b.classList.remove("shake"), 400); if (++wrong >= 2) { const r = btns.find(([x, kk]) => kk !== ans && !x.classList.contains("no")); if (r) r[0].classList.add("elim"); } } };
  });
  q.append(row, box); q.reveal = () => btns.find(([, k]) => k === ans)[0].classList.add("ok");
  q.autoSay = () => { if (!proj() && ttsLevel() !== "none") setTimeout(() => { if (q.isConnected) big.click(); }, 350); };
  return q;
}
function listenSlide(sayWhat, opts, ans, label, o) { const q = listenQ(sayWhat, opts, ans, label, o); const st = o && o.stem ? (o.stem instanceof Node ? o.stem : el("div", { class: "stem", style: "text-align:center" }, o.stem)) : null; const s = slide("", st, q); s.reveal = q.reveal; s.onshow = q.autoSay; return s; }

/* 填空󠇡＋詞庫（一󠇡頁一󠇡句） */
function bankSlides(items, bank, label, o = {}) {
  const lk = {}; bank.forEach(b => lk[b] = b);
  return items.map((t, i) => {
    const ctx = {}; const line = fillLine(bparts(t), [], ctx, `${label}${i + 1}`); const stem = el("div", { class: "big-line" }); stem.append(line);
    const chips = bankBox(bank.map(b => ({ t: b, h: b })), ctx);
    const s = slide("", o.kick ? kick(o.kick[i]) : null, sayRow(stem), stem, el("div", { style: "height:.8em" }), chips);
    s.onshow = () => { ctx.slideBlanks = line.blanks; const b = line.blanks.find(x => !x.classList.contains("ok")); if (b) b.click(); };
    s.reveal = () => revealBlanks(line.blanks, lk); return s;
  });
}
/* 開放題：句框＋自我檢核（自閉症學生：指示語字面明確） */
function frameSlide(q, frame, ref, label, checks) {
  const stem = el("div", { class: "stem" }, mk(q));
  const fr = el("div", { class: "frame" }, `<span class="flab">句框</span>${esc(frame)}`);
  const w = writeBox(label); const ta = w.querySelector("textarea"); ta.placeholder = frame;
  const ck = el("div", { class: "selfck only-stu" }); ck.append(el("div", { class: "hint" }, "寫完檢查："), checklist(checks || ["有用到句框", "句子󠇡有寫完", "有標點符號"]));
  const s = slide("", sayRow(stem), stem, fr, w, ck, refBox(esc(ref))); return s;
}
/* 是非／對錯判斷 */
function ynSlide(stemHtml, ans, label, labels = ["用得󠇡對", "用得󠇡不󠇡對"]) {
  const r = pickRow(labels, ans ? 0 : 1, label, "yn"); const stem = el("div", { class: "stem big-line" }, stemHtml);
  const s = slide("", sayRow(stem), stem, el("div", { class: "ynrow" }, ""), r); s.querySelector(".ynrow").append(r); s.reveal = r.reveal; return s;
}

/* ── 寫字格（描寫、看詞寫字共用）：逐步提示＋手寫辨識，寫完讓學生點選自己寫的字 ── */
function inkPad(o) {
  const box = el("div", { class: "ipad" }); const size = Math.max(170, Math.min(260, Math.floor(innerHeight * .32)));
  const cv = el("canvas", { width: String(size * 2), height: String(size * 2), "aria-label": "寫字格，用手指或觸控筆寫" }); cv.style.width = cv.style.height = size + "px"; cv.style.touchAction = "none";
  const g = cv.getContext("2d"); g.scale(2, 2); let ink = [], stroke = null, t0 = 0, hint = 0;
  const FONT = `${size * .8}px "L${cur.lesson}", "IansuiUI", serif`;
  const base = () => {
    g.clearRect(0, 0, size, size); g.fillStyle = "#fff"; g.fillRect(0, 0, size, size);
    g.strokeStyle = "#e3b9b2"; g.lineWidth = 1; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(size / 2, 0); g.lineTo(size / 2, size); g.moveTo(0, size / 2); g.lineTo(size, size / 2); g.moveTo(0, 0); g.lineTo(size, size); g.moveTo(size, 0); g.lineTo(0, size); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "#c97a6d"; g.lineWidth = 2; g.strokeRect(1, 1, size - 2, size - 2);
    if (hint && o.ch) {
      g.save(); g.beginPath();
      if (hint === 1) { if (o.st === "上下" || o.st === "上中下") g.rect(0, 0, size, size * .5); else g.rect(0, 0, size * .5, size); } else g.rect(0, 0, size, size);
      g.clip(); g.fillStyle = "#cfd8d6"; g.font = FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(o.ch, size / 2, size / 2 + size * .03); g.restore();
    }
    ink.forEach(s => { g.strokeStyle = "#1f6560"; g.lineWidth = Math.max(6, size / 30); g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(s[0][0], s[1][0]); for (let k = 1; k < s[0].length; k++) g.lineTo(s[0][k], s[1][k]); g.stroke(); });
  };
  base();
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
  cv.onpointerdown = e => { e.stopPropagation(); if (!t0) t0 = Date.now(); const [x, y] = pt(e); stroke = [[x], [y], [Date.now() - t0]]; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (!stroke) return; const [x, y] = pt(e); const n = stroke[0].length - 1; g.strokeStyle = "#1f6560"; g.lineWidth = Math.max(6, size / 30); g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(stroke[0][n], stroke[1][n]); g.lineTo(x, y); g.stroke(); stroke[0].push(x); stroke[1].push(y); stroke[2].push(Date.now() - t0); };
  cv.onpointerup = cv.onpointercancel = e => { e.stopPropagation(); if (stroke && stroke[0].length > 1) ink.push(stroke); stroke = null; };
  const cands = el("div", { class: "cands", "aria-live": "polite" });
  const res = el("div", { class: "pres", "aria-live": "polite" });
  const clr = el("button", { type: "button", class: "btn" }, "擦掉"); clr.onclick = () => { ink = []; t0 = 0; base(); cands.innerHTML = ""; };
  const done = el("button", { type: "button", class: "btn solid" }, "寫好了");
  const hb = el("button", { type: "button", class: "btn" }, "提示");
  hb.onclick = () => { hint = Math.min(2, hint + 1); hb.textContent = hint === 1 ? "再一󠇡個󠇡提示" : "提示"; hb.disabled = hint >= 2; base(); box.hints = hint; };
  done.onclick = async () => {
    if (!ink.length) { res.innerHTML = '<span class="nomsg">先在格子󠇡裡寫字。</span>'; return; }
    cands.innerHTML = '<span class="hint">看看你寫的是哪一󠇡個󠇡字……</span>';
    let list = [];
    try { list = (await hwRecognize(ink, size, size)).filter(c => [...c].length === 1).slice(0, 5); } catch (e) { list = []; }
    if (o.ch && !list.includes(o.ch) && o.pool) list = list.slice(0, 4);
    if (!list.length) { cands.innerHTML = '<span class="hint">電腦認不出來，擦掉再寫一󠇡次，或請老師來看。</span>'; return; }
    cands.innerHTML = ""; cands.append(el("span", { class: "hint" }, "你寫的是哪一󠇡個󠇡字？按一󠇡下："));
    list.forEach(c => { const b = el("button", { type: "button", class: "chip big" }, nz(c)); b.onclick = () => o.onPick(c, hint); cands.append(b); });
  };
  const btns = tools(done, clr); if (o.hints) btns.append(hb);
  box.append(cv, btns, cands, res); box.res = res; box.reset = () => { clr.onclick(); res.innerHTML = ""; }; box.lock = () => { box.classList.add("pdone"); [done, clr, hb].forEach(b => b.disabled = true); cands.innerHTML = ""; };
  return box;
}

/* ── 生字教學卡用：造詞卡、跳到字音字形 ── */
let BACK = null;
const hlc = (w, ch) => String(w).replace(new RegExp(ch + "[\\u{E0100}-\\u{E01EF}]?", "u"), m => `<b class="tc">${m}</b>`);
function zcard(x, ch, open) {
  const card = el("button", { type: "button", class: "zcard" + (x.k || open ? " open" : "") + (x.k ? " kw" : "") + (x.mine ? " mine" : "") + (x.n ? " chk" : ""), "aria-label": x.k || open ? plainText(x.w) : "翻開詞語" });
  const hint = el("span", { class: "zh" }); if (x.pic) hint.innerHTML = pic(x.pic, ""); else hint.textContent = x.e || "";
  card.append(hint, el("span", { class: "zx" }, "？"), el("span", { class: "zw" }, hlc(x.w, ch)));
  card.onclick = () => { card.classList.add("open"); if (HAS_TTS) { stopSpeak(); speak(plainText(x.w)); } };
  return card;
}
function zxSecName(id) { if (id === "cmp") return "比一󠇢比"; if (id === "poly") return "多音字"; return `${id}家族`; }
function backBtn() {
  if (!BACK) return null; const b0 = BACK;
  const b = el("button", { type: "button", class: "btn solid backbtn", "aria-label": `回到生字「${b0.c}」` }, `↩ <span class="nozy">${b0.c}</span>`);
  b.onclick = () => { BACK = null; jumpTo(b0.tab, b0.sec, b0.i); };
  return b;
}

/* ── 改錯字：先在句子󠇡裡按出錯字（圈起來），再寫出正確的字 ── */
function fixSlide(x) {
  const id = qid(`改錯字（找錯字）：${plainText(x.s)}`); let found = false;
  const line = el("div", { class: "stem big-line fixline" }); const msg = el("div", { class: "gcres", "aria-live": "polite" });
  const p = produce({ label: `改錯字：${plainText(x.s)}`, answer: x.ans, check: t => t === x.ans ? { st: "ok" } : { st: "no", msg: "不󠇡是這個󠇡字" } });
  const pw = el("div", { class: "fixw", hidden: "" }); pw.append(el("div", { class: "inst" }, "寫出正確的字："), p);
  const wrong = plainText(x.wrong);
  GR(x.s).forEach(g => { const ch = g[0]; if (/[，。、！？：；「」]/.test(ch)) { line.append(g); return; }
    const b = el("span", { class: "fz" }, g); b.onclick = () => { if (found) return;
      if (ch === wrong) { found = true; b.classList.add("circ"); msg.innerHTML = '<span class="okmsg">√ 找到了！</span>'; if (!proj()) logAns(id, true, ch); pw.hidden = false; }
      else { msg.innerHTML = `<span class="nomsg">「${ch}」沒有寫錯，再找找看。</span>`; b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 400); if (!proj()) logAns(id, false, ch); } };
    line.append(b); });
  const s = slide("", kick("改錯字"), el("div", { class: "inst" }, "句子󠇡裡有一󠇡個󠇡錯字，先按出錯的字。"), line, msg, pw);
  s.dataset.nofit = "1";
  s.reveal = () => { line.querySelectorAll(".fz").forEach(b => { if (b.textContent[0] === wrong) b.classList.add("circ"); }); pw.hidden = false; p.reveal && p.reveal(); };
  return s;
}

/* ── 照樣寫：每個󠇡空󠇡格有詞庫，點詞放進空󠇡格，也可以自己打 ── */
function phraseSlide(p, i) {
  const w = writeBox(`照樣寫${i + 1}`); const ta = w.querySelector("textarea");
  const line = el("div", { class: "stem big-line" }); const blanks = [];
  p.stem.forEach(x => { if (x === 0) { const b = el("span", { class: "pblank" }, "〔　〕"); blanks.push(b); line.append(b); } else line.append(x); });
  const banks = el("div", { class: "pbanks" });
  (p.banks || []).forEach((bk, k) => { const r = el("div", { class: "pbrow" }); r.append(el("span", { class: "pbn" }, "〔" + (k + 1) + "〕"));
    bk.forEach(t => { const c = el("button", { type: "button", class: "chip" }, t); c.onclick = () => { const b = blanks[k]; if (!b) return; b.dataset.v = t; b.textContent = t; b.classList.add("on");
      let n = 0; if (blanks.every(x => x.dataset.v)) { ta.value = p.stem.map(x => x === 0 ? blanks[n++].dataset.v : x).join(""); ta.onchange(); } }; r.append(c); });
    banks.append(r); });
  return slide("", kick(p.pat), el("div", { class: "stem big-line" }, `課文：${p.orig}`), p.hint ? el("div", { class: "inst" }, "💡 " + p.hint) : null, line, banks, el("div", { class: "inst" }, "也可以自己寫："), w, refBox(esc(p.ref)));
}

/* ── 字音字形教學：以字帶字、字族文、比一󠇢比 ── */
const GR = t => String(t).match(/.[\u{E0100}-\u{E01EF}]?/gu) || [];
function famSlide(F) {
  const box = el("div", { class: "fam" });
  box.append(el("div", { class: "famc nozy" }, F.id));
  const grid = el("div", { class: "famg" });
  F.fam.forEach(([ch, r, m, mid], k) => {
    const pc = plainText(ch); const ws = (F.ws || [])[k] || [];
    const card = el("button", { type: "button", class: "famk" + (pc === plainText(F.from) ? " from open" : "") });
    card.innerHTML = `<span class="ff nozy"><b class="fr">${r}</b>＋${mid ? mid + "＋" : ""}${F.id}</span><span class="fe nozy">＝</span><span class="fch">${ch}</span><span class="fq">？</span><span class="fm">和${m}有關</span>${ws.length ? `<span class="fws">${ws.join("、")}</span>` : ""}`;
    card.onclick = () => { card.classList.add("open"); if (HAS_TTS) { stopSpeak(); speak(pc + "，" + ws.map(plainText).join("，")); } };
    grid.append(card);
  });
  const all = el("button", { type: "button", class: "btn stepbtn", "aria-label": "全部翻開", title: "全部翻開" }, "👀"); all.onclick = () => { const ks = [...grid.querySelectorAll(".famk:not(.from)")]; const on = ks.every(x => x.classList.contains("open")); ks.forEach(x => x.classList.toggle("open", !on)); };
  box.append(grid);
  const s = slide("", kick(`${F.id}家族`), box, tools(all)); s.dataset.nofit = "1"; return s;
}
function poemSlide(F) {
  const set = new Set(F.fam.map(x => plainText(x[0])));
  const box = el("div", { class: "poem" });
  F.poem.forEach(line => { const p = el("div", { class: "pline" }); GR(line).forEach(g => { const ch = g[0]; const b = el("span", { class: "pz" + (set.has(ch) ? " fm" : "") }, g); if (set.has(ch)) b.onclick = () => b.classList.add("circ"); p.append(b); }); box.append(p); });
  const all = el("button", { type: "button", class: "btn stepbtn", "aria-label": "圈出全部", title: "圈出全部" }, "👀"); all.onclick = () => { const ks = [...box.querySelectorAll(".pz.fm")]; const on = ks.every(x => x.classList.contains("circ")); ks.forEach(x => x.classList.toggle("circ", !on)); };
  const sr = el("div", { class: "sayrow" }); sr.append(sayBtn(() => plainText(F.poem.join("")), "唸字族文"));
  const s = slide("", kick(`${F.id}家族 字族文`), sr, box, tools(all)); s.dataset.nofit = "1"; return s;
}
function cmpSlide(C) {
  const box = el("div", { class: "cmp" });
  C.pair.forEach(([ch, l, r], k) => {
    const d = el("div", { class: "cmpk" });
    d.innerHTML = `<div class="cch nozy">${ch}</div><div class="cf nozy">${l}＋<b class="${k ? "diff" : ""}">${r}</b></div><div class="cws">${(C.ws[k] || []).join("、")}</div>`;
    box.append(d);
  });
  return slide("", kick("形近字比一󠇢比"), box, peekBox(C.note, "def"));
}

/* ── 必學字五步驟 ── */
function mustSlides(c) {
  const W = L.mustkw[c.c] || [c.word, c.pwh]; const others = L.cards.filter(x => x.c !== c.c);
  const head = t => el("div", { class: "mhead" }, `<span class="mstep">${t}</span>`);
  /* ① 聽字選字 */
  const pool = shuffle(others.map(x => x.c)).slice(0, 2);
  const s1 = listenSlide(`${c.c}，${W[0]}的${c.c}`, [c.c, ...pool], 0, `聽字選字：${c.c}`, { cls: "bigc", stem: head("① 聽一󠇢聽，選出這個󠇡字") });
  /* ② 看圖選詞 */
  const s2 = picSlide(`看圖，選出對的詞語。`, c.pick.map((w, k) => [w, null]), 0, `看圖選詞：${c.c}`, { keep: false, lead: [head("② 看圖選詞")], after: [el("div", { class: "bigpic" }, pic(c.pic, c.pick[0]))] });
  /* ③ 拼組部件 */
  const s3 = slide("", head("③ 拼出這個󠇡字"), assemble(c));
  /* ④ 描寫 */
  const s4 = traceSlide(c, head("④ 照著寫寫看"));
  /* ⑤ 看詞寫字 */
  const s5 = wordWriteSlide(c, W[0], W[1], `看詞寫字：${c.c}`, head("⑤ 看詞寫字"));
  return [s1, s2, s3, s4, s5];
}
function traceSlide(c, head) {
  const q4 = qid(`描寫：${c.c}`); const r4 = el("div");
  const p4 = inkPad({ ch: c.c, st: c.st, hints: true, onPick: (ch, h) => { const ok = ch === c.c; logAns(q4, ok, ch + (h ? `（用了${h}個提示）` : "")); if (ok) { p4.lock(); p4.res.innerHTML = '<span class="okmsg">√ 寫對了！</span>'; r4.classList.add("answered"); } else p4.res.innerHTML = `<span class="nomsg">這是「${nz(ch)}」，不󠇡是我們要寫的字。</span>擦掉再寫一󠇡次，可以按「提示」。`; } });
  const model = el("div", { class: "model" }, c.img ? `<img class="mimg" src="${c.img}" alt="${c.c}">` : `<span class="mch nozy">${c.c}</span>`);
  const w4 = el("div", { class: "wrow" }); w4.append(model, p4); r4.append(w4);
  const s4 = slide("", head, el("div", { class: "inst" }, "看左邊的字，在格子󠇡裡寫一󠇡次。需要時按「提示」。"), r4); s4.dataset.nofit = "1";
  return s4;
}
function wordWriteSlide(c, word, wh, label, head) {
  const q = qid(label); const r = el("div"); let got = false;
  const sw = el("div", { class: "wword" }, nz(wh.replace("□", '<span class="cpb">□</span>')));
  const sb = sayBtn(() => `${word}的${c.c}`, "唸給我聽"); sb.classList.add("bigsay");
  const p = inkPad({ ch: c.c, st: c.st, hints: false, onPick: ch => {
    const ok = ch === c.c; logAns(q, ok, ch);
    if (ok) { p.lock(); r.classList.add("answered"); if (!got) { got = true; const o = knownHit(c.c, word, wh); const n = o ? Math.min(o.n, KNOWN_N) : 0; p.res.innerHTML = `<span class="okmsg">√ 寫對了！</span>` + (o ? (o.n >= KNOWN_N ? `<div class="known">🌟「${nz(c.c)}」收進「我會的字」了！</div>` : `<div class="hint">再答對 ${KNOWN_N - n} 次，就能收進「我會的字」。</div>`) : ""); } }
    else p.res.innerHTML = `<span class="nomsg">這是「${nz(ch)}」，再想想看。</span>擦掉再寫一󠇡次。`;
  } });
  const top = el("div", { class: "wwtop" }); top.append(sb, sw); r.append(top, p);
  const s = slide("", head || null, el("div", { class: "inst" }, "聽一󠇢聽，寫出□裡的字。"), r); s.dataset.nofit = "1"; return s;
}
/* 拼組部件：依序按出部件 */
function assemble(c) {
  const q = qid(`拼組部件：${c.c}`); const box = el("div", { class: "asm" }); let pos = 0, wrong = 0, done = false;
  const lay = c.parts.length === 3 ? "l3" : (c.st === "上下" ? "tb" : "lr");
  const slots = el("div", { class: "aslots " + lay }); const ss = c.parts.map(() => { const d = el("span", { class: "aslot" }, ""); slots.append(d); return d; });
  const res = el("div", { class: "pres", "aria-live": "polite" });
  const tiles = el("div", { class: "atiles" });
  shuffle([...c.parts, ...c.pd]).forEach(p => {
    const b = el("button", { type: "button", class: "atile nozy" }, p);
    b.onclick = () => { if (done || proj() && false) return; const ok = p === c.parts[pos];
      if (ok) { ss[pos].textContent = p; ss[pos].classList.add("on"); b.disabled = true; pos++; res.innerHTML = "";
        if (pos >= c.parts.length) { done = true; if (!wrong) logAns(q, true, c.c); else logAns(q, true, c.c); box.classList.add("answered"); res.innerHTML = `<span class="okmsg">√ 拼好了！是「${nz(c.c)}」。</span>`; slots.classList.add("whole"); slots.setAttribute("data-c", c.c); } }
      else { wrong++; logAns(q, false, p); b.classList.add("no", "shake"); setTimeout(() => b.classList.remove("no", "shake"), 500); res.innerHTML = `<span class="nomsg">「${nz(p)}」不󠇡在這個󠇡字裡，再找找看。</span>`; }
    };
    tiles.append(b);
  });
  const reset = el("button", { type: "button", class: "btn" }, "重󠇡來"); reset.onclick = () => { if (done) return; pos = 0; ss.forEach(s => { s.textContent = ""; s.classList.remove("on"); }); tiles.querySelectorAll("button").forEach(b => b.disabled = false); };
  box.append(el("div", { class: "asmtop" }, `<span class="mch nozy">${c.c}</span>`), slots, tiles, tools(reset), res);
  box.reveal = () => { c.parts.forEach((p, k) => { ss[k].textContent = p; ss[k].classList.add("on"); }); };
  return box;
}
/* 我會的字：收集頁＋重󠇡複抽考 */
function knownSlides() {
  const k = knownGet(); const got = Object.entries(k).filter(([, o]) => o.n >= KNOWN_N);
  const grid = el("div", { class: "kgrid" });
  if (!got.length) grid.append(el("div", { class: "hint" }, "還沒有收集到字。看詞寫字答對三次，就會收進這裡。"));
  got.forEach(([ch, o]) => grid.append(el("div", { class: "kcard" }, `<span class="kc nozy">${ch}</span><span class="kw">${esc(o.w)}</span>`)));
  const prog = el("div", { class: "kprog" }); (L.must || []).forEach(ch => { const o = k[ch] || { n: 0 }; prog.append(el("span", { class: "kp" + (o.n >= KNOWN_N ? " ok" : "") }, `${nz(ch)} ${"●".repeat(Math.min(o.n, KNOWN_N))}${"○".repeat(Math.max(0, KNOWN_N - o.n))}`)); });
  const s0 = slide("", el("h2", { class: "ktitle" }, "🌟 我會的字"), grid, el("div", { class: "hint" }, "這一󠇡課的必學字："), prog);
  /* 抽考：之前收進來的字（不󠇡限這一󠇡課），最多 3 個 */
  const pickN = shuffle(got).slice(0, 3).map(([ch, o]) => { const c = (L.cards.find(x => x.c === ch)) || { c: ch, st: "左右" }; return wordWriteSlide(c, o.w, o.wh, `複習我會的字：${ch}`, el("div", { class: "mhead" }, '<span class="mstep">複習</span>')); });
  return [s0, ...pickN];
}

/* ── 課文：逐詞亮起朗讀 ── */
function wordReadBtn(container) {
  const b = el("button", { type: "button", class: "btn say-btn wordread" }, `${SPK} 聽課文`);
  b.onclick = () => wordRead(container, b); return b;
}
function wordRead(container, btn) {
  if (btn.classList.contains("on")) { stopSpeak(); btn.classList.remove("on"); return; }
  stopSpeak();
  const map = []; let txt = "";
  const walk = n => { if (n.nodeType === 3) { for (let k = 0; k < n.data.length; k++) { const cp = n.data.codePointAt(k); if (cp > 0xffff) { if (cp >= 0xE0100 && cp <= 0xE01EF) { k++; continue; } txt += n.data.substr(k, 2); map.push([n, k]); map.push([n, k + 1]); k++; continue; } txt += n.data[k]; map.push([n, k]); } } else if (!(n.classList && (n.classList.contains("say") || n.classList.contains("pn") || n.classList.contains("zb")))) n.childNodes.forEach(walk); };
  walk(container);
  let segs = [];
  try { const sg = new Intl.Segmenter("zh-TW", { granularity: "word" }); for (const s of sg.segment(txt)) segs.push([s.index, s.index + s.segment.length, s.isWordLike]); } catch (e) { segs = [...txt].map((c, i) => [i, i + 1, /[一-鿿]/.test(c)]); }
  const sents = []; let st = 0;
  for (let k = 0; k < txt.length; k++) if ("。！？；".includes(txt[k]) || k === txt.length - 1) { let e = k + 1; while (e < txt.length && "」』）".includes(txt[e])) e++; if (txt.slice(st, e).trim()) sents.push([st, e]); st = e; k = e - 1; }
  const hl = (a, b, name) => { if (!(window.CSS && CSS.highlights && window.Highlight)) return; try { const r = new Range(); r.setStart(map[a][0], map[a][1]); const z = map[b - 1]; r.setEnd(z[0], z[1] + 1); CSS.highlights.set(name, new Highlight(r)); } catch (e) {} };
  let i = 0; btn.classList.add("on");
  const nextS = () => {
    if (!btn.classList.contains("on") || i >= sents.length) { stopSpeak(); btn.classList.remove("on"); if (CSS.highlights) CSS.highlights.delete("word"); return; }
    const [a, b] = sents[i++]; hl(a, b, "reading");
    const words = segs.filter(s => s[0] >= a && s[1] <= b && s[2]);
    const han = [...txt.slice(a, b)].filter(c => /[\p{L}\p{N}]/u.test(c)).length || 1;
    let last = -1;
    speak(txt.slice(a, b), { onprog: f => { /* 依時間比例推算唸到第幾個󠇡字 */
        let cnt = Math.floor(f * han), k = a; for (; k < b && cnt > 0; k++) if (/[\p{L}\p{N}]/u.test(txt[k])) cnt--;
        const w = words.find(s => k >= s[0] && k < s[1]) || words.find(s => s[0] >= k); if (w && w[0] !== last) { last = w[0]; hl(w[0], w[1], "word"); } },
      onend: () => { if (btn.classList.contains("on")) nextS(); } });
  };
  nextS();
}

/* ── 課文段落（課文未解鎖時顯示提示）── */
function paraHTML(i) { return (L.text && L.text[i]) || ""; }
function lockedText() { return !L.text || !L.text.length || L.text.some(t => t.includes("lockp")); }
function paraSlide(i, o = {}) {
  const para = el("p", { class: "para" }, paraHTML(i));
  const left = el("div"); const rowh = el("div", { class: "rowh" }); rowh.append(lessonHead(), kick(`第 ${i + 1} 段`));
  if (o.word) rowh.append(wordReadBtn(para)); else { const rd = el("button", { type: "button", class: "btn say-btn" }, `${SPK} 逐句朗讀`); rd.onclick = () => readAloud(para, rd); rowh.append(rd); }
  left.append(rowh, para);
  if (o.side === false) return slide("", left);
  const ws = [...new Set([...para.querySelectorAll(".w")].map(b => b.dataset.w))];
  const side = el("aside", { class: "side" }); side.append(el("h3", {}, ws.length ? "詞語：按一󠇡下看意思󠇢" : "這一󠇡段沒有新詞語"));
  const wl = el("div", { class: "wordlist" }); ws.forEach(w => wl.append(el("button", { type: "button", class: "w", "data-w": w, "aria-pressed": "false" }, w))); side.append(wl, el("div", { class: "panel" }, '<span class="hint">按詞語，意思󠇢會出現在這裡。</span>'));
  const g = el("div", { class: "sl2 narrow-r" }); g.append(left, side); return slide("", g);
}
function lessonHead() { return el("div", { class: "lhead" }, `<span class="ltitle">${L.title}</span>`); }

/* ── 投影：背景知識卡、提問卡 ── */
function bgSlide(b) {
  /* 提問收成按鈕，按了用浮動視窗一󠇢題一󠇢題大字顯示，讓卡片文字可以放大 */
  const qs = el("div", { class: "bgq" }); qs.append(el("span", { class: "bgqi" }, "💬"));
  (b.q || []).forEach((t, i) => { const bt = el("button", { type: "button", class: "btn bgqb", "aria-label": `第${i + 1}題提問` }, "①②③④⑤⑥"[i]); bt.onclick = () => qPop(b.q, i); qs.append(bt); });
  const top = el("div", { class: "bgtop" }); const tx = el("div", { class: "bgtx" });
  tx.append(el("div", { class: "bgtext" }, b.text), sayBtn(() => plainText(b.text), "唸卡片"));
  top.append(el("div", { class: "bgimg" }, pic(b.img, b.title)), tx);
  const s = slide("", el("h2", { class: "bgt" }, b.title), top, qs); s.dataset.fg = "bg" + b.title; return s;
}
function projQSlide(x) {
  const box = el("div", { class: "pq big" });
  x.b.forEach(t => box.append(el("div", { class: "pqi" }, ICON_B + `<span>${t}</span>`)));
  x.s.forEach(t => box.append(el("div", { class: "pqi" }, ICON_S + `<span>${t}</span>`)));
  const para = el("details", { class: "pqpara" }); para.innerHTML = `<summary>看第 ${x.p} 段課文</summary><p class="para">${paraHTML(x.p - 1)}</p>`;
  return slide("", kick(`第 ${x.p} 段提問`), box, para);
}
function iconLegend() { return el("span", { class: "legend ui" }, `${ICON_B}聽得󠇡懂、指得󠇡出、選得󠇡出　${ICON_S}說出原因、用自己的話說`); }

/* ── 結構：總說／分說／總結 ── */
function structSlides() {
  const segs = ["總說", "分說", "總結"];
  if (proj()) {
    const g = el("div", { class: "tree" });
    segs.forEach(sg => { const ps = L.struct.filter(x => x.seg === sg).map(x => x.p); const c = el("div", { class: "tnode" }); c.append(peekBox(`<b>${sg}</b>`, "tseg"), el("div", { class: "tps" }, `第 ${ps.join("、")} 段`), el("div", { class: "hint" }, L.structNote[sg])); g.append(c); });
    return [slide("", kick("課文結構"), el("div", { class: "hint" }, "這一󠇡課是說明文，用「總說、分說、總結」的方式寫。"), g)];
  }
  return L.struct.map(x => { const r = pickRow(segs, segs.indexOf(x.seg), `課文結構：第${x.p}段`, "ab"); const stem = el("div", { class: "stem" }, `第 ${x.p} 段是「總說」、「分說」，還是「總結」？`); const s = slide("", sayRow(stem), stem, el("details", { class: "pqpara" }, `<summary>看第 ${x.p} 段課文</summary><p class="para">${paraHTML(x.p - 1)}</p>`), el("div", { class: "ynrow" }, "")); s.querySelector(".ynrow").append(r); s.reveal = r.reveal; return s; });
}
function peekBox(html, cls) { const b = el("button", { type: "button", class: "fpk " + (cls || "") }, `<span class="fpk-c">${html}</span><span class="fpk-h">按一󠇡下顯示</span>`); b.onclick = () => b.classList.toggle("open"); return b; }
/* 三座塔表格 */
/* 提問浮動視窗：一󠇢題一󠇢題看 */
function qPop(list, i) {
  const d = el("div", { class: "qpop" });
  d.append(el("div", { class: "qpopn" }, "①②③④⑤⑥"[i]), el("div", { class: "qpopt" }, list[i]));
  const nav = el("div", { class: "fptnav" });
  const pv = el("button", { type: "button", class: "btn" }, "‹ 上一󠇢題"), nx = el("button", { type: "button", class: "btn solid" }, "下一󠇢題 ›");
  pv.disabled = i === 0; nx.disabled = i === list.length - 1;
  nav.append(pv, sayBtn(() => plainText(list[i]), "唸題目"), nx); d.append(nav);
  let close; const go = (dir, c) => { const n = i + dir; if (n < 0 || n >= list.length) return; (c || close)(); qPop(list, n); };
  pv.onclick = () => go(-1); nx.onclick = () => go(1);
  close = popup(d, go);
}
/* ── 浮動視窗：一󠇡次只看一󠇢格，字放大 ── */
function popup(node, onNav) {
  const ov = el("div", { class: "fpop", role: "dialog", "aria-modal": "true" });
  const box = el("div", { class: "fpopbox" });
  const x = el("button", { type: "button", class: "btn fpx", "aria-label": "關閉" }, "✕");
  const close = () => { ov.remove(); document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); else if (onNav && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.stopPropagation(); e.preventDefault(); onNav(e.key === "ArrowRight" ? 1 : -1, close); } };
  x.onclick = close; ov.onclick = e => { if (e.target === ov) close(); };
  box.append(x, node); ov.append(box); document.body.append(ov); document.addEventListener("keydown", key, true);
  return close;
}
/* 三座建築比一󠇢比（投影）：表格只放圖和按鈕，按格子󠇡開浮動視窗看內容 */
function towerProj(T) {
  const cells = []; T.rows.forEach((r, ri) => T.cols.forEach((c, k) => cells.push({ ri, k })));
  const show = idx => {
    const { ri, k } = cells[idx]; const r = T.rows[ri];
    const d = el("div", { class: "fpt" });
    d.append(el("div", { class: "fpthead" }, `${pic(T.imgs[k], T.cols[k])}<div><div class="fptcol">${T.cols[k]}</div><div class="fptrow">${r.h}</div></div>`));
    const body = el("div", { class: "fptbody" });
    String(r.cells[k]).split(/(\{[^}]*\})/).forEach(p => { const m = p.match(/^\{(.*)\}$/); if (m) body.append(peekBox(m[1], "inl")); else if (p) body.insertAdjacentHTML("beforeend", p); });
    const nav = el("div", { class: "fptnav" });
    const pv = el("button", { type: "button", class: "btn" }, "‹ 上一󠇢格"), nx = el("button", { type: "button", class: "btn solid" }, "下一󠇢格 ›");
    nav.append(pv, sayBtn(() => plainText(String(r.cells[k]).replace(/[{}]/g, "")), "唸這一󠇢格"), nx);
    d.append(body, nav);
    let close;
    const go = (dir, c) => { (c || close)(); const n = idx + dir; if (n >= 0 && n < cells.length) show(n); };
    pv.onclick = () => go(-1); nx.onclick = () => go(1); pv.disabled = idx === 0; nx.disabled = idx === cells.length - 1;
    close = popup(d, go);
  };
  const g = el("div", { class: "tgrid" });
  g.append(el("div", { class: "tg0" }, ""));
  T.cols.forEach((c, k) => g.append(el("div", { class: "tgcol" }, `${pic(T.imgs[k], c)}<div>${c}</div>`)));
  T.rows.forEach((r, ri) => { g.append(el("div", { class: "tgrow" }, r.h));
    T.cols.forEach((c, k) => { const b = el("button", { type: "button", class: "tgcell", "aria-label": `${c}的${plainText(r.h)}` }, "🔍"); b.onclick = () => show(ri * T.cols.length + k); g.append(b); }); });
  const s = slide("", kick("三座建築比一󠇢比"), g); s.dataset.nofit = "1"; return s;
}

function towerSlide() {
  const T = L.towers; const ctx = {}; const blanks = [];
  if (proj()) return towerProj(T);
  const tb = el("table", { class: "tower" }); const th = el("tr"); th.append(el("th", {}, ""));
  T.cols.forEach((c, k) => th.append(el("th", {}, `${pic(T.imgs[k], c)}<div>${c}</div>`))); tb.append(th);
  T.rows.forEach(r => { const tr = el("tr"); tr.append(el("th", {}, r.h));
    r.cells.forEach((c, k) => { const td = el("td"); if (proj()) { const parts = String(c).split(/(\{[^}]*\})/); parts.forEach(p => { const m = p.match(/^\{(.*)\}$/); if (m) td.append(peekBox(m[1], "inl")); else if (p) td.insertAdjacentHTML("beforeend", p); }); }
      else { const line = fillLine(bparts(c), [], ctx, `三座塔表格：${T.cols[k]}${r.h}`); blanks.push(...line.blanks); td.append(line); } tr.append(td); }); tb.append(tr); });
  const sc = el("div", { class: "tscroll" }); sc.append(tb);
  const s = slide("", kick("三座建築比一󠇢比"), sc, proj() ? null : bankBox(T.bank.map(b => ({ t: b, h: b })), ctx));
  if (!proj()) { s.onshow = () => { ctx.slideBlanks = blanks; const b = blanks.find(x => !x.classList.contains("ok")); if (b) b.click(); }; s.reveal = () => revealBlanks(blanks); }
  s.dataset.nofit = "1"; return s;
}

/* ══════════ 各分頁 ══════════ */
const VIEWS = {
  text() {
    const T = tier(); const n = (L.text || []).length || 5;
    if (T === "proj") {
      const secs = [
        { name: "背景知識", hint: "先用圖片和生活經驗想一󠇢想，再讀課文。", slides: L.bg.map(bgSlide) },
        { name: "分段讀", hint: "畫底線的是詞語，按一󠇡下看意思󠇢；黃色底的字是本課生字。", slides: [...Array(n).keys()].map(i => paraSlide(i)) },
        { name: "課文結構", slides: structSlides() },
        { name: "三座建築比一󠇢比", hint: "按 🔍 打開那一󠇢格，看完按「下一󠇢格」。", slides: [towerSlide()] },
        { name: "段落大意", hint: "先按空󠇡格，再按詞語。", slides: bankSlides(L.summary.map(x => x.t), L.sumBank, "段落大意", { kick: L.summary.map(x => x.label) }) },
        { name: "提問", slides: L.projq.map(projQSlide), extra: iconLegend() },
      ];
      return deck(secs);
    }
    if (T === "base") {
      const secs = [
        { name: "聽課文", hint: "按「聽課文」，跟著亮起來的字一󠇢起看。", slides: [...Array(n).keys()].map(i => paraSlide(i, { word: true, side: false })) },
        { name: "聽題選答", hint: "聽題目，選出答案。", slides: L.readb.map((x, i) => picSlide(x.q, x.opts, 0, `聽題選答${i + 1}`, { auto: true })) },
        { name: "自讀挑戰", hint: "橘色的字先自己讀一󠇡次，再按喇叭對答案。", slides: shuffle(L.readb.map((x, i) => picSlide(x.q, x.opts, 0, `自讀挑戰${i + 1}`, { self: true }))) },
        { name: "完成", slides: [finishSlide()] },
      ];
      return deck(secs, { submit: true });
    }
    const R = L.readq.map((x, i) => x.type === "choice" ? (() => { const c = choiceQ(mk(x.q), x.opts, x.ans, `理解與推論${i + 1}`); const s = slide("", sayRow(c), c); s.reveal = c.reveal; return s; })() : frameSlide(x.q, x.frame, x.ref, `理解與推論${i + 1}：${x.q}`));
    const secs = [
      { name: "分段讀", hint: "按詞語可以看意思󠇢。", slides: [...Array(n).keys()].map(i => paraSlide(i)) },
      { name: "課文結構", hint: "想一󠇢想每一󠇡段在做什麼。", slides: structSlides() },
      { name: "段落大意", hint: "先按空󠇡格，再按詞語。詞庫裡有用不󠇡到的詞。", slides: bankSlides(L.summary.map(x => x.t), L.sumBank, "段落大意", { kick: L.summary.map(x => x.label) }) },
      { name: "三座建築比一󠇢比", hint: "先按空󠇡格，再按詞語。", slides: [towerSlide()] },
      { name: "理解與推論", hint: "用句框回答，寫完檢查一󠇡次。", slides: R },
      { name: "完成", slides: [finishSlide()] },
    ];
    return deck(secs, { submit: true });
  },

  chars() {
    const T = tier(); const must = MUST();
    if (T === "proj") {
      const slides = L.cards.map((c, ci) => {
        const N = (L.net || {})[c.c] || { bj: [], f: [], b: [] };
        /* 左：彩色生字、注音框、部首框、拆一󠇢拆、字音字形連結 */
        const left = el("div", { class: "cimg" });
        const r1 = el("div", { class: "row" }); r1.append(c.img ? el("img", { src: c.img, alt: c.c + "（彩色部件）" }) : el("span", { class: "cglyph nozy" }, c.c), zyBox(c.cz)); left.append(r1);
        const rb = el("div", { class: "radb" }); const rbtn = el("button", { type: "button", "aria-label": "部首框，按一󠇡下顯示部首" }); rbtn.onclick = () => rbtn.textContent = rbtn.textContent ? "" : c.radb; rb.append(rbtn, "部");
        left.append(rb);
        const bjBtn = el("button", { type: "button", class: "btn stepbtn", "aria-label": "拆一󠇢拆", title: "拆一󠇢拆" }, "✂️");
        const bjs = el("div", { class: "bjs", hidden: "" });
        N.bj.forEach((t, k) => { if (k) bjs.append(el("span", { class: "plus" }, "＋")); bjs.append(el("span", { class: "bj nozy" + (t.includes("*") ? " rad" : "") }, t.replace("*", ""))); });
        bjBtn.onclick = () => { bjs.hidden = !bjs.hidden; };
        left.append(bjBtn, bjs);
        const acts = el("div", { class: "row2" }); acts.append(sayBtn(() => c.c, "唸這個󠇡字"));
        const zl = (L.zxlink || {})[c.c];
        if (zl) { const j = el("button", { type: "button", class: "btn zxjump", title: "到字音字形教學", "aria-label": "到字音字形教學" }, "🔗");
          j.onclick = () => { BACK = { tab: "chars", sec: 0, i: ci, c: c.c }; jumpTo("zx", zxSecName(zl)); }; acts.append(j); }
        left.append(acts);
        if (must.has(c.c)) left.append(el("div", { class: "mustnote" }, "★"));
        /* 右：造詞網（字在前一󠇡列、字在後一󠇡列），最下面加自己想的詞 */
        const right = el("div", { class: "cteach" });
        const net = el("div", { class: "znet" });
        const cards = el("div", { class: "zcards" });
        [...N.f, ...N.b].forEach(x => cards.append(zcard(x, c.c)));
        net.append(cards);
        const flipAll = el("button", { type: "button", class: "btn stepbtn", "aria-label": "全部翻開", title: "全部翻開" }, "👀");
        flipAll.onclick = () => { const ks = [...net.querySelectorAll(".zcard:not(.kw):not(.mine)")]; const on = ks.every(x => x.classList.contains("open")); ks.forEach(x => x.classList.toggle("open", !on)); };
        const mine = el("div", { class: "zmine" });
        const inp = el("input", { type: "text", class: "zin", "aria-label": "學生說的詞", maxlength: "6" });
        const add = el("button", { type: "button", class: "btn stepbtn", "aria-label": "加到造詞網", title: "加到造詞網" }, "➕");
        const hw = el("button", { type: "button", class: "btn stepbtn", "aria-label": "用手寫", title: "用手寫" }, "✍️");
        const hwBox = el("div", { class: "zhw", hidden: "" });
        let pad = null;
        hw.onclick = () => { hwBox.hidden = !hwBox.hidden; if (!hwBox.hidden && !pad) { pad = inkPad({ hints: false, onPick: ch => { inp.value += ch; pad.reset(); } }); hwBox.append(pad); } };
        const doAdd = () => { const w = inp.value.trim(); if (!w) return; if (!w.includes(c.c)) { inp.classList.add("bad"); setTimeout(() => inp.classList.remove("bad"), 900); return; }
          cards.append(zcard({ w, e: "💡", mine: 1 }, c.c, true)); inp.value = ""; };
        add.onclick = doAdd; inp.addEventListener("keydown", e => { if (e.key === "Enter") doAdd(); });
        const clr = el("button", { type: "button", class: "btn stepbtn", "aria-label": "清除", title: "清除" }, "⌫"); clr.onclick = () => { inp.value = inp.value.slice(0, -1); };
        mine.append(el("span", { class: "zq" }, "💬"), inp, clr, hw, add, el("span", { class: "sp" }, ""), flipAll);
        right.append(net, mine, hwBox);
        const g = el("div", { class: "cslide teach" }); g.append(left, right); const sl = slide("", g); sl.dataset.fg = "cteach"; return sl;
      });
      return deck([{ name: "生字", hint: "✂️ 拆一󠇢拆 → 翻開詞卡 → 💬 還能造什麼詞？（🔗 到字音字形）", slides, dotChars: L.cards.map(c => c.c) }]);
    }
    if (T === "base") {
      const ms = L.cards.filter(c => must.has(c.c)); const rest = L.cards.filter(c => !must.has(c.c));
      const secs = ms.map(c => ({ group: "必學字", name: c.c, hint: "聽字選字 → 看圖選詞 → 拼出這個󠇡字 → 照著寫 → 看詞寫字", slides: mustSlides(c), seq: true }));
      secs.push({ name: "寫寫看", hint: "照著左邊的字寫一󠇡次，寫完會辨認你寫的字。", slides: rest.map(c => traceSlide(c, el("div", { class: "mhead" }, '<span class="mstep">寫寫看</span>'))), dotChars: rest.map(c => c.c) });
      secs.push({ name: "聽字選字", hint: "聽一󠇢聽，選出聽到的字。", slides: rest.map(c => listenSlide(`${c.c}，${c.word}的${c.c}`, [c.c, ...shuffle(L.cards.filter(x => x.c !== c.c).map(x => x.c)).slice(0, 2)], 0, `聽字選字：${c.c}`, { cls: "bigc" })) });
      secs.push({ name: "我會的字", hint: "看詞寫字答對三次的字，會收進這裡。", slides: knownSlides() }, { name: "完成", slides: [finishSlide()] });
      return deck(secs, { submit: true });
    }
    const ps = L.cards.map(c => { const s = charPractice(Object.assign({}, c, { pw: c.word, pwh: c.pwh }), 0); return s; });
    const zc = L.cards.map(c => { const p = produce({ label: `自己造詞：${c.c}`, answer: c.zc.join("、"), hint: `想想生活中哪些詞有「${c.c}」`,
      check: t => !t.includes(c.c) ? { st: "no", msg: `要用到「${c.c}」這個󠇡字` } : (t === c.word ? { st: "no", msg: "這是課本的詞，換一󠇡個󠇡自己想的詞" } : (c.zc.includes(t) ? { st: "ok" } : { st: "check", msg: "老師會再確認這個󠇡詞" })) });
      /* 左右兩欄：左邊生字與提示固定大小，右邊作答區；不跟著作答區縮放 */
      const lf = el("div", { class: "zcl" }, `<div class="zct nozy">${c.c}</div><div class="zch">課本的詞：${c.word}</div><div class="zch">用「${c.c}」造一󠇡個󠇡課本以外的詞。</div>`);
      const g = el("div", { class: "zcgrid" }); const rt = el("div", { class: "zcr" }); rt.append(p); g.append(lf, rt);
      const sl = slide("zcs", g); sl.dataset.nofit = "1"; return sl; });
    return deck([{ group: "生字", name: "生字練習", hint: "每個󠇡生字要完成三件事：寫國字、拼注音、選部首。", slides: ps, dotChars: L.cards.map(c => c.c) }, { name: "自己造詞", slides: zc, dotChars: L.cards.map(c => c.c) }, { name: "完成", slides: [finishSlide()] }], { submit: true });
  },

  words() {
    const T = tier(); const WD = L.words; const lk = {}; WD.forEach(w => lk[w.w] = w);
    const judgeS = L.judge.map((x, i) => ynSlide(x.s.replace(x.w, `<b class="kw">${x.w}</b>`), x.ok, `情境判斷${i + 1}：${x.w}`));
    const multiS = L.multi.items.map((x, i) => { const stem = el("div", { class: "stem big-line" }, x.s.replace(L.multi.w, `<b class="kw">${L.multi.w}</b>`)); const r = pickRow(L.multi.senses.map((t, k) => `${"①②"[k]} ${t}`), x.ans, `「${L.multi.w}」的意思󠇢${i + 1}`, "ab wide"); const s = slide("", sayRow(stem), stem, el("div", { class: "ynrow col" }, "")); s.querySelector(".ynrow").append(r); s.reveal = r.reveal; return s; });
    const fillS = bankSlides(L.fillw.items, L.fillw.bank, "選詞填入");
    if (T === "proj") {
      const cards = WD.map(w => {
        const t = (L.wt || {})[w.w] || {};
        const g = el("div", { class: "wteach" });
        const pics = el("div", { class: "wpics" + ((t.pic || []).length > 1 ? " two" : "") }); (t.pic || []).forEach(p => pics.insertAdjacentHTML("beforeend", pic(p, "")));
        const right = el("div", { class: "wbody" });
        const hd = el("div", { class: "whead" }); hd.append(el("span", { class: "wword" }, w.w), sayBtn(() => plainText(w.w), "唸詞語"));
        right.append(hd);
        const dr = el("div", { class: "wrow" }); dr.append(el("span", { class: "wi", title: "意思󠇢" }, "📖"), peekBox(w.def, "def"), sayBtn(() => plainText(w.def), "唸意思󠇢")); right.append(dr);
        const split = (t.pic || []).length > 1 && (t.ex || []).length === t.pic.length;
        (t.ex || []).forEach((x, xi) => { const r = el("div", { class: "wrow ex" + (split ? " expic" : "") }); r.append(split ? el("span", { class: "wi wpi" }, pic(t.pic[xi], "")) : el("span", { class: "wi", title: "例句" }, "✏️"), el("span", { class: "wex" }, x.split(w.w).join(`<b class="kw">${w.w}</b>`)), sayBtn(() => plainText(x), "唸例句")); right.append(r); });
        if (t.qb || t.qs) { const q = el("div", { class: "wqs pq" }); [t.qb, t.qs].filter(Boolean).forEach((x, i) => q.append(el("div", { class: "pqi" }, `<span class="qn">${"①②"[i]}</span><span>${x}</span>`))); right.append(q); }
        if (split) g.classList.add("one"); else g.append(pics); g.append(right); const ws = slide("", g); ws.dataset.fg = "w" + plainText(w.w); return ws;
      });
      const demo = L.judge.filter(x => x.w === "居高臨下").map((x, i) => ynSlide(x.s.replace(x.w, `<b class="kw">${x.w}</b>`), x.ok, `一󠇢起想想看${i + 1}`));
      return deck([{ name: "語詞", hint: "看圖說說看 → 📖 猜意思󠇢再打開 → ✏️ 讀例句 → 回答提問", slides: cards }, { name: "一󠇢起想想看", hint: "詞語用得󠇡對不󠇡對？說說你的理由。", slides: demo }]);
    }
    if (T === "base") {
      const ws = L.wsel || [];
      const hear = ws.map(o => listenSlide(o[0], o, 0, `聽詞選詞：${o[0]}`, { cls: "lword", hint: "聽一󠇢聽，按出對的詞語。" }));
      const look = L.kw.map(x => { const o = shuffle(L.kw.filter(y => y !== x)).slice(0, 2).map(y => y[0]);
        const st = el("div", { class: "bigpic" }); st.innerHTML = pic(x[1], "");
        return listenSlide("看圖，選出對的詞語。", [x[0], ...o], 0, `看圖選詞：${x[0]}`, { stem: st, cls: "lword", hint: "看圖，按出對的詞語。" }); });
      const sent = L.listen.map((x, i) => picSlide(x.t.replace(/\{[^}]*\}/, "（　）"), x.opts.map(w => [w, (L.kw.find(k => k[0] === w) || [])[1]]), 0, `聽句子󠇡選詞${i + 1}`, { auto: true, say: blankless(x.t) }));
      return deck([{ name: "聽詞選詞", hint: "聽詞語，選出對的詞語。", slides: hear }, { name: "看圖選詞", hint: "看圖，選出對的詞語。", slides: look }, { name: "聽句子󠇡選詞", hint: "聽句子󠇡，選出空󠇡格裡的詞。", slides: sent }, { name: "完成", slides: [finishSlide()] }], { submit: true });
    }
    const defS = defBankSlides(WD.filter(w => !/^\s*$/.test(w.def)).map(w => ({ t: w.w, h: w.w, def: w.def.replace(/^①/, "").replace(/②.*$/, "") })), { label: "詞義", per: 5 });
    return deck([{ name: "詞義", hint: "看解釋，選出詞語。", slides: defS }, { name: "情境判斷", hint: "看句子󠇡，判斷詞語用得󠇡對不󠇡對。", slides: judgeS }, { name: `「${L.multi.w}」的意思󠇢`, hint: "判斷句子󠇡裡的意思󠇢是 ① 還是 ②。", slides: multiS }, { name: "選詞填入", hint: "先按空󠇡格，再按詞語。", slides: fillS }, { name: "完成", slides: [finishSlide()] }], { submit: true });
  },

  zx() {
    const T = tier();
    const zxS = L.zx.flatMap((g, gi) => g.items.map((t, i) => {
      const ans = (t.match(/\{([^}]*)\}/) || [])[1]; const parts = t.split(/\{[^}]*\}/);
      const r = pickRow(g.set.map(nz), g.set.indexOf(ans), `形近字（${g.set.join("、")}）${i + 1}`, "ab zxc");
      const stem = el("div", { class: "stem big-line" }); stem.append(document.createTextNode("")); stem.insertAdjacentHTML("beforeend", parts[0]); const bl = el("span", { class: "zxbl" }, "＿"); stem.append(bl); stem.insertAdjacentHTML("beforeend", parts[1] || "");
      r.addEventListener("click", () => { const sel = r.querySelector(".ok"); if (sel) bl.innerHTML = nz(ans); });
      const s = slide("", kick(g.set.join("／")), sayRow(stem), stem, el("div", { class: "ynrow" }, "")); s.querySelector(".ynrow").append(r); s.reveal = () => { r.reveal(); bl.innerHTML = nz(ans); }; return s;
    }));
    const P = L.poly;
    const polyTeach = slide("", kick(`多音字「${P.c}」`), el("div", { class: "polybig nozy" }, P.c), el("div", { class: "prs" }, P.rs.map(r => `<div class="pr"><span class="ui bp">${r.z}</span><span>${r.use}</span><span class="pws">${r.ws.join("、")}</span></div>`).join("")), el("div", { class: "src" }, P.src));
    /* 報讀時把要判斷的字換成「嗶」，避免直接聽到讀音 */
    const polyS = P.items.map((x, i) => { const stem = el("div", { class: "stem big-line" }, x.s.replace(/\{([^}]*)\}/, `<span class="pl nozy">$1</span>`)); const r = pickRow(P.rs.map(r => `<span class="ui">${r.z}</span>`), x.ans, `多音字「${P.c}」${i + 1}`, "ab"); const sr = el("div", { class: "sayrow" }); sr.append(sayBtn(() => x.s.replace(/\{[^}]*\}/, "嗶"), "唸題目")); const s = slide("", sr, stem, el("div", { class: "ynrow" }, "")); s.querySelector(".ynrow").append(r); s.reveal = r.reveal; return s; });
    const radS = L.radsort.map(R => radSortSlide(R));
    if (T === "proj") {
      const fam = (L.zz || []).map(F => ({ name: zxSecName(F.id), hint: "看部首猜意思󠇢 → 讀字族文，圈出同一󠇢家的字", slides: [famSlide(F), poemSlide(F)] }));
      const secs = [...fam];
      if (L.cmp) secs.push({ name: "比一󠇢比", hint: "看看兩個字哪裡不一󠇡樣。", slides: [cmpSlide(L.cmp)] });
      secs.push({ name: "多音字", slides: [polyTeach] });
      const d = deck(secs); const bb = backBtn(); if (bb) d.append(bb); return d;
    }
    if (T === "base") return deck([{ name: "部首歸類", hint: "找出有這個󠇡部首的字。", slides: radS }, { name: "完成", slides: [finishSlide()] }], { submit: true });
    return deck([{ name: "形近字", hint: "選出句子󠇡裡要用的字。", slides: zxS }, { name: "多音字", hint: `判斷「${P.c}」在句子󠇡裡怎麼讀。`, slides: [polyTeach, ...polyS] }, { name: "完成", slides: [finishSlide()] }], { submit: true });
  },

  jx() {
    const T = tier(); const J = L.jx; const COL = ["b1", "b2", "b3"];
    const blocks = (arr, empty) => { const d = el("div", { class: "blocks" }); arr.forEach((t, k) => d.append(el("span", { class: "blk " + COL[k] + (t ? "" : " empty") }, t || J.blocks[k]))); return d; };
    const legend = el("div", { class: "blegend" }); J.blocks.forEach((t, k) => legend.append(el("span", { class: "blk " + COL[k] }, t)));
    const ck = ["有用到「假如」和「就」", "前後在說同一󠇡件事", "有標點符號"];
    /* ① 看示範 */
    const s1 = slide("", kick("① 看示範"), el("div", { class: "stem big-line" }, `${J.demo[0]}，${J.demo[1]}${J.demo[2]}。`), blocks(J.demo), legend.cloneNode(true), sayBtn(`${J.demo[0]}，${J.demo[1]}${J.demo[2]}。`, "唸句子󠇡"));
    /* ② 仿寫：換情況 */
    const ctx2 = {}; const l2 = fillLine(["假如", { ans: "", h: "" }, "，我們就去台北一○一大樓看風景。"], [], ctx2, "仿寫（換情況）");
    l2.blanks[0].dataset.ans = ""; l2.blanks[0].textContent = "　　　　";
    const chips2 = el("div", { class: "bank" }); J.s2.opts.forEach(t => { const b = el("button", { type: "button", class: "chip" }, t); b.onclick = () => { l2.blanks[0].textContent = t; l2.blanks[0].classList.add("ok"); if (!proj()) logText(qid2, `假如${t}，我們就去台北一○一大樓看風景。`); s2.classList.add("answered"); l2.parentNode.classList.add("answered"); }; chips2.append(b); });
    const qid2 = qid("② 仿寫：只換情況");
    const st2 = el("div", { class: "stem big-line" }); st2.append(l2);
    const s2 = slide("", kick("② 仿寫：只換「情況」"), el("div", { class: "hint" }, "選一󠇡個󠇡情況放進空󠇡格，唸唸看。"), blocks(["", J.demo[1], J.demo[2]]), st2, chips2);
    /* ③ 替換：換情況和做什麼 */
    const s3 = swapSlide(J, T);
    const slides = [s1, s2, s3];
    if (T !== "base") {
      /* ④ 半開放 */
      J.s4.forEach((x, i) => { const w = writeBox(`④ 半開放${i + 1}：${x.pre}`); w.querySelector("textarea").value = x.pre; const s = slide("", kick("④ 補完句子󠇡"), el("div", { class: "stem big-line" }, `${x.pre}……`), w, refBox(esc(x.pre + x.ref + "。"))); slides.push(s); });
      /* ⑤ 自己造句 */
      { const w = writeBox("⑤ 自己造句（假如……就……）"); const c = el("div", { class: "selfck only-stu" }); c.append(el("div", { class: "hint" }, "寫完檢查："), checklist(ck)); slides.push(slide("", kick("⑤ 自己造句"), el("div", { class: "stem" }, "用「假如……就……」自己造一󠇡句。"), legend.cloneNode(true), w, c, refBox(esc(J.s5ref)))); }
      /* ⑥ 接成兩句 */
      { const w = writeBox("⑥ 接成兩句"); const c = el("div", { class: "selfck only-stu" }); c.append(el("div", { class: "hint" }, "寫完檢查："), checklist(["第一句用到「假如……就……」", "第二句和第一句在說同一󠇡件事", "兩句都有標點符號"])); slides.push(slide("", kick("⑥ 接成兩句"), el("div", { class: "stem" }, "在自己的句子󠇡後面，寫出有關係的第二句。"), w, c, refBox(esc(J.s6ref)))); }
    } else {
      /* 基礎層：詞卡排句、口說，最後給參考例句 */
      slides.push(cardOrderSlide(J.cards, "詞卡排句"));
      slides.push(slide("", kick("參考例句"), el("div", { class: "refcard big-line" }, esc(J.baseRef)), sayBtn(J.baseRef, "唸例句")));
    }
    const secs = [{ name: "假如……就……", hint: T === "base" ? "看示範 → 換情況 → 換情況和做什麼 → 排排看" : "看示範 → 仿寫 → 替換 → 補完 → 自己造句 → 接成兩句", slides, seq: true }];
    if (T !== "base") {
      const B = L.bd;
      const bd1 = slide("", kick("看示範"), el("div", { class: "stem big-line" }, B.demo.replace("不󠇡但", '<b class="kw">不󠇡但</b>').replace("更", '<b class="kw">更</b>')), el("div", { class: "hint" }, "「更」後面說的，要比前面更進一󠇡步。"), sayBtn(B.demo, "唸句子󠇡"));
      const w2 = writeBox("不󠇡但……更……：仿寫"); w2.querySelector("textarea").value = B.copy.pre;
      const bd2 = slide("", kick("仿寫"), el("div", { class: "stem big-line" }, `${B.copy.pre}〔　〕。`), w2, refBox(esc(B.copy.pre + B.copy.ref + "。")));
      const w3 = writeBox("不󠇡但……更……：自己造句"); const c3 = el("div", { class: "selfck only-stu" }); c3.append(el("div", { class: "hint" }, "寫完檢查："), checklist(["有用到「不󠇡但」和「更」", "「更」後面比前面更進一󠇡步", "有標點符號"]));
      const bd3 = slide("", kick("自己造句"), el("div", { class: "stem" }, "用「不󠇡但……更……」自己造一󠇡句。"), w3, c3, refBox(esc(B.ownRef)));
      secs.push({ name: "不󠇡但……更……", slides: [bd1, bd2, bd3], seq: true });
      secs.push({ name: "照樣寫", hint: "照著課文的句子󠇡，換上自己的詞。", slides: L.phrase.map((p, i) => phraseSlide(p, i)) });
    }
    if (T !== "proj") secs.push({ name: "完成", slides: [finishSlide()] });
    return deck(secs, { submit: T !== "proj" });
  },

  zyrz() {
    const zq = L.zyq.map((x, i) => listenSlide(x.c, [x.z, ...x.d], 0, `聽音選注音：${x.c}`, { cls: "zyopt", html: z => `<span class="ui zyo">${z}</span>`, stem: el("div", { class: "bigchar nozy" }, x.c), hint: "聽一󠇢聽，選出對的注音。" }));
    const zw = L.zyw.map((x, i) => listenSlide(x.w, [x.z, ...x.d], 0, `拼讀詞語：${x.w}`, { cls: "zyopt", html: z => `<span class="ui zyo">${z}</span>`, stem: el("div", { class: "bigword nozy" }, x.w), hint: "聽詞語，選出對的注音。" }));
    const rd = [...L.must.map(ch => { const c = L.cards.find(x => x.c === ch); const done = selfRead(`認讀：${ch}`); const sb = sayBtn(() => `${ch}，${c.word}的${ch}`, "對答案"); sb.hidden = !proj(); sb.classList.add("bigsay");
        const b = el("button", { type: "button", class: "btn solid only-stu" }, "我讀完了"); b.onclick = () => { done(); b.remove(); sb.hidden = false; sb.click(); };
        return slide("", el("div", { class: "flashc" }, `<span class="bigchar nozy must">${ch}</span>`), el("div", { class: "hint", style: "text-align:center" }, "先自己讀一󠇡次，再按喇叭對答案。"), tools(b, sb)); }),
      ...L.radsort.map(R => slide("", el("div", { class: "radcard" }, `${pic(R.img, R.r)}<span class="bigchar nozy">${R.r}</span>`), el("div", { class: "hint", style: "text-align:center" }, R.note.replace("這些字", "有這個󠇡部首的字")), sayBtn(`${R.r}部`, "唸部首")))];
    const secs = [{ name: "聽音選注音", hint: "每次做一󠇢小段就好。", slides: zq }, { name: "拼讀詞語", slides: zw }, { name: "認讀", hint: "必學字與部首卡。", slides: rd }];
    if (!proj()) secs.push({ name: "完成", slides: [finishSlide()] });
    return deck(secs, { submit: !proj() });
  },

  review() {
    const T = tier();
    if (T === "base") {
      const s = L.rvb.map((x, i) => x.pics ? listenSlide(x.say, x.pics, 0, `綜合練習${i + 1}`, { html: y => pic(y[1], y[0]), cls: "lpic", stem: el("div", { class: "stem" }, x.q) }) : listenSlide(x.say, x.opts, 0, `綜合練習${i + 1}`, { cls: "bigc", stem: el("div", { class: "stem" }, mk(x.q)) }));
      return deck([{ name: "聽題點選", hint: "聽題目，按出答案。", slides: s }, { name: "完成", slides: [finishSlide()] }], { submit: true });
    }
    const out = [];
    L.rvs.forEach((x, i) => {
      if (x.type === "write") x.items.forEach((it, k) => { const zyi = it[2]; const show = it.slice(0, 2).map((t, j) => j === zyi ? `<span class="ui zyk">${t}</span>` : nz(t)).join("");
        const p = produce({ modes: ["write"], label: `寫國字：${it.slice(0, 2).join("")}`, answer: it[3], check: t => t === it[3] ? { st: "ok" } : { st: "no", msg: "不󠇡是這個󠇡字" } });
        const s = slide("", kick(x.k), el("div", { class: "stem big-line" }, `寫出注音的國字：${show}`), p); s.reveal = p.reveal; out.push(s); });
      else if (x.type === "fix") { out.push(fixSlide(x)); }
      else if (x.type === "choice") { const poly = x.k === "多音字"; const c = choiceQ(poly ? x.q.replace(/(濟+)/g, m => nz(m)) : x.q, x.opts.map(o => poly ? `<span class="ui">${o}</span>` : o), x.ans, `${x.k}：${plainText(x.q)}`); const s = slide("", kick(x.k), poly ? null : sayRow(c), c); s.reveal = c.reveal; out.push(s); }
      else if (x.type === "own") { const w = writeBox(`造句：${x.pat}`); out.push(slide("", kick(x.k), el("div", { class: "stem" }, `用「${x.pat}」造一󠇡句。`), w)); }
    });
    if (T === "proj") return deck([{ name: "綜合練習", slides: out }]);
    return deck([{ name: "綜合練習", hint: "整課重點複習。", slides: out }, { name: "完成", slides: [finishSlide()] }], { submit: true });
  },
};

/* 部首歸類：按出有這個󠇡部首的字 */
function radSortSlide(R) {
  const all = L.radsort; const others = all.filter(x => x !== R).flatMap(x => [...x.must, ...x.known]);
  const right = [...R.must, ...R.known]; const opts = shuffle([...right, ...shuffle(others).slice(0, 3)]);
  const qs = {}; const box = el("div", { class: "rsort" }); let left = right.length;
  const res = el("div", { class: "pres", "aria-live": "polite" });
  opts.forEach(ch => { const b = el("button", { type: "button", class: "rchip nozy" + (R.must.includes(ch) ? " must" : "") }, ch); const ok = right.includes(ch);
    b.onclick = () => { if (b.classList.contains("ok")) return; if (proj()) { b.classList.toggle("sel"); return; } const q = qs[ch] || (qs[ch] = qid(`部首歸類「${R.r}」：${ch}`)); logAns(q, ok, ch);
      if (ok) { b.classList.add("ok"); if (--left === 0) { box.classList.add("answered"); res.innerHTML = `<span class="okmsg">√ 全部找到了！</span>${R.note}`; } } else { b.classList.add("no", "shake"); setTimeout(() => b.classList.remove("no", "shake"), 500); res.innerHTML = `<span class="nomsg">「${nz(ch)}」沒有「${R.r}」。</span>`; } };
    box.append(b); });
  const s = slide("", el("div", { class: "radcard sm" }, `${pic(R.img, R.r)}<span class="bigchar nozy">${R.r}</span>`), el("div", { class: "hint", style: "text-align:center" }, `按出有「${R.r}」的字（共 ${right.length} 個）。`), box, res);
  s.reveal = () => { box.querySelectorAll(".rchip").forEach(b => { if (right.includes(b.textContent)) b.classList.add("ok"); }); res.innerHTML = R.note; };
  return s;
}
/* 替換：情況、做什麼兩排詞卡各自打亂，配成合理的一󠇢組 */
function swapSlide(J, T) {
  const P = J.s3.pairs; const q = qid("③ 替換：換情況和做什麼"); let selA = null, selB = null, n = 0;
  const line = el("div", { class: "stem big-line" }); const paint = () => { line.innerHTML = `假如<span class="slot2 b1">${selA === null ? "情況" : P[selA][0]}</span>，我們就<span class="slot2 b3">${selB === null ? "做什麼" : P[selB][1]}</span>。`; };
  const msg = el("div", { class: "segmsg", "aria-live": "polite" }); const got = el("ol", { class: "cgot" });
  const colA = el("div", { class: "ccol" }), colB = el("div", { class: "ccol" });
  colA.append(el("div", { class: "chead" }, '<span class="blk b1">情況</span>')); colB.append(el("div", { class: "chead" }, '<span class="blk b3">做什麼</span>'));
  const bA = shuffle(P.map((x, k) => k)).map(k => { const b = el("button", { type: "button", class: "ccard" }, P[k][0]); b.onclick = () => { bA.forEach(x => x.classList.remove("sel")); b.classList.add("sel"); selA = k; paint(); check(); }; colA.append(b); return b; });
  const bB = shuffle(P.map((x, k) => k)).map(k => { const b = el("button", { type: "button", class: "ccard" }, P[k][1]); b.onclick = () => { bB.forEach(x => x.classList.remove("sel")); b.classList.add("sel"); selB = k; paint(); check(); }; colB.append(b); return b; });
  const used = new Set();
  function check() {
    if (selA === null || selB === null) return; const s = `假如${P[selA][0]}，我們就${P[selB][1]}。`; const key = selA + "-" + selB;
    if (used.has(key)) { msg.innerHTML = '<span class="hint">這一󠇡句已經組過了。</span>'; return; }
    if (selA === selB) { used.add(key); n++; if (!proj()) logAns(q, true, s); msg.innerHTML = '<span class="okmsg">√ 通順！</span>'; got.append(el("li", {}, s)); }
    else { msg.innerHTML = '<span class="pendmsg">唸唸看：前後合理嗎？</span>'; const a = el("button", { type: "button", class: "btn only-stu" }, "我覺得󠇡合理，請老師看"); a.onclick = () => { used.add(key); n++; logText(q, `${s}（學生覺得󠇡合理，待老師確認）`); got.append(el("li", { class: "pend" }, s + ' <small>老師會確認</small>')); msg.innerHTML = ""; root.classList.add("pending"); }; msg.append(a); }
    if (n >= 2) root.classList.add("answered");
  }
  paint(); const cols = el("div", { class: "ccols" }); cols.append(colA, colB);
  const root = el("div", { class: "combo" }); root.append(line, msg, cols, got);
  const s = slide("", kick("③ 替換：換「情況」和「做什麼」"), el("div", { class: "hint" }, "左邊選一󠇡個󠇡情況，右邊選一󠇡件事，組成合理的句子󠇡。至少組兩句。"), root);
  s.reveal = () => { got.innerHTML = ""; P.forEach(p => got.append(el("li", {}, `假如${p[0]}，我們就${p[1]}。`))); };
  return s;
}
/* 詞卡排句：依序按詞卡排成句子󠇡，也可以用說的 */
function cardOrderSlide(cards, label) {
  const q = qid(label); const box = el("div", { class: "ord" }); const line = el("div", { class: "ordline big-line" }); const pool = el("div", { class: "bank" });
  let seq = []; const res = el("div", { class: "pres", "aria-live": "polite" });
  const paint = () => { line.innerHTML = seq.length ? seq.map(k => `<span class="wchip">${cards[k]}</span>`).join("") : '<span class="hint">按下面的詞卡排成句子󠇡</span>'; };
  const btns = shuffle(cards.map((c, k) => k)).map(k => { const b = el("button", { type: "button", class: "chip" }, cards[k]); b.onclick = () => { if (box.classList.contains("answered")) return; seq.push(k); b.disabled = true; paint();
      if (seq.length === cards.length) { const ok = seq.every((x, i) => x === i); const s = seq.map(x => cards[x]).join(""); logAns(q, ok, s); if (ok) { box.classList.add("answered"); res.innerHTML = '<span class="okmsg">√ 排對了！唸唸看。</span>'; res.append(sayBtn(cards.join("").replace("放晴", "放晴，"), "唸句子󠇡")); } else { res.innerHTML = '<span class="nomsg">唸唸看，順不󠇡順？</span>再排一󠇡次。'; setTimeout(() => { seq = []; btns.forEach(x => x.disabled = false); paint(); }, 900); } } }; pool.append(b); return b; });
  const back = el("button", { type: "button", class: "btn" }, "退一󠇢張"); back.onclick = () => { if (box.classList.contains("answered") || !seq.length) return; const k = seq.pop(); btns.find(b => b.textContent === cards[k]).disabled = false; paint(); };
  paint(); box.append(line, pool, tools(back), res);
  const s = slide("", kick("詞卡排句"), el("div", { class: "inst" }, "照順序按詞卡，排成一󠇡句話。排好後大聲唸一󠇡次。"), box);
  s.reveal = () => { seq = cards.map((c, k) => k); paint(); }; return s;
}

function zbHTML(rd, show) {
  let s = rd || ""; let light = false, tone = "";
  if (s.startsWith("˙")) { light = true; s = s.slice(1); }
  if (/[ˊˇˋ]$/.test(s)) { tone = s.slice(-1); s = s.slice(0, -1); }
  const sy = [...s]; let row = 1; let h = "";
  if (light) h += `<i style="grid-row:${row++}">˙</i>`;
  sy.forEach(c => h += `<i style="grid-row:${row++}">${c}</i>`);
  if (tone) h += `<i class="tn" style="grid-row:${Math.max(1, row - 1)}">${tone}</i>`;
  return `<span class="zb${show ? " on" : ""}" style="grid-template-rows:repeat(${Math.max(row - 1, 1)},.62em)">${show ? h : ""}</span>`;
}
function handoutHTML(o) {
  const fonts = (document.querySelector("style").textContent.match(/@font-face\s*{[^}]*}/g) || []).filter(f => f.includes('"Kai"')).join("\n");
  const lesson = plainText(L.no) + "　" + plainText(L.title);
  const cardsH = L.cards.map((c, i) => {
    const words = c.words.map(w => `<span class="wc">${w.zy.map(x => `<b>${x.c}</b>${zbHTML(x.z, o.zy)}`).join("")}</span>`).join("");
    const sents = c.sents.map((x, k) => `<p>${k + 1}. ${x.parts.map(p => typeof p === "number" ? `<span class="bl" style="width:${Math.max(4, x.ans.length + 1)}em"></span>` : p).join("").replace(/(<span class="bl"[^>]*><\/span>)([，。、！？；：」』）]+)/g, '<span style="white-space:nowrap">$1$2</span>')}</p>`).join("");
    return `<section class="cd"><div class="top"><div class="lf"><div class="r"><img src="${c.img}" alt="${c.c}">${zbHTML(c.cz, o.zy)}</div><div class="rb"><span class="bx">${o.rad ? c.radb : ""}</span>部</div></div><div class="ws">${words}</div></div><div class="ss">${sents}</div></section>`;
  }).join("");
  return `<!DOCTYPE html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>${lesson} 生字講義</title><style>
${fonts}
@page { size: 182mm 257mm; margin: 5mm; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: "Kai", serif; font-size: 10.5pt; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { width: 171mm; margin: 0 auto; }
h1 { font-family: "Kai", serif; font-size: 13pt; margin: 0 0 1mm; display: flex; justify-content: space-between; align-items: baseline; height: 6mm; }
h1 small { font-size: 10.5pt; font-weight: 400; }
.cd { border: .35mm solid #9aa4a8; border-radius: 3mm; padding: 2mm 2.5mm; margin-bottom: 1.2mm; break-inside: avoid; overflow: hidden; display: grid; grid-template-rows: auto 1fr; gap: 1.5mm; }
.top { display: grid; grid-template-columns: 34mm 1fr; gap: 3mm; }
.lf { display: grid; justify-items: center; gap: 1.5mm; border-right: .35mm solid #c5ccd1; padding-right: 3mm; }
.lf .r { display: flex; align-items: center; gap: 1mm; }
.lf img { width: 19mm; height: 19mm; object-fit: contain; border: .35mm solid #b5bec4; border-radius: 1.5mm; }
.lf .zb { font-size: 18pt; min-width: 1.45em; min-height: 2.7em; }
.rb { font-family: "Kai", serif; display: flex; align-items: center; gap: 1.5mm; font-size: 10.5pt; }
.bx { width: 7mm; height: 7mm; border: .35mm solid #9aa4a8; border-radius: 1mm; display: inline-flex; align-items: center; justify-content: center; font-size: 12pt; }
.ws { display: flex; flex-wrap: wrap; gap: 2mm; align-content: flex-start; }
.wc { display: inline-flex; align-items: center; gap: .3mm; padding: 1mm 2.5mm; border: .35mm solid #9cc3e8; background: #eef5fd; border-radius: 2.5mm; font-family: "Kai", serif; font-size: 18pt; }
.wc .zb { min-width: 1.45em; min-height: 2.7em; margin: 0 .1em 0 .05em; }
.wc b { font-weight: 700; }
.zb { display: inline-grid; grid-template-columns: auto .42em; justify-items: center; align-content: center; min-width: 1.15em; min-height: 2.2em; margin: 0 .05em; border: .3mm solid #9aa4a8; border-left-color: transparent; border-right-color: transparent; border-radius: 50% / 18%; font-family: "Kai", serif; line-height: 1; vertical-align: middle; }
.zb.on { border-color: transparent; }
.zb i { font-style: normal; font-size: .58em; line-height: 1.03; grid-column: 1; }
.zb i.tn { grid-column: 2; justify-self: start; }
.ss { background: #f3f5f4; border-radius: 2mm; padding: 1mm 2.5mm; }
.ss p { margin: 0; line-height: 1.6; font-size: 18pt; padding-left: 1.1em; text-indent: -1.1em; }
.bl { display: inline-block; border-bottom: .35mm solid #111; height: 1.15em; vertical-align: bottom; margin: 0 .5mm; }
.pl { font-family: "Kai", serif; }
</style></head><body><div class="sheet"><h1><span>${lesson}｜生字講義</span><small>姓名：＿＿＿＿＿＿</small></h1>${cardsH}</div></body></html>`;
}
window.makeHandout = handoutHTML;
function openPrint() {
  const box = $("#rbox");
  box.innerHTML = `<h2 id="rtitle" style="margin:0 0 8px;color:var(--accent)">${plainText(L.no)}　生字講義（B5）</h2>
    <p>本課 ${L.cards.length} 個生字，例句以 18 級字印出，空󠇡格至少留四個字寬。上課時當講義用，例句的空󠇡格可以直接寫。</p>
    <fieldset style="border:1px solid var(--line);border-radius:8px"><legend>注音框</legend>
      <label><input type="radio" name="hz" value="0" checked> 空󠇡白（學生自己寫）</label>　<label><input type="radio" name="hz" value="1"> 印出注音</label></fieldset>
    <fieldset style="border:1px solid var(--line);border-radius:8px"><legend>部首框</legend>
      <label><input type="radio" name="hr" value="0" checked> 空󠇡白</label>　<label><input type="radio" name="hr" value="1"> 印出部首</label></fieldset>

    <p class="hint">下載後用 Chrome 開啟講義檔，按列印，紙張選 B5、邊界選「無」或「最小」，並勾選「背景圖形」。</p>`;
  const t = tools(); const msg = el("p", { class: "hint" });
  const go = el("button", { type: "button", class: "btn solid" }, "下載講義檔");
  go.onclick = async () => {
    const o = { zy: box.querySelector('input[name=hz]:checked').value === "1", rad: box.querySelector('input[name=hr]:checked').value === "1" };
    const html = handoutHTML(o);
    const fn = `${plainText(L.no)}_生字講義.html`; const blob = new Blob([html], { type: "text/html" });
    if (!window.claude) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fn; document.body.append(a); a.click(); a.remove();
      msg.textContent = "已下載。"; return;
    }
    try {
      const dl = await claude.use("downloads");
      if (!dl) throw new Error("none");
      await dl.save({ filename: fn, data: blob });
      msg.textContent = "已下載。";
    } catch (e) { msg.textContent = "這個󠇡畫面不能直接下載，請改用老師資料夾裡的講義 PDF。"; }
  };
  const close = el("button", { type: "button", class: "btn" }, "關閉"); close.onclick = () => $("#result").classList.remove("show");
  t.append(go, close); box.append(t, msg); $("#result").classList.add("show");
}

/* ── 交給老師 ── */
function summary() {
  const r = REC[recKey()] || {}; const rows = Object.values(r);
  const judged = rows.filter(x => x.first !== undefined && x.first !== null);
  const firstOk = judged.filter(x => x.first).length;
  const lines = rows.map(x => x.text !== undefined ? `${x.label}：${x.text || "（未寫）"}` : `${x.label}：${x.first ? "一󠇡次答對" : (x.done ? `第${x.tries}次答對` : `未答對（試${x.tries}次，最後選${x.last}）`)}`);
  return { judged: judged.length, firstOk, lines };
}
/* 老師電腦（示範畫面）按「交給老師」：先說明，不󠇡會送出 */
function demoNotice() {
  const box = $("#rbox"); box.className = "box sub"; box.innerHTML = "";
  box.append(el("h2", { id: "rtitle", style: "margin:0 0 8px;color:var(--accent)" }, "這是示範畫面"),
    el("p", { style: "text-align:left;margin:0 0 10px" }, "學生用<b>學生連結</b>打開網站作答，按「交給老師」後，作答結果會加密送到老師的後台。<br>在示範畫面按這個󠇡按鈕，不󠇡會送出任何資料。"),
    el("div", { class: "left", style: "text-align:left;font-size:1em;font-weight:400;color:var(--ink)" }, "<b>想收到學生的作答結果？</b><br>請到「教師管理」註冊帳號（免費）、建立組別，再把學生連結給學生。<br>只用來上課的話不󠇡用註冊；課文全文和生字講義需要課文密碼，有沒有註冊都一󠇡樣。"));
  const nag = el("input", { type: "checkbox", id: "nonag" }); const nl = el("label", { for: "nonag", class: "ui hint" }); nl.append(nag, " 這次使用期間不󠇡再提醒");
  const see = el("button", { type: "button", class: "btn" }, "看學生會看到的畫面"); see.onclick = () => { if (nag.checked) ssSet("nonag", "1"); openResult(true); };
  const tm = el("a", { href: "#teacher", class: "btn" }, "前往教師管理"); tm.onclick = () => { if (nag.checked) ssSet("nonag", "1"); $("#result").classList.remove("show"); };
  const ok = el("button", { type: "button", class: "btn solid" }, "知道了"); ok.onclick = () => { if (nag.checked) ssSet("nonag", "1"); $("#result").classList.remove("show"); };
  box.append(el("div", { style: "margin:8px 0" }, ""), nl, el("div", { class: "dbtns" }, ""));
  box.lastChild.append(see, tm, ok); $("#result").classList.add("show");
}
function openResult(preview) {
  preview = preview === true;
  if (!LOCK && !preview) { if (ssGet("nonag")) preview = true; else { demoNotice(); return; } }
  const tab = TABS.find(t => t[0] === cur.tab); const sm = summary();
  const lesson = GSHORT + plainText(LIST.find(l => l[0] === cur.lesson)[1]); const part = tab[1] + (tier() === "base" ? "（基礎層）" : "");
  const detail = sm.lines.join("\n");
  const box = $("#rbox"); box.className = "box sub"; box.innerHTML = "";
  const close = () => $("#result").classList.remove("show");
  box.append(el("h2", { id: "rtitle", style: "margin:0 0 6px;color:var(--accent)" }, "交給老師"), el("div", { class: "hint" }, `${lesson}　${part}` + (preview ? "　（示範畫面，不󠇡會送出）" : "")));
  const nm = el("input", { type: "text", class: "tkey", placeholder: "例：王小明", "aria-label": "姓名" }); nm.value = $("#who").value.trim();
  const r1 = el("div", { class: "srow" }); r1.append(el("span", {}, "姓名"), nm); box.append(r1);
  let cc = null;
  if (CLS.code && CLS.name) box.append(el("div", { class: "srow hint" }, `班級：${CLS.name}`));
  else if (!preview) { cc = el("input", { type: "text", class: "tkey", placeholder: "沒有可以空󠇡白", "aria-label": "組別代碼", style: "text-transform:uppercase" }); cc.value = CLS.code; const r2 = el("div", { class: "srow" }); r2.append(el("span", {}, "組別代碼"), cc); box.append(r2); }
  const all = CUR && CUR.todo ? CUR.todo() : []; const left = all.filter(x => !x.st);
  const back = el("button", { type: "button", class: "btn" }, left.length ? "回去做完" : "回去檢查");
  back.onclick = () => { close(); if (left.length && CUR) CUR.go(left[0].si, left[0].k); };
  if (all.length && !left.length) box.append(el("div", { class: "allok" }, `✓ 全部 ${all.length} 題都做完了！`));
  else if (all.length) {
    box.append(el("div", { class: "left" }, `還有 ${left.length} 題還沒做`));
    const ll = el("div", { class: "leftlist" }); const grp = {};
    left.forEach(x => { (grp[x.si] = grp[x.si] || []).push(x); });
    Object.values(grp).forEach(g => { const b = el("button", { type: "button", class: "chip" }, `${g[0].name}：${g.length} 題`); b.onclick = () => { close(); CUR.go(g[0].si, g[0].k); }; ll.append(b); });
    box.append(el("div", { class: "hint" }, "按一󠇡下，可以回到還沒做的地方："), ll);
  }
  const msg = el("p", { class: "hint", role: "status" });
  const btns = el("div", { class: "sbtns" }); btns.append(back);
  if (API && !API.startsWith("__")) {
    const send = el("button", { type: "button", class: "btn solid" }, "送出"); btns.append(send);
    if (!sm.lines.length) { send.disabled = true; msg.textContent = "先做題目，再交給老師。"; }
    send.onclick = async () => {
      if (preview) { msg.textContent = "這是示範畫面，不󠇡會送出。學生用學生連結作答時，按「送出」就會交給老師。"; return; }
      const name = nm.value.trim(); const code = cc ? cc.value.trim().toUpperCase() : CLS.code;
      if (!name) { msg.textContent = "請先寫上姓名。"; nm.focus(); return; }
      $("#who").value = name; store("who", name);
      if (cc && code !== CLS.code) { CLS.code = code; CLS.name = ""; CLS.pub = ""; try { localStorage.setItem("l4g-cls", code); } catch (e) {} }
      send.disabled = true; back.disabled = true; msg.textContent = "傳送中……";
      const r = REC[recKey()] || {};
      const prog = {}; all.forEach(x => { const o = prog[x.name] || (prog[x.name] = { sec: x.name, done: 0, total: 0 }); o.total++; if (x.st) o.done++; });
      const payload = { who: name, lesson, part, firstOk: sm.firstOk, judged: sm.judged, detail, items: Object.values(r), prog: Object.values(prog) };
      try {
        if (code && !CLS.pub) { const ci = await apiCall({ action: "classinfo", c: code }); if (!ci.ok) throw new Error("class"); CLS.name = ci.name; CLS.pub = ci.pub || ""; showClass(); }
        const body = code && CLS.pub ? { action: "submit", cls: code, enc: await sealFor(CLS.pub, payload) } : Object.assign({ cls: code }, payload);
        const j = await apiCall(body);
        if (!j.ok) throw new Error(j.error || "fail");
        box.innerHTML = ""; const ok = el("button", { type: "button", class: "btn solid", style: "font-size:20px;padding:12px 40px" }, "好"); ok.onclick = close;
        box.append(el("div", { class: "bigok" }, "✓"), el("h2", { style: "color:var(--ok)" }, "老師收到了！"), ok);
        if (cc && code) loadConfig();
      } catch (e) { send.disabled = false; back.disabled = false; msg.textContent = String(e.message) === "class" ? "找不󠇡到這個󠇡班級代碼，請問老師正確的代碼。" : "沒有送出成功，請再按一󠇡次「送出」，或請老師來看。"; }
    };
  } else msg.textContent = "老師還沒有設定作答紀錄，請請老師來看。";
  box.append(btns, msg); $("#result").classList.add("show");
}


/* qrcode-generator (c) Kazuhiko Arase, MIT license */
var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1})},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"██":"█","█ ":"▀"," █":"▄","  ":" "},l={"██":"▀","█ ":"▀"," █":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",h+=t<1&&r+1>=c?l[i]:g[i];h+="\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("▀"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("██"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}(function(){return qrcode});
function ssGet(k) { try { return sessionStorage.getItem(k) || ""; } catch (e) { return ""; } }
function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
function fmtTime(s) { const d = new Date(s); if (isNaN(d)) return s; const p = n => String(n).padStart(2, "0"); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function itemMark(x) {
  if (x.text !== undefined) return { cls: "tx", s: x.text ? "已寫" : "未寫" };
  if (x.first) return { cls: "ok", s: "一󠇡次答對" };
  if (x.done) return { cls: "mid", s: `第${x.tries}次答對` };
  return { cls: "ng", s: `未答對（試${x.tries}次）` };
}
function apiErr(e) {
  if (e.kind === "net") return "連不󠇡上後端：請確認網路正常；如果網路沒問題，請把這個󠇡畫面截圖給 Claude。";
  if (e.kind === "html") return "後端回傳錯誤（請把這段訊息給 Claude 看）：" + e.message;
  return "網站讀取資料時出錯（請把這段訊息給 Claude 看）：" + (e.message || e);
}
function copyText(s, btn) { try { navigator.clipboard.writeText(s); btn.textContent = "已複製"; setTimeout(() => btn.textContent = "複製連結", 1500); } catch (e) { prompt("請複製這個󠇡連結：", s); } }
/* 向度：練習（分頁）＋小節；舊紀錄沒有小節時，由題目名稱推回 */
function dimOf(x, it) { const sec = it.sec || String(it.label || "").replace(/[「：:（(\s].*$/, "").replace(/[0-9０-９]+$/, ""); return `${x.part}｜${sec || "其他"}`; }
/* 作答明細：每個󠇡小節收成一󠇢行摘要（答對、未答對、待確認幾題），按一󠇡下才展開；同一󠇡類（造句）再收成一󠇢層 */
function detailHTML(x) {
  const items = x.items || []; if (!items.length) return "";
  const secs = []; items.forEach(it => { const d = dimOf(x, it); let s = secs[secs.length - 1]; if (!s || s.d !== d) secs.push(s = { d, items: [] }); s.items.push(it); });
  const one = it => { const k = itemMark(it); return `<div class="ti"><span class="tm ${k.cls}">${k.s}</span>${esc(it.label)}${it.text ? `：<b>${esc(it.text)}</b>` : ""}${!it.done && it.last && it.text === undefined ? `<span class="hint">（最後選：${esc(it.last)}）</span>` : ""}</div>`; };
  const cnt = list => { const c = { ok: 0, ng: 0, tx: 0 }; list.forEach(it => { const k = itemMark(it).cls; if (k === "tx") c.tx++; else if (k === "ng") c.ng++; else c.ok++; }); return `<span class="tsum"><span class="tm ok">答對 ${c.ok}</span>${c.ng ? `<span class="tm ng">未答對 ${c.ng}</span>` : ""}${c.tx ? `<span class="tm tx">待確認 ${c.tx}</span>` : ""}</span>`; };
  const secH = s => `<details class="tdsec"${s.items.some(it => itemMark(it).cls === "ng" || itemMark(it).cls === "tx") ? "" : ""}><summary><b>${esc(s.d.split("｜")[1])}</b>${cnt(s.items)}</summary>${s.items.map(one).join("")}</details>`;
  const SG = secGroups();
  return groupRuns(secs, s => SG[s.d]).map(run => run.g ? `<details class="tdsec tdgrp"><summary><b>${esc(run.g)}（${run.items.length} 個小節）</b>${cnt(run.items.flatMap(s => s.items))}</summary>${run.items.map(secH).join("")}</details>` : secH(run.items[0])).join("");
}
function rateCls(p) { return p >= .8 ? "good" : p >= .6 ? "mid" : "low"; }
function dimCard(r) {
  /* 每位學生每個󠇡練習只取最新一󠇡次 */
  const seen = new Set(), latest = r.filter(x => { const k = x.cls + "|" + x.who + "|" + x.lesson + "|" + x.part; if (seen.has(k)) return false; seen.add(k); return true; });
  const dims = [], stu = [], cell = {};
  const C = (d, w) => cell[d + "\u0001" + w] || (cell[d + "\u0001" + w] = { n: 0, first: 0, done: 0, pend: 0, pd: 0, pt: 0 });
  latest.forEach(x => {
    if (!stu.includes(x.who)) stu.push(x.who);
    (x.prog || []).forEach(p => { const d = `${x.part}｜${p.sec}`; if (!dims.includes(d)) dims.push(d); const c = C(d, x.who); c.pd += p.done; c.pt += p.total; });
    (x.items || []).forEach(it => {
      const d = dimOf(x, it); if (!dims.includes(d)) dims.push(d);
      const c = C(d, x.who);
      if (it.text !== undefined) { c.pend++; return; }
      c.n++; if (it.first) c.first++; if (it.done) c.done++;
    });
  });
  if (!dims.length) return null;
  stu.sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const c = card("各向度正確率與完成度", "", "依每位學生每個󠇡練習最新一󠇡次的作答統計。大字是「一󠇡次就答對」的比例（只算有作答的題目）；「完成」是這個󠇡向度做了幾題／共幾題；黃色小標是「待老師確認」的題數（口說、自編詞句）。正確率顏色：綠色 80% 以上、黃色 60–79%、紅色 60% 以下。");
  const tb = el("table", { class: "ttable dimt" });
  const sum = (d, who) => { const list = who ? [cell[d + "\u0001" + who]].filter(Boolean) : stu.map(w => cell[d + "\u0001" + w]).filter(Boolean); return list.reduce((a, o) => ({ n: a.n + o.n, first: a.first + o.first, done: a.done + o.done, pend: a.pend + o.pend, pd: a.pd + o.pd, pt: a.pt + o.pt }), { n: 0, first: 0, done: 0, pend: 0, pd: 0, pt: 0 }); };
  const comp = o => o.pt ? `<span class="dcomp ${o.pd >= o.pt ? "full" : ""}">完成 ${o.pd}/${o.pt}（${Math.round(o.pd / o.pt * 100)}%）</span>` : "";
  const td = o => { if (!o.n && !o.pend) return o.pt ? `<td class="dc">—${comp(o)}</td>` : "<td>—</td>"; if (!o.n) return `<td class="dc"><span class="dpend">待確認 ${o.pend}</span>${comp(o)}</td>`; const p = o.first / o.n, q = o.done / o.n;
    return `<td class="dc ${rateCls(p)}"><b>${Math.round(p * 100)}%</b><small>一󠇡次答對 ${o.first}/${o.n}${q > p ? `　再試後 ${Math.round(q * 100)}%` : ""}</small>${comp(o)}${o.pend ? `<span class="dpend">待確認 ${o.pend}</span>` : ""}</td>`; };
  /* 同一󠇡類（例如造句的六個詞）收成一󠇡列，按一󠇡下展開 */
  const SG = secGroups(); const sumL = (ds, who) => ds.map(d => sum(d, who)).reduce((a, o) => ({ n: a.n + o.n, first: a.first + o.first, done: a.done + o.done, pend: a.pend + o.pend, pd: a.pd + o.pd, pt: a.pt + o.pt }), { n: 0, first: 0, done: 0, pend: 0, pd: 0, pt: 0 });
  const rowH = (ds, label, sub, cls, extra) => `<tr class="${cls}"${extra || ""}><th class="dn">${label}<small>${esc(sub)}</small></th>${stu.map(w => td(sumL(ds, w))).join("")}${stu.length > 1 ? td(sumL(ds)) : ""}</tr>`;
  let gi = 0;
  const body = groupRuns(dims, d => SG[d]).map(run => {
    if (!run.g) { const d = run.items[0]; return rowH([d], esc(d.split("｜")[1]), d.split("｜")[0], ""); }
    const k = gi++; const part = run.items[0].split("｜")[0];
    return rowH(run.items, `▸ ${esc(run.g)}（${run.items.length}）`, `${part}・按一󠇡下展開`, "dgrow", ` data-g="${k}"`) + run.items.map(d => rowH([d], "　" + esc(d.split("｜")[1]), d.split("｜")[0], "dkid", ` data-k="${k}" hidden`)).join("");
  }).join("");
  tb.innerHTML = `<thead><tr><th>向度</th>${stu.map(w => `<th>${esc(w)}</th>`).join("")}${stu.length > 1 ? "<th>全組</th>" : ""}</tr></thead><tbody>${body}</tbody>`;
  tb.querySelectorAll("tr.dgrow").forEach(r => { r.onclick = () => { const kids = tb.querySelectorAll(`tr.dkid[data-k="${r.dataset.g}"]`); const open = kids[0] && kids[0].hidden; kids.forEach(x => { x.hidden = !open; }); const th = r.querySelector("th"); th.firstChild.textContent = th.firstChild.textContent.replace(/^[▸▾]/, open ? "▾" : "▸"); }; });
  const sc = el("div", { class: "tscroll" }); sc.append(tb); c.append(sc); return c;
}
function drawTeacher(body) {
  body.innerHTML = ""; const onDel = TD.onDelete;
  const rows = TD.rows.slice().reverse();
  const uniq = f => [...new Set(rows.map(f).filter(Boolean))];
  const mk = (label, vals) => { const s = el("select", { class: "tsel" }); s.append(el("option", { value: "" }, `全部${label}`)); vals.forEach(v => s.append(el("option", { value: v }, v))); return s; };
  const sL = mk("課次", uniq(r => r.lesson)), sP = mk("練習", uniq(r => r.part)), sW = mk("學生", uniq(r => r.who).sort((a, b) => a.localeCompare(b, "zh-Hant")));
  const sC = mk("組別", uniq(r => r.clsName)); if (!TD.owner || TD.code) sC.hidden = true;
  const latest = el("input", { type: "checkbox", id: "tlatest" }); latest.checked = true;
  const lab = el("label", { class: "ui", for: "tlatest" }); lab.append(latest, " 每人每個󠇡練習只看最新一󠇡次"); const bar = tools(sC, sL, sP, sW, lab);
  const out = el("div");
  const fc = card("篩選", "", ""); fc.append(bar); body.append(fc, out);
  const draw = () => {
    const base = rows.filter(x => (!sC.value || x.clsName === sC.value) && (!sL.value || x.lesson === sL.value) && (!sP.value || x.part === sP.value) && (!sW.value || x.who === sW.value));
    let r = base;
    if (latest.checked) { const seen = new Set(); r = r.filter(x => { const k = x.cls + "|" + x.who + "|" + x.lesson + "|" + x.part; if (seen.has(k)) return false; seen.add(k); return true; }); }
    out.innerHTML = "";
    const dc = dimCard(base); if (dc) out.append(dc);
    const list = card(`作答紀錄（${r.length} 筆）`, "", "按「看明細」可以看每一󠇢題的情形。");
    const tb = el("table", { class: "ttable" });
    tb.innerHTML = `<thead><tr><th>時間</th><th>姓名</th><th>課次</th><th>練習</th><th>完成度</th><th>一󠇡次答對</th><th></th></tr></thead>`;
    const tbody = el("tbody");
    r.forEach(x => {
      const tr = el("tr"); const rate = x.judged ? Math.round(x.firstOk / x.judged * 100) : null;
      tr.innerHTML = `<td>${fmtTime(x.time)}</td><td>${esc(x.who)}</td><td>${esc(x.lesson)}</td><td>${esc(x.part)}</td><td>${(() => { const p = (x.prog || []).reduce((a, o) => [a[0] + o.done, a[1] + o.total], [0, 0]); return p[1] ? `${p[0]} / ${p[1]}（${Math.round(p[0] / p[1] * 100)}%）` : "—"; })()}</td><td>${x.judged ? `${x.firstOk} / ${x.judged}（${rate}%）` : "—"}</td>`;
      const td = el("td"); const b = el("button", { type: "button", class: "btn" }, "看明細"); td.append(b); tr.append(td); tbody.append(tr);
      const dr = el("tr", { class: "tdetail", hidden: "" }); const dd = el("td", { colspan: "7" });
      dd.innerHTML = detailHTML(x) || `<pre>${esc(x.detail)}</pre>`;
      if (onDel) { const del = el("button", { type: "button", class: "btn" }, "刪除這筆紀錄"); let armed = false; del.onclick = () => { if (!armed) { armed = true; del.textContent = "確定刪除？再按一󠇡次"; setTimeout(() => { armed = false; del.textContent = "刪除這筆紀錄"; }, 4000); return; } del.disabled = true; onDel([x]); }; dd.append(tools(del)); }
      dr.append(dd); tbody.append(dr);
      b.onclick = () => { dr.hidden = !dr.hidden; b.textContent = dr.hidden ? "看明細" : "收起"; };
    });
    tb.append(tbody); const sc1 = el("div", { class: "tscroll" }); sc1.append(tb);
    const csv = el("button", { type: "button", class: "btn" }, "下載成 Excel 檔（CSV）");
    csv.onclick = () => {
      const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [["時間", "組別", "姓名", "課次", "練習", "向度", "一󠇡次答對", "作答題數", "題目", "結果", "學生答案"].map(q).join(",")];
      r.forEach(x => (x.items && x.items.length ? x.items : [null]).forEach(it => { const k = it ? itemMark(it) : null;
        lines.push([fmtTime(x.time), x.clsName, x.who, x.lesson, x.part, it ? dimOf(x, it).split("｜")[1] : "", x.firstOk, x.judged, it ? it.label : "", k ? k.s : "", it ? (it.text ?? it.last ?? "") : ""].map(q).join(",")); }));
      const a2 = el("a", { href: URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv" })), download: "作答紀錄.csv" }); document.body.append(a2); a2.click(); a2.remove();
    };
    const openAll = el("button", { type: "button", class: "btn" }, "全部展開明細"); let allOpen = false;
    openAll.onclick = () => { allOpen = !allOpen; tbody.querySelectorAll("tr.tdetail").forEach(d => { d.hidden = !allOpen; const b = d.previousElementSibling && d.previousElementSibling.querySelector("button"); if (b) b.textContent = allOpen ? "收起" : "看明細"; }); openAll.textContent = allOpen ? "全部收起明細" : "全部展開明細"; };
    const btns = [openAll, csv];
    if (onDel && base.length) {
      const delAll = el("button", { type: "button", class: "btn" }, `刪除符合篩選的 ${base.length} 筆紀錄`); let armed = false;
      delAll.onclick = () => { if (!armed) { armed = true; delAll.textContent = `確定刪除 ${base.length} 筆？再按一󠇡次`; setTimeout(() => { armed = false; delAll.textContent = `刪除符合篩選的 ${base.length} 筆紀錄`; }, 4000); return; } delAll.disabled = true; onDel(base); };
      btns.push(delAll);
    }
    list.append(tools(...btns), sc1); out.append(list);
    if (sL.value && sP.value) {
      const by = {};
      r.forEach(x => (x.items || []).forEach(it => { if (it.text !== undefined) return; const o = by[it.label] || (by[it.label] = { n: 0, ok: 0, miss: [] }); o.n++; if (it.first) o.ok++; else o.miss.push(x.who); }));
      const ks = Object.keys(by);
      if (ks.length) {
        const qc = card("各題答對情形", "", "依每位學生最新一󠇡次作答統計（請勾選上方「只看最新一󠇡次」）。");
        const qt = el("table", { class: "ttable" });
        qt.innerHTML = `<thead><tr><th>題目</th><th>一󠇡次答對</th><th>需要再教</th></tr></thead><tbody>${ks.map(k => { const o = by[k]; return `<tr${o.ok / o.n < .6 ? ' class="low"' : ""}><td>${esc(k)}</td><td>${o.ok} / ${o.n}</td><td>${o.miss.map(esc).join("、") || "—"}</td></tr>`; }).join("")}</tbody>`;
        const sc2 = el("div", { class: "tscroll" }); sc2.append(qt); qc.append(sc2); out.append(qc);
      }
    }
  };
  [sC, sL, sP, sW, latest].forEach(s => s.onchange = draw); draw();
}
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }



/* ── 加密工具（瀏覽器內建 WebCrypto）── */
const b64 = buf => { const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const TENC = new TextEncoder(), TDEC = new TextDecoder();
async function pbkdf(pass, salt, bits) {
  const base = await crypto.subtle.importKey("raw", TENC.encode(pass), "PBKDF2", false, ["deriveBits", "deriveKey"]);
  const p = { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" };
  return bits ? crypto.subtle.deriveBits(p, base, 256) : crypto.subtle.deriveKey(p, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
/* 驗證碼：由密碼算出，網站只收到這個󠇡，收不󠇡到密碼本身 */
async function authToken(acct, pass) { return b64(await pbkdf(pass, TENC.encode("guoyu6-auth|" + acct), true)); }
async function sealPriv(pkcs8, pass) {
  const s = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const d = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await pbkdf(pass, s), pkcs8);
  return JSON.stringify({ s: b64(s), iv: b64(iv), d: b64(d) });
}
async function openPriv(blob, pass) { const o = JSON.parse(blob); return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, await pbkdf(pass, unb64(o.s)), unb64(o.d))); }
async function newKeyPair() {
  const kp = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  return { pub: b64(await crypto.subtle.exportKey("spki", kp.publicKey)), pkcs8: new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey)) };
}
async function zipBytes(bytes, un) {
  if (typeof CompressionStream === "undefined") return null;
  const st = new Blob([bytes]).stream().pipeThrough(un ? new DecompressionStream("deflate-raw") : new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(st).arrayBuffer());
}
/* 學生端：用老師的公鑰把作答鎖起來 */
async function sealFor(pubB64, obj) {
  const pub = await crypto.subtle.importKey("spki", unb64(pubB64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  let data = TENC.encode(JSON.stringify(obj)), z = 0; const c = await zipBytes(data); if (c) { data = c; z = 1; }
  const raw = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const d = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, data);
  const ek = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, raw);
  return JSON.stringify({ v: 1, z, k: b64(ek), iv: b64(iv), d: b64(d) });
}
async function openSealed(priv, blob) {
  const o = JSON.parse(blob);
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, priv, unb64(o.k));
  const k = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  let d = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, k, unb64(o.d)));
  if (o.z) d = await zipBytes(d, true);
  return JSON.parse(TDEC.decode(d));
}
/* 救援碼：忘記密碼時用來取回鑰匙、重󠇡設密碼 */
function newRecoveryCode() { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const r = crypto.getRandomValues(new Uint8Array(16)); let s = ""; r.forEach((x, i) => { s += A[x % 32]; if (i % 4 === 3 && i < 15) s += "-"; }); return s; }
const normRC = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const recAuth = (acct, code) => authToken(acct, "rec:" + normRC(code));
async function recoveryPack(acct, pkcs8, code) { return { authR: await recAuth(acct, code), privR: await sealPriv(pkcs8, normRC(code)) }; }
/* 作答方式設定用：學生姓名的不可逆代號 */
async function nameKey(cls, name) {
  const h = await crypto.subtle.digest("SHA-256", TENC.encode("guoyu6-name|" + String(cls).toUpperCase() + "|" + String(name).trim()));
  return [...new Uint8Array(h)].slice(0, 10).map(x => x.toString(16).padStart(2, "0")).join("");
}

/* ── 教師管理（後台）── */
const OWNER = "管理者";
const TD = { me: null, rows: null, gsel: "", tab: "", owner: false, code: "" };
const cred = () => TD.me.owner ? { acct: OWNER, pass: TD.me.pass } : { acct: TD.me.acct, auth: TD.me.auth };
function errMsg(j) {
  const e = j && j.error;
  if (e === "key") return "帳號或密碼不󠇡對。";
  if (e === "taken") return "這個󠇡帳號已經有人用了，請換一󠇡個󠇡。";
  if (e === "no name" || e === "action") return "後端還是舊版：請把新版 Code.gs 貼上，並在「管理部署作業」用「新版本」重󠇡新部署。";
  if (e === "input") return "資料不完整，請再檢查一󠇡次。";
  if (e === "recovery") return "帳號或救援碼不󠇡對。";
  return "失敗：" + e;
}
async function doLogin(acct, pass) {
  acct = acct.trim();
  if (acct === OWNER) {
    const j = await apiCall({ action: "login", acct, pass }); if (!j.ok) throw j;
    TD.me = { acct, owner: true, pass, info: j };
  } else {
    const auth = await authToken(acct, pass);
    const j = await apiCall({ action: "login", acct, auth }); if (!j.ok) throw j;
    const pkcs8 = await openPriv(j.priv, pass);
    const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
    TD.me = { acct, owner: false, auth, pub: j.pub, pkcs8, key, allGroups: j.groups || [], groups: (j.groups || []).filter(g => isMyGrade(g.name)), hasRecovery: !!j.hasRecovery };
    if (!TD.me.groups.some(g => g.code === TD.gsel)) TD.gsel = (TD.me.groups[0] || {}).code || "";
  }
  TD.rows = null; ssSet("tacct", acct); ssSet("tpass", pass); return true;
}
function logout() { TD.me = null; TD.rows = null; ssSet("tacct", ""); ssSet("tpass", ""); renderTeacher(); }
function renderTeacher() {
  if (cur.tab === "sheets") cur.tab = "text";
  document.documentElement.classList.add("tmode");
  const m = $("#main"); m.innerHTML = ""; m.className = "scrollpage tview"; $("#pop").classList.remove("show"); CUR = null;
  const tb = $("#tback"); if (tb) tb.href = `#l${cur.lesson}-${cur.tab}`;
  if (!API || API.startsWith("__")) { m.append(card("教師管理", "", "還沒有設定作答紀錄後端。")); return; }
  if (!window.crypto || !crypto.subtle) { m.append(card("教師管理", "", "這個󠇡瀏覽器不支援加密功能，請改用新版的 Chrome、Edge 或 Safari。")); return; }
  if (TD.me) { drawBackend(m); return; }
  const sa = ssGet("tacct"), sp = ssGet("tpass");
  if (sa && sp) {
    m.append(el("p", { class: "hint" }, "登入中……"));
    doLogin(sa, sp).then(() => { if (page() === "teacher") renderTeacher(); }).catch(() => { ssSet("tpass", ""); if (page() === "teacher") renderTeacher(); });
    return;
  }
  drawLogin(m);
}
function inp(ph, type = "text", ac = "off") { return el("input", { type, class: "tkey", placeholder: ph, autocomplete: ac }); }
function drawLogin(m) {
  const box = el("div", { class: "tlogin" });
  const lc = card("教師管理登入", "", "輸入你的帳號和密碼。");
  const a = inp("帳號", "text", "username"), p = inp("密碼", "password", "current-password"); a.value = ssGet("tacct");
  const go = el("button", { type: "button", class: "btn solid" }, "登入"); const msg = el("p", { class: "hint", role: "status" });
  const run = async () => {
    if (!a.value.trim() || !p.value) { msg.textContent = "請輸入帳號和密碼。"; return; }
    go.disabled = true; msg.textContent = "登入中……（第一次會比較久，正在解開你的鑰匙）";
    try { await doLogin(a.value, p.value); renderTeacher(); }
    catch (e) { msg.textContent = e && e.ok === false ? errMsg(e) : (e && e.kind ? apiErr(e) : "密碼不󠇡對，或資料無法解開。"); go.disabled = false; }
  };
  go.onclick = run; p.onkeydown = e => { if (e.key === "Enter") run(); };
  const fg = el("button", { type: "button", class: "btn" }, "忘記密碼？");
  lc.append(tools(a, p, go, fg), msg);
  const fc = el("div", { class: "tforgot", hidden: "" });
  const fa = inp("帳號"), fcode = inp("救援碼，例：ABCD-EFGH-JKLM-NPQR"), f1 = inp("新密碼（至少 8 個字）", "password", "new-password"), f2 = inp("再輸入一󠇡次新密碼", "password", "new-password");
  fcode.style.width = "18em"; const fgo = el("button", { type: "button", class: "btn solid" }, "重󠇡設密碼"); const fmsg = el("p", { class: "hint", role: "status" });
  fc.append(el("p", { class: "hint" }, "用註冊時拿到的救援碼重󠇡設密碼，舊的作答紀錄都還在。沒有救援碼的話，紀錄就無法找回，只能用新的帳號重󠇡新註冊。"), tools(fa, fcode), tools(f1, f2, fgo), fmsg);
  fg.onclick = () => { fc.hidden = !fc.hidden; fa.value = a.value; };
  fgo.onclick = async () => {
    const acct = fa.value.trim(), code = normRC(fcode.value);
    if (!acct || code.length !== 16) { fmsg.textContent = "請輸入帳號和 16 碼救援碼。"; return; }
    if (f1.value.length < 8) { fmsg.textContent = "新密碼至少 8 個字。"; return; }
    if (f1.value !== f2.value) { fmsg.textContent = "兩次輸入的新密碼不一󠇡樣。"; return; }
    fgo.disabled = true; fmsg.textContent = "驗證救援碼中……";
    try {
      const authR = await recAuth(acct, code);
      const j = await apiCall({ action: "getrecovery", acct, authR }); if (!j.ok) { fmsg.textContent = errMsg(j); fgo.disabled = false; return; }
      const pkcs8 = await openPriv(j.privR, code);
      const k = await apiCall({ action: "recoverset", acct, authR, newauth: await authToken(acct, f1.value), newpriv: await sealPriv(pkcs8, f1.value) });
      if (!k.ok) { fmsg.textContent = errMsg(k); fgo.disabled = false; return; }
      await doLogin(acct, f1.value); renderTeacher();
    } catch (e) { fmsg.textContent = e && e.ok === false ? errMsg(e) : (e && e.kind ? apiErr(e) : "救援碼不󠇡對。"); fgo.disabled = false; }
  };
  lc.append(fc, el("p", { class: "hint" }, "還沒有帳號？請在下方註冊。"));
  const rc = card("第一次使用？註冊帳號", "", "帳號自己取（例如「王老師」），只用來登入，學生看不󠇡到。密碼至少 8 個字，請自己記好，忘記無法找回。");
  const ra = inp("自訂帳號（20 字以內）"), r1 = inp("設定密碼（至少 8 個字）", "password", "new-password"), r2 = inp("再輸入一󠇡次密碼", "password", "new-password");
  const agree = el("input", { type: "checkbox", id: "tagree" }); const al = el("label", { for: "tagree", class: "ui" }); al.append(agree, " 我已閱讀下方的「隱私與安全說明」");
  const rg = el("button", { type: "button", class: "btn solid" }, "註冊"); const rmsg = el("p", { class: "hint", role: "status" });
  rg.onclick = async () => {
    const acct = ra.value.trim();
    if (!acct || acct.length > 20) { rmsg.textContent = "請輸入 20 字以內的帳號。"; return; }
    if (acct === OWNER) { rmsg.textContent = "這個󠇡名稱保留給網站管理者，請換一󠇡個󠇡。"; return; }
    if (r1.value.length < 8) { rmsg.textContent = "密碼至少 8 個字。"; return; }
    if (r1.value !== r2.value) { rmsg.textContent = "兩次輸入的密碼不一󠇡樣。"; return; }
    if (!agree.checked) { rmsg.textContent = "請先閱讀並勾選隱私與安全說明。"; return; }
    rg.disabled = true; rmsg.textContent = "正在產生你的專屬鑰匙……";
    try {
      const kp = await newKeyPair(); const code = newRecoveryCode();
      const j = await apiCall({ action: "register", acct, auth: await authToken(acct, r1.value), pub: kp.pub, priv: await sealPriv(kp.pkcs8, r1.value), ...(await recoveryPack(acct, kp.pkcs8, code)) });
      if (!j.ok) { rmsg.textContent = errMsg(j); rg.disabled = false; return; }
      await doLogin(acct, r1.value); TD.tab = "group"; TD.showRC = code; renderTeacher();
    } catch (e) { rmsg.textContent = e && e.ok === false ? errMsg(e) : apiErr(e); rg.disabled = false; }
  };
  rc.append(tools(ra, r1, r2), tools(al, rg), rmsg, el("p", { class: "hint" }, "註冊完成後會給你一󠇢組「救援碼」，忘記密碼時用它重󠇡設，請一󠇡定要存好。"));
  const diff = card("要不󠇡要註冊？", "", "");
  diff.append(el("div", { class: "tscroll" }, `<table class="ttable"><thead><tr><th>功能</th><th>不󠇡註冊</th><th>註冊後</th></tr></thead><tbody>
<tr><td>投影上課、教學工具（畫筆、遮住選項、抽籤、計時）、其他課程內容</td><td>✓</td><td>✓</td></tr>
<tr><td>課文全文、彩色生字圖</td><td>需課文密碼</td><td>需課文密碼</td></tr>
<tr><td>學生練習示範（用大螢幕示範學生怎麼作答）</td><td>✓</td><td>✓</td></tr>
<tr><td>下載生字講義（本頁下方「紙本學習單」）</td><td>需課文密碼</td><td>需課文密碼</td></tr>
<tr><td>下載其他紙本學習單（詞語、字音字形、句型）</td><td>✓</td><td>✓</td></tr>
<tr><td>學生連結與 QR code（學生平板只看到學生練習）</td><td>—</td><td>✓</td></tr>
<tr><td>收到學生的作答結果，看每一󠇢題答對情形、下載成 Excel</td><td>—</td><td>✓</td></tr>
<tr><td>設定每位學生能用口說、寫字或打字作答</td><td>—</td><td>✓</td></tr>
</tbody></table>`), el("p", { class: "hint" }, "註冊免費，只用來收學生作答紀錄，不能代替課文密碼。課文密碼只提供給網站管理者認識的老師，提示：管理者 IG 頭像的英文。學生的作答會加密，只有你看得󠇡到。"));
  const b5 = el("div"); tabB5(b5);
  const more = card("使用說明與隱私", "", "完整的使用說明、隱私說明和著作權說明，都在「使用說明」頁。"); const gm = el("button", { type: "button", class: "btn" }, "看使用說明"); gm.onclick = () => { location.hash = "guide"; }; more.append(tools(gm));
  box.append(lc, rc, diff, b5, more); m.append(box);
}
function rcCard(code, onDone) {
  const c = card("請存好你的救援碼", "", "忘記密碼時，要用這組救援碼才能重󠇡設密碼、找回作答紀錄。它只會出現這一󠇡次，網站和管理者都沒有備份。");
  c.append(el("div", { class: "rcode" }, code));
  const cp = el("button", { type: "button", class: "btn" }, "複製"); cp.onclick = () => { copyText(code, cp); };
  const dl = el("button", { type: "button", class: "btn" }, "下載成文字檔");
  dl.onclick = () => { const a2 = el("a", { href: URL.createObjectURL(new Blob([`快樂學國語　教師管理救援碼\r\n帳號：${TD.me.acct}\r\n救援碼：${code}\r\n\r\n忘記密碼時，在登入頁按「忘記密碼？」，輸入帳號和救援碼就能重󠇡設密碼。請把這個󠇡檔案存在安全的地方。`], { type: "text/plain" })), download: "救援碼.txt" }); document.body.append(a2); a2.click(); a2.remove(); };
  const ok = el("input", { type: "checkbox", id: "rcok" }); const ol = el("label", { for: "rcok", class: "ui" }); ol.append(ok, " 我已經抄下或存好救援碼");
  const go = el("button", { type: "button", class: "btn solid", disabled: "" }, "繼續"); ok.onchange = () => go.disabled = !ok.checked; go.onclick = onDone;
  c.append(tools(cp, dl), tools(ol, go)); return c;
}
function drawBackend(m) {
  const me = TD.me;
  if (TD.showRC) { m.append(rcCard(TD.showRC, () => { TD.showRC = ""; renderTeacher(); })); return; }
  const top = el("div", { class: "tbar" });
  top.append(el("b", {}, `帳號：${me.acct}`));
  if (!me.owner) {
    const sel = el("select", { class: "tsel", "aria-label": "組別" });
    me.groups.forEach(g => sel.append(el("option", { value: g.code }, g.name)));
    sel.value = TD.gsel; sel.onchange = () => { TD.gsel = sel.value; renderTeacher(); };
    const add = el("button", { type: "button", class: "btn" }, "＋新增組別"); add.onclick = () => { TD.tab = "group"; renderTeacher(); };
    if (me.groups.length) top.append(el("span", { class: "ui" }, "組別"), sel);
    top.append(add);
  }
  const out = el("button", { type: "button", class: "btn" }, "登出"); out.onclick = logout; top.append(el("span", { class: "grow" }), out);
  if (!me.owner && !me.hasRecovery) { const w = el("div", { class: "twarn" }, "你還沒有救援碼，忘記密碼就無法找回紀錄。"); const b = el("button", { type: "button", class: "btn" }, "現在產生"); b.onclick = () => { GTAB = "acct"; location.hash = "guide"; }; w.append(b); m.append(w); }
  const TABS2 = me.owner ? [["accts", "老師帳號"], ["msg", (me.info && me.info.unread) ? `站內信（${me.info.unread}）` : "站內信"], ["legacy", "未加密的舊紀錄"], ["b5", "紙本學習單"]]
    : [["task", "今日任務"], ["rec", "作答紀錄"], ["roster", "學生名單與作答方式"], ["link", "學生連結"], ["group", "組別管理"], ["b5", "紙本學習單"], ["msg", "站內信"]];
  if (!TD.tab || (!TABS2.some(t => t[0] === TD.tab) && TD.tab !== "group")) TD.tab = TABS2[0][0];
  if (!me.owner && !me.groups.length && ["task", "rec", "roster", "link"].includes(TD.tab)) TD.tab = "group";
  const nav = el("div", { class: "ttabs", role: "tablist" });
  TABS2.forEach(([id, n]) => { const b = el("button", { type: "button", role: "tab", "aria-selected": String(TD.tab === id) }, n); b.onclick = () => { TD.tab = id; renderTeacher(); }; nav.append(b); });
  const body = el("div");
  m.append(top, nav, body);
  ({ task: tabTask, group: tabGroup, rec: tabRec, roster: tabRoster, link: tabLink, b5: tabB5, acct: tabAcct, help: tabHelp, accts: tabAccts, legacy: tabLegacy, msg: tabMsg })[TD.tab](body);
}
const curGroup = () => (TD.me.groups || []).find(g => g.code === TD.gsel);
/* 學生平板上的「老師」入口：輸入任何一󠇡位老師的帳號密碼，解除學生模式 */
function teacherUnlockBtn() {
  if (!LOCK || $("#tunlock")) return;
  const b = el("button", { type: "button", id: "tunlock", title: "老師用：解除學生模式" }, "老師"); document.body.append(b);
  b.onclick = () => {
    const box = $("#rbox"); box.className = "box sub"; box.innerHTML = "";
    const a = inp("老師帳號", "text", "username"), p = inp("密碼", "password", "current-password");
    const go = el("button", { type: "button", class: "btn solid" }, "解除學生模式"), cc = el("button", { type: "button", class: "btn" }, "取消");
    const msg = el("p", { class: "hint", role: "status" });
    cc.onclick = () => $("#result").classList.remove("show");
    const run = async () => {
      if (!a.value.trim() || !p.value) { msg.textContent = "請輸入帳號和密碼。"; return; }
      go.disabled = true; msg.textContent = "確認中……";
      try { await doLogin(a.value, p.value); location.replace(location.pathname + "?t" + location.hash); }
      catch (e) { msg.textContent = e && e.ok === false ? errMsg(e) : (e && e.kind ? apiErr(e) : "帳號或密碼不󠇡對。"); go.disabled = false; }
    };
    go.onclick = run; p.onkeydown = e => { if (e.key === "Enter") run(); };
    box.append(el("h2", { id: "rtitle", style: "margin:0 0 6px;color:var(--accent)" }, "老師解鎖"), el("p", { style: "margin:0 0 8px" }, "這台裝置目前是學生模式。輸入老師的帳號和密碼，就能恢復投影上課與教師管理。"),
      el("div", { class: "srow" }, ""), el("div", { class: "srow" }, "")); const rs = box.querySelectorAll(".srow"); rs[0].append(a); rs[1].append(p);
    const bt = el("div", { class: "dbtns" }); bt.append(go, cc); box.append(bt, msg); $("#result").classList.add("show"); setTimeout(() => a.focus(), 50);
  };
}
async function editConfig(code, fn) {
  const conf = (await fetchConfig(code)) || {}; fn(conf);
  const j = await apiCall({ action: "saveconfig", ...cred(), c: code, config: conf }); if (!j.ok) throw j; return conf;
}
/* 暫停學生練習：學生平板畫面蓋住「請看老師這裡」（約 15 秒內生效），按「繼續」打開 */
async function setPause(code, on) { return editConfig(code, c => { c.pause = { on: !!on, at: new Date().toISOString() }; }); }
function pauseQuick() {
  const box = $("#rbox"); box.className = "box sub"; box.innerHTML = ""; const close = () => $("#result").classList.remove("show");
  const gs = el("select", { class: "tsel" }); TD.me.groups.forEach(g => gs.append(el("option", { value: g.code }, g.name))); gs.value = TD.gsel || TD.me.groups[0].code;
  const st = el("p", { style: "font-size:1.1em;margin:6px 0" }, "讀取中……"), msg = el("p", { class: "hint", role: "status" });
  const on = el("button", { type: "button", class: "btn solid" }, "⏸ 暫停學生練習"), off = el("button", { type: "button", class: "btn solid" }, "▶ 讓學生繼續練習"), cc = el("button", { type: "button", class: "btn" }, "關閉");
  const show = async () => { st.textContent = "讀取中……"; const c = await fetchConfig(gs.value); const p = !!(c && c.pause && c.pause.on); st.textContent = p ? "目前：⏸ 暫停中（學生畫面蓋住）" : "目前：▶ 學生可以練習"; on.hidden = p; off.hidden = !p; };
  const run = async v => { on.disabled = off.disabled = true; msg.textContent = "儲存中……"; try { await setPause(gs.value, v); TD.gsel = gs.value; msg.textContent = v ? "已暫停，學生畫面約 15 秒內會蓋住。" : "已打開，學生約 15 秒內可以繼續。"; await show(); } catch (e) { msg.textContent = e.ok === false ? errMsg(e) : apiErr(e); } on.disabled = off.disabled = false; };
  on.onclick = () => run(true); off.onclick = () => run(false); cc.onclick = close; gs.onchange = show;
  box.append(el("h2", { id: "rtitle", style: "margin:0 0 6px;color:var(--accent)" }, "暫停／繼續學生練習"), el("div", { class: "srow" }, ""), st);
  box.querySelector(".srow").append(el("span", {}, "組別"), gs);
  const bt = el("div", { class: "dbtns" }); bt.append(on, off, cc); box.append(bt, msg, el("p", { class: "hint" }, "暫停時，學生平板會蓋上「請看老師這裡」，不能作答；已經寫的答案不󠇡會不󠇡見。"));
  $("#result").classList.add("show"); show();
}
/* 投影上課時的快捷鍵：講完直接開放目前這個󠇡小節 */
function openTaskQuick() {
  const p = DPOS[recKey()] || { s: 0 }; const meta = sectionMeta(cur.lesson, cur.tab); const pn = CUR && CUR.sections && CUR.sections[p.s] ? CUR.sections[p.s].name : null; /* 投影與學生練習的小節順序不同，要用小節名稱對應（舊版用編號，會開到別的小節） */ const m = meta.find(x => x.name === pn);
  const box = $("#rbox"); box.className = "box sub"; box.innerHTML = "";
  const close = () => $("#result").classList.remove("show");
  if (!m) { box.append(el("h2", { id: "rtitle" }, "這張卡片不能開放"), el("p", {}, "這個󠇡小節沒有對應的學生練習。")); const ok = el("button", { type: "button", class: "btn solid" }, "知道了"); ok.onclick = close; box.append(ok); $("#result").classList.add("show"); return; }
  const t0 = { lesson: cur.lesson, tab: cur.tab, idx: m.i, name: m.name };
  box.append(el("h2", { id: "rtitle", style: "margin:0 0 6px;color:var(--accent)" }, "開放給學生練習"), el("div", { style: "font-size:1.1em;margin-bottom:8px" }, esc(taskName(t0))));
  const gs = el("select", { class: "tsel" }); TD.me.groups.forEach(g => gs.append(el("option", { value: g.code }, g.name))); gs.value = TD.gsel || TD.me.groups[0].code;
  const n = el("input", { type: "number", class: "tkey", min: "1", max: String(Math.max(1, m.nq)), style: "width:5em" }); n.value = m.nq && !m.seq ? Math.min(m.nq, 6) : ""; if (!m.nq || m.seq) { n.disabled = true; n.placeholder = "全部"; }
  box.append(el("div", { class: "srow" }, ""), el("div", { class: "srow" }, "")); const rows = box.querySelectorAll(".srow");
  rows[0].append(el("span", {}, "組別"), gs); rows[1].append(el("span", {}, m.seq ? `照步驟全部做（共 ${m.nq} 題）` : `每人做幾題（共 ${m.nq} 題）`), n);
  const msg = el("p", { class: "hint", role: "status" });
  const ok = el("button", { type: "button", class: "btn solid" }, "開放"), off = el("button", { type: "button", class: "btn" }, "關閉這個󠇡小節"), cc = el("button", { type: "button", class: "btn" }, "取消");
  const run = async on => {
    ok.disabled = off.disabled = true; msg.textContent = "儲存中……";
    try { await editTasks(gs.value, ts => { const i = ts.findIndex(y => y.lesson === t0.lesson && y.tab === t0.tab && y.idx === t0.idx); if (i >= 0) ts.splice(i, 1);
        if (on) { const nn = Math.max(0, Math.min(m.nq, parseInt(n.value, 10) || 0)); ts.push(Object.assign({}, t0, { n: nn && nn < m.nq ? nn : 0, at: new Date().toISOString() })); } });
      TD.gsel = gs.value; msg.textContent = on ? "已開放，學生平板約 15 秒內會自動更新。" : "已關閉。"; setTimeout(close, 1200); }
    catch (e) { msg.textContent = e.ok === false ? errMsg(e) : apiErr(e); ok.disabled = off.disabled = false; }
  };
  ok.onclick = () => run(true); off.onclick = () => run(false); cc.onclick = close;
  const bt = el("div", { class: "dbtns" }); bt.append(ok, off, cc); box.append(bt, msg); $("#result").classList.add("show");
}
/* 今日任務：讀出、修改、存回組別設定（保留名單與作答方式） */
async function editTasks(code, fn) {
  const conf = (await fetchConfig(code)) || {}; conf.tasks = conf.tasks || []; fn(conf.tasks);
  const j = await apiCall({ action: "saveconfig", ...cred(), c: code, config: conf }); if (!j.ok) throw j; return conf.tasks;
}
const taskName = t => { const tab = TABS.find(x => x[0] === t.tab); const ln = (LIST.find(x => x[0] === t.lesson) || [0, ""])[1]; return `${plainText(ln).split(/\s+/)[0]}｜${tab ? tab[1] : t.tab}｜${t.name}`; };
function tabTask(body) {
  const g = curGroup();
  const c = card(`今日任務：${g.name}`, "", "勾選今天上完、要讓學生練習的小節，並設定每位學生要做幾題（隨機抽題，每人不同；「語句練習」的小節有先後步驟，會整組開放）。設定後，學生平板只看得󠇡到開放的部分，其他分頁會鎖住；之前開放過的仍可複習，最新一󠇡次設定的會標上 ★ 今天。學生平板約 15 秒內會自動更新，不󠇡用重󠇡新整理。上課時想讓學生先看老師講解，可以按「暫停」。");
  const msg = el("p", { class: "hint", role: "status" }, "讀取中……"); const curBox = el("div"); const addBox = el("div");
  const pz = el("button", { type: "button", class: "btn" }, "⏸ 暫停／繼續學生練習"); pz.onclick = () => { TD.gsel = g.code; pauseQuick(); };
  c.append(tools(pz), msg); body.append(c, curBox, addBox);
  let tasks = [];
  const drawCur = () => {
    curBox.innerHTML = "";
    const k = card("已開放的練習", "", tasks.length ? "" : "目前沒有設定，學生可以做全部的練習。");
    if (tasks.length) {
      const latest = tasks.reduce((a, t) => (t.at > a ? t.at : a), ""); const day = s => (new Date(s)).toDateString();
      /* 依「課次｜分頁」收成一󠇡列；小節用小標籤列出（造句這類同一󠇢組的合成一󠇡個󠇡），✕ 關閉單一項，「調整」帶到下方重󠇡新勾選 */
      const close = async pred => { try { tasks = await editTasks(g.code, ts => { for (let i = ts.length - 1; i >= 0; i--) if (pred(ts[i])) ts.splice(i, 1); }); drawCur(); fill(); } catch (e) { msg.textContent = e.ok === false ? errMsg(e) : apiErr(e); } };
      const pages = []; tasks.forEach(t => { const key = t.lesson + "|" + t.tab; let p = pages.find(x => x.key === key); if (!p) pages.push(p = { key, lesson: t.lesson, tab: t.tab, ts: [], at: "" }); p.ts.push(t); if (t.at > p.at) p.at = t.at; });
      pages.sort((a, b) => b.at.localeCompare(a.at));
      const wrap = el("div", { class: "tpages" });
      pages.forEach(p => {
        const meta = sectionMeta(p.lesson, p.tab); let rg = ""; const gOf = {}; meta.forEach(m => { if (m.group) rg = m.group; if (m.seq) gOf[m.i] = rg; });
        const row = el("div", { class: "tpage" }); const head = el("div", { class: "tph" });
        const tabName = (TABS.find(x => x[0] === p.tab) || [, p.tab])[1];
        head.append(el("b", {}, `${day(p.at) === day(latest) ? "★ " : ""}${esc(plainText((LIST.find(x => x[0] === p.lesson) || [0, p.lesson])[1]).split(/\s+/)[0])}｜${esc(tabName)}`), el("span", { class: "hint" }, " " + fmtTime(p.at)));
        const adj = el("button", { type: "button", class: "btn" }, "調整"); adj.onclick = () => { sl.value = p.lesson; st.value = p.tab; fill(); addBox.scrollIntoView({ behavior: "smooth" }); };
        const off = el("button", { type: "button", class: "btn" }, "關閉這一󠇡頁"); off.onclick = () => { off.disabled = true; close(t => t.lesson === p.lesson && t.tab === p.tab); };
        head.append(adj, off);
        const chips = el("div", { class: "tchips" }); const done = new Set();
        p.ts.slice().sort((a, b) => a.idx - b.idx).forEach(t => {
          const gg = gOf[t.idx]; if (gg && done.has(gg)) return;
          const mem = gg ? p.ts.filter(x => gOf[x.idx] === gg) : [t]; if (gg) done.add(gg);
          const label = gg ? `${gg}：${mem.map(x => esc(x.name || "")).join("、")}` : `${esc(t.name || "")}${t.n ? `　${t.n} 題` : ""}`;
          const c = el("span", { class: "tchip" }, label); const x = el("button", { type: "button", class: "tx", "aria-label": "關閉這一󠇡項", title: "關閉這一󠇡項" }, "✕");
          x.onclick = () => { x.disabled = true; const ids = new Set(mem.map(m => m.idx)); close(y => y.lesson === p.lesson && y.tab === p.tab && ids.has(y.idx)); };
          c.append(x); chips.append(c);
        });
        row.append(head, chips); wrap.append(row);
      });
      const clr = el("button", { type: "button", class: "btn" }, "全部關閉（學生可以做全部練習）"); let armed = false;
      clr.onclick = async () => { if (!armed) { armed = true; clr.textContent = "確定全部關閉？再按一󠇡次"; setTimeout(() => { armed = false; clr.textContent = "全部關閉（學生可以做全部練習）"; }, 4000); return; } try { tasks = await editTasks(g.code, ts => ts.splice(0)); drawCur(); } catch (e) { msg.textContent = apiErr(e); } };
      k.append(wrap, tools(clr));
    }
    curBox.append(k);
  };
  const drawAdd = () => {
    addBox.innerHTML = "";
    const k = card("開放新的練習", "", "");
    const sl = el("select", { class: "tsel" }); LIST.forEach(([id, n]) => sl.append(el("option", { value: id }, plainText(n)))); sl.value = LIST.some(x => x[0] === cur.lesson) ? cur.lesson : sl.value;
    const st = el("select", { class: "tsel" }); TABS.forEach(([id, n]) => st.append(el("option", { value: id }, n))); st.value = cur.tab && cur.tab !== "sheets" ? cur.tab : "chars";
    const list = el("div"); const go = el("button", { type: "button", class: "btn solid" }, "開放勾選的練習");
    let fill = () => {
      list.innerHTML = ""; const meta = sectionMeta(sl.value, st.value);
      if (!meta.length) { list.append(el("p", { class: "hint" }, "這個󠇡分頁沒有可以設定的練習。")); return; }
      const tb = el("table", { class: "ttable" }); tb.innerHTML = "<thead><tr><th>開放</th><th>小節</th><th>題目數</th><th>每人做幾題</th></tr></thead>"; const tbody = el("tbody"); tb.append(tbody);
      const rowOf = m => {
        const tr = el("tr"); const cb = el("input", { type: "checkbox" }); const old = tasks.find(t => t.lesson === sl.value && t.tab === st.value && t.idx === m.i); cb.checked = !!old;
        const n = el("input", { type: "number", class: "tkey", min: "1", max: String(Math.max(1, m.nq)), style: "width:5em" }); n.value = old && old.n ? old.n : (m.nq ? Math.min(m.nq, 6) : ""); if (!m.nq || m.seq) { n.disabled = true; n.value = ""; n.placeholder = m.seq ? "全部" : "—"; n.title = m.seq ? "這個󠇡小節有先後步驟，學生要照順序全部做" : ""; }
        const td0 = el("td"); td0.append(cb); tr.append(td0); tr.append(el("td", {}, esc(m.name) + (m.tag ? ` <span class="ttag">${m.tag}</span>` : ""))); tr.append(el("td", {}, m.nq ? String(m.nq) : "（閱讀）"));
        const td3 = el("td"); td3.append(n); tr.append(td3); tr.m = m; tr.cb = cb; tr.n = n; return tr;
      };
      /* 同一󠇡類有 3 個以上小節（例如造句的六個詞）收成一󠇡列，一󠇡次勾選；按「展開」才逐一󠇡設定 */
      let rg = ""; const metaG = meta.map(m => { if (m.group) rg = m.group; return Object.assign({ g: rg }, m); });
      const all = [];
      groupRuns(metaG, m => m.seq ? m.g : "").forEach(run => {
        if (!run.g) { const tr = rowOf(run.items[0]); tbody.append(tr); all.push(tr); return; }
        const kids = run.items.map(rowOf); all.push(...kids);
        const hr = el("tr", { class: "tgrp" }); const gcb = el("input", { type: "checkbox" }); const tg = el("button", { type: "button", class: "btn tgt" }, "展開");
        const sync = () => { const n = kids.filter(k => k.cb.checked).length; gcb.checked = n === kids.length; gcb.indeterminate = n > 0 && n < kids.length; };
        gcb.onchange = () => { kids.forEach(k => { k.cb.checked = gcb.checked; }); };
        kids.forEach(k => { k.classList.add("tkid"); k.hidden = true; k.cb.addEventListener("change", sync); });
        tg.onclick = () => { const h = !kids[0].hidden; kids.forEach(k => { k.hidden = h; }); tg.textContent = h ? "展開" : "收起"; };
        const td0 = el("td"); td0.append(gcb); const td1 = el("td"); td1.append(el("b", {}, esc(run.g)), ` （${kids.length} 個小節：${run.items.map(m => esc(m.name)).join("、")}） `, tg);
        hr.append(td0, td1, el("td", {}, String(run.items.reduce((a, m) => a + (m.nq || 0), 0))), el("td", {}, "每個󠇡小節照步驟全部做"));
        tbody.append(hr, ...kids); sync();
      });
      const selAll = el("button", { type: "button", class: "btn" }, "全選"), selNone = el("button", { type: "button", class: "btn" }, "全不選");
      const setAll = v => { all.forEach(k => { k.cb.checked = v; k.cb.dispatchEvent(new Event("change")); }); };
      selAll.onclick = () => setAll(true); selNone.onclick = () => setAll(false);
      const sc = el("div", { class: "tscroll" }); sc.append(tb); list.append(tools(selAll, selNone), sc); list.rows = all;
    };
    const fill0 = fill; fill = () => { list.innerHTML = '<p class="hint">讀取中……</p>'; ensureLesson(sl.value).then(fill0).catch(() => { list.innerHTML = '<p class="hint">這一󠇡課載入失敗。</p>'; }); };
    sl.onchange = () => fill(); st.onchange = () => fill(); fill();
    go.onclick = async () => {
      const at = new Date().toISOString(); const rows = list.rows || [];
      go.disabled = true; msg.textContent = "儲存中……";
      try {
        tasks = await editTasks(g.code, ts => rows.forEach(r => {
          const i = ts.findIndex(y => y.lesson === sl.value && y.tab === st.value && y.idx === r.m.i);
          if (!r.cb.checked) { if (i >= 0) ts.splice(i, 1); return; }
          const nn = Math.max(0, Math.min(r.m.nq, parseInt(r.n.value, 10) || 0));
          const t = { lesson: sl.value, tab: st.value, idx: r.m.i, name: r.m.name, n: nn && nn < r.m.nq ? nn : 0, at };
          if (i >= 0) ts[i] = t; else ts.push(t);
        }));
        msg.textContent = "已開放，學生平板約 15 秒內會自動更新。"; drawCur(); fill();
      } catch (e) { msg.textContent = e.ok === false ? errMsg(e) : apiErr(e); }
      go.disabled = false;
    };
    k.append(tools(el("span", { class: "ui" }, "課次"), sl, el("span", { class: "ui" }, "分頁"), st), list, tools(go)); addBox.append(k);
  };
  fetchConfig(g.code).then(async cf => { tasks = (cf && cf.tasks) || []; for (const l of new Set(tasks.map(t => t.lesson))) { try { await ensureLesson(l); } catch (e) {} } msg.textContent = ""; drawCur(); drawAdd(); }).catch(e => { msg.textContent = apiErr(e); });
}
function tabGroup(body) {
  const me = TD.me;
  const c = card(me.groups.length ? "新增組別" : "先建立第一個󠇡組別", "", "一󠇡個󠇡組別就是一󠇢群學生（例如「四甲組」「週三抽離組」），各有自己的學生連結、名單和作答紀錄。組別名稱網站管理者看得󠇡到，請不󠇡要用學生姓名。");
  const n = inp("組別名稱，例：週三抽離組"); const go = el("button", { type: "button", class: "btn solid" }, "建立"); const msg = el("p", { class: "hint", role: "status" });
  go.onclick = async () => {
    if (!n.value.trim()) { msg.textContent = "請輸入組別名稱。"; return; }
    go.disabled = true;
    try { const j = await apiCall({ action: "newgroup", ...cred(), name: gradeName(n.value.trim()) }); if (!j.ok) { msg.textContent = errMsg(j); go.disabled = false; return; }
      me.groups.push({ code: j.code, name: j.name }); TD.gsel = j.code; TD.tab = "link"; renderTeacher(); }
    catch (e) { msg.textContent = apiErr(e); go.disabled = false; }
  };
  c.append(tools(n, go), msg); body.append(c);
  const g = curGroup();
  if (g) {
    const rc = card(`把「${g.name}」改名`, "", "");
    const rn = inp("新的組別名稱"); rn.value = g.name.replace(GPREFIX, ""); const rb = el("button", { type: "button", class: "btn" }, "改名"); const rm = el("p", { class: "hint", role: "status" });
    rb.onclick = async () => { const nn = gradeName(rn.value.trim()); try { const j = await apiCall({ action: "renamegroup", ...cred(), c: g.code, name: nn }); if (!j.ok) { rm.textContent = errMsg(j); return; } g.name = nn; renderTeacher(); } catch (e) { rm.textContent = apiErr(e); } };
    rc.append(tools(rn, rb), rm); body.append(rc);
    const dc = card(`刪除「${g.name}」`, "", "會一󠇡併刪除這個󠇡組別的所有作答紀錄、學生名單與作答方式設定，學生連結也會失效。刪除後無法復原。");
    const db = el("button", { type: "button", class: "btn" }, "刪除這個󠇡組別"); const dm = el("p", { class: "hint", role: "status" }); let armed = false;
    db.onclick = async () => {
      if (!armed) { armed = true; db.textContent = `確定刪除「${g.name}」和所有紀錄？再按一󠇡次`; setTimeout(() => { armed = false; db.textContent = "刪除這個󠇡組別"; }, 5000); return; }
      db.disabled = true;
      try { const j = await apiCall({ action: "deletegroup", ...cred(), c: g.code }); if (!j.ok) { dm.textContent = errMsg(j); db.disabled = false; return; }
        me.groups = me.groups.filter(x => x.code !== g.code); TD.gsel = (me.groups[0] || {}).code || ""; TD.rows = null; renderTeacher(); }
      catch (e) { dm.textContent = apiErr(e); db.disabled = false; }
    };
    dc.append(tools(db), dm); body.append(dc);
  }
}
async function loadRows() {
  const j = await apiCall({ action: "list", ...cred() }); if (!j.ok) throw j;
  const rows = []; let bad = 0;
  for (const r of j.rows) {
    if (!r.enc) { rows.push(r); continue; }
    try { const o = await openSealed(TD.me.key, r.enc); rows.push(Object.assign(o, { time: r.time, cls: r.cls, clsName: r.clsName, r: r.r })); } catch (e) { bad++; }
  }
  TD.rows = rows; TD.bad = bad; TD.loaded = new Date().toISOString();
}
function tabRec(body) {
  const g = curGroup();
  const head = card(`作答紀錄：${g.name}`, "", "");
  const all = el("input", { type: "checkbox", id: "tall" }); all.checked = !!TD.allGroups; const al = el("label", { for: "tall", class: "ui" }); al.append(all, " 顯示我所有組別");
  const rl = el("button", { type: "button", class: "btn" }, "重󠇡新整理"); const msg = el("p", { class: "hint", role: "status" });
  head.append(tools(rl, al), msg); const host = el("div"); body.append(head, host);
  const draw = () => {
    const mine = new Set(TD.me.groups.map(x => x.code)); const rows = (TD.rows || []).filter(r => TD.allGroups ? mine.has(r.cls) : r.cls === g.code);
    TD.owner = !!TD.allGroups; TD.code = TD.allGroups ? "" : g.code;
    msg.textContent = `共 ${rows.length} 筆，更新時間 ${fmtTime(TD.loaded)}` + (TD.bad ? `；有 ${TD.bad} 筆解不開（可能是改密碼前的舊鑰匙）` : "");
    const keep = TD.rows; TD.rows = rows; TD.onDelete = delRows; drawTeacher(host); TD.rows = keep; TD.onDelete = null;
  };
  const delRows = async list => {
    msg.textContent = "刪除中……";
    try { const j = await apiCall({ action: "delrows", ...cred(), rows: list.map(x => ({ r: x.r, t: x.time })) }); if (!j.ok) { msg.textContent = errMsg(j); return; } await loadRows(); draw(); msg.textContent += `　已刪除 ${j.n} 筆。`; }
    catch (e) { msg.textContent = apiErr(e); }
  };
  all.onchange = () => { TD.allGroups = all.checked; draw(); };
  const load = async () => { rl.disabled = true; msg.textContent = "讀取並解密中……"; try { await loadRows(); draw(); } catch (e) { msg.textContent = e && e.ok === false ? errMsg(e) : apiErr(e); } rl.disabled = false; };
  rl.onclick = load; if (TD.rows) draw(); else load();
}
function tabRoster(body) {
  const g = curGroup(); const M = ["say", "write", "type"];
  const c = card(`學生名單與作答方式：${g.name}`, "", "名字要和學生在網站上輸入的姓名完全一󠇡樣，設定才會套用（建議只用名字或暱稱）。「層級」決定學生看到標準層或基礎層的練習，學生畫面不󠇡會顯示層級名稱。「語音報讀」可以逐步關閉：選「題目報讀，必學字不󠇡報讀」時，題目照常報讀，橘色的必學字會跳過，讓學生自己讀；選「不󠇡報讀」就不出現喇叭按鈕。名單會加密保存，只有你看得󠇡到；儲存後也會變成這台電腦上課時的抽籤名單。");
  const msg = el("p", { class: "hint", role: "status" }, "讀取中……"); c.append(msg); body.append(c);
  (async () => {
    const conf = (await fetchConfig(g.code)) || {}; let names = [];
    if (conf.roster) { try { names = await openSealed(TD.me.key, conf.roster); } catch (e) {} }
    const def = conf.default || M;
    const keys = {}; for (const n of names) keys[n] = await nameKey(g.code, n);
    const tb = el("table", { class: "ttable" }); tb.innerHTML = "<thead><tr><th>學生</th><th>口說</th><th>寫字</th><th>打字</th><th title=\"題目、選項旁的喇叭按鈕\">語音報讀</th><th title=\"學生畫面不󠇡會出現層級名稱\">層級</th><th></th></tr></thead>";
    const valOf = cbs => [...M.filter((mm, k) => cbs[k].checked), ...(cbs.tts.value === "none" ? ["nott"] : [])];
    const TIERS = conf.tiers || {}, TTSL = conf.ttsLv || {};
    const tbody = el("tbody"); tb.append(tbody); const rows = [];
    const mkRow = (name, val, fixed) => {
      const tr = el("tr"); const td0 = el("td"); let ip = null;
      if (fixed) td0.textContent = "全部學生（預設）"; else { ip = inp("學生名字"); ip.style.width = "9em"; ip.value = name; td0.append(ip); }
      tr.append(td0);
      const cbs = M.map(mm => { const td = el("td"); const cb = el("input", { type: "checkbox", "aria-label": MODE_NAMES[mm] }); cb.checked = val.includes(mm); td.append(cb); tr.append(td); return cb; });
      const key = fixed ? "_default" : keys[name];
      const ts = el("select", { class: "tsel sm", "aria-label": "語音報讀" }); [["all", "全部報讀"], ["q", "題目報讀，必學字不󠇡報讀"], ["none", "不󠇡報讀"]].forEach(([v, t]) => ts.append(el("option", { value: v }, t)));
      ts.value = val.includes("nott") ? "none" : (TTSL[key] || (fixed ? "all" : TTSL._default || "all")); const td4 = el("td"); td4.append(ts); tr.append(td4); cbs.tts = ts;
      const tl = el("select", { class: "tsel sm", "aria-label": "層級" }); [["std", "標準層"], ["base", "基礎層"]].forEach(([v, t]) => tl.append(el("option", { value: v }, t)));
      tl.value = TIERS[key] || (fixed ? "std" : TIERS._default || "std"); const td5 = el("td"); td5.append(tl); tr.append(td5); cbs.tier = tl;
      const td9 = el("td"); if (!fixed) { const x = el("button", { type: "button", class: "btn", title: "刪除這一󠇡列" }, "✕"); x.onclick = () => { tr.remove(); rows.splice(rows.indexOf(r), 1); }; td9.append(x); } tr.append(td9);
      const r = { ip, cbs }; rows.push(r); return tr;
    };
    tbody.append(mkRow("", def, true));
    names.forEach(n => tbody.append(mkRow(n, (conf.students || {})[keys[n]] || def)));
    if (!names.length) for (let k = 0; k < 4; k++) tbody.append(mkRow("", def));
    const more = el("button", { type: "button", class: "btn" }, "多加一󠇡位"); more.onclick = () => rows.length > LOT_MAX ? (msg.textContent = `每組最多 ${LOT_MAX} 位學生。`) : tbody.append(mkRow("", valOf(rows[0].cbs)));
    const save = el("button", { type: "button", class: "btn solid" }, "儲存");
    save.onclick = async () => {
      const d0 = valOf(rows[0].cbs); if (!d0.filter(x => x !== "nott").length) { msg.textContent = "預設至少要勾一󠇢種作答方式。"; return; }
      const list = [], students = {}, tiers = { _default: rows[0].cbs.tier.value }, ttsLv = { _default: rows[0].cbs.tts.value };
      for (const r of rows.slice(1)) { const n = r.ip.value.trim(); if (!n || list.includes(n) || list.length >= LOT_MAX) continue; list.push(n); const k = await nameKey(g.code, n); const v = valOf(r.cbs); if (v.filter(x => x !== "nott").length && v.join() !== d0.join()) students[k] = v;
        if (r.cbs.tier.value !== tiers._default) tiers[k] = r.cbs.tier.value; if (r.cbs.tts.value !== ttsLv._default) ttsLv[k] = r.cbs.tts.value; }
      save.disabled = true; msg.textContent = "加密並儲存中……";
      try {
        const latest = (await fetchConfig(g.code)) || {};
        const j = await apiCall({ action: "saveconfig", ...cred(), c: g.code, config: Object.assign({}, latest, { default: d0, students, tiers, ttsLv, roster: await sealFor(TD.me.pub, list), tasks: latest.tasks || [] }) });
        if (!j.ok) { msg.textContent = errMsg(j); save.disabled = false; return; }
        setLotList(g.name, list);
        msg.textContent = `已儲存 ${list.length} 位學生。學生平板約 15 秒內會自動套用；這台電腦的抽籤名單「${g.name}」也更新了。`;
      } catch (e) { msg.textContent = apiErr(e); }
      save.disabled = false;
    };
    const lots = el("button", { type: "button", class: "btn" }, "只更新這台電腦的抽籤名單");
    lots.onclick = () => { const list = rows.slice(1).map(r => r.ip.value.trim()).filter(Boolean); setLotList(g.name, list); msg.textContent = `抽籤名單「${g.name}」已更新為 ${Math.min(list.length, LOT_MAX)} 人（只存在這台電腦）。`; };
    const sc = el("div", { class: "tscroll" }); sc.append(tb);
    msg.textContent = "";
    c.insertBefore(sc, msg); c.insertBefore(tools(save, more, lots), msg);
    c.append(el("p", { class: "hint" }, "沒有特別設定的學生，使用「全部學生」的預設。沒有語音輸入功能的裝置，會自動拿掉「口說」。"));
  })().catch(e => { msg.textContent = apiErr(e); });
}
function studentURL(c) { return `${location.origin}${location.pathname}?${c ? "c=" + c : "s"}`; }
function teacherURL() { return `${location.origin}${location.pathname}?t`; }
function tabLink(body) {
  const g = curGroup(); const url = studentURL(g.code);
  const c = card(`學生連結：${g.name}`, "", "把連結或 QR code 給學生（可以貼在 Google Classroom，或印出來貼在平板上）。學生打開後只要輸入名字，交給老師的作答會加密送到這個󠇡組別。");
  const box = el("input", { type: "text", class: "tkey", readonly: "", style: "width:min(34em,100%)" }); box.value = url;
  const cp = el("button", { type: "button", class: "btn solid" }, "複製連結"); cp.onclick = () => copyText(url, cp);
  const qr = el("div", { class: "tqr" });
  try { const q = qrcode(0, "M"); q.addData(url); q.make(); qr.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2 }); } catch (e) { qr.textContent = "（無法產生 QR code）"; }
  c.append(tools(box, cp), qr,
    el("p", { class: "hint" }, "用學生連結打開的平板，只會看到「學生練習」，看不󠇡到投影上課和教師管理。"),
    el("p", { class: "hint" }, `請不󠇡要用老師自己的電腦打開學生連結，否則這台也會被鎖成學生模式。如果發生了，用老師連結打開就能恢復：${teacherURL()}`));
  body.append(c);
}
function tabB5(body) {
  const c = card("生字講義（B5）", "", "每課全部生字的講義，學生帶回家複習、上課當講義用。可以選注音框要空󠇡白或顯示。");
  const sel = el("select", { class: "tsel" }); LIST.filter(([id]) => LESSONS[id]).forEach(([id, n]) => sel.append(el("option", { value: id }, n))); sel.value = LESSONS[cur.lesson] ? cur.lesson : sel.value;
  const go = el("button", { type: "button", class: "btn solid" }, "下載生字講義"); go.onclick = () => { L = LESSONS[sel.value]; openPrint(); };
  c.append(tools(sel, go)); body.append(c);
}
function tabAcct(body) {
  const c = card("更改密碼", "", "改密碼後，舊的紀錄仍然看得󠇡到。新密碼至少 8 個字，請自己記好。");
  const p1 = inp("新密碼（至少 8 個字）", "password", "new-password"), p2 = inp("再輸入一󠇡次", "password", "new-password");
  const go = el("button", { type: "button", class: "btn solid" }, "更改密碼"); const msg = el("p", { class: "hint", role: "status" });
  go.onclick = async () => {
    if (p1.value.length < 8) { msg.textContent = "密碼至少 8 個字。"; return; }
    if (p1.value !== p2.value) { msg.textContent = "兩次輸入的密碼不一󠇡樣。"; return; }
    go.disabled = true; msg.textContent = "處理中……";
    try {
      const newauth = await authToken(TD.me.acct, p1.value), newpriv = await sealPriv(TD.me.pkcs8, p1.value);
      const j = await apiCall({ action: "setpass", ...cred(), newauth, newpriv }); if (!j.ok) { msg.textContent = errMsg(j); go.disabled = false; return; }
      TD.me.auth = newauth; ssSet("tpass", p1.value); msg.textContent = "密碼已更改。"; p1.value = p2.value = "";
    } catch (e) { msg.textContent = apiErr(e); }
    go.disabled = false;
  };
  c.append(tools(p1, p2, go), msg); body.append(c);
  const rc = card("救援碼", "", TD.me.hasRecovery ? "已設定救援碼。弄丟了可以產生新的一󠇢組，舊的就會失效。" : "還沒有救援碼。產生一󠇢組並存好，忘記密碼時才能重󠇡設。");
  const gen = el("button", { type: "button", class: "btn solid" }, TD.me.hasRecovery ? "產生新的救援碼" : "產生救援碼"); const rm = el("p", { class: "hint", role: "status" });
  gen.onclick = async () => {
    gen.disabled = true; rm.textContent = "產生中……";
    try { const code = newRecoveryCode(); const j = await apiCall({ action: "setrecovery", ...cred(), ...(await recoveryPack(TD.me.acct, TD.me.pkcs8, code)) });
      if (!j.ok) { rm.textContent = errMsg(j); gen.disabled = false; return; }
      TD.me.hasRecovery = true; TD.showRC = code; page() === "guide" ? renderGuide() : renderTeacher(); }
    catch (e) { rm.textContent = apiErr(e); gen.disabled = false; }
  };
  rc.append(tools(gen), rm); body.append(rc);
}
function tabHelp(body) { body.append(privacyCard(true), guideCard(true)); }
/* 使用說明頁：使用說明與隱私、帳號與密碼（從教師管理移過來） */
let GTAB = "help";
function renderGuide() {
  stopSpeak(); document.documentElement.classList.add("tmode");
  const m = $("#main"); m.innerHTML = ""; m.className = "scrollpage tview"; $("#pop").classList.remove("show"); CUR = null;
  const tb = $("#tback"); if (tb) tb.href = `#l${cur.lesson}-${cur.tab}`;
  if (TD.showRC) { m.append(rcCard(TD.showRC, () => { TD.showRC = ""; renderGuide(); })); return; }
  const nav = el("div", { class: "ttabs", role: "tablist" });
  [["help", "使用說明與隱私"], ["acct", "帳號與密碼"]].forEach(([id, n]) => { const b = el("button", { type: "button", role: "tab", "aria-selected": String(GTAB === id) }, n); b.onclick = () => { GTAB = id; renderGuide(); }; nav.append(b); });
  const body = el("div"); m.append(el("h2", { class: "gtitle" }, "使用說明"), nav, body);
  if (GTAB === "help") { tabHelp(body); return; }
  if (TD.me && !TD.me.owner) { tabAcct(body); return; }
  if (TD.me && TD.me.owner) { body.append(card("帳號與密碼", "", "網站管理者帳號的密碼由 Code.gs 的設定管理，這裡沒有可以更改的項目。")); return; }
  const sa = ssGet("tacct"), sp = ssGet("tpass");
  if (sa && sp && window.crypto && crypto.subtle && API && !API.startsWith("__")) {
    body.append(el("p", { class: "hint" }, "登入中……"));
    doLogin(sa, sp).then(() => { if (page() === "guide") renderGuide(); }).catch(() => { ssSet("tpass", ""); if (page() === "guide") renderGuide(); });
    return;
  }
  const c = card("帳號與密碼", "", "更改密碼、產生救援碼需要先登入。請到「教師管理」登入後，再回到這裡。忘記密碼的話，在教師管理登入頁按「忘記密碼？」，用救援碼重󠇡設。");
  c.append(tools(el("a", { class: "btn solid", href: "#teacher" }, "前往教師管理登入"))); body.append(c);
}
function tabAccts(body) {
  const info = TD.me.info;
  const tip = card("管理者帳號只用來管理網站", "", "");
  tip.append(el("p", {}, "管理者帳號看不󠇡到任何學生的作答內容，也沒有組別、學生連結和作答方式設定。要帶自己的學生，請按右上角「登出」，在登入頁註冊一󠇡個󠇡一󠇢般老師帳號，用那個󠇡帳號建立組別。"));
  body.append(tip);
  const c = card("老師帳號", "", "這裡只看得󠇡到帳號名稱、組別名稱和紀錄筆數；各老師學生的作答內容都已加密，管理者無法查看。老師忘記密碼可以自己用救援碼重󠇡設，不需要管理者處理。不󠇡再使用的帳號可以刪除（該帳號的組別和紀錄會一󠇢起刪除，無法復原）。");
  const tb = el("table", { class: "ttable" }); tb.innerHTML = "<thead><tr><th>帳號</th><th>組別</th><th>紀錄筆數</th><th>建立時間</th><th></th></tr></thead>";
  const tbody = el("tbody"); tb.append(tbody); const msg = el("p", { class: "hint", role: "status" });
  (info.accts || []).forEach(a => {
    const tr = el("tr"); tr.innerHTML = `<td>${esc(a.acct)}</td><td>${esc(a.groups.join("、") || "—")}</td><td>${a.n}</td><td>${fmtTime(a.time)}</td>`;
    const td = el("td"); const del = el("button", { type: "button", class: "btn" }, "刪除"); let armed = false;
    del.onclick = async () => {
      if (!armed) { armed = true; del.textContent = "確定刪除？再按一󠇡次"; setTimeout(() => { armed = false; del.textContent = "刪除"; }, 4000); return; }
      del.disabled = true;
      try { const j = await apiCall({ action: "deleteacct", ...cred(), target: a.acct }); if (!j.ok) { msg.textContent = errMsg(j); del.disabled = false; return; } await doLogin(OWNER, TD.me.pass); renderTeacher(); }
      catch (e) { msg.textContent = apiErr(e); del.disabled = false; }
    };
    td.append(del); tr.append(td); tbody.append(tr);
  });
  if (!(info.accts || []).length) tbody.innerHTML = '<tr><td colspan="5">還沒有老師註冊。</td></tr>';
  const sc = el("div", { class: "tscroll" }); sc.append(tb); c.append(sc, msg); body.append(c);
}
function tabLegacy(body) {
  const head = card("未加密的舊紀錄", "", "改成加密之前送出的作答，以及沒有用學生連結（沒有組別）送出的作答。");
  const msg = el("p", { class: "hint", role: "status" }, "讀取中……"); head.append(msg); const host = el("div"); body.append(head, host);
  apiCall({ action: "list", ...cred() }).then(j => {
    if (!j.ok) { msg.textContent = errMsg(j); return; }
    msg.textContent = `共 ${j.rows.length} 筆。`; TD.owner = true; TD.code = ""; const keep = TD.rows; TD.rows = j.rows;
    TD.onDelete = async list => { try { const k = await apiCall({ action: "delrows", ...cred(), rows: list.map(x => ({ r: x.r, t: x.time })) }); if (!k.ok) { msg.textContent = errMsg(k); return; } body.innerHTML = ""; tabLegacy(body); } catch (e) { msg.textContent = apiErr(e); } };
    drawTeacher(host); TD.rows = keep; TD.onDelete = null;
  }).catch(e => { msg.textContent = apiErr(e); });
}

/* 隱私與安全說明 */
function privacyCard(open) {
  const k = card("隱私與安全說明", "", "");
  k.append(el("details", { class: "guide", ...(open ? { open: "" } : {}) }, `<summary>按這裡展開</summary>
<h3>資料存在哪裡</h3>
<ul><li>這個󠇡網站沒有自己的伺服器。作答紀錄存放在網站管理者（肚老獅）的 Google 試算表，透過 Google Apps Script 收發。</li>
<li>為󠇡了保護學生資料，<b>學生的作答在學生自己的平板上就先加密，才送出去</b>。試算表裡存的是一󠇡串亂碼。</li></ul>
<h3>誰看得󠇡到什麼</h3>
<ul><li><b>只有你</b>：在自己的瀏覽器輸入密碼後，才看得󠇡到你組別學生的姓名、作答內容、成績，以及你設定的學生名單。</li>
<li><b>網站管理者</b>看得󠇡到：老師帳號名稱、組別名稱、每筆紀錄的上傳時間、屬於哪個󠇡組別、紀錄筆數。看不󠇡到學生姓名、作答內容和成績。</li>
<li>網站程式、Google 試算表、Claude 及其他任何人，都只拿得到亂碼。</li>
<li>帳號名稱和組別名稱沒有加密，請不󠇡要放學生姓名、學校全名等可以辨識身分的資料。</li></ul>
<h3>加密怎麼運作</h3>
<ul><li>註冊時，你的瀏覽器會產生一󠇢組專屬的「鎖」（公鑰）和「鑰匙」（私鑰）。鑰匙分別用你的密碼和救援碼加密保存。</li>
<li>鎖交給網站：學生交作業時，平板用你的鎖把資料鎖起來，只有你的鑰匙打得開。</li>
<li>鑰匙會先用你的密碼再加密一󠇡次才存起來，所以存在網站上的鑰匙，沒有你的密碼也打不開。</li>
<li>你的密碼本身不󠇡會傳到網站；網站只收到由密碼算出來、無法反推密碼的驗證碼。</li>
<li>作答方式設定只存學生姓名的不可逆代號，用來比對該用哪些作答方式；學生名單本身也是加密存放。</li></ul>
<h3>請注意</h3>
<ul><li>註冊時會拿到一󠇢組<b>救援碼</b>。忘記密碼時，在登入頁按「忘記密碼？」，用帳號和救援碼就能自己重󠇡設密碼，紀錄都還在。救援碼和密碼一󠇡樣能打開你的鑰匙，請像密碼一󠇡樣妥善保管。</li>
<li><b>密碼和救援碼都遺失時，紀錄就永遠打不開</b>，網站和管理者都沒有備份，無法幫你找回，只能用新帳號重󠇡新註冊。</li>
<li>密碼請設定至少 8 個字、不容易猜的組合，也不󠇡要和其他網站共用。</li>
<li>登入狀態只留在目前這個󠇡瀏覽器分頁；用公用電腦時，用完請按「登出」並關閉分頁。</li>
<li>學生只需要輸入名字，建議用名字或暱稱，不󠇡要填全名；不需要學生的帳號或信箱。</li>
<li>口說作答會使用瀏覽器內建的語音辨識（Chrome 為 Google、iPad 為 Apple），寫字作答會使用 Google 手寫輸入辨識，學生說的話、寫的字會送到這些服務辨識（不含學生姓名）。不想使用時，可以在「學生名單與作答方式」只開放打字。</li>
<li>上課抽籤用的名單只存在老師那台電腦的瀏覽器裡。</li></ul>`));
  return k;
}
/* 使用說明 */
function guideCard(open) {
  const k = card("使用說明", "", "");
  k.append(el("details", { class: "guide", ...(open ? { open: "" } : {}) }, `<summary>按這裡展開</summary>
<h3>第一次使用</h3>
<ol><li>在「教師管理」註冊帳號（自訂帳號＋密碼）。</li>
<li>建立組別（例如「週三抽離組」）。一󠇡位老師可以建很多組。</li>
<li>到「學生連結」複製連結或 QR code 給學生。</li>
<li>到「學生名單與作答方式」輸入學生名字，勾選每位學生能用口說、寫字或打字作答。</li></ol>
<h3>今日任務（控制學生能做哪些、做幾題）</h3>
<ul><li>在後台「今日任務」勾選要開放的小節，設定每人做幾題（隨機抽題，每位學生題目不同）。</li>
<li>也可以在投影上課時，講完一󠇡個󠇡小節直接按下方的「開放給學生」（需先在這個󠇡分頁登入過教師管理）。</li>
<li>設定後，學生平板只看得󠇡到開放的部分，其他分頁顯示 🔒；最新一󠇡次開放的標 ★。之前開放過的仍可複習，不󠇡要的可以按「關閉」。</li>
<li>學生做完可以按「再來一󠇢組新題目」多練習。沒有設定任何任務時，學生可以做全部練習。</li>
<li>學生平板約每 15 秒會自動檢查一󠇡次，老師開放或關閉後不󠇡用請學生重󠇡新整理。</li>
<li>想讓學生先聽講解、不󠇡要往後做，可以在投影上課按「暫停學生」（或在今日任務按「暫停／繼續學生練習」），學生平板會蓋上「請看老師這裡」；按「繼續」就打開。</li></ul>
<h3>上課（投影上課模式）</h3>
<ul><li>回到上課畫面，右上角選「投影上課」。一󠇡次一󠇢張卡片，用「上一󠇡個󠇡／下一󠇡個󠇡」、鍵盤左右鍵或下方圓點切換。</li>
<li>下方工具：<b>全螢幕</b>、<b>畫筆</b>（換卡會自動清掉）、<b>遮住選項</b>（選擇題的選項先遮住讓學生想，再按「翻開一󠇡個󠇡」或空󠇡白鍵逐一󠇢打開）、<b>抽籤</b>（使用學生名單）、<b>計時</b>。</li>
<li>題目卡按「公布答案」顯示答案。</li></ul>
<h3>學生練習示範與學生練習</h3>
<ul><li>老師電腦上的「學生練習示範」，是用大螢幕示範學生怎麼操作，也方便學生做題目遇到問題時，老師馬上投影對照說明。示範畫面按「交給老師」不󠇡會送出。</li>
<li>學生用學生連結打開，輸入名字就可以開始；學生的平板只會看到學生練習。</li>
<li>老師講解用的卡片，在學生練習會變成要學生自己說、寫或打出答案的題目；答錯兩次會出現提示。</li>
<li>每個󠇡分頁做完按「交給老師」。學生只會看到還有沒有題目沒做，作答明細只在老師後台。</li></ul>
<h3>看作答紀錄</h3>
<ul><li>登入後在「作答紀錄」可以依課次、練習、學生篩選，按「看明細」看每一󠇢題；同時選了課次和練習，會列出各題答對情形與需要再教的學生。</li>
<li>「待老師確認」是學生口說或自己造的詞，系統無法自動判斷，請老師看明細判斷。</li></ul>
<h3>其他</h3>
<ul><li>學生平板（打開過學生連結的瀏覽器）會一󠇢直維持學生模式。老師要用時，按畫面左下角淡淡的「老師」，輸入任何一󠇡位老師的帳號密碼即可解除；也可以用老師連結（網址後面加 <b>?t</b>）打開。自己測試學生畫面時，建議用無痕視窗。</li>
<li>語音輸入、手寫辨識需要網路；iPad 第一次使用口說時要允許麥克風。</li></ul>`));
  return k;
}


/* 上方分頁放不󠇡下時，改成自己一󠇡列（不󠇡讓「綜合練習」被切掉） */
function fitTabs() { const bar = $("#bar"), t = $("#tabs"); if (!bar || !t) return; bar.classList.remove("tabrow"); requestAnimationFrame(() => { if (t.scrollWidth > t.clientWidth + 2) bar.classList.add("tabrow"); }); }
addEventListener("resize", () => fitTabs());
function renderTabs(none) {
  const t = $("#tabs"); t.innerHTML = "";
  const tm = TASKMODE(); const today = tm ? todayTasks() : [];
  TABS.forEach(([id, name, tip]) => {
    if (!tabAllowed(id)) return;
    const L0 = LESSONS[cur.lesson]; const notyet = L0 && L0.ready && !L0.ready.includes(id);
    const locked = tm && !tabOpen(cur.lesson, id), star = today.some(x => x.lesson === cur.lesson && x.tab === id);
    const a = el("a", { href: `#l${cur.lesson}-${id}`, title: notyet ? "製作中" : locked ? "老師還沒開放" : tip, class: notyet ? "notyet" : locked ? "locked" : (star ? "today" : "") }, (locked ? "🔒" : star ? "★" : "") + name);
    if (!none && id === cur.tab) a.setAttribute("aria-current", "page"); t.append(a);
  });
  fitTabs();
}
function render() {
  stopSpeak();
  const m = $("#main"); m.innerHTML = ""; m.className = ""; $("#pop").classList.remove("show"); document.querySelectorAll(".menu").forEach(x => x.remove());
  L = LESSONS[cur.lesson]; QN = 0; REC[recKey()] = {}; CUR = null;
  document.documentElement.classList.toggle("notts", ttsLevel() === "none");
  document.documentElement.classList.toggle("tier-base", tier() === "base");
  renderTabs();
  if (!L) {
    m.className = "scrollpage";
    if (!LIST.some(x => x[0] === cur.lesson)) { m.append(card("這一󠇡課還在準備中", "", "目前可以使用：" + LIST.map(x => plainText(x[1])).join("、") + "。")); return; }
    m.append(el("p", { class: "hint loading" }, "載入這一󠇡課……"));
    const want = cur.lesson; ensureLesson(want).then(() => { if (cur.lesson === want && page() === "lesson") render(); }).catch(() => { m.innerHTML = ""; m.append(card("這一󠇡課載入失敗", "", "請檢查網路，再重󠇡新整理一󠇡次。")); });
    return;
  }
  if (!tabAllowed(cur.tab)) { location.replace(`#l${cur.lesson}-text`); return; }
  useLessonFont(cur.lesson);
  if (L.ready && !L.ready.includes(cur.tab)) { /* 這一󠇡課只做好部分分頁 */
    m.className = "scrollpage"; const k = card(`${plainText(L.no)}的「${(TABS.find(t => t[0] === cur.tab) || [, ""])[1]}」製作中`, "", "目前可以使用：" + L.ready.map(t => (TABS.find(x => x[0] === t) || [, t])[1]).join("、") + "。");
    const go = el("button", { type: "button", class: "btn solid" }, `到「${(TABS.find(t => t[0] === L.ready[0]) || [, ""])[1]}」`); go.onclick = () => { location.hash = `l${cur.lesson}-${L.ready[0]}`; }; k.append(tools(go)); m.append(k); return; }
  if (TASKMODE() && !tabOpen(cur.lesson, cur.tab)) { m.className = "scrollpage"; m.append(lockedPage()); return; }
  const v = (VIEWS[cur.tab] || VIEWS.text)();
  if (v.page) { m.className = "scrollpage"; v.page.forEach(x => m.append(x)); }
  else { m.append(v); CUR = v; }
  if (JUMP && CUR && CUR.sections) { const j = JUMP; JUMP = null; const k = typeof j.sec === "number" ? j.sec : CUR.sections.findIndex(x => x.name === j.sec); if (k >= 0) setTimeout(() => CUR && CUR.go(k, j.i || 0), 0); }
}
/* 上課時從生字跳到核心詞（或跳回來） */
let JUMP = null;
function jumpTo(tab, sec, i = 0) { JUMP = { sec, i }; const h = `#l${cur.lesson}-${tab}`; if (location.hash === h) render(); else location.hash = h; }
/* 目前在哪一󠇢種頁面：首頁、教師管理、使用說明，或上課／練習 */
function page() { const h = location.hash.slice(1); if (h === "teacher") return "teacher"; if (h === "guide") return "guide"; if (!LOCK && (h === "" || h === "home")) return "home"; return "lesson"; }
function route() {
  const h = location.hash.slice(1); let pg = page();
  document.querySelector("a.tmgr[href=\"#teacher\"]").setAttribute("aria-current", pg === "teacher" ? "page" : "false");
  if (pg === "teacher" && LOCK) { location.hash = `l${cur.lesson}-${cur.tab}`; return; }
  document.documentElement.classList.toggle("tmode", pg !== "lesson");
  document.documentElement.classList.toggle("hmode", pg === "home");
  $("#result").classList.remove("show");
  if (pg === "home") { renderHome(); return; }
  if (pg === "guide") { renderGuide(); return; }
  if (pg === "teacher") { renderTeacher(); return; }
  const m = h.match(/^l(\w+?)-(\w+)$/);
  if (m) { cur.lesson = m[1]; cur.tab = m[2] === "zj" ? "jx" : m[2] === "read" ? "text" : m[2] === "quiz" ? "words" : m[2] === "cy" ? "chars" : m[2]; }
  $("#lesson").value = cur.lesson; render();
}
function renderHome() {
  stopSpeak(); CUR = null; $("#pop").classList.remove("show");
  const m = $("#main"); m.innerHTML = ""; m.className = "scrollpage home";
  const w = el("div", { class: "homewrap" });
  w.append(el("div", { class: "hhead" }, `<div class="htitle">快樂學國語</div><div class="hsub">康軒版國語　四年級上學期（${VER}）</div>`));
  const g = el("div", { class: "hgrid" });
  const item = (ico, t, d, fn) => { const b = el("button", { type: "button", class: "hcard" }, `<span class="hico" aria-hidden="true">${ico}</span><b>${t}</b><span>${d}</span>`); b.onclick = fn; g.append(b); };
  const toLesson = p => { setMode(p); location.hash = `l${cur.lesson}-${cur.tab}`; };
  item("🖥️", "投影上課", "上課時投影在大螢幕，老師講解、公布答案。", () => toLesson(true));
  item("✍️", "學生練習示範", "示範學生在平板上怎麼作答。", () => toLesson(false));
  item("🗂️", "教師管理", "今日任務、作答紀錄、學生名單、學生連結、組別管理、紙本學習單。", () => { location.hash = "teacher"; });
  item("📘", "使用說明", "網站怎麼用、隱私與安全、帳號與密碼。", () => { location.hash = "guide"; });
  w.append(g, el("p", { class: "hint hfoot" }, "進入各頁面後，可以用上方的按鈕切換；按左上角的「快樂學國語」回到這一󠇡頁。"));
  m.append(w);
}
let setMode = () => {};
function setPressed(a, b, on) { a.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-pressed", String(!on)); }
function initToggles() {
  const root = document.documentElement;
  const mode = (p) => { root.classList.toggle("proj", p); setPressed($("#m-proj"), $("#m-stu"), p); store("mode", p ? "proj" : "stu"); if (page() === "lesson") render(); };
  setMode = mode;
  const h1 = $("#bar h1"); h1.setAttribute("role", "link"); h1.tabIndex = 0; h1.title = "回到首頁";
  const goHome = () => { if (LOCK) return; location.hash = "home"; };
  h1.onclick = goHome; h1.onkeydown = e => { if (e.key === "Enter") goHome(); };
  const zy = (on) => { root.classList.toggle("zy-off", !on); setPressed($("#z-on"), $("#z-off"), on); store("zy", on ? "1" : "0"); };
  const big = (b) => { root.classList.toggle("big", b); setPressed($("#f-b"), $("#f-n"), b); store("big", b ? "1" : "0"); };
  $("#m-proj").onclick = () => mode(true); $("#m-stu").onclick = () => mode(false);
  const demo = t => { store("demotier", t); setPressed($("#d-b"), $("#d-a"), t === "base"); if (page() === "lesson") render(); };
  $("#d-a").onclick = () => demo("std"); $("#d-b").onclick = () => demo("base"); setPressed($("#d-b"), $("#d-a"), load("demotier") === "base");
  $("#z-on").onclick = () => zy(true); $("#z-off").onclick = () => zy(false);
  $("#f-b").onclick = () => big(true); $("#f-n").onclick = () => big(false);
  if (LOCK) { root.classList.add("stulock"); store("mode", "stu"); }
  root.classList.toggle("proj", load("mode") !== "stu"); setPressed($("#m-proj"), $("#m-stu"), load("mode") !== "stu");
  zy(load("zy") !== "0"); big(load("big") === "1");
  VEIL.on = load("veil") === "1";
  const snd = $("#snd"); const sndSet = on => { SND.on = on; snd.setAttribute("aria-pressed", String(on)); snd.title = on ? "提示音：開（按一󠇡下關閉）" : "提示音：關（按一󠇡下開啟）"; store("snd", on ? "1" : "0"); };
  snd.onclick = () => sndSet(!SND.on); sndSet(load("snd") !== "0");
  const who = $("#who"); who.value = load("who") || ""; who.oninput = () => store("who", who.value.trim());
  /* 姓名框只在學生連結出現，而且只顯示目前是誰（名字在開始時的名字視窗輸入） */
  document.documentElement.classList.toggle("stulock", LOCK); if (LOCK) { who.readOnly = true; who.title = "目前使用的人"; }
  who.onchange = async () => { const before = allowedModes().join() + ttsLocked(); store("who", who.value.trim()); await updWhoKey(); if (allowedModes().join() + ttsLocked() !== before && !proj() && page() === "lesson") render(); };
  const sel = $("#lesson"); LIST.forEach(([id, n]) => sel.append(el("option", { value: id }, n)));
  sel.onchange = () => { location.hash = `l${sel.value}-${cur.tab}`; };
  $("#mset").onclick = () => { const o = $("#bar").classList.toggle("open"); $("#mset").setAttribute("aria-expanded", String(o)); $("#mset").textContent = o ? "收起" : "設定"; };
  $("#popx").onclick = () => $("#pop").classList.remove("show");
  $("#result").onclick = e => { if (e.target.id === "result" && !$("#rbox").classList.contains("sub")) { $("#result").classList.remove("show"); $("#rbox").classList.remove("trace"); } };
  $("#main").addEventListener("click", e => {
    const zc = e.target.closest(".zc"); if (zc) { showChar(zc.dataset.c, zc); return; }
    const b = e.target.closest(".w"); if (b && b.dataset.w) { showWord(b.dataset.w, b); return; }
    const z = e.target.closest(".para .zi"); if (z) showChar(plainText(z.innerHTML), z);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { $("#result").classList.remove("show"); $("#pop").classList.remove("show"); } if (CUR && CUR.keyNav) CUR.keyNav(e); });
}
addEventListener("hashchange", route);
(async () => {
  try { await loadList(); } catch (e) { $("#main").append(card("讀不󠇡到課次清單", "", "請檢查網路，再重󠇡新整理一󠇡次。")); return; }
  if (!LIST.some(x => x[0] === cur.lesson)) cur.lesson = LIST[0][0];
  initToggles(); route(); loadConfig(); nameGate(); teacherUnlockBtn(); LOCKINIT();
})();
/* 老師這個󠇡分頁已登入過教師管理：背景重󠇡新登入，投影時才有「開放給學生」 */
if (!LOCK && ssGet("tacct") && ssGet("tpass") && ssGet("tacct") !== OWNER) doLogin(ssGet("tacct"), ssGet("tpass")).then(() => { if (page() === "lesson") render(); }).catch(() => {});


/* ── 雲端語音報讀（ChromeOS 無法安裝中文語音，內建只有機器腔 eSpeak）──
   改用 Google 雲端國語語音播放音檔；連不上時自動退回平板內建語音。
   網址加 ?tts=local 可強制使用平板內建語音（比對用）。 */
(function cloudTTS() {
  const FORCE_LOCAL = /[?&]tts=local\b/.test(location.search);
  const RATE = 1.3;            // 播放速度（1 = 原速；雲端與平板語音都用這個）
  const MAXLEN = 90;           // 每段最多字數（雲端服務單次上限約 200 字）
  const TIMEOUT = 7000;        // 幾毫秒沒開始播放就改用內建語音
  let cloudOK = !FORCE_LOCAL, failAt = 0;
  const cache = new Map();     // 文字 → Audio（同一句重播或預先載入）
  let cur = null, token = 0;

  const url = t => "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-TW&ttsspeed=1&q=" + encodeURIComponent(t);
  /* 圖示（💬📖✏️⭐🔒✕↩ 等）不唸：去掉表情符號與圖形符號 */
  const ICON = /[\p{Extended_Pictographic}\p{So}\u200D\u20E3\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}]/gu;
  const BLANK = /[_＿‗▁﹍-﹏]+/g;   /* 題目的空格線不唸「底線」，改成停頓 */
  const fix = t => TTSFIX.reduce((s, [a, b]) => s.split(a).join(b), String(t).replace(BLANK, "，").normalize("NFKC"))
    .replace(/[\u{E0100}-\u{E01EF}\uFE00-\uFE0F]/gu, "").replace(ICON, " ")
    .replace(/[,，](\s*[,，])+/g, "，").replace(/[,，]\s*([。！？；!?;])/g, "$1").replace(/[ \t]{2,}/g, " ").trim();
  /* 切成短段：先依句號等切，太長再依逗號切，最後硬切 */
  function chunks(t) {
    t = t.replace(/\s+/g, " ").trim(); if (!t) return [];
    const out = [];
    const push = s => { s = s.trim(); if (!s) return; while (s.length > MAXLEN) { out.push(s.slice(0, MAXLEN)); s = s.slice(MAXLEN); } if (s) out.push(s); };
    const big = t.match(/[^。！？；!?;\n]+[。！？；!?;」』）\n]*/g) || [t];
    let buf = "";
    big.forEach(seg => {
      if (seg.length > MAXLEN) { if (buf) { push(buf); buf = ""; } (seg.match(/[^，、：,:]+[，、：,:]*/g) || [seg]).forEach(p => { if ((buf + p).length > MAXLEN) { push(buf); buf = p; } else buf += p; }); }
      else if ((buf + seg).length > MAXLEN) { push(buf); buf = seg; }
      else buf += seg;
    });
    push(buf);
    return out;
  }
  function audioFor(t) {
    let a = cache.get(t);
    if (!a) {
      a = new Audio(); a.preload = "auto"; a.src = url(t);
      a.addEventListener("error", () => cache.delete(t));
      cache.set(t, a);
      if (cache.size > 60) cache.delete(cache.keys().next().value);
    }
    return a;
  }
  function prefetch(t) { if (cloudOK && t) chunks(fix(t)).slice(0, 2).forEach(audioFor); }
  function localSpeak(text, opt) {
    if (!HAS_TTS) { opt.onend && opt.onend(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = "zh-TW"; if (VOICE) u.voice = VOICE; u.rate = opt.rate || RATE;
    u.onend = () => opt.onend && opt.onend(); u.onerror = () => opt.onend && opt.onend();
    if (opt.onprog) u.onboundary = e => opt.onprog(Math.min(1, (e.charIndex || 0) / Math.max(1, text.length)));
    speechSynthesis.speak(u);
  }
  function halt() {
    token++;
    if (cur) { try { cur.pause(); cur.currentTime = 0; } catch (e) {} cur = null; }
    if (HAS_TTS) speechSynthesis.cancel();
  }
  window.ttsPrefetch = prefetch;

  speak = function (text, opt = {}) {
    if (!text) return;
    halt();
    text = fix(text);
    if (!/[\p{L}\p{N}]/u.test(text)) { opt.onend && opt.onend(); return; }   // 只有圖示就不唸
    if (!cloudOK && failAt && Date.now() - failAt > 120000 && !FORCE_LOCAL) cloudOK = true; // 兩分鐘後再試雲端
    if (!cloudOK) { localSpeak(text, opt); return; }
    const parts = chunks(text), my = token;
    const total = parts.reduce((a, p) => a + p.length, 0) || 1; let before = 0;
    /* 逐詞亮起：依播放時間推算唸到哪裡 */
    const tick = () => { if (my !== token || !cur || !opt.onprog) return; const a = cur, p = parts[k - 1] || ""; if (a.duration && isFinite(a.duration)) opt.onprog(Math.min(1, (before + p.length * a.currentTime / a.duration) / total)); requestAnimationFrame(tick); };
    let k = 0, done = false;
    const finish = () => { if (done) return; done = true; if (my === token) { cur = null; opt.onend && opt.onend(); } };
    const fallback = from => { if (my !== token) return; cloudOK = false; failAt = Date.now(); if (cur) { try { cur.pause(); } catch (e) {} } cur = null; localSpeak(parts.slice(from).join(""), opt); done = true; };
    const next = () => {
      if (my !== token) return;
      if (k >= parts.length) { finish(); return; }
      const idx = k, a = audioFor(parts[k++]);
      if (k < parts.length) audioFor(parts[k]);         // 預先載入下一段
      cur = a; a.defaultPlaybackRate = RATE; a.playbackRate = RATE; a.preservesPitch = true;
      let started = false;
      const tm = setTimeout(() => { if (!started) fallback(idx); }, TIMEOUT);
      a.onplaying = () => { started = true; clearTimeout(tm); if (opt.onprog) requestAnimationFrame(tick); };
      a.onended = () => { clearTimeout(tm); a.onended = a.onerror = a.onplaying = null; before += parts[idx].length; try { a.currentTime = 0; } catch (e) {} next(); };
      a.onerror = () => { clearTimeout(tm); fallback(idx); };
      try { a.currentTime = 0; } catch (e) {}
      const p = a.play(); if (p && p.catch) p.catch(err => { clearTimeout(tm); if (err && err.name === "NotAllowedError") { if (my === token) { cur = null; done = true; localSpeak(parts.slice(idx).join(""), opt); } } else fallback(idx); });
    };
    next();
  };

  stopSpeak = function () {
    halt();
    document.querySelectorAll(".say.on").forEach(b => b.classList.remove("on"));
    if (window.CSS && CSS.highlights) CSS.highlights.delete("reading");
  };

  /* 逐句朗讀：唸這一句時先載入下一句，句與句之間不卡頓 */
  let raList = [];
  const _ra = readAloud;
  readAloud = function (container, btn) {
    raList = [];
    if (cloudOK && !btn.classList.contains("on")) {
      const c = container.cloneNode(true); c.querySelectorAll(".say, .zb").forEach(x => x.remove());
      const t = c.textContent.replace(/[\u{E0100}-\u{E01EF}]/gu, "");
      raList = (t.match(/[^。！？；]+[。！？；」』）]*/g) || []).map(s => fix(s).trim()).filter(Boolean);
      raList.slice(0, 2).forEach(prefetch);
    }
    return _ra(container, btn);
  };
  const _sp = speak;
  speak = function (text, opt) {
    _sp(text, opt);
    if (cloudOK && raList.length && text) { const j = raList.indexOf(fix(text).trim()); if (j >= 0 && raList[j + 1]) prefetch(raList[j + 1]); }
  };

  /* 平板沒有中文語音時，報讀按鈕原本會被藏起來；雲端可用時一律顯示 */
  if (!HAS_TTS) {
    const _sb = sayBtn;
    sayBtn = function (getText, label) { const b = _sb(getText, label); b.hidden = false; return b; };
  }
})();


/* ── 課文加密：課文全文與彩色生字圖用老師密碼加密，每一課一個檔（lessons/課次/sealed.json）。
   所有課次共用同一組鹽值，同一個密碼導出的鑰匙可以打開每一課；鑰匙只存在這個分頁（sessionStorage）。 */
let UNLOCKED = false, KEY = null;
const ub = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
const PLACEHOLDER = {};
async function deriveKey(pw) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: ub(SEAL.s), iterations: SEAL.n, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
}
async function openLesson(id, key) {
  const L0 = LESSONS[id]; if (!L0 || L0._open) return;
  const S = await (await fetch(`${LBASE}${id}/sealed.json?v=${L0.v || ""}`)).json();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub(S.i) }, key, ub(S.c));
  const data = JSON.parse(new TextDecoder().decode(pt));
  if (!PLACEHOLDER[id]) PLACEHOLDER[id] = { text: (L0.text || []).slice(), img: (L0.cards || []).map(c => c.img || "") };
  L0.text = data.text; (L0.cards || []).forEach((c, k) => { if (data.img[k]) c.img = data.img[k]; }); L0._open = true;
}
/* 課次載入後：這個分頁已解鎖就順便打開 */
onLessonLoaded = async id => { if (KEY) { try { await openLesson(id, KEY); } catch (e) {} } };
async function openWithKey(key) {
  const ids = Object.keys(LESSONS).filter(id => LESSONS[id]);
  if (!ids.length) { const j = await (await fetch(`${LBASE}${LIST[0][0]}/sealed.json`)).json(); await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub(j.i) }, key, ub(j.c)); }
  for (const id of ids) await openLesson(id, key);
  KEY = key; UNLOCKED = true; paintLockBtn();
  if (page() === "lesson") render();
}
function relock() {
  Object.keys(PLACEHOLDER).forEach(id => { const L0 = LESSONS[id]; if (!L0) return; L0.text = PLACEHOLDER[id].text.slice(); (L0.cards || []).forEach((c, k) => c.img = PLACEHOLDER[id].img[k]); L0._open = false; });
  UNLOCKED = false; KEY = null; try { sessionStorage.removeItem("kwkey4"); } catch (e) {}
  paintLockBtn(); if (page() === "lesson") render();
}
function paintLockBtn() { const b = document.getElementById("lockbtn"); if (b) { b.textContent = UNLOCKED ? "🔓 課文已解鎖" : "🔒 課文已上鎖"; b.classList.toggle("on", UNLOCKED); b.title = UNLOCKED ? "按一下重新上鎖" : "按一下輸入密碼解鎖"; } }
let AFTER_UNLOCK = null;
function askPw(note, then) {
  const d = document.getElementById("lockdlg"); d.classList.add("show"); AFTER_UNLOCK = then || null;
  const n = d.querySelector(".lknote"); n.textContent = typeof note === "string" ? note : ""; n.hidden = !n.textContent;
  const inp = d.querySelector("input"); inp.value = ""; d.querySelector(".err").textContent = ""; setTimeout(() => inp.focus(), 50);
}
async function tryPw() {
  const d = document.getElementById("lockdlg"); const inp = d.querySelector("input"); const err = d.querySelector(".err"); const go = d.querySelector(".go");
  if (!inp.value) { err.textContent = "請輸入密碼。"; return; }
  go.disabled = true; err.textContent = "解鎖中……";
  try {
    const key = await deriveKey(inp.value); await openWithKey(key);
    try { const raw = await crypto.subtle.exportKey("raw", key); sessionStorage.setItem("kwkey4", btoa(String.fromCharCode(...new Uint8Array(raw)))); } catch (e) {}
    d.classList.remove("show");
    if (AFTER_UNLOCK) { const f = AFTER_UNLOCK; AFTER_UNLOCK = null; f(); }
  } catch (e) { err.textContent = "密碼不正確，請再試一次。"; }
  go.disabled = false;
}

/* ── 站內信（測試版） ── */
function msgErr(j) {
  const e = j && j.error;
  const M = { email: "請填寫正確的電子信箱。", limit: "留言太頻繁，請過幾個小時再試。", busy: "現在留言的人比較多，請稍後再試。",
    input: "請先寫留言內容。", msg: "找不到這則留言，可能已經刪除。",
    mail: "回覆信寄不出去：請先在 Apps Script 執行一次 authorizeMail，同意寄信權限後重新部署。",
    action: "後端還是舊版：請貼上新版 Code.gs，並在「管理部署作業」用「新版本」重新部署。" };
  return M[e] || errMsg(j);
}
function msgReady() { return API && !API.startsWith("__"); }
function openMsgDlg() {
  const ld = document.getElementById("lockdlg"); if (ld) ld.classList.remove("show");
  let d = document.getElementById("msgdlg");
  if (!d) { d = el("div", { id: "msgdlg", role: "dialog", "aria-modal": "true", "aria-labelledby": "msgt" }); document.body.append(d); }
  const asT = TD.me && !TD.me.owner;
  d.innerHTML = '<div class="bx"><h3 id="msgt">✉️ 聯絡網站管理者</h3>' +
    (asT ? `<p class="mh">你目前以「${esc(TD.me.acct)}」登入，管理者的回覆會出現在教師管理的「站內信」，不用留信箱。</p>`
         : '<p class="mh">沒有登入也可以留言，請留下電子信箱，管理者會寄信回覆。已註冊的老師可以先到「教師管理」登入再留言，回覆會出現在後台，不用留信箱。</p>') +
    '<label class="mf">稱呼（選填）<input class="mname" maxlength="30" autocomplete="off"></label>' +
    (asT ? "" : '<label class="mf">電子信箱（必填）<input class="mmail" type="email" maxlength="100" autocomplete="email"></label>') +
    '<label class="mf">留言內容<textarea class="mbody" maxlength="500" rows="3"></textarea><span class="mcnt">0 / 500</span></label>' +
    '<div class="mhp" aria-hidden="true"><input class="mweb" tabindex="-1" autocomplete="off"></div>' +
    '<p class="mpriv">留言只有網站管理者看得到' + (asT ? "。" : "；信箱只用來回覆這則留言。") + '</p>' +
    '<div class="merr" role="status"></div><div class="acts"><button type="button" class="btn mcancel">取消</button><button type="button" class="btn solid msend">送出</button></div></div>';
  d.classList.add("show");
  const q = s => d.querySelector(s);
  q(".mbody").oninput = () => { q(".mcnt").textContent = `${q(".mbody").value.length} / 500`; };
  q(".mcancel").onclick = () => d.classList.remove("show");
  q(".msend").onclick = async () => {
    const err = q(".merr"), btn = q(".msend");
    const body = q(".mbody").value.trim();
    if (!body) { err.textContent = "請先寫留言內容。"; return; }
    const o = { action: "sendmsg", name: q(".mname").value.trim(), body, hp: q(".mweb").value };
    if (asT) Object.assign(o, { acct: TD.me.acct, auth: TD.me.auth });
    else { o.email = q(".mmail").value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) { err.textContent = "請填寫正確的電子信箱。"; return; } }
    if (!msgReady()) { err.textContent = "網站還沒有設定後端，暫時無法留言。"; return; }
    btn.disabled = true; err.textContent = "送出中……";
    try {
      const j = await apiCall(o);
      if (!j.ok) { err.textContent = msgErr(j); btn.disabled = false; return; }
      q(".bx").innerHTML = '<h3>✉️ 已送出</h3><p class="mh">謝謝你的留言！' + (asT ? "管理者回覆後，會出現在教師管理的「站內信」。" : "管理者回覆後，會寄到你留下的信箱。") + '</p><div class="acts"><button type="button" class="btn solid mok">好</button></div>';
      q(".mok").onclick = () => { d.classList.remove("show"); if (asT && page() === "teacher" && TD.tab === "msg") renderTeacher(); };
    } catch (e) { err.textContent = apiErr(e); btn.disabled = false; }
  };
  setTimeout(() => q(".mbody").focus(), 50);
}
document.addEventListener("click", e => { if (e.target.closest(".openmsg")) { e.preventDefault(); e.stopPropagation(); openMsgDlg(); } }, true);

function msgItem(m, owner, after) {
  const box = el("div", { class: "mitem" + (m.status === "未讀" ? " unread" : "") });
  const who = owner ? (m.kind === "老師" ? `老師：${esc(m.acct)}${m.name ? `（${esc(m.name)}）` : ""}` : `訪客：${esc(m.name || "（未填稱呼）")}〈${esc(m.email)}〉`) : "我的留言";
  box.append(el("div", { class: "mhead" }, `<span class="mtime">${fmtTime(m.time)}</span><b>${who}</b><span class="mst ${m.status === "未讀" ? "u" : m.status === "已回覆" ? "r" : ""}">${esc(m.status)}</span>`));
  box.append(el("div", { class: "mtext" }, esc(m.body)));
  if (m.reply) box.append(el("div", { class: "mreply" }, `<span class="mrl">${owner ? "我的回覆" : "管理者回覆"}${m.rtime ? "（" + fmtTime(m.rtime) + "）" : ""}</span>${esc(m.reply)}`));
  if (owner) {
    const msg = el("p", { class: "hint", role: "status" });
    const bar = el("div", { class: "tools" });
    if (m.status === "未讀") {
      const rd = el("button", { type: "button", class: "btn" }, "標為已讀");
      rd.onclick = async () => { rd.disabled = true; try { const j = await apiCall({ action: "msgread", ...cred(), id: m.id }); if (!j.ok) { msg.textContent = msgErr(j); rd.disabled = false; return; } if (TD.me.info) TD.me.info.unread = Math.max(0, (TD.me.info.unread || 1) - 1); after(); } catch (e) { msg.textContent = apiErr(e); rd.disabled = false; } };
      bar.append(rd);
    }
    const rp = el("button", { type: "button", class: "btn" }, m.reply ? "再回覆一次" : "回覆");
    rp.onclick = () => {
      if (box.querySelector(".mrbox")) return;
      const rb = el("div", { class: "mrbox" });
      rb.append(el("p", { class: "hint" }, m.kind === "老師" ? "回覆會出現在這位老師的教師管理後台。" : "回覆會以不接受回信（noreply）的地址寄到對方信箱，不會顯示你的信箱。"));
      const ta = el("textarea", { rows: "4", maxlength: "1000" }); const go = el("button", { type: "button", class: "btn solid" }, "送出回覆");
      go.onclick = async () => {
        if (!ta.value.trim()) { msg.textContent = "請先寫回覆內容。"; return; }
        go.disabled = true; msg.textContent = "送出中……";
        try { const j = await apiCall({ action: "msgreply", ...cred(), id: m.id, text: ta.value.trim() }); if (!j.ok) { msg.textContent = msgErr(j); go.disabled = false; return; } if (m.status === "未讀" && TD.me.info) TD.me.info.unread = Math.max(0, (TD.me.info.unread || 1) - 1); after(); }
        catch (e) { msg.textContent = apiErr(e); go.disabled = false; }
      };
      rb.append(ta, tools(go)); box.insertBefore(rb, msg); ta.focus();
    };
    const del = el("button", { type: "button", class: "btn" }, "刪除"); let armed = false;
    del.onclick = async () => {
      if (!armed) { armed = true; del.textContent = "確定刪除？再按一次"; setTimeout(() => { armed = false; del.textContent = "刪除"; }, 4000); return; }
      del.disabled = true;
      try { const j = await apiCall({ action: "msgdel", ...cred(), id: m.id }); if (!j.ok) { msg.textContent = msgErr(j); del.disabled = false; return; } if (m.status === "未讀" && TD.me.info) TD.me.info.unread = Math.max(0, (TD.me.info.unread || 1) - 1); after(); }
      catch (e) { msg.textContent = apiErr(e); del.disabled = false; }
    };
    bar.append(rp, del); box.append(bar, msg);
  }
  return box;
}
async function tabMsg(body) {
  const owner = TD.me.owner;
  const c = card("站內信", "", owner ? "老師和訪客留給網站管理者的訊息，只有管理者看得到。未讀的留言以橘色標示。" : "你留給網站管理者的訊息，以及管理者的回覆。");
  if (!owner) { const nb = el("button", { type: "button", class: "btn solid openmsg" }, "✉️ 寫新留言"); c.append(tools(nb)); }
  const list = el("div", { class: "mlist" }, '<p class="hint">讀取中……</p>'); c.append(list); body.append(c);
  try {
    const j = await apiCall({ action: owner ? "msglist" : "mymsgs", ...cred() });
    if (!j.ok) { list.innerHTML = ""; list.append(el("p", { class: "hint" }, msgErr(j))); return; }
    list.innerHTML = "";
    if (!j.msgs.length) { list.append(el("p", { class: "hint" }, "目前沒有站內信。")); return; }
    j.msgs.forEach(m => list.append(msgItem(m, owner, () => renderTeacher())));
  } catch (e) { list.innerHTML = ""; list.append(el("p", { class: "hint" }, apiErr(e))); }
}

/* 紙本學習單：以網站學習頁面簡化，標準層與基礎層各一份，老師審查後才產出 */
tabB5 = function (body) {
  const c = card("紙本學習單", "", "四年級的紙本學習單會依網站的學習頁面簡化，標準層和基礎層各做一份；內容審查通過後，會放在這裡下載。");
  body.append(c);
};

/* 著作權說明（測試版） */
const CR_LINE = "本站部分內容引用或改寫自康軒版《國語》四上、雄::gsyan 筆順練習及教育部辭典資料，著作權屬原權利人，僅供課堂教學使用。詳見「使用說明」。";
function copyrightCard() {
  const c = el("section", { class: "card crcard" });
  c.innerHTML = '<h3>著作權說明</h3><ol>' +
    '<li>課文引用自康軒文教事業《國小國語》第七冊（四年級上學期）；課文大意、段落大意、課文結構及部分題目、例句，依康軒備課資料整理或改寫。著作權屬康軒文教事業及原作者所有。</li>' +
    '<li>彩色生字圖取自「雄::gsyan」網站（顏國雄）的 HTML5 FUN 筆順練習，著作權屬原作者所有。網址：<a href="https://gsyan888.blogspot.com/p/stroke.html" target="_blank" rel="noopener">gsyan888.blogspot.com/p/stroke.html</a></li>' +
    '<li>詞語解釋、字音、部首參考教育部《國語辭典簡編本》《國語小字典》等辭典資料。</li>' +
    '<li>背景知識卡插畫、選項圖片與部分例句為本站自製。</li>' +
    '<li>以上內容僅在學校課堂教學必要範圍內使用。課文全文與彩色生字圖已加密，只開放給網站管理者認識的老師解鎖。權利人如認為本站有不當使用，請透過<button type="button" class="linkbtn openmsg">✉️ 站內信</button>與網站管理者聯絡，將立即處理。</li></ol>';
  return c;
}
{ const _th = tabHelp; tabHelp = function (body) {
  const q = el("section", { class: "card crcard" });
  q.innerHTML = '<h3>使用說明</h3><ul class="gl">' +
    '<li><b>只想上課</b>：首頁按「投影上課」，不用註冊。下方有全螢幕、畫筆、遮住選項、抽籤、計時；題目卡按「公布答案」。</li>' +
    '<li><b>要收學生作答</b>：到「教師管理」註冊 → 建組別 → 把「學生連結」或 QR code 給學生。</li>' +
    '<li><b>控制練習範圍</b>：後台「今日任務」勾選小節和題數；投影時也可以按「開放給學生」。</li>' +
    '<li><b>看結果</b>：後台「作答紀錄」。標示「待老師確認」的，請看明細判斷。</li>' +
    '<li><b>學生平板</b>會一直停在學生練習；老師要用時，按左下角「老師」輸入帳號密碼。</li></ul>';
  const k = el("section", { class: "card crcard" });
  k.innerHTML = '<h3>課文密碼與註冊</h3><ul class="gl">' +
    '<li>課文全文和彩色生字圖需要<b>課文密碼</b>，只提供給網站管理者認識的老師。密碼提示：管理者 IG 頭像的英文。</li>' +
    '<li>註冊帳號只用來收學生作答紀錄，<b>不能代替課文密碼</b>。</li>' +
    '<li>其他教材和練習都不需要密碼。</li></ul>';
  const pv = el("section", { class: "card crcard" });
  pv.innerHTML = '<h3>隱私重點</h3><ul class="gl">' +
    '<li>學生作答在平板上先加密才送出，只有該組老師登入後看得到；網站管理者只看得到帳號名稱、組別名稱和筆數。</li>' +
    '<li>註冊時會拿到<b>救援碼</b>，請存好。密碼和救援碼都弄丟，紀錄就找不回來。</li>' +
    '<li>帳號、組別名稱不要用學生全名或學校全名。口說、手寫作答會用到 Google／Apple 的辨識服務；語音報讀使用 Google 雲端語音（只傳送要唸的文字）。</li></ul>';
  const more = el("details", { class: "card crcard gmore" }, '<summary>看完整說明</summary>'); const tmp = el("div"); _th(tmp); tmp.querySelectorAll("details").forEach(x => x.open = true); more.append(...tmp.childNodes);
  body.append(q, k, pv, copyrightCard()); const mc = card("聯絡網站管理者", "", "對網站有問題、建議，或有特殊需求，可以用站內信留言。留言只有網站管理者看得到。"); mc.append(tools(el("button", { type: "button", class: "btn solid openmsg" }, "✉️ 寫站內信"))); mc.classList.add("crcard"); body.append(mc, more); }; }
{ const _rh = renderHome; renderHome = function () { _rh(); const w = document.querySelector("#main .homewrap"); if (w) { w.append(el("p", { class: "hmsg" }, '<button type="button" class="btn openmsg">✉️ 聯絡網站管理者</button>')); w.append(el("p", { class: "crline" }, CR_LINE)); } }; }


function LOCKINIT() {
  document.head.insertAdjacentHTML("beforeend", "");
  const b = document.createElement("button"); b.type = "button"; b.id = "lockbtn"; b.className = "mset";
  b.onclick = () => UNLOCKED ? relock() : askPw();
  const bar = document.querySelector("#bar .row"); bar.insertBefore(b, document.getElementById("mset"));
  paintLockBtn();
  if (TESTBUILD) document.querySelector("#bar .ver").insertAdjacentHTML("afterend", '<span id="testtag" title="測試版：課文加密，請勿給學生使用">測試版</span>');
  document.body.insertAdjacentHTML("beforeend", "" +
    '<div id="lockdlg" role="dialog" aria-modal="true" aria-labelledby="lockt"><div class="bx"><h3 id="lockt">🔑 課文解鎖</h3>' +
    '<p class="lknote" hidden></p>' +
    '<div class="lkbub"><b>為什麼需要密碼？</b><br>課文全文和彩色生字圖受著作權保護，只開放給網站管理者認識的老師使用。有沒有註冊帳號，都需要這組密碼。<br><b>沒有密碼也能照常上課：</b>課文請學生翻開課本，生字改用一般字體顯示，其他練習都不受影響。<br>想要密碼，請用<button type="button" class="linkbtn openmsg">✉️ 站內信</button>聯絡管理者。</div>' +
    '<p class="lkhint">🔑 密碼提示：管理者 IG 頭像的英文</p>' +
    '<input type="password" autocomplete="off" aria-label="密碼"><div class="err"></div>' +
    '<div class="acts"><button type="button" class="btn cancel">取消</button><button type="button" class="btn solid go">解鎖</button></div></div></div>');
  const d = document.getElementById("lockdlg");
  d.querySelector(".cancel").onclick = () => d.classList.remove("show");
  d.querySelector(".go").onclick = tryPw;
  d.querySelector("input").addEventListener("keydown", e => { if (e.key === "Enter") tryPw(); if (e.key === "Escape") d.classList.remove("show"); });
  document.addEventListener("click", e => { if (e.target.closest(".unlockbtn")) { e.preventDefault(); e.stopPropagation(); askPw(); } }, true);
  
  let saved = null; try { saved = sessionStorage.getItem("kwkey4"); } catch (e) {}
  if (saved) crypto.subtle.importKey("raw", ub(saved), "AES-GCM", true, ["decrypt"]).then(openWithKey).catch(() => {});
}

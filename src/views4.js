/* ══════════ 四年級：標準層／基礎層兩條路徑 ══════════
   投影上課：同一套卡片，提問分基礎（👆）與標準（💬）兩種圖示。
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
/* 報讀等級：all 全部報讀；q 題目報讀、必學字不報讀；none 不報讀（老師在後台逐步關閉） */
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
/* 報讀文字：必學字不報讀時，把橘色字換成停頓，讓學生自己讀 */
function sayText(t) {
  let s = plainText(String(t).replace(/<span class="must">([^<]+)<\/span>/g, "【$1】"));
  if (ttsLevel() === "q") s = s.replace(/【[^】]+】/g, "，，");
  return s.replace(/[【】]/g, "");
}
/* 填空字串 "…{答案}…" → fillLine 用的 parts */
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
/* 聽一聽再選：大喇叭＋三個字／詞卡 */
function listenQ(sayWhat, opts, ans, label, o = {}) {
  const id = qid(label); const q = el("div", { class: "q lq" }); let wrong = 0;
  const big = sayBtn(() => sayWhat, "再聽一次"); big.classList.add("bigsay");
  const row = el("div", { class: "lqhead" }); row.append(big, el("span", { class: "hint" }, o.hint || "聽一聽，按出正確的答案。"));
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

/* 填空＋詞庫（一頁一句） */
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
  const ck = el("div", { class: "selfck only-stu" }); ck.append(el("div", { class: "hint" }, "寫完檢查："), checklist(checks || ["有用到句框", "句子有寫完", "有標點符號"]));
  const s = slide("", sayRow(stem), stem, fr, w, ck, refBox(esc(ref))); return s;
}
/* 是非／對錯判斷 */
function ynSlide(stemHtml, ans, label, labels = ["用得對", "用得不對"]) {
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
  hb.onclick = () => { hint = Math.min(2, hint + 1); hb.textContent = hint === 1 ? "再一個提示" : "提示"; hb.disabled = hint >= 2; base(); box.hints = hint; };
  done.onclick = async () => {
    if (!ink.length) { res.innerHTML = '<span class="nomsg">先在格子裡寫字。</span>'; return; }
    cands.innerHTML = '<span class="hint">看看你寫的是哪一個字……</span>';
    let list = [];
    try { list = (await hwRecognize(ink, size, size)).filter(c => [...c].length === 1).slice(0, 5); } catch (e) { list = []; }
    if (o.ch && !list.includes(o.ch) && o.pool) list = list.slice(0, 4);
    if (!list.length) { cands.innerHTML = '<span class="hint">電腦認不出來，擦掉再寫一次，或請老師來看。</span>'; return; }
    cands.innerHTML = ""; cands.append(el("span", { class: "hint" }, "你寫的是哪一個字？按一下："));
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
function zxSecName(id) { if (id === "cmp") return "比一比"; if (id === "poly") return "多音字"; return `${id}家族`; }
function backBtn() {
  if (!BACK) return null; const b0 = BACK;
  const b = el("button", { type: "button", class: "btn solid backbtn", "aria-label": `回到生字「${b0.c}」` }, `↩ <span class="nozy">${b0.c}</span>`);
  b.onclick = () => { BACK = null; jumpTo(b0.tab, b0.sec, b0.i); };
  return b;
}

/* ── 字音字形教學：以字帶字、字族文、比一比 ── */
const GR = t => String(t).match(/.[\u{E0100}-\u{E01EF}]?/gu) || [];
function famSlide(F) {
  const box = el("div", { class: "fam" });
  box.append(el("div", { class: "famc nozy" }, F.id));
  const grid = el("div", { class: "famg" });
  F.fam.forEach(([ch, r, m, mid]) => {
    const card = el("button", { type: "button", class: "famk" + (ch === F.from ? " from open" : "") });
    card.innerHTML = `<span class="ff nozy"><b class="fr">${r}</b>＋${mid ? mid + "＋" : ""}${F.id}</span><span class="fe nozy">＝</span><span class="fch nozy">${ch}</span><span class="fq">？</span><span class="fm">和${m}有關</span>`;
    card.onclick = () => { card.classList.add("open"); if (HAS_TTS) { stopSpeak(); speak(ch); } };
    grid.append(card);
  });
  const all = el("button", { type: "button", class: "btn stepbtn", "aria-label": "全部翻開", title: "全部翻開" }, "👀"); all.onclick = () => grid.querySelectorAll(".famk").forEach(x => x.classList.add("open"));
  box.append(grid);
  const s = slide("", kick(`${F.id}家族`), box, tools(all)); s.dataset.nofit = "1"; return s;
}
function poemSlide(F) {
  const set = new Set(F.fam.map(x => x[0]));
  const box = el("div", { class: "poem" });
  F.poem.forEach(line => { const p = el("div", { class: "pline" }); GR(line).forEach(g => { const ch = g[0]; const b = el("span", { class: "pz" + (set.has(ch) ? " fm" : "") }, g); if (set.has(ch)) b.onclick = () => b.classList.add("circ"); p.append(b); }); box.append(p); });
  const all = el("button", { type: "button", class: "btn stepbtn", "aria-label": "圈出全部", title: "圈出全部" }, "👀"); all.onclick = () => box.querySelectorAll(".pz.fm").forEach(x => x.classList.add("circ"));
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
  return slide("", kick("形近字比一比"), box, peekBox(C.note, "def"));
}

/* ── 必學字五步驟 ── */
function mustSlides(c) {
  const W = L.mustkw[c.c] || [c.word, c.pwh]; const others = L.cards.filter(x => x.c !== c.c);
  const head = t => el("div", { class: "mhead" }, `<span class="mstep">${t}</span>`);
  /* ① 聽字選字 */
  const pool = shuffle(others.map(x => x.c)).slice(0, 2);
  const s1 = listenSlide(`${c.c}，${W[0]}的${c.c}`, [c.c, ...pool], 0, `聽字選字：${c.c}`, { cls: "bigc", stem: head("① 聽一聽，選出這個字") });
  /* ② 看圖選詞 */
  const s2 = picSlide(`看圖，選出對的詞語。`, c.pick.map((w, k) => [w, null]), 0, `看圖選詞：${c.c}`, { keep: false, lead: [head("② 看圖選詞")], after: [el("div", { class: "bigpic" }, pic(c.pic, c.pick[0]))] });
  /* ③ 拼組部件 */
  const s3 = slide("", head("③ 拼出這個字"), assemble(c));
  /* ④ 描寫 */
  const s4 = traceSlide(c, head("④ 照著寫寫看"));
  /* ⑤ 看詞寫字 */
  const s5 = wordWriteSlide(c, W[0], W[1], `看詞寫字：${c.c}`, head("⑤ 看詞寫字"));
  return [s1, s2, s3, s4, s5];
}
function traceSlide(c, head) {
  const q4 = qid(`描寫：${c.c}`); const r4 = el("div");
  const p4 = inkPad({ ch: c.c, st: c.st, hints: true, onPick: (ch, h) => { const ok = ch === c.c; logAns(q4, ok, ch + (h ? `（用了${h}個提示）` : "")); if (ok) { p4.lock(); p4.res.innerHTML = '<span class="okmsg">√ 寫對了！</span>'; r4.classList.add("answered"); } else p4.res.innerHTML = `<span class="nomsg">這是「${nz(ch)}」，不是我們要寫的字。</span>擦掉再寫一次，可以按「提示」。`; } });
  const model = el("div", { class: "model" }, `<span class="mch nozy">${c.c}</span>`);
  const w4 = el("div", { class: "wrow" }); w4.append(model, p4); r4.append(w4);
  const s4 = slide("", head, el("div", { class: "inst" }, "看左邊的字，在格子裡寫一次。需要時按「提示」。"), r4); s4.dataset.nofit = "1";
  return s4;
}
function wordWriteSlide(c, word, wh, label, head) {
  const q = qid(label); const r = el("div"); let got = false;
  const sw = el("div", { class: "wword" }, nz(wh.replace("□", '<span class="cpb">□</span>')));
  const sb = sayBtn(() => `${word}的${c.c}`, "唸給我聽"); sb.classList.add("bigsay");
  const p = inkPad({ ch: c.c, st: c.st, hints: false, onPick: ch => {
    const ok = ch === c.c; logAns(q, ok, ch);
    if (ok) { p.lock(); r.classList.add("answered"); if (!got) { got = true; const o = knownHit(c.c, word, wh); const n = o ? Math.min(o.n, KNOWN_N) : 0; p.res.innerHTML = `<span class="okmsg">√ 寫對了！</span>` + (o ? (o.n >= KNOWN_N ? `<div class="known">🌟「${nz(c.c)}」收進「我會的字」了！</div>` : `<div class="hint">再答對 ${KNOWN_N - n} 次，就能收進「我會的字」。</div>`) : ""); } }
    else p.res.innerHTML = `<span class="nomsg">這是「${nz(ch)}」，再想想看。</span>擦掉再寫一次。`;
  } });
  const top = el("div", { class: "wwtop" }); top.append(sb, sw); r.append(top, p);
  const s = slide("", head || null, el("div", { class: "inst" }, "聽一聽，寫出□裡的字。"), r); s.dataset.nofit = "1"; return s;
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
      else { wrong++; logAns(q, false, p); b.classList.add("no", "shake"); setTimeout(() => b.classList.remove("no", "shake"), 500); res.innerHTML = `<span class="nomsg">「${nz(p)}」不在這個字裡，再找找看。</span>`; }
    };
    tiles.append(b);
  });
  const reset = el("button", { type: "button", class: "btn" }, "重來"); reset.onclick = () => { if (done) return; pos = 0; ss.forEach(s => { s.textContent = ""; s.classList.remove("on"); }); tiles.querySelectorAll("button").forEach(b => b.disabled = false); };
  box.append(el("div", { class: "asmtop" }, `<span class="mch nozy">${c.c}</span>`), slots, tiles, tools(reset), res);
  box.reveal = () => { c.parts.forEach((p, k) => { ss[k].textContent = p; ss[k].classList.add("on"); }); };
  return box;
}
/* 我會的字：收集頁＋重複抽考 */
function knownSlides() {
  const k = knownGet(); const got = Object.entries(k).filter(([, o]) => o.n >= KNOWN_N);
  const grid = el("div", { class: "kgrid" });
  if (!got.length) grid.append(el("div", { class: "hint" }, "還沒有收集到字。看詞寫字答對三次，就會收進這裡。"));
  got.forEach(([ch, o]) => grid.append(el("div", { class: "kcard" }, `<span class="kc nozy">${ch}</span><span class="kw">${esc(o.w)}</span>`)));
  const prog = el("div", { class: "kprog" }); (L.must || []).forEach(ch => { const o = k[ch] || { n: 0 }; prog.append(el("span", { class: "kp" + (o.n >= KNOWN_N ? " ok" : "") }, `${nz(ch)} ${"●".repeat(Math.min(o.n, KNOWN_N))}${"○".repeat(Math.max(0, KNOWN_N - o.n))}`)); });
  const s0 = slide("", el("h2", { class: "ktitle" }, "🌟 我會的字"), grid, el("div", { class: "hint" }, "這一課的必學字："), prog);
  /* 抽考：之前收進來的字（不限這一課），最多 3 個 */
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
    speak(txt.slice(a, b), { onprog: f => { /* 依時間比例推算唸到第幾個字 */
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
  const side = el("aside", { class: "side" }); side.append(el("h3", {}, ws.length ? "詞語：按一下看意思" : "這一段沒有新詞語"));
  const wl = el("div", { class: "wordlist" }); ws.forEach(w => wl.append(el("button", { type: "button", class: "w", "data-w": w, "aria-pressed": "false" }, w))); side.append(wl, el("div", { class: "panel" }, '<span class="hint">按詞語，意思會出現在這裡。</span>'));
  const g = el("div", { class: "sl2 narrow-r" }); g.append(left, side); return slide("", g);
}
function lessonHead() { return el("div", { class: "lhead" }, `<span class="ltitle">${L.title}</span>`); }

/* ── 投影：背景知識卡、提問卡 ── */
function bgSlide(b) {
  const qs = el("div", { class: "pq" });
  b.qb.forEach(t => qs.append(el("div", { class: "pqi" }, ICON_B + `<span>${t}</span>`)));
  b.qs.forEach(t => qs.append(el("div", { class: "pqi" }, ICON_S + `<span>${t}</span>`)));
  const left = el("div", { class: "bgimg" }, pic(b.img, b.title)); const right = el("div");
  right.append(el("div", { class: "bgtext" }, b.text), sayBtn(() => plainText(b.text), "唸卡片"), qs);
  return slide("", kick("背景知識"), el("h2", { class: "bgt" }, b.title), splitBox([left], [right]));
}
function projQSlide(x) {
  const box = el("div", { class: "pq big" });
  x.b.forEach(t => box.append(el("div", { class: "pqi" }, ICON_B + `<span>${t}</span>`)));
  x.s.forEach(t => box.append(el("div", { class: "pqi" }, ICON_S + `<span>${t}</span>`)));
  const para = el("details", { class: "pqpara" }); para.innerHTML = `<summary>看第 ${x.p} 段課文</summary><p class="para">${paraHTML(x.p - 1)}</p>`;
  return slide("", kick(`第 ${x.p} 段提問`), box, para);
}
function iconLegend() { return el("span", { class: "legend ui" }, `${ICON_B}聽得懂、指得出、選得出　${ICON_S}說出原因、用自己的話說`); }

/* ── 結構：總說／分說／總結 ── */
function structSlides() {
  const segs = ["總說", "分說", "總結"];
  if (proj()) {
    const g = el("div", { class: "tree" });
    segs.forEach(sg => { const ps = L.struct.filter(x => x.seg === sg).map(x => x.p); const c = el("div", { class: "tnode" }); c.append(peekBox(`<b>${sg}</b>`, "tseg"), el("div", { class: "tps" }, `第 ${ps.join("、")} 段`), el("div", { class: "hint" }, L.structNote[sg])); g.append(c); });
    return [slide("", kick("課文結構"), el("div", { class: "hint" }, "這一課是說明文，用「總說、分說、總結」的方式寫。"), g)];
  }
  return L.struct.map(x => { const r = pickRow(segs, segs.indexOf(x.seg), `課文結構：第${x.p}段`, "ab"); const stem = el("div", { class: "stem" }, `第 ${x.p} 段是「總說」、「分說」，還是「總結」？`); const s = slide("", sayRow(stem), stem, el("details", { class: "pqpara" }, `<summary>看第 ${x.p} 段課文</summary><p class="para">${paraHTML(x.p - 1)}</p>`), el("div", { class: "ynrow" }, "")); s.querySelector(".ynrow").append(r); s.reveal = r.reveal; return s; });
}
function peekBox(html, cls) { const b = el("button", { type: "button", class: "fpk " + (cls || "") }, `<span class="fpk-c">${html}</span><span class="fpk-h">按一下顯示</span>`); b.onclick = () => b.classList.toggle("open"); return b; }
/* 三座塔表格 */
function towerSlide() {
  const T = L.towers; const ctx = {}; const blanks = [];
  const tb = el("table", { class: "tower" }); const th = el("tr"); th.append(el("th", {}, ""));
  T.cols.forEach((c, k) => th.append(el("th", {}, `${pic(T.imgs[k], c)}<div>${c}</div>`))); tb.append(th);
  T.rows.forEach(r => { const tr = el("tr"); tr.append(el("th", {}, r.h));
    r.cells.forEach((c, k) => { const td = el("td"); if (proj()) { const parts = String(c).split(/(\{[^}]*\})/); parts.forEach(p => { const m = p.match(/^\{(.*)\}$/); if (m) td.append(peekBox(m[1], "inl")); else if (p) td.insertAdjacentHTML("beforeend", p); }); }
      else { const line = fillLine(bparts(c), [], ctx, `三座塔表格：${T.cols[k]}${r.h}`); blanks.push(...line.blanks); td.append(line); } tr.append(td); }); tb.append(tr); });
  const sc = el("div", { class: "tscroll" }); sc.append(tb);
  const s = slide("", kick("三座建築比一比"), sc, proj() ? null : bankBox(T.bank.map(b => ({ t: b, h: b })), ctx));
  if (!proj()) { s.onshow = () => { ctx.slideBlanks = blanks; const b = blanks.find(x => !x.classList.contains("ok")); if (b) b.click(); }; s.reveal = () => revealBlanks(blanks); }
  s.dataset.nofit = "1"; return s;
}

/* ══════════ 各分頁 ══════════ */
const VIEWS = {
  text() {
    const T = tier(); const n = (L.text || []).length || 5;
    if (T === "proj") {
      const secs = [
        { name: "背景知識", hint: "先用圖片和生活經驗想一想，再讀課文。", slides: L.bg.map(bgSlide), extra: iconLegend() },
        { name: "分段讀", hint: "畫底線的是詞語，按一下看意思；黃色底的字是本課生字。", slides: [...Array(n).keys()].map(i => paraSlide(i)) },
        { name: "課文結構", slides: structSlides() },
        { name: "三座建築比一比", hint: "按一下格子，顯示答案。", slides: [towerSlide()] },
        { name: "段落大意", hint: "先按空格，再按詞語。", slides: bankSlides(L.summary.map(x => x.t), L.sumBank, "段落大意", { kick: L.summary.map(x => x.label) }) },
        { name: "提問", slides: L.projq.map(projQSlide), extra: iconLegend() },
      ];
      return deck(secs);
    }
    if (T === "base") {
      const secs = [
        { name: "聽課文", hint: "按「聽課文」，跟著亮起來的字一起看。", slides: [...Array(n).keys()].map(i => paraSlide(i, { word: true, side: false })) },
        { name: "聽題選答", hint: "聽題目，選出答案。", slides: L.readb.map((x, i) => picSlide(x.q, x.opts, 0, `聽題選答${i + 1}`, { auto: true })) },
        { name: "自讀挑戰", hint: "橘色的字先自己讀一次，再按喇叭對答案。", slides: shuffle(L.readb.map((x, i) => picSlide(x.q, x.opts, 0, `自讀挑戰${i + 1}`, { self: true }))) },
        { name: "完成", slides: [finishSlide()] },
      ];
      return deck(secs, { submit: true });
    }
    const R = L.readq.map((x, i) => x.type === "choice" ? (() => { const c = choiceQ(mk(x.q), x.opts, x.ans, `理解與推論${i + 1}`); const s = slide("", sayRow(c), c); s.reveal = c.reveal; return s; })() : frameSlide(x.q, x.frame, x.ref, `理解與推論${i + 1}：${x.q}`));
    const secs = [
      { name: "分段讀", hint: "按詞語可以看意思。", slides: [...Array(n).keys()].map(i => paraSlide(i)) },
      { name: "課文結構", hint: "想一想每一段在做什麼。", slides: structSlides() },
      { name: "段落大意", hint: "先按空格，再按詞語。詞庫裡有用不到的詞。", slides: bankSlides(L.summary.map(x => x.t), L.sumBank, "段落大意", { kick: L.summary.map(x => x.label) }) },
      { name: "三座建築比一比", hint: "先按空格，再按詞語。", slides: [towerSlide()] },
      { name: "理解與推論", hint: "用句框回答，寫完檢查一次。", slides: R },
      { name: "完成", slides: [finishSlide()] },
    ];
    return deck(secs, { submit: true });
  },

  chars() {
    const T = tier(); const must = MUST();
    if (T === "proj") {
      const slides = L.cards.map((c, ci) => {
        const N = (L.net || {})[c.c] || { bj: [], f: [], b: [] };
        /* 左：彩色生字、注音框、部首框、拆一拆、字音字形連結 */
        const left = el("div", { class: "cimg" });
        const r1 = el("div", { class: "row" }); r1.append(c.img ? el("img", { src: c.img, alt: c.c + "（彩色部件）" }) : el("span", { class: "cglyph nozy" }, c.c), zyBox(c.cz)); left.append(r1);
        const rb = el("div", { class: "radb" }); const rbtn = el("button", { type: "button", "aria-label": "部首框，按一下顯示部首" }); rbtn.onclick = () => rbtn.textContent = rbtn.textContent ? "" : c.radb; rb.append(rbtn, "部");
        left.append(rb);
        const bjBtn = el("button", { type: "button", class: "btn stepbtn", "aria-label": "拆一拆", title: "拆一拆" }, "✂️");
        const bjs = el("div", { class: "bjs", hidden: "" });
        N.bj.forEach((t, k) => { if (k) bjs.append(el("span", { class: "plus" }, "＋")); bjs.append(el("span", { class: "bj nozy" + (t.includes("*") ? " rad" : "") }, t.replace("*", ""))); });
        bjBtn.onclick = () => { bjs.hidden = !bjs.hidden; };
        left.append(bjBtn, bjs);
        const acts = el("div", { class: "row2" }); acts.append(sayBtn(() => c.c, "唸這個字"));
        const zl = (L.zxlink || {})[c.c];
        if (zl) { const j = el("button", { type: "button", class: "btn zxjump", title: "到字音字形教學", "aria-label": "到字音字形教學" }, "🔗");
          j.onclick = () => { BACK = { tab: "chars", sec: 0, i: ci, c: c.c }; jumpTo("zx", zxSecName(zl)); }; acts.append(j); }
        left.append(acts);
        if (must.has(c.c)) left.append(el("div", { class: "mustnote" }, "★"));
        /* 右：造詞網（字在前一列、字在後一列），最下面加自己想的詞 */
        const right = el("div", { class: "cteach" });
        const net = el("div", { class: "znet" });
        const row = (list, pat) => {
          const r = el("div", { class: "zrow" }); r.append(el("div", { class: "zpat nozy" }, pat.replace(c.c, `<b class="tc">${c.c}</b>`)));
          const cards = el("div", { class: "zcards" }); r.append(cards); r.cards = cards;
          list.forEach(x => cards.append(zcard(x, c.c)));
          return r;
        };
        const rf = row(N.f, `${c.c}＿`), rbk = row(N.b, `＿${c.c}`);
        if (!N.f.length) rf.hidden = true;
        net.append(rf, rbk);
        const flipAll = el("button", { type: "button", class: "btn stepbtn", "aria-label": "全部翻開", title: "全部翻開" }, "👀");
        flipAll.onclick = () => net.querySelectorAll(".zcard").forEach(x => x.classList.add("open"));
        const mine = el("div", { class: "zmine" });
        const inp = el("input", { type: "text", class: "zin", "aria-label": "學生說的詞", maxlength: "6" });
        const add = el("button", { type: "button", class: "btn stepbtn", "aria-label": "加到造詞網", title: "加到造詞網" }, "➕");
        const hw = el("button", { type: "button", class: "btn stepbtn", "aria-label": "用手寫", title: "用手寫" }, "✍️");
        const hwBox = el("div", { class: "zhw", hidden: "" });
        let pad = null;
        hw.onclick = () => { hwBox.hidden = !hwBox.hidden; if (!hwBox.hidden && !pad) { pad = inkPad({ hints: false, onPick: ch => { inp.value += ch; pad.reset(); } }); hwBox.append(pad); } };
        const doAdd = () => { const w = inp.value.trim(); if (!w) return; if (!w.includes(c.c)) { inp.classList.add("bad"); setTimeout(() => inp.classList.remove("bad"), 900); return; }
          const tgt = w.startsWith(c.c) ? rf : rbk; tgt.hidden = false; tgt.cards.append(zcard({ w, e: "💡", mine: 1 }, c.c, true)); inp.value = ""; };
        add.onclick = doAdd; inp.addEventListener("keydown", e => { if (e.key === "Enter") doAdd(); });
        const clr = el("button", { type: "button", class: "btn stepbtn", "aria-label": "清除", title: "清除" }, "⌫"); clr.onclick = () => { inp.value = inp.value.slice(0, -1); };
        mine.append(el("span", { class: "zq" }, "💬"), inp, clr, hw, add, el("span", { class: "sp" }, ""), flipAll);
        right.append(net, mine, hwBox);
        const g = el("div", { class: "cslide teach" }); g.append(left, right); return slide("", g);
      });
      return deck([{ name: "生字", hint: "✂️ 拆一拆 → 翻開詞卡 → 💬 還能造什麼詞？（🔗 到字音字形）", slides, dotChars: L.cards.map(c => c.c) }]);
    }
    if (T === "base") {
      const ms = L.cards.filter(c => must.has(c.c)); const rest = L.cards.filter(c => !must.has(c.c));
      const secs = ms.map(c => ({ group: "必學字", name: c.c, hint: "聽字選字 → 看圖選詞 → 拼出這個字 → 照著寫 → 看詞寫字", slides: mustSlides(c), seq: true }));
      secs.push({ name: "聽字選字", hint: "聽一聽，選出聽到的字。", slides: rest.map(c => listenSlide(`${c.c}，${c.word}的${c.c}`, [c.c, ...shuffle(L.cards.filter(x => x.c !== c.c).map(x => x.c)).slice(0, 2)], 0, `聽字選字：${c.c}`, { cls: "bigc" })) });
      secs.push({ name: "我會的字", hint: "看詞寫字答對三次的字，會收進這裡。", slides: knownSlides() }, { name: "完成", slides: [finishSlide()] });
      return deck(secs, { submit: true });
    }
    const ps = L.cards.map(c => { const s = charPractice(Object.assign({}, c, { pw: c.word, pwh: c.pwh }), 0); return s; });
    const zc = L.cards.map(c => { const p = produce({ label: `自己造詞：${c.c}`, answer: c.zc.join("、"), hint: `想想生活中哪些詞有「${c.c}」`,
      check: t => !t.includes(c.c) ? { st: "no", msg: `要用到「${c.c}」這個字` } : (t === c.word ? { st: "no", msg: "這是課本的詞，換一個自己想的詞" } : (c.zc.includes(t) ? { st: "ok" } : { st: "check", msg: "老師會再確認這個詞" })) });
      return slide("", el("div", { class: "flash" }, `<span class="tag">自己造詞</span><div class="t nozy">${c.c}</div><div class="hint">課本的詞：${c.word}</div>`), el("div", { class: "hint", style: "text-align:center" }, `用「${c.c}」造一個課本以外的詞。`), p); });
    const tr = L.cards.map(c => traceSlide(c, el("div", { class: "mhead" }, '<span class="mstep">寫寫看</span>')));
    return deck([{ group: "生字", name: "寫寫看", hint: "照著左邊的字寫一次，寫完會辨認你寫的字。", slides: tr, dotChars: L.cards.map(c => c.c) }, { name: "生字練習", hint: "每個生字要完成三件事：寫國字、拼注音、選部首。", slides: ps, dotChars: L.cards.map(c => c.c) }, { name: "自己造詞", slides: zc, dotChars: L.cards.map(c => c.c) }, { name: "完成", slides: [finishSlide()] }], { submit: true });
  },

  words() {
    const T = tier(); const WD = L.words; const lk = {}; WD.forEach(w => lk[w.w] = w);
    const judgeS = L.judge.map((x, i) => ynSlide(x.s.replace(x.w, `<b class="kw">${x.w}</b>`), x.ok, `情境判斷${i + 1}：${x.w}`));
    const multiS = L.multi.items.map((x, i) => { const stem = el("div", { class: "stem big-line" }, x.s.replace(L.multi.w, `<b class="kw">${L.multi.w}</b>`)); const r = pickRow(L.multi.senses.map((t, k) => `${"①②"[k]} ${t}`), x.ans, `「${L.multi.w}」的意思${i + 1}`, "ab wide"); const s = slide("", sayRow(stem), stem, el("div", { class: "ynrow col" }, "")); s.querySelector(".ynrow").append(r); s.reveal = r.reveal; return s; });
    const fillS = bankSlides(L.fillw.items, L.fillw.bank, "選詞填入");
    if (T === "proj") {
      const cards = WD.map(w => {
        const t = (L.wt || {})[w.w] || {};
        const g = el("div", { class: "wteach" });
        const pics = el("div", { class: "wpics" + ((t.pic || []).length > 1 ? " two" : "") }); (t.pic || []).forEach(p => pics.insertAdjacentHTML("beforeend", pic(p, "")));
        const right = el("div", { class: "wbody" });
        const hd = el("div", { class: "whead" }); hd.append(el("span", { class: "wword" }, w.w), sayBtn(() => plainText(w.w), "唸詞語"));
        right.append(hd);
        const dr = el("div", { class: "wrow" }); dr.append(el("span", { class: "wi", title: "意思" }, "📖"), peekBox(w.def, "def"), sayBtn(() => plainText(w.def), "唸意思")); right.append(dr);
        (t.ex || []).forEach(x => { const r = el("div", { class: "wrow ex" }); r.append(el("span", { class: "wi", title: "例句" }, "✏️"), el("span", { class: "wex" }, x.split(w.w).join(`<b class="kw">${w.w}</b>`)), sayBtn(() => plainText(x), "唸例句")); right.append(r); });
        if (t.qb || t.qs) { const q = el("div", { class: "wqs" }); if (t.qb) q.append(el("div", { class: "pqi" }, ICON_B + `<span>${t.qb}</span>`)); if (t.qs) q.append(el("div", { class: "pqi" }, ICON_S + `<span>${t.qs}</span>`)); right.append(q); }
        g.append(pics, right); return slide("", g);
      });
      const demo = L.judge.filter(x => x.w === "居高臨下").map((x, i) => ynSlide(x.s.replace(x.w, `<b class="kw">${x.w}</b>`), x.ok, `一起想想看${i + 1}`));
      return deck([{ name: "語詞", hint: "看圖說說看 → 📖 猜意思再打開 → ✏️ 讀例句 → 回答提問", slides: cards }, { name: "一起想想看", hint: "詞語用得對不對？說說你的理由。", slides: demo }]);
    }
    if (T === "base") {
      const kwPics = L.kw.map((x, i) => { const o = shuffle(L.kw.filter(y => y !== x)).slice(0, 2); return listenSlide(x[0], [x, ...o], 0, `聽詞選圖：${x[0]}`, { html: y => pic(y[1], y[0]), cls: "lpic", hint: "聽一聽，按出對的圖。" }); });
      const sent = L.listen.map((x, i) => picSlide(x.t.replace(/\{[^}]*\}/, "（　）"), x.opts.map(w => [w, (L.kw.find(k => k[0] === w) || [])[1]]), 0, `聽句子選詞${i + 1}`, { auto: true, say: blankless(x.t) }));
      return deck([{ name: "聽詞選圖", hint: "聽詞語，選出對的圖。", slides: kwPics }, { name: "聽句子選詞", hint: "聽句子，選出空格裡的詞。", slides: sent }, { name: "完成", slides: [finishSlide()] }], { submit: true });
    }
    const defS = defBankSlides(WD.filter(w => !/^\s*$/.test(w.def)).map(w => ({ t: w.w, h: w.w, def: w.def.replace(/^①/, "").replace(/②.*$/, "") })), { label: "詞義", per: 5 });
    return deck([{ name: "詞義", hint: "看解釋，選出詞語。", slides: defS }, { name: "情境判斷", hint: "看句子，判斷詞語用得對不對。", slides: judgeS }, { name: `「${L.multi.w}」的意思`, hint: "判斷句子裡的意思是 ① 還是 ②。", slides: multiS }, { name: "選詞填入", hint: "先按空格，再按詞語。", slides: fillS }, { name: "完成", slides: [finishSlide()] }], { submit: true });
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
      const fam = (L.zz || []).map(F => ({ name: zxSecName(F.id), hint: "看部首猜意思 → 讀字族文，圈出同一家的字", slides: [famSlide(F), poemSlide(F)] }));
      const secs = [...fam];
      if (L.cmp) secs.push({ name: "比一比", hint: "看看兩個字哪裡不一樣。", slides: [cmpSlide(L.cmp)] });
      secs.push({ name: "多音字", slides: [polyTeach] });
      const d = deck(secs); const bb = backBtn(); if (bb) d.append(bb); return d;
    }
    if (T === "base") return deck([{ name: "部首歸類", hint: "找出有這個部首的字。", slides: radS }, { name: "完成", slides: [finishSlide()] }], { submit: true });
    return deck([{ name: "形近字", hint: "選出句子裡要用的字。", slides: zxS }, { name: "多音字", hint: `判斷「${P.c}」在句子裡怎麼讀。`, slides: [polyTeach, ...polyS] }, { name: "完成", slides: [finishSlide()] }], { submit: true });
  },

  jx() {
    const T = tier(); const J = L.jx; const COL = ["b1", "b2", "b3"];
    const blocks = (arr, empty) => { const d = el("div", { class: "blocks" }); arr.forEach((t, k) => d.append(el("span", { class: "blk " + COL[k] + (t ? "" : " empty") }, t || J.blocks[k]))); return d; };
    const legend = el("div", { class: "blegend" }); J.blocks.forEach((t, k) => legend.append(el("span", { class: "blk " + COL[k] }, t)));
    const ck = ["有用到「假如」和「就」", "前後在說同一件事", "有標點符號"];
    /* ① 看示範 */
    const s1 = slide("", kick("① 看示範"), el("div", { class: "stem big-line" }, `${J.demo[0]}，${J.demo[1]}${J.demo[2]}。`), blocks(J.demo), legend.cloneNode(true), sayBtn(`${J.demo[0]}，${J.demo[1]}${J.demo[2]}。`, "唸句子"));
    /* ② 仿寫：換情況 */
    const ctx2 = {}; const l2 = fillLine(["假如", { ans: "", h: "" }, "，我們就去台北一○一大樓看風景。"], [], ctx2, "仿寫（換情況）");
    l2.blanks[0].dataset.ans = ""; l2.blanks[0].textContent = "　　　　";
    const chips2 = el("div", { class: "bank" }); J.s2.opts.forEach(t => { const b = el("button", { type: "button", class: "chip" }, t); b.onclick = () => { l2.blanks[0].textContent = t; l2.blanks[0].classList.add("ok"); if (!proj()) logText(qid2, `假如${t}，我們就去台北一○一大樓看風景。`); s2.classList.add("answered"); l2.parentNode.classList.add("answered"); }; chips2.append(b); });
    const qid2 = qid("② 仿寫：只換情況");
    const st2 = el("div", { class: "stem big-line" }); st2.append(l2);
    const s2 = slide("", kick("② 仿寫：只換「情況」"), el("div", { class: "hint" }, "選一個情況放進空格，唸唸看。"), blocks(["", J.demo[1], J.demo[2]]), st2, chips2);
    /* ③ 替換：換情況和做什麼 */
    const s3 = swapSlide(J, T);
    const slides = [s1, s2, s3];
    if (T !== "base") {
      /* ④ 半開放 */
      J.s4.forEach((x, i) => { const w = writeBox(`④ 半開放${i + 1}：${x.pre}`); w.querySelector("textarea").value = x.pre; const s = slide("", kick("④ 補完句子"), el("div", { class: "stem big-line" }, `${x.pre}……`), w, refBox(esc(x.pre + x.ref + "。"))); slides.push(s); });
      /* ⑤ 自己造句 */
      { const w = writeBox("⑤ 自己造句（假如……就……）"); const c = el("div", { class: "selfck only-stu" }); c.append(el("div", { class: "hint" }, "寫完檢查："), checklist(ck)); slides.push(slide("", kick("⑤ 自己造句"), el("div", { class: "stem" }, "用「假如……就……」自己造一句。"), legend.cloneNode(true), w, c, refBox(esc(J.s5ref)))); }
      /* ⑥ 接成兩句 */
      { const w = writeBox("⑥ 接成兩句"); const c = el("div", { class: "selfck only-stu" }); c.append(el("div", { class: "hint" }, "寫完檢查："), checklist(["第一句用到「假如……就……」", "第二句和第一句在說同一件事", "兩句都有標點符號"])); slides.push(slide("", kick("⑥ 接成兩句"), el("div", { class: "stem" }, "在自己的句子後面，寫出有關係的第二句。"), w, c, refBox(esc(J.s6ref)))); }
    } else {
      /* 基礎層：詞卡排句、口說，最後給參考例句 */
      slides.push(cardOrderSlide(J.cards, "詞卡排句"));
      slides.push(slide("", kick("參考例句"), el("div", { class: "refcard big-line" }, esc(J.baseRef)), sayBtn(J.baseRef, "唸例句")));
    }
    const secs = [{ name: "假如……就……", hint: T === "base" ? "看示範 → 換情況 → 換情況和做什麼 → 排排看" : "看示範 → 仿寫 → 替換 → 補完 → 自己造句 → 接成兩句", slides, seq: true }];
    if (T !== "base") {
      const B = L.bd;
      const bd1 = slide("", kick("看示範"), el("div", { class: "stem big-line" }, B.demo.replace("不但", '<b class="kw">不但</b>').replace("更", '<b class="kw">更</b>')), el("div", { class: "hint" }, "「更」後面說的，要比前面更進一步。"), sayBtn(B.demo, "唸句子"));
      const w2 = writeBox("不但……更……：仿寫"); w2.querySelector("textarea").value = B.copy.pre;
      const bd2 = slide("", kick("仿寫"), el("div", { class: "stem big-line" }, `${B.copy.pre}〔　〕。`), w2, refBox(esc(B.copy.pre + B.copy.ref + "。")));
      const w3 = writeBox("不但……更……：自己造句"); const c3 = el("div", { class: "selfck only-stu" }); c3.append(el("div", { class: "hint" }, "寫完檢查："), checklist(["有用到「不但」和「更」", "「更」後面比前面更進一步", "有標點符號"]));
      const bd3 = slide("", kick("自己造句"), el("div", { class: "stem" }, "用「不但……更……」自己造一句。"), w3, c3, refBox(esc(B.ownRef)));
      secs.push({ name: "不但……更……", slides: [bd1, bd2, bd3], seq: true });
      secs.push({ name: "照樣寫", hint: "照著課文的句子，換上自己的詞。", slides: L.phrase.map((p, i) => { const w = writeBox(`照樣寫${i + 1}`); return slide("", kick(p.pat), el("div", { class: "stem big-line" }, `課文：${p.orig}`), el("div", { class: "stem big-line" }, p.stem.map(x => x === 0 ? "〔　〕" : x).join("")), w, refBox(esc(p.ref))); }) });
    }
    if (T !== "proj") secs.push({ name: "完成", slides: [finishSlide()] });
    return deck(secs, { submit: T !== "proj" });
  },

  zyrz() {
    const zq = L.zyq.map((x, i) => listenSlide(x.c, [x.z, ...x.d], 0, `聽音選注音：${x.c}`, { cls: "zyopt", html: z => `<span class="ui zyo">${z}</span>`, stem: el("div", { class: "bigchar nozy" }, x.c), hint: "聽一聽，選出對的注音。" }));
    const zw = L.zyw.map((x, i) => listenSlide(x.w, [x.z, ...x.d], 0, `拼讀詞語：${x.w}`, { cls: "zyopt", html: z => `<span class="ui zyo">${z}</span>`, stem: el("div", { class: "bigword nozy" }, x.w), hint: "聽詞語，選出對的注音。" }));
    const rd = [...L.must.map(ch => { const c = L.cards.find(x => x.c === ch); const done = selfRead(`認讀：${ch}`); const sb = sayBtn(() => `${ch}，${c.word}的${ch}`, "對答案"); sb.hidden = !proj(); sb.classList.add("bigsay");
        const b = el("button", { type: "button", class: "btn solid only-stu" }, "我讀完了"); b.onclick = () => { done(); b.remove(); sb.hidden = false; sb.click(); };
        return slide("", el("div", { class: "flashc" }, `<span class="bigchar nozy must">${ch}</span>`), el("div", { class: "hint", style: "text-align:center" }, "先自己讀一次，再按喇叭對答案。"), tools(b, sb)); }),
      ...L.radsort.map(R => slide("", el("div", { class: "radcard" }, `${pic(R.img, R.r)}<span class="bigchar nozy">${R.r}</span>`), el("div", { class: "hint", style: "text-align:center" }, R.note.replace("這些字", "有這個部首的字")), sayBtn(`${R.r}部`, "唸部首")))];
    const secs = [{ name: "聽音選注音", hint: "每次做一小段就好。", slides: zq }, { name: "拼讀詞語", slides: zw }, { name: "認讀", hint: "必學字與部首卡。", slides: rd }];
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
        const p = produce({ label: `寫國字：${it.slice(0, 2).join("")}`, answer: it[3], check: t => t === it[3] ? { st: "ok" } : { st: "no", msg: "不是這個字" } });
        const s = slide("", kick(x.k), el("div", { class: "stem big-line" }, `寫出注音的國字：${show}`), p); s.reveal = p.reveal; out.push(s); });
      else if (x.type === "fix") { const p = produce({ label: `改錯字：${x.s}`, answer: x.ans, check: t => t === x.ans ? { st: "ok" } : { st: "no", msg: "再找找看" }, hint: `錯的字是「${x.wrong}」` });
        const s = slide("", kick(x.k), el("div", { class: "stem big-line" }, `句子裡有一個錯字，寫出正確的字：<br>${nz(x.s)}`), p); s.reveal = p.reveal; out.push(s); }
      else if (x.type === "choice") { const poly = x.k === "多音字"; const c = choiceQ(poly ? x.q.replace(/(濟+)/g, m => nz(m)) : x.q, x.opts.map(o => poly ? `<span class="ui">${o}</span>` : o), x.ans, `${x.k}：${plainText(x.q)}`); const s = slide("", kick(x.k), poly ? null : sayRow(c), c); s.reveal = c.reveal; out.push(s); }
      else if (x.type === "own") { const w = writeBox(`造句：${x.pat}`); out.push(slide("", kick(x.k), el("div", { class: "stem" }, `用「${x.pat}」造一句。`), w)); }
    });
    if (T === "proj") return deck([{ name: "綜合練習", slides: out }]);
    return deck([{ name: "綜合練習", hint: "整課重點複習。", slides: out }, { name: "完成", slides: [finishSlide()] }], { submit: true });
  },
};

/* 部首歸類：按出有這個部首的字 */
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
/* 替換：情況、做什麼兩排詞卡各自打亂，配成合理的一組 */
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
    if (used.has(key)) { msg.innerHTML = '<span class="hint">這一句已經組過了。</span>'; return; }
    if (selA === selB) { used.add(key); n++; if (!proj()) logAns(q, true, s); msg.innerHTML = '<span class="okmsg">√ 通順！</span>'; got.append(el("li", {}, s)); }
    else { msg.innerHTML = '<span class="pendmsg">唸唸看：前後合理嗎？</span>'; const a = el("button", { type: "button", class: "btn only-stu" }, "我覺得合理，請老師看"); a.onclick = () => { used.add(key); n++; logText(q, `${s}（學生覺得合理，待老師確認）`); got.append(el("li", { class: "pend" }, s + ' <small>老師會確認</small>')); msg.innerHTML = ""; root.classList.add("pending"); }; msg.append(a); }
    if (n >= 2) root.classList.add("answered");
  }
  paint(); const cols = el("div", { class: "ccols" }); cols.append(colA, colB);
  const root = el("div", { class: "combo" }); root.append(line, msg, cols, got);
  const s = slide("", kick("③ 替換：換「情況」和「做什麼」"), el("div", { class: "hint" }, "左邊選一個情況，右邊選一件事，組成合理的句子。至少組兩句。"), root);
  s.reveal = () => { got.innerHTML = ""; P.forEach(p => got.append(el("li", {}, `假如${p[0]}，我們就${p[1]}。`))); };
  return s;
}
/* 詞卡排句：依序按詞卡排成句子，也可以用說的 */
function cardOrderSlide(cards, label) {
  const q = qid(label); const box = el("div", { class: "ord" }); const line = el("div", { class: "ordline big-line" }); const pool = el("div", { class: "bank" });
  let seq = []; const res = el("div", { class: "pres", "aria-live": "polite" });
  const paint = () => { line.innerHTML = seq.length ? seq.map(k => `<span class="wchip">${cards[k]}</span>`).join("") : '<span class="hint">按下面的詞卡排成句子</span>'; };
  const btns = shuffle(cards.map((c, k) => k)).map(k => { const b = el("button", { type: "button", class: "chip" }, cards[k]); b.onclick = () => { if (box.classList.contains("answered")) return; seq.push(k); b.disabled = true; paint();
      if (seq.length === cards.length) { const ok = seq.every((x, i) => x === i); const s = seq.map(x => cards[x]).join(""); logAns(q, ok, s); if (ok) { box.classList.add("answered"); res.innerHTML = '<span class="okmsg">√ 排對了！唸唸看。</span>'; res.append(sayBtn(cards.join("").replace("放晴", "放晴，"), "唸句子")); } else { res.innerHTML = '<span class="nomsg">唸唸看，順不順？</span>再排一次。'; setTimeout(() => { seq = []; btns.forEach(x => x.disabled = false); paint(); }, 900); } } }; pool.append(b); return b; });
  const back = el("button", { type: "button", class: "btn" }, "退一張"); back.onclick = () => { if (box.classList.contains("answered") || !seq.length) return; const k = seq.pop(); btns.find(b => b.textContent === cards[k]).disabled = false; paint(); };
  paint(); box.append(line, pool, tools(back), res);
  const s = slide("", kick("詞卡排句"), el("div", { class: "inst" }, "照順序按詞卡，排成一句話。排好後大聲唸一次。"), box);
  s.reveal = () => { seq = cards.map((c, k) => k); paint(); }; return s;
}

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

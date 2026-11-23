"""組出四年級網站：網站外框（index/test.html、app.js、app.css、介面字型）＋各課資料（lessons/課次/）。

用法：
  python3 tools/build.py test   → 輸出到 dist/：test.html、t/（測試頁）
  python3 tools/build.py prod   → 輸出到 dist/：index.html、app.js…（正式網站，老師確認後才做）

課文密碼：環境變數 GUOYU_PW，或 private/pw.txt（不提交）。課文全文：private/text課次.txt（不提交）。
"""
import base64, hashlib, html, io, json, os, re, shutil, sys, importlib.util
from fontTools import subset
from PIL import Image
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import zy

MODE = sys.argv[1] if len(sys.argv) > 1 else "test"
TEST = MODE == "test"
PRIV = os.environ.get("GUOYU_PRIVATE", os.path.join(os.path.dirname(ROOT), "private"))
FONTS = os.environ.get("GUOYU_FONTS", os.path.join(os.path.dirname(ROOT), "fonts_src"))
IANSUI = os.path.join(FONTS, "Iansui_400Regular.ttf")
BPMF = os.path.join(FONTS, "BpmfIansui_400Regular.ttf")
DIST = ROOT   # GitHub Pages 直接從儲存庫根目錄發布
OUT = os.path.join(DIST, "t") if TEST else DIST
LESSON_IDS = ["8"]
IVSR = re.compile("[\U000E0100-\U000E01EF]")

def load_py(path, name):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

def pw():
    if os.environ.get("GUOYU_PW"): return os.environ["GUOYU_PW"]
    return open(os.path.join(PRIV, "pw.txt"), encoding="utf-8").read().strip()

LOCK = json.load(open(os.path.join(ROOT, "tools", "lock.json")))

def seal(obj, key):
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, json.dumps(obj, ensure_ascii=False).encode(), None)
    return {"i": base64.b64encode(iv).decode(), "c": base64.b64encode(ct).decode()}

# ── 字串處理：多音字加 IVS；代號、注音字串不處理 ──
ID_RE = re.compile(r"^[a-z0-9_]+$")
def is_zhuyin(s): return bool(s) and all(c in "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˊˇˋ˙ˉ " for c in s)
SKIP_KEYS = {"img", "pic", "pics", "imgs", "cz", "z", "d", "type", "seg", "st", "id"}
def annotate(x, rules, key=None):
    if isinstance(x, str):
        if key in SKIP_KEYS or ID_RE.match(x) or is_zhuyin(x): return x
        return zy.apply(x, rules)
    if isinstance(x, list): return [annotate(v, rules, key) for v in x]
    if isinstance(x, dict): return {k: annotate(v, rules, k) for k, v in x.items()}
    return x

def para_html(t, words, chars, rules):
    """課文段落：加 IVS、詞語按鈕、生字標示"""
    t = zy.apply(t, rules)
    plain = zy.strip(t)
    # 依 plain 位置找詞語（長的先），換成按鈕
    spans = []; used = [False] * len(plain)
    for w in sorted(words, key=len, reverse=True):
        for m in re.finditer(re.escape(w), plain):
            a, b = m.span()
            if any(used[a:b]): continue
            for k in range(a, b): used[k] = True
            spans.append((a, b, w))
    spans.sort()
    # 把 plain 位置對應回含 IVS 的字串
    pos = []; k = 0
    for i, c in enumerate(t):
        if IVSR.match(c): continue
        pos.append(i)
    pos.append(len(t))
    def seg(a, b):
        out = ""
        for i in range(a, b):
            s0 = t[pos[i]:pos[i + 1]]
            out += f'<span class="zi">{html.escape(s0)}</span>' if plain[i] in chars else html.escape(s0)
        return out
    out = ""; last = 0
    for a, b, w in spans:
        out += seg(last, a) + f'<button type="button" class="w" data-w="{html.escape(w)}">{seg(a, b)}</button>'; last = b
    return out + seg(last, len(plain))

NUMS = "一二三四五六七八九十"
def placeholder(i, words_in):
    no = NUMS[i] if i < len(NUMS) else str(i + 1)
    hidden = "".join(f'<button type="button" class="w" data-w="{html.escape(w)}">{html.escape(w)}</button>' for w in words_in)
    return (f'<span class="lockp">🔒 第{no}段課文請翻開課本閱讀。<button type="button" class="btn unlockbtn">🔑 老師解鎖</button></span>'
            f'<span class="lockw" hidden>{hidden}</span>')

def webp_uri(path):
    im = Image.open(path).convert("RGBA"); buf = io.BytesIO(); im.save(buf, "WEBP", quality=90, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()

def subset_font(src, chars, out, keep_ivs=False):
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = ["*"]; opts.notdef_outline = True; opts.recalc_bounds = True
    opts.drop_tables = [t for t in opts.drop_tables]
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    us = {ord(c) for c in chars if ord(c) < 0xE0100}
    us |= set(range(0x20, 0x7F))
    if keep_ivs: us |= set(range(0xE0100, 0xE01F0))
    sub.populate(unicodes=us); sub.subset(font)
    subset.save_font(font, out, opts)
    return os.path.getsize(out)

def build_lesson(lid, key):
    src = os.path.join(ROOT, "lessons_src", lid)
    L = load_py(os.path.join(src, "lesson.py"), f"lesson{lid}").LESSON
    rules = load_py(os.path.join(src, "zyrules.py"), f"zyrules{lid}").RULES
    art = load_py(os.path.join(src, "art.py"), f"art{lid}").ART
    D = annotate(L, rules)
    # 課文
    text = [x for x in open(os.path.join(PRIV, f"text{lid}.txt"), encoding="utf-8").read().split("\n") if x.strip()]
    words = [w["w"] for w in L["words"]]
    chars = {c["c"] for c in L["cards"]}
    paras = [para_html(t, words, chars, rules) for t in text]
    winp = [[w for w in sorted(words, key=lambda w: t.find(w)) if w in t] for t in text]
    D["text"] = [placeholder(i, ws) for i, ws in enumerate(winp)]
    # 彩色生字圖（依生字順序）
    imgdir = os.path.join(PRIV, f"img{lid}")
    imgs = [webp_uri(os.path.join(imgdir, f"{c['c']}.png")) if os.path.exists(os.path.join(imgdir, f"{c['c']}.png")) else "" for c in L["cards"]]
    for c in D["cards"]: c["img"] = ""
    out = os.path.join(OUT, "lessons", lid); os.makedirs(os.path.join(out, "img"), exist_ok=True)
    data = json.dumps(D, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(out, "data.json"), "w", encoding="utf-8").write(data)
    json.dump(seal({"text": paras, "img": imgs}, key), open(os.path.join(out, "sealed.json"), "w"))
    for n, s in art.items(): open(os.path.join(out, "img", n + ".svg"), "w", encoding="utf-8").write(s)
    # 字型子集：這一課用到的字
    chars_all = set(data) | set("".join(paras)) | set("".join(text))
    chars_all = {c for c in chars_all if ord(c) > 0x7F}
    a = subset_font(IANSUI, chars_all, os.path.join(out, "l.woff2"))
    b = subset_font(BPMF, chars_all, os.path.join(out, "z.woff2"), keep_ivs=True)
    v = hashlib.sha1((data + json.dumps(paras, ensure_ascii=False) + "".join(art.values())).encode()).hexdigest()[:8]
    print(f"第{lid}課：data {len(data)//1024}KB、芫荽 {a//1024}KB、注音芫荽 {b//1024}KB、字數 {len(chars_all)}")
    return {"id": lid, "no": L["no"], "title": L["title"], "v": v}

def main():
    if os.path.exists(OUT) and TEST: shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)
    k = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=base64.b64decode(LOCK["s"]), iterations=LOCK["n"]).derive(pw().encode())
    idx = [build_lesson(lid, k) for lid in LESSON_IDS]
    os.makedirs(os.path.join(OUT, "lessons"), exist_ok=True)
    json.dump({"lessons": idx}, open(os.path.join(OUT, "lessons", "index.json"), "w", encoding="utf-8"), ensure_ascii=False)
    # 網站外框
    S = os.path.join(ROOT, "src")
    core = open(os.path.join(S, "core.js"), encoding="utf-8").read()
    views = open(os.path.join(S, "views4.js"), encoding="utf-8").read()
    UI = load_py(os.path.join(ROOT, "tools", "zyrules_ui.py"), "zyui").RULES
    core = zy.apply(core, UI); views = zy.apply(views, UI)   # 介面文字也照注音規則標讀音
    head = f'const SEAL = {json.dumps(LOCK)}; const TESTBUILD = {"true" if TEST else "false"};\n'
    js = head + core.replace("/*__VIEWS__*/", views) + "\n" + open(os.path.join(S, "tts.js"), encoding="utf-8").read() + "\n" + open(os.path.join(S, "lock.js"), encoding="utf-8").read()
    css = open(os.path.join(S, "app.css"), encoding="utf-8").read() + "\n" + open(os.path.join(S, "lock.css"), encoding="utf-8").read()
    body = open(os.path.join(S, "body.html"), encoding="utf-8").read()
    nocomment = re.sub(r"/\*.*?\*/", "", js + css, flags=re.S)
    ui_chars = {c for c in nocomment + body if ord(c) > 0x7F}
    os.makedirs(os.path.join(OUT, "fonts"), exist_ok=True)
    u = subset_font(IANSUI, ui_chars, os.path.join(OUT, "fonts", "ui.woff2"))
    uv = hashlib.sha1("".join(sorted(ui_chars)).encode()).hexdigest()[:8]
    css = css.replace("__UIFONT__", f"fonts/ui.woff2?v={uv}")
    vjs = hashlib.sha1(js.encode()).hexdigest()[:8]; vcss = hashlib.sha1(css.encode()).hexdigest()[:8]
    open(os.path.join(OUT, "app.js"), "w", encoding="utf-8").write(js)
    open(os.path.join(OUT, "app.css"), "w", encoding="utf-8").write(css)
    pre = "t/" if TEST else ""
    page = body.replace('<html lang="zh-Hant-TW">', f'<html lang="zh-Hant-TW" data-lbase="{pre}lessons/">')
    page = page.replace("<title>", "<title>【測試版】" if TEST else "<title>", 1)
    page = page.replace("</head>", f'<link rel="preload" href="{pre}fonts/ui.woff2?v={uv}" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="{pre}app.css?v={vcss}">\n<script src="{pre}app.js?v={vjs}" defer></script>\n</head>', 1)
    open(os.path.join(DIST, "test.html" if TEST else "index.html"), "w", encoding="utf-8").write(page)
    print(f"介面字型 {u//1024}KB（{len(ui_chars)} 字）、app.js {len(js.encode())//1024}KB、app.css {len(css.encode())//1024}KB")

main()

"""注音 IVS 工具：依 bpmfvs 讀音表，在多音字後面加上異體字選擇器，選出正確讀音。"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
TABLE = os.environ.get("BPMF_TABLE", os.path.join(HERE, "phonic_table_Z.txt"))
READ = {}
for line in open(TABLE, encoding="utf-8"):
    p = line.rstrip("\n").split("\t")
    if len(p) >= 4: READ[p[0]] = p[3:]
POLY = {c for c, r in READ.items() if len(r) > 1}
MARK = set("【】{}|")
IVS = re.compile("[\U000E0100-\U000E01EF]")

def strip(s): return IVS.sub("", s)

def default(c): return READ.get(c, [""])[0]

def scan(text):
    """列出文字裡每個多音字的位置、前後文與預設讀音"""
    t = strip(text); out = []
    for i, c in enumerate(t):
        if c in POLY: out.append((i, c, t[max(0, i - 4):i + 5], READ[c][0], READ[c]))
    return out

NUM = set("〇○零一二三四五六七八九十百千萬兩第")
def tone(z):
    if not z: return 0
    if z.startswith("˙"): return 5
    return {"ˊ": 2, "ˇ": 3, "ˋ": 4}.get(z[-1], 1)
def auto_sandhi(t):
    """「一」「不」依後字聲調自動變調（與六年級網站相同的標法）；數字、序數、年月日讀原調"""
    pick = {}
    for i, c in enumerate(t):
        if c not in "一不": continue
        nxt = t[i + 1] if i + 1 < len(t) else ""
        prv = t[i - 1] if i else ""
        if c == "一":
            if not nxt or nxt not in READ or nxt in NUM or prv in NUM or prv in "統唯單專之" or nxt in "月日號樓": continue
            pick[i] = "ㄧˊ" if tone(READ[nxt][0]) == 4 else "ㄧˋ"
        else:
            if nxt in READ and tone(READ[nxt][0]) == 4: pick[i] = "ㄅㄨˊ"
    return pick

def apply(text, rules):
    """rules：[(片語, {片語內位置: 讀音})]。片語出現的地方套用指定讀音；其他多音字用預設讀音。
    回傳加上 IVS 的文字，以及沒有被規則涵蓋、但預設讀音以外還有其他讀音的字（交給人工確認）。"""
    t = strip(text); pick = auto_sandhi(t)
    keep = [i for i, c in enumerate(t) if c not in MARK]   # 比對時略過【】{}| 等記號
    flat = "".join(t[i] for i in keep)
    for ph, m in rules:
        for mm in re.finditer(re.escape(ph), flat):
            for k, z in m.items(): pick[keep[mm.start() + k]] = z
    out = []; 
    for i, c in enumerate(t):
        out.append(c)
        if i in pick:
            rs = READ.get(c, [])
            if pick[i] not in rs: raise ValueError(f"{c} 沒有讀音 {pick[i]}（可選 {rs}）")
            k = rs.index(pick[i])
            if k: out.append(chr(0xE01E0 + k))
    return "".join(out)

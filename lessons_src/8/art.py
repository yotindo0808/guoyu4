# 第八課插畫（自製簡單插畫，SVG）。圖裡不放文字，避免字型不一致。
W, H = 160, 120

def svg(body, bg="#eef6fb", vb=f"0 0 {W} {H}"):
    rect = f'<rect width="100%" height="100%" rx="10" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{rect}{body}</svg>'

def windows(x, y, w, h, cols, rows, fill="#bfe0f5", pad=3):
    cw, rh = (w - pad * (cols + 1)) / cols, (h - pad * (rows + 1)) / rows
    return "".join(f'<rect x="{x + pad + c * (cw + pad):.1f}" y="{y + pad + r * (rh + pad):.1f}" width="{cw:.1f}" height="{rh:.1f}" fill="{fill}"/>' for c in range(cols) for r in range(rows))

GROUND = '<rect x="0" y="104" width="160" height="16" fill="#cfe3c2"/>'

def building(x=58, w=44, top=12, col="#7d8fa3"):
    return f'<rect x="{x}" y="{top}" width="{w}" height="{104 - top}" fill="{col}"/>' + windows(x, top + 4, w, 100 - top - 10, 3, 7)

def t101(cx=80, base=104, s=1.0, col="#5f8f8a"):
    # 台北一○一：八節倒梯形往上疊，頂端有塔尖
    out = f'<rect x="{cx - 16 * s}" y="{base - 16 * s}" width="{32 * s}" height="{16 * s}" fill="{col}"/>'
    y = base - 16 * s
    for k in range(8):
        h = 9.5 * s
        out += f'<polygon points="{cx - 12 * s},{y} {cx + 12 * s},{y} {cx + 14.5 * s},{y - h} {cx - 14.5 * s},{y - h}" fill="{col}" stroke="#3e6b66" stroke-width="{.8 * s}"/>'
        y -= h
    out += f'<rect x="{cx - 6 * s}" y="{y - 6 * s}" width="{12 * s}" height="{6 * s}" fill="{col}"/><rect x="{cx - 1.2 * s}" y="{y - 20 * s}" width="{2.4 * s}" height="{14 * s}" fill="#3e6b66"/>'
    return out

def skytree(cx=80, base=104, s=1.0, col="#f4fbff", line="#7fb8d8"):
    # 東京晴空塔：底部寬、往上收窄，有兩層展望台
    out = f'<polygon points="{cx - 14 * s},{base} {cx + 14 * s},{base} {cx + 4 * s},{base - 60 * s} {cx - 4 * s},{base - 60 * s}" fill="{col}" stroke="{line}" stroke-width="{1.2 * s}"/>'
    for k in range(1, 6):
        y = base - k * 10 * s; hw = 14 * s - (10 * s) * k / 6
        out += f'<line x1="{cx - hw}" y1="{y}" x2="{cx + hw}" y2="{y}" stroke="{line}" stroke-width="{.8 * s}"/>'
    out += f'<rect x="{cx - 8 * s}" y="{base - 66 * s}" width="{16 * s}" height="{6 * s}" rx="{2 * s}" fill="{col}" stroke="{line}" stroke-width="{1.2 * s}"/>'
    out += f'<rect x="{cx - 3.5 * s}" y="{base - 84 * s}" width="{7 * s}" height="{18 * s}" fill="{col}" stroke="{line}" stroke-width="{1.2 * s}"/>'
    out += f'<rect x="{cx - 5.5 * s}" y="{base - 80 * s}" width="{11 * s}" height="{4 * s}" rx="{1.5 * s}" fill="{col}" stroke="{line}" stroke-width="{1 * s}"/>'
    out += f'<rect x="{cx - .9 * s}" y="{base - 98 * s}" width="{1.8 * s}" height="{14 * s}" fill="{line}"/>'
    return out

def tower(cx, base=104, s=1.0, col="#9aa9b8"):
    # 雙峰塔的一棟：層層往上收，頂端尖塔
    out = ""; w = 13 * s; y = base
    for k, h in enumerate([34, 18, 12, 8, 6]):
        out += f'<rect x="{cx - w}" y="{y - h * s}" width="{2 * w}" height="{h * s}" fill="{col}" stroke="#6f7f8f" stroke-width="{.8 * s}"/>'
        y -= h * s; w -= 2.2 * s
    out += f'<polygon points="{cx - 2 * s},{y} {cx + 2 * s},{y} {cx},{y - 16 * s}" fill="#6f7f8f"/>'
    return out

def twin(base=104, s=1.0, gap=36, bridge="#e8b93c", cx=80):
    a, b = cx - gap / 2 * s, cx + gap / 2 * s
    out = tower(a, base, s) + tower(b, base, s)
    by = base - 44 * s
    out += f'<rect x="{a + 9 * s}" y="{by}" width="{b - a - 18 * s}" height="{4 * s}" fill="{bridge}"/>'
    out += f'<line x1="{a + 9 * s}" y1="{by + 4 * s}" x2="{(a + b) / 2}" y2="{by + 14 * s}" stroke="{bridge}" stroke-width="{2 * s}"/><line x1="{b - 9 * s}" y1="{by + 4 * s}" x2="{(a + b) / 2}" y2="{by + 14 * s}" stroke="{bridge}" stroke-width="{2 * s}"/>'
    return out

def giraffe(x=0, y=0, s=1.0):
    g = f'<g transform="translate({x},{y}) scale({s})">'
    g += '<rect x="28" y="70" width="5" height="30" fill="#d9a441"/><rect x="40" y="70" width="5" height="30" fill="#d9a441"/><rect x="58" y="70" width="5" height="30" fill="#d9a441"/><rect x="68" y="70" width="5" height="30" fill="#d9a441"/>'
    g += '<ellipse cx="50" cy="66" rx="27" ry="14" fill="#f2c14e"/>'
    g += '<polygon points="66,60 76,58 92,10 84,8" fill="#f2c14e"/>'
    g += '<ellipse cx="92" cy="10" rx="11" ry="6.5" fill="#f2c14e"/><circle cx="94" cy="8" r="1.6" fill="#333"/>'
    g += '<line x1="86" y1="4" x2="85" y2="-2" stroke="#b07c2a" stroke-width="2"/><line x1="90" y1="4" x2="90" y2="-2" stroke="#b07c2a" stroke-width="2"/>'
    for cx, cy, r in [(40, 62, 4), (54, 68, 3.5), (62, 60, 3), (46, 72, 3), (78, 42, 2.5), (83, 28, 2.2), (72, 56, 2.5), (33, 68, 2.5)]:
        g += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#b0702a"/>'
    return g + '</g>'

ART = {}
ART["building"] = svg(GROUND + building(56, 48, 10) + '<rect x="20" y="62" width="26" height="42" fill="#a7b4c2"/>' + windows(20, 64, 26, 38, 2, 4) + '<rect x="114" y="54" width="28" height="50" fill="#a7b4c2"/>' + windows(114, 56, 28, 46, 2, 5))
ART["t101"] = svg(GROUND + t101())
ART["skytree"] = svg(GROUND + skytree())
ART["twin"] = svg(GROUND + twin())
ART["skybridge"] = svg(GROUND + twin(bridge="#ff8f1f") + '<circle cx="80" cy="64" r="20" fill="none" stroke="#ff8f1f" stroke-width="3" stroke-dasharray="5 4"/>')
ART["giraffe"] = svg(GROUND + giraffe(22, 8, 1.0))
ART["elephant"] = svg(GROUND + '<ellipse cx="78" cy="68" rx="38" ry="24" fill="#9aa5b1"/><rect x="50" y="80" width="10" height="24" fill="#9aa5b1"/><rect x="66" y="82" width="10" height="22" fill="#9aa5b1"/><rect x="86" y="82" width="10" height="22" fill="#9aa5b1"/><rect x="100" y="80" width="10" height="24" fill="#9aa5b1"/><circle cx="118" cy="52" r="18" fill="#9aa5b1"/><ellipse cx="108" cy="52" rx="10" ry="14" fill="#8793a0"/><path d="M132 56 Q142 76 134 94" stroke="#9aa5b1" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="124" cy="48" r="2" fill="#333"/>')
ART["rabbit"] = svg(GROUND + '<ellipse cx="80" cy="80" rx="26" ry="22" fill="#fff" stroke="#c9c9c9"/><circle cx="80" cy="50" r="16" fill="#fff" stroke="#c9c9c9"/><ellipse cx="72" cy="22" rx="5" ry="16" fill="#fff" stroke="#c9c9c9"/><ellipse cx="88" cy="22" rx="5" ry="16" fill="#fff" stroke="#c9c9c9"/><ellipse cx="72" cy="22" rx="2.2" ry="11" fill="#f7b6c2"/><ellipse cx="88" cy="22" rx="2.2" ry="11" fill="#f7b6c2"/><circle cx="74" cy="48" r="2" fill="#333"/><circle cx="86" cy="48" r="2" fill="#333"/><circle cx="80" cy="55" r="2" fill="#f28da0"/>')
ART["door"] = svg('<rect x="0" y="104" width="160" height="16" fill="#d9cdb6"/><rect x="40" y="14" width="80" height="90" fill="#c9b18f"/><rect x="48" y="22" width="30" height="82" fill="#8a5a33"/><rect x="82" y="22" width="30" height="82" fill="#8a5a33"/><circle cx="74" cy="64" r="2.6" fill="#e8b93c"/><circle cx="86" cy="64" r="2.6" fill="#e8b93c"/>')
SUN = '<circle cx="80" cy="58" r="22" fill="#ffcf3d"/>' + "".join(f'<line x1="{80 + 28 * c:.1f}" y1="{58 + 28 * s:.1f}" x2="{80 + 40 * c:.1f}" y2="{58 + 40 * s:.1f}" stroke="#ffb31a" stroke-width="5" stroke-linecap="round"/>' for c, s in [(1, 0), (.71, .71), (0, 1), (-.71, .71), (-1, 0), (-.71, -.71), (0, -1), (.71, -.71)])
ART["sunny"] = svg(SUN, bg="#cde9ff")
CLOUD = lambda x, y, c="#fff", s=1: f'<g transform="translate({x},{y}) scale({s})" fill="{c}"><circle cx="0" cy="0" r="14"/><circle cx="16" cy="-8" r="18"/><circle cx="34" cy="0" r="14"/><rect x="0" y="-2" width="34" height="16"/></g>'
ART["rainy"] = svg(CLOUD(50, 44, "#9fb0bf", 1.4) + "".join(f'<line x1="{x}" y1="{y}" x2="{x - 4}" y2="{y + 12}" stroke="#4a90d9" stroke-width="3" stroke-linecap="round"/>' for x, y in [(56, 78), (72, 86), (88, 76), (104, 88), (64, 98), (96, 100), (118, 80)]), bg="#dde5ea")
ART["cloudy"] = svg(CLOUD(30, 50, "#b8c2cc", 1.2) + CLOUD(82, 66, "#9aa6b2", 1.3) + CLOUD(70, 32, "#c7d0d8", 1.0), bg="#e3e8ec")
ART["lighthouse"] = svg('<rect x="0" y="90" width="160" height="30" fill="#7fc3e6"/><path d="M40 104 Q80 84 120 104 Z" fill="#8c7a66"/><polygon points="68,92 92,92 86,30 74,30" fill="#fff" stroke="#b33" stroke-width="1"/><polygon points="72,62 88,62 87,50 73,50" fill="#d94b3d"/><polygon points="70,84 90,84 89,74 71,74" fill="#d94b3d"/><rect x="72" y="20" width="16" height="10" fill="#ffe27a" stroke="#555"/><polygon points="70,20 90,20 80,10" fill="#d94b3d"/><polygon points="88,22 150,6 150,38" fill="#fff3a6" opacity=".7"/>', bg="#d8eefb")
ART["bulb"] = svg('<circle cx="80" cy="50" r="26" fill="#fff3a6" stroke="#e0b100" stroke-width="3"/><rect x="70" y="74" width="20" height="16" fill="#9aa5b1"/><line x1="70" y1="80" x2="90" y2="80" stroke="#6f7a85" stroke-width="2"/><line x1="70" y1="86" x2="90" y2="86" stroke="#6f7a85" stroke-width="2"/><path d="M72 58 Q80 42 88 58" stroke="#e0b100" stroke-width="2.5" fill="none"/>', bg="#f3f0e6")
ART["lantern"] = svg('<line x1="80" y1="6" x2="80" y2="22" stroke="#7a5a2a" stroke-width="2"/><rect x="66" y="20" width="28" height="6" fill="#e8b93c"/><ellipse cx="80" cy="56" rx="30" ry="32" fill="#e0453a"/><path d="M60 32 Q52 56 60 80 M100 32 Q108 56 100 80 M80 24 L80 88" stroke="#b92f26" stroke-width="2" fill="none"/><rect x="66" y="86" width="28" height="6" fill="#e8b93c"/><line x1="76" y1="92" x2="76" y2="110" stroke="#e8b93c" stroke-width="2"/><line x1="80" y1="92" x2="80" y2="112" stroke="#e8b93c" stroke-width="2"/><line x1="84" y1="92" x2="84" y2="110" stroke="#e8b93c" stroke-width="2"/>', bg="#f6ece1")
ART["bridge"] = svg('<rect x="0" y="86" width="160" height="34" fill="#8d98a3"/><line x1="0" y1="103" x2="160" y2="103" stroke="#fff" stroke-width="2" stroke-dasharray="10 8"/><rect x="18" y="92" width="22" height="9" rx="3" fill="#e0453a"/><rect x="110" y="106" width="22" height="9" rx="3" fill="#4a90d9"/><rect x="20" y="44" width="120" height="9" fill="#c9a26b"/><rect x="20" y="36" width="120" height="3" fill="#6d5a3d"/>' + "".join(f'<line x1="{x}" y1="39" x2="{x}" y2="44" stroke="#6d5a3d" stroke-width="2"/>' for x in range(24, 140, 10)) + '<rect x="26" y="53" width="7" height="33" fill="#9c8a6e"/><rect x="127" y="53" width="7" height="33" fill="#9c8a6e"/><polygon points="0,86 20,53 28,53 8,86" fill="#c9a26b"/><polygon points="160,86 140,53 132,53 152,86" fill="#c9a26b"/><circle cx="70" cy="30" r="4" fill="#333"/><line x1="70" y1="34" x2="70" y2="43" stroke="#333" stroke-width="3"/>', bg="#dff1ff")
ART["bamboo"] = svg(GROUND + "".join(f'<rect x="{x}" y="{t}" width="10" height="{104 - t}" rx="3" fill="#6cb86b"/>' + "".join(f'<rect x="{x - 1}" y="{y}" width="12" height="3" rx="1.5" fill="#3f8b45"/>' for y in range(t + 14, 104, 16)) for x, t in [(52, 10), (74, 22), (96, 14)]) + '<path d="M62 30 q16 -4 24 -16 q-6 14 -24 16z M106 40 q14 2 24 -8 q-8 12 -24 8z M84 56 q-16 -2 -26 -12 q10 14 26 12z" fill="#4f9d50"/>')
ART["banana"] = svg('<path d="M40 40 Q50 96 120 92 Q128 90 126 84 Q70 84 56 36 Z" fill="#ffd84d" stroke="#d1a800" stroke-width="2"/><path d="M40 40 l-4 -8 l8 2 z" fill="#6b5a2a"/>', bg="#fbf6e2")
ART["umbrella"] = svg('<path d="M24 64 Q80 -6 136 64 Q122 56 108 64 Q94 56 80 64 Q66 56 52 64 Q38 56 24 64Z" fill="#4a90d9"/><line x1="80" y1="22" x2="80" y2="96" stroke="#555" stroke-width="3"/><path d="M80 96 q0 10 -10 10 q-8 0 -8 -8" stroke="#555" stroke-width="3" fill="none"/>', bg="#eef3fa")
ART["damper"] = svg('<rect x="34" y="8" width="92" height="104" fill="#d5dde4" stroke="#7d8fa3" stroke-width="3"/><line x1="60" y1="8" x2="70" y2="52" stroke="#555" stroke-width="2.5"/><line x1="100" y1="8" x2="90" y2="52" stroke="#555" stroke-width="2.5"/><line x1="80" y1="8" x2="80" y2="48" stroke="#555" stroke-width="2.5"/><circle cx="80" cy="70" r="24" fill="#e8b93c" stroke="#b88a12" stroke-width="3"/><ellipse cx="72" cy="62" rx="7" ry="5" fill="#fff3c4" opacity=".8"/><line x1="40" y1="100" x2="58" y2="84" stroke="#7d8fa3" stroke-width="4"/><line x1="120" y1="100" x2="102" y2="84" stroke="#7d8fa3" stroke-width="4"/>', bg="#eef2f5")
ART["elevator"] = svg('<rect x="40" y="10" width="80" height="100" fill="#c9d1d8"/><rect x="48" y="24" width="31" height="86" fill="#9aa6b2"/><rect x="81" y="24" width="31" height="86" fill="#9aa6b2"/><rect x="66" y="12" width="28" height="9" rx="2" fill="#333"/><polygon points="74,19 78,14 82,19" fill="#ffcf3d"/><circle cx="130" cy="52" r="6" fill="#fff" stroke="#555"/><polygon points="127,54 130,49 133,54" fill="#555"/><circle cx="130" cy="68" r="6" fill="#fff" stroke="#555"/><polygon points="127,66 130,71 133,66" fill="#555"/>', bg="#eef1f3")
ART["aircon"] = svg('<rect x="24" y="22" width="112" height="36" rx="8" fill="#fff" stroke="#9aa6b2" stroke-width="2"/><rect x="34" y="48" width="92" height="5" rx="2" fill="#c9d1d8"/><circle cx="122" cy="32" r="3" fill="#4caf50"/>' + "".join(f'<path d="M{x} 66 q-6 12 0 24 q6 12 0 22" stroke="#7fc3e6" stroke-width="3" fill="none" stroke-linecap="round"/>' for x in (54, 80, 106)), bg="#eef6fb")
FW = lambda cx, cy, r, c: "".join(f'<line x1="{cx + r * .3 * dx:.1f}" y1="{cy + r * .3 * dy:.1f}" x2="{cx + r * dx:.1f}" y2="{cy + r * dy:.1f}" stroke="{c}" stroke-width="2.5" stroke-linecap="round"/>' for dx, dy in [(1, 0), (.71, .71), (0, 1), (-.71, .71), (-1, 0), (-.71, -.71), (0, -1), (.71, -.71)]) + f'<circle cx="{cx}" cy="{cy}" r="2.5" fill="{c}"/>'
ART["fireworks"] = svg(FW(40, 30, 18, "#ff6b6b") + FW(120, 26, 20, "#ffd84d") + FW(84, 50, 14, "#7fd1ff") + t101(80, 120, .9, "#2f4f5f"), bg="#1d2a44")
ART["snow"] = svg("".join(f'<g stroke="#fff" stroke-width="2.4" stroke-linecap="round" transform="translate({x},{y})"><line x1="-7" y1="0" x2="7" y2="0"/><line x1="0" y1="-7" x2="0" y2="7"/><line x1="-5" y1="-5" x2="5" y2="5"/><line x1="-5" y1="5" x2="5" y2="-5"/></g>' for x, y in [(30, 24), (70, 16), (116, 30), (48, 58), (96, 52), (136, 66), (24, 86), (80, 84)]) + '<rect x="0" y="100" width="160" height="20" fill="#fff"/>', bg="#9fc4e4")
RUNNER = lambda x, c: f'<g transform="translate({x},40)" stroke="{c}" stroke-width="5" stroke-linecap="round" fill="none"><circle cx="0" cy="0" r="6" fill="{c}" stroke="none"/><line x1="0" y1="8" x2="-4" y2="30"/><line x1="-4" y1="30" x2="8" y2="44"/><line x1="-4" y1="30" x2="-16" y2="42"/><line x1="-1" y1="14" x2="12" y2="20"/><line x1="-1" y1="14" x2="-14" y2="10"/></g>'
ART["race"] = svg('<rect x="0" y="84" width="160" height="36" fill="#d9734e"/><line x1="0" y1="96" x2="160" y2="96" stroke="#fff" stroke-width="2"/><line x1="0" y1="108" x2="160" y2="108" stroke="#fff" stroke-width="2"/><rect x="136" y="30" width="4" height="66" fill="#555"/><rect x="140" y="30" width="16" height="10" fill="#fff"/><rect x="140" y="30" width="5" height="5" fill="#333"/><rect x="150" y="30" width="5" height="5" fill="#333"/><rect x="145" y="35" width="5" height="5" fill="#333"/>' + RUNNER(50, "#4a90d9") + RUNNER(92, "#e0453a"), bg="#e8f4fb")
ART["c_white"] = svg(skytree(80, 112, 1.0, "#ffffff", "#5fb7d6"), bg="#bfe3f7")
ART["c_red"] = svg(skytree(80, 112, 1.0, "#e0453a", "#9c2a22"), bg="#bfe3f7")
ART["c_black"] = svg(skytree(80, 112, 1.0, "#2d2d2d", "#000"), bg="#bfe3f7")
ART["n1"] = svg(GROUND + tower(80))
ART["n2"] = svg(GROUND + tower(56) + tower(104))
ART["n3"] = svg(GROUND + tower(36) + tower(80) + tower(124))
ART["pool"] = svg('<rect x="16" y="30" width="128" height="70" rx="6" fill="#5cc3ef" stroke="#e8e8e8" stroke-width="6"/>' + "".join(f'<line x1="16" y1="{y}" x2="144" y2="{y}" stroke="#ff8f6b" stroke-width="2" stroke-dasharray="4 4"/>' for y in (48, 64, 80)) + '<path d="M128 22 v24 M138 22 v24 M128 30 h10 M128 38 h10" stroke="#9aa6b2" stroke-width="3"/>', bg="#eaf6ee")
ART["parking"] = svg('<rect x="0" y="70" width="160" height="50" fill="#8d98a3"/>' + "".join(f'<line x1="{x}" y1="74" x2="{x}" y2="116" stroke="#fff" stroke-width="3"/>' for x in (40, 80, 120)) + '<rect x="48" y="86" width="26" height="14" rx="4" fill="#e0453a"/><circle cx="54" cy="101" r="3.5" fill="#333"/><circle cx="68" cy="101" r="3.5" fill="#333"/><rect x="18" y="14" width="36" height="36" rx="6" fill="#1f6fd1"/><path d="M30 42 V22 h8 a7 7 0 0 1 0 14 h-8" stroke="#fff" stroke-width="4" fill="none"/><rect x="34" y="50" width="4" height="20" fill="#555"/>', bg="#e8eef3")
ART["quake"] = svg('<path d="M0 104 L40 104 L48 96 L56 110 L66 98 L74 104 L160 104 L160 120 L0 120 Z" fill="#b8956b"/><g transform="rotate(-6 80 104)">' + building(62, 36, 20, "#8b9cb0") + '</g><path d="M30 40 l-8 6 l8 6 l-8 6 M130 40 l8 6 l-8 6 l8 6" stroke="#e0453a" stroke-width="3" fill="none" stroke-linecap="round"/>', bg="#f6ecdf")
# 部首卡
ART["r_wood"] = svg('<rect x="72" y="62" width="16" height="44" fill="#8a5a33"/><circle cx="80" cy="44" r="30" fill="#5aa469"/><circle cx="60" cy="56" r="16" fill="#5aa469"/><circle cx="100" cy="56" r="16" fill="#5aa469"/>' + GROUND)
ART["r_sun"] = svg(SUN, bg="#cde9ff")
ART["r_soil"] = svg('<path d="M0 120 L0 78 Q40 60 80 70 Q120 80 160 64 L160 120 Z" fill="#b8865a"/><circle cx="44" cy="96" r="4" fill="#8e643f"/><circle cx="112" cy="100" r="5" fill="#8e643f"/><path d="M80 70 v-24" stroke="#4f9d50" stroke-width="4"/><path d="M80 52 q-14 -2 -18 -14 q14 0 18 14z M80 48 q12 -4 18 -16 q-14 2 -18 16z" fill="#5aa469"/>', bg="#e9f4fb")
ART["r_mouth"] = svg('<circle cx="80" cy="60" r="44" fill="#ffd9b8"/><circle cx="64" cy="48" r="4" fill="#333"/><circle cx="96" cy="48" r="4" fill="#333"/><path d="M60 72 Q80 96 100 72 Z" fill="#c0392b"/><path d="M66 74 Q80 82 94 74" fill="#fff"/>', bg="#fdf1e6")
# 背景知識卡
MAP = ('<rect x="0" y="0" width="160" height="120" fill="#bfe3f7"/>'
       '<path d="M0 0 L70 0 Q78 14 66 24 Q72 34 62 44 Q50 52 44 66 Q40 80 30 86 Q20 92 0 90 Z" fill="#d8e6c4"/>'  # 亞洲大陸（示意）
       '<path d="M118 14 q10 4 8 14 q-6 10 -14 14 q-6 4 -10 0 q8 -8 10 -16 q2 -8 6 -12z" fill="#e8d6a8"/>'  # 日本（示意）
       '<ellipse cx="88" cy="58" rx="4" ry="8" fill="#e8d6a8"/>'  # 臺灣
       '<path d="M30 96 q8 -2 12 6 q4 10 -2 14 q-8 0 -10 -8 q-2 -8 0 -12z" fill="#e8d6a8"/>')  # 馬來半島（示意）
PIN = lambda x, y, c: f'<circle cx="{x}" cy="{y}" r="5" fill="{c}" stroke="#fff" stroke-width="2"/>'
ART["bg1"] = svg(f'<g transform="translate(0,0)">{GROUND}{giraffe(-4, 10, .95)}{t101(118, 104, .95)}</g>'
                 f'<g transform="translate(206,0)">{MAP}{PIN(118, 26, "#e0453a")}{PIN(88, 58, "#e0453a")}{PIN(36, 104, "#e0453a")}'
                 f'<g transform="translate(130,6) scale(.28)">{skytree(20, 100)}</g><g transform="translate(94,40) scale(.28)">{t101(20, 100)}</g><g transform="translate(46,72) scale(.28)">{twin(100, 1, 36, "#e8b93c", 20)}</g></g>',
                 vb="0 0 366 120", bg="#eef6fb")
SWAY = ('<path d="M10 104 L150 104" stroke="#8a7a66" stroke-width="3"/><path d="M10 112 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6" stroke="#e0453a" stroke-width="2.5" fill="none"/>'
        '<g transform="rotate(-7 80 104)"><rect x="66" y="22" width="28" height="82" fill="#8b9cb0"/>' + windows(66, 26, 28, 74, 2, 6) + '</g>'
        '<rect x="66" y="22" width="28" height="82" fill="none" stroke="#8b9cb0" stroke-dasharray="4 4"/>'
        '<path d="M14 30 h26 M8 44 h30 M16 58 h22" stroke="#7fb8d8" stroke-width="3" stroke-linecap="round"/><polygon points="40,26 48,30 40,34" fill="#7fb8d8"/><polygon points="38,40 46,44 38,48" fill="#7fb8d8"/>')
DAMP = ('<rect x="40" y="8" width="80" height="100" fill="#d5dde4" stroke="#7d8fa3" stroke-width="3"/>' + windows(40, 10, 80, 96, 4, 8, "#eef4f8")
        + '<line x1="70" y1="20" x2="76" y2="54" stroke="#555" stroke-width="2"/><line x1="90" y1="20" x2="84" y2="54" stroke="#555" stroke-width="2"/><circle cx="80" cy="64" r="15" fill="#e8b93c" stroke="#b88a12" stroke-width="2"/>'
        + '<path d="M54 64 h-10 M106 64 h10" stroke="#e0453a" stroke-width="3"/><polygon points="44,60 38,64 44,68" fill="#e0453a"/><polygon points="116,60 122,64 116,68" fill="#e0453a"/>')
ART["bg2"] = svg(f'<g>{SWAY}</g><g transform="translate(176,0)">{DAMP}</g><path d="M164 60 h14" stroke="#555" stroke-width="3"/><polygon points="178,55 186,60 178,65" fill="#555"/>', vb="0 0 346 120", bg="#f3f6f8")
# 生字教學卡圖解
HAIR = ["#3b2a20", "#5a3a22", "#2d2d2d", "#7a4a2a"]
def PERSON(x, y, c="#e0703a", s=1, h=0, arms="down"):
    """y 是腳底；高約 44。arms: down／up（舉手）／wave（一手舉起）"""
    hair = HAIR[h % len(HAIR)]
    la = '<path d="M-7 -20 Q-12 -12 -11 -5" stroke="{c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
    ra = '<path d="M7 -20 Q12 -12 11 -5" stroke="{c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
    if arms == "up": ra = '<path d="M7 -20 Q13 -28 12 -36" stroke="{c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
    if arms == "wave": la = '<path d="M-7 -20 Q-14 -27 -13 -34" stroke="{c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
    la, ra = la.format(c=c), ra.format(c=c)
    return (f'<g transform="translate({x},{y + 13 * s:.1f}) scale({s})">'
            f'<rect x="-6" y="-8" width="5" height="8" rx="2" fill="#3e4c5e"/><rect x="1" y="-8" width="5" height="8" rx="2" fill="#3e4c5e"/>'
            f'<ellipse cx="-3.5" cy="0" rx="3.5" ry="1.6" fill="#333"/><ellipse cx="3.5" cy="0" rx="3.5" ry="1.6" fill="#333"/>'
            f'{la}{ra}<path d="M-8 -9 Q-8 -24 0 -24 Q8 -24 8 -9 Z" fill="{c}"/>'
            f'<rect x="-1.8" y="-27" width="3.6" height="4" fill="#f2c9a0"/><circle cx="0" cy="-33" r="7.5" fill="#f6d2b0"/>'
            f'<path d="M-7.6 -33 Q-8 -42 0 -41.5 Q8 -42 7.6 -33 Q4 -38 0 -37.5 Q-4 -38 -7.6 -33 Z" fill="{hair}"/>'
            f'<circle cx="-2.6" cy="-32.5" r="0.9" fill="#333"/><circle cx="2.6" cy="-32.5" r="0.9" fill="#333"/>'
            f'<path d="M-2.2 -29.6 Q0 -28 2.2 -29.6" stroke="#b5533c" stroke-width="0.9" fill="none" stroke-linecap="round"/>'
            f'<circle cx="-4.6" cy="-30.4" r="1.3" fill="#f2a7a0" opacity=".6"/><circle cx="4.6" cy="-30.4" r="1.3" fill="#f2a7a0" opacity=".6"/></g>')
ART["lookout"] = svg('<path d="M0 120 L0 56 L46 30 L70 44 L70 120 Z" fill="#8fbf7a"/>'
                     + "".join(building(x, w, t, c) for x, w, t, c in [(84, 14, 78, "#9aa9b8"), (100, 12, 70, "#7d8fa3"), (114, 16, 84, "#a7b4c2"), (132, 12, 74, "#8b9cb0"), (146, 12, 88, "#9aa9b8")])
                     + '<rect x="70" y="104" width="90" height="16" fill="#cfe3c2"/>' + PERSON(46, 30)
                     + '<path d="M54 26 L90 64" stroke="#e0453a" stroke-width="2.5" stroke-dasharray="5 4"/><polygon points="92,68 84,64 90,58" fill="#e0453a"/>')
ART["podium"] = svg('<rect x="0" y="100" width="160" height="20" fill="#d9c7a6"/><rect x="34" y="12" width="92" height="40" rx="3" fill="#3f6b55"/>'
                    + PERSON(80, 84, "#e0703a", 1.2, 1, "wave") + '<polygon points="80,16 83,24 92,24 85,29 88,38 80,32 72,38 75,29 68,24 77,24" fill="#ffcf3d"/>'
                    + "".join(PERSON(x, 116, "#7fa6c9", .8) for x in (20, 44, 116, 140)))
ART["coins"] = svg('<rect x="0" y="104" width="160" height="16" fill="#e8dcc4"/>'
                   + "".join(f'<ellipse cx="{x}" cy="{104 - k * 8}" rx="14" ry="5" fill="#f2c14e" stroke="#c99a1c" stroke-width="1.5"/>' for x, n in [(34, 2), (66, 5), (98, 8), (130, 11)] for k in range(n))
                   + '<path d="M22 84 L120 14" stroke="#e0453a" stroke-width="4" stroke-linecap="round"/><polygon points="126,10 112,12 120,24" fill="#e0453a"/>', bg="#fbf6e2")
ART["phone"] = svg('<rect x="44" y="12" width="48" height="96" rx="8" fill="#3a4654"/><rect x="49" y="22" width="38" height="72" rx="3" fill="#bfe3f7"/><circle cx="68" cy="101" r="3" fill="#7d8fa3"/>'
                   + "".join(f'<rect x="{104 + i * 10}" y="{80 - i * 14}" width="7" height="{14 + i * 14}" rx="2" fill="#4aa564"/>' for i in range(4))
                   + '<path d="M56 50 q12 -12 24 0 M60 56 q8 -7 16 0" stroke="#3a7bd5" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="68" cy="62" r="3" fill="#3a7bd5"/>')
# 語詞教學卡插圖
ART["slide"] = svg(GROUND + '<path d="M40 104 L40 30 M58 104 L58 30" stroke="#7d8fa3" stroke-width="4"/>'
                   + "".join(f'<line x1="40" y1="{y}" x2="58" y2="{y}" stroke="#7d8fa3" stroke-width="3"/>' for y in (44, 58, 72, 86, 100))
                   + '<rect x="36" y="26" width="30" height="6" fill="#e0703a"/><path d="M64 30 Q100 40 120 100 L132 100 Q112 34 66 22 Z" fill="#ffcf3d"/>'
                   + PERSON(50, 20, "#4a90d9", .8) + '<path d="M58 6 L96 30" stroke="#e0453a" stroke-width="2" stroke-dasharray="4 3"/>'
                   + "".join(PERSON(x, 116, "#9aa9b8", .55) for x in (110, 126, 142)))
ART["greenlight"] = svg('<rect x="0" y="96" width="160" height="24" fill="#8d98a3"/>' + "".join(f'<rect x="{x}" y="100" width="10" height="16" fill="#fff"/>' for x in range(6, 160, 20))
                        + '<rect x="70" y="40" width="6" height="56" fill="#555"/><rect x="58" y="6" width="30" height="40" rx="5" fill="#333"/><circle cx="73" cy="17" r="7" fill="#5a2a2a"/><circle cx="73" cy="35" r="7" fill="#3cd070"/>'
                        + PERSON(118, 92, "#e0703a", .9))
ART["queue"] = svg('<rect x="0" y="100" width="160" height="20" fill="#e8dcc4"/><rect x="6" y="20" width="34" height="80" fill="#c97a6d"/><rect x="12" y="44" width="22" height="56" fill="#8a5a33"/>'
                   + "".join(PERSON(46 + k * 12, 100 - (k % 2) * 3, ["#4a90d9", "#e0703a", "#5aa469", "#9b6bd3"][k % 4], .75) for k in range(10)))
ART["umbrellashop"] = svg('<rect x="0" y="100" width="160" height="20" fill="#8d98a3"/><rect x="10" y="30" width="70" height="70" fill="#f4e3c3"/><rect x="6" y="22" width="78" height="12" fill="#4a90d9"/>'
                          + "".join(f'<path d="M{x} 70 q10 -16 20 0 z" fill="{c}"/><line x1="{x + 10}" y1="62" x2="{x + 10}" y2="86" stroke="#555" stroke-width="2"/>' for x, c in [(16, "#e0453a"), (40, "#ffcf3d"), (60, "#5aa469")])
                          + "".join(f'<line x1="{x}" y1="{y}" x2="{x - 3}" y2="{y + 8}" stroke="#4a90d9" stroke-width="2"/>' for x, y in [(96, 10), (120, 24), (144, 8), (108, 44), (136, 50), (150, 30)])
                          + "".join(PERSON(x, 104, "#7fa6c9", .75) for x in (96, 112, 128, 144)))
ART["silhouette"] = svg('<rect width="160" height="120" fill="#f5b86b"/><circle cx="120" cy="70" r="22" fill="#ffe29a"/><rect x="0" y="92" width="160" height="28" fill="#c9824a"/>'
                        + '<g fill="#2a1d14"><circle cx="50" cy="44" r="8"/><rect x="42" y="52" width="16" height="26" rx="5"/><rect x="43" y="76" width="6" height="18"/><rect x="51" y="76" width="6" height="18"/>'
                        + '<ellipse cx="80" cy="84" rx="12" ry="6"/><circle cx="92" cy="78" r="5"/><rect x="72" y="88" width="3" height="6"/><rect x="85" y="88" width="3" height="6"/><path d="M68 82 l-6 -6" stroke="#2a1d14" stroke-width="3"/></g>', bg=None)
ART["magician"] = svg('<rect x="0" y="0" width="160" height="70" fill="#7a2f3f"/><rect x="20" y="62" width="120" height="14" fill="#c9824a"/>'
                      + PERSON(80, 62, "#333", 1.1, 2, "up") + '<rect x="71" y="22" width="18" height="11" rx="1" fill="#222"/><rect x="66" y="31" width="28" height="3" rx="1" fill="#222"/><rect x="71" y="29" width="18" height="2" fill="#c0392b"/><line x1="94" y1="44" x2="106" y2="30" stroke="#222" stroke-width="3" stroke-linecap="round"/><circle cx="106" cy="30" r="2" fill="#fff"/>'
                      + "".join(f'<circle cx="{x}" cy="{y}" r="2.5" fill="#ffe29a"/>' for x, y in [(108, 22), (114, 30), (104, 16)])
                      + "".join(f'<circle cx="{x}" cy="100" r="9" fill="#3a4654"/>' for x in range(14, 160, 22)) + '<rect x="0" y="108" width="160" height="12" fill="#3a4654"/>', bg="#eef0f4")
ART["dragonboat"] = svg('<rect x="0" y="70" width="160" height="50" fill="#5cb6e0"/><path d="M14 70 Q80 90 146 70 L140 78 Q80 96 20 78 Z" fill="#e0453a"/>'
                        + '<path d="M146 70 q10 -14 2 -22 q-6 6 -10 18 z" fill="#5aa469"/><circle cx="148" cy="52" r="2" fill="#222"/>'
                        + "".join(PERSON(x, 74, "#ffcf3d", .6) for x in (40, 60, 80, 100, 120))
                        + '<polygon points="24,20 44,20 34,40" fill="#6cb86b"/><polygon points="26,24 42,24 34,36" fill="#a8d08d"/><line x1="24" y1="24" x2="44" y2="34" stroke="#8a5a33" stroke-width="2"/>')
ART["villagers"] = svg(GROUND + '<polygon points="96,40 140,40 150,56 86,56" fill="#a0522d"/><rect x="92" y="56" width="52" height="48" fill="#f4e3c3"/><rect x="110" y="72" width="16" height="32" fill="#8a5a33"/>'
                       + PERSON(30, 104, "#5aa469", 1.1, 2, "wave") + PERSON(54, 104, "#c97a6d", 1.1, 3, "up")
                       + '<path d="M40 52 q4 -6 8 0 q4 -6 8 0 q0 6 -8 11 q-8 -5 -8 -11 z" fill="#e8546a"/>' + PERSON(78, 104, "#4a90d9", .85, 0))
ART["gucoin"] = svg('<circle cx="80" cy="60" r="44" fill="#e8b93a" stroke="#b8860b" stroke-width="4"/><circle cx="80" cy="60" r="34" fill="none" stroke="#b8860b" stroke-width="2"/>'
                    + '<rect x="66" y="46" width="28" height="28" fill="#fff8e1" stroke="#b8860b" stroke-width="3"/>', bg="#fff8e1")
ART["heart"] = svg('<path d="M80 100 C30 70 30 28 58 26 C70 25 78 34 80 40 C82 34 90 25 102 26 C130 28 130 70 80 100 Z" fill="#e8546a"/>', bg="#fdeef0")
ART["star"] = svg('<polygon points="80,14 92,46 126,48 99,68 108,102 80,82 52,102 61,68 34,48 68,46" fill="#ffcf3d" stroke="#e0a800" stroke-width="3"/>', bg="#eef3fb")
# 生字字義圖（阻、尼、器、吉各自依字義）
ART["roadblock"] = svg('<rect x="0" y="80" width="160" height="40" fill="#8d98a3"/><line x1="0" y1="100" x2="160" y2="100" stroke="#fff" stroke-width="2" stroke-dasharray="10 8"/>'
                       '<rect x="14" y="84" width="40" height="18" rx="5" fill="#4a90d9"/><rect x="22" y="76" width="22" height="10" rx="3" fill="#7fb3e6"/><circle cx="24" cy="103" r="5" fill="#333"/><circle cx="46" cy="103" r="5" fill="#333"/>'
                       '<rect x="74" y="64" width="6" height="40" fill="#555"/><rect x="132" y="64" width="6" height="40" fill="#555"/>'
                       '<rect x="68" y="56" width="76" height="16" fill="#fff" stroke="#c0392b" stroke-width="2"/>'
                       + "".join(f'<polygon points="{x},56 {x + 10},56 {x + 2},72 {x - 8},72" fill="#e0453a"/>' for x in (76, 96, 116, 136))
                       + '<circle cx="106" cy="30" r="18" fill="#fff" stroke="#e0453a" stroke-width="5"/><rect x="96" y="27" width="20" height="6" fill="#e0453a"/>', bg="#eef3f6")
ART["raincoat"] = svg('<path d="M80 14 Q60 14 58 36 L40 104 L120 104 L102 36 Q100 14 80 14 Z" fill="#ffd84d" stroke="#d1a800" stroke-width="2"/>'
                      '<ellipse cx="80" cy="34" rx="14" ry="13" fill="#f6d2b0"/><path d="M66 32 Q80 12 94 32" fill="#ffd84d"/><circle cx="75" cy="35" r="1.4" fill="#333"/><circle cx="85" cy="35" r="1.4" fill="#333"/><path d="M76 40 Q80 43 84 40" stroke="#b5533c" stroke-width="1.2" fill="none"/>'
                      '<line x1="80" y1="50" x2="80" y2="104" stroke="#d1a800" stroke-width="1.5"/>' + "".join(f'<circle cx="84" cy="{y}" r="2" fill="#d1a800"/>' for y in (60, 74, 88))
                      + "".join(f'<line x1="{x}" y1="{y}" x2="{x - 3}" y2="{y + 9}" stroke="#4a90d9" stroke-width="2.4" stroke-linecap="round"/>' for x, y in [(22, 20), (36, 50), (18, 78), (132, 24), (146, 56), (138, 86), (120, 8)]), bg="#dde8f0")
ART["instruments"] = svg('<rect x="0" y="104" width="160" height="16" fill="#e8dcc4"/>'
                         '<ellipse cx="44" cy="70" rx="30" ry="10" fill="#e0453a"/><rect x="14" y="70" width="60" height="30" fill="#e0453a"/><ellipse cx="44" cy="100" rx="30" ry="10" fill="#b92f26"/><ellipse cx="44" cy="70" rx="30" ry="10" fill="#fdf3e0" stroke="#b92f26" stroke-width="2"/>'
                         + "".join(f'<line x1="{x}" y1="74" x2="{x + 10}" y2="98" stroke="#ffd84d" stroke-width="2"/>' for x in (18, 34, 50))
                         + '<line x1="30" y1="40" x2="40" y2="66" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/><line x1="62" y1="40" x2="52" y2="66" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/>'
                         '<path d="M112 46 Q98 46 100 62 Q102 72 98 82 Q96 100 116 102 Q136 100 134 82 Q130 72 132 62 Q134 46 120 46 Z" fill="#b8651e" stroke="#7a3f10" stroke-width="2"/>'
                         '<rect x="113" y="12" width="6" height="40" fill="#5a3a1a"/><rect x="110" y="8" width="12" height="8" rx="2" fill="#5a3a1a"/>'
                         + "".join(f'<line x1="{x}" y1="14" x2="{x}" y2="94" stroke="#f0e6d0" stroke-width=".8"/>' for x in (114, 116, 118))
                         + '<path d="M110 70 q3 3 0 6 M122 70 q-3 3 0 6" stroke="#3b1f08" stroke-width="1.5" fill="none"/><rect x="108" y="88" width="16" height="3" fill="#3b1f08"/>', bg="#fbf3e6")
ART["luckybag"] = svg('<rect x="0" y="0" width="160" height="120" fill="#fbeee4"/>'
                      '<rect x="20" y="20" width="56" height="84" rx="4" fill="#e0453a"/><path d="M20 24 L48 44 L76 24" fill="#c9302c"/><circle cx="48" cy="62" r="14" fill="#f2c14e"/><text x="48" y="69" font-size="18" text-anchor="middle" fill="#c9302c" font-weight="bold">吉</text>'
                      '<rect x="92" y="34" width="50" height="50" fill="#e0453a" transform="rotate(45 117 59)"/><circle cx="117" cy="59" r="12" fill="none" stroke="#f2c14e" stroke-width="3"/><circle cx="117" cy="59" r="4" fill="#f2c14e"/>'
                      '<path d="M117 18 v10" stroke="#e8b93c" stroke-width="2"/>')

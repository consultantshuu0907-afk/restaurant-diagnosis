# -*- coding: utf-8 -*-
"""【独立検証】PDFの文字座標から表を丸ごと組み直し、js/pricing-data.js と全項目突合する。

build_pricing.py がテキスト行から抽出しているのに対し、こちらは描画エンジン
(pdfium) の文字座標から表を再構築するため、抽出経路が完全に独立している。
行・列・プラン名の取り違え、行の欠落、余分な値を検出できる。

使い方（このファイルのあるディレクトリで実行）:

    pip install pypdfium2
    python verify_layout.py "＜バイトル料金表＞.pdf" "＜バイトルNEXT料金表＞.pdf"

検証項目
  A. プラン名の並び（上→下、座標のみで判定）
  B. プランラベルの y が、そのプランに属する行群の中心と一致する
     （＝プラン名と行の対応が幾何的に正しい）
  C. 各プランの枠数ラベルの並び
  D. エリア列見出しの文字列と左右順
  E. 期間見出しの文字列と左右順（上段表・下段表それぞれ）
  F. 「総額 / 7日1枠あたり」の対の並び
  G. 全セルの金額（行バンド×列アンカーで復元して突合）
  H. 空欄セル（「-」）の位置
  I. ページ見出し・該当エリアの都道府県・注記文言
  J. 表領域に画像オブジェクトが無いこと（＝数字が画像で描かれていないこと。
     これにより「文字レイヤー＝実際に見える数字」と断定できる）
"""
import io
import json
import os
import re
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_c

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(BASE, "..", "js", "pricing-data.js")

if len(sys.argv) != 3:
    print(__doc__)
    sys.exit(2)
PDFS = {"baitoru": sys.argv[1], "next": sys.argv[2]}

LINE_TOL, GAP, ROW_BAND = 8.0, 4.0, 6.0
PLAN_NAMES = ["Pプラン(EX)", "Pプラン", "PLプラン", "Dプラン", "Cプラン", "Bプラン", "Aプラン"]
SLOT_NAMES = ["1枠", "3枠", "5枠", "10枠", "20枠"]
PERIODS = ["7日", "14日", "1か月", "14日間", "2か月", "3か月", "6か月", "12か月"]

# 原本PDFの誤記に対して意図的に補正している列見出し（READMEに明記）
KNOWN_FIX = {("next", "大阪市北区・中央区"): "大証市北区・中央区"}


# ---------------------------------------------------------------- 座標の取得
def page_runs(page, gap=GAP, line_tol=LINE_TOL):
    """[(x_left, x_right, y_center, text), ...]（yは大きいほど上）"""
    tp = page.get_textpage()
    chars = []
    for i in range(tp.count_chars()):
        try:
            l, b, r, t = tp.get_charbox(i, loose=False)
        except Exception:
            continue
        ch = tp.get_text_range(i, 1)
        if not ch or ch in ("\r", "\n"):
            continue
        if r - l <= 0 and t - b <= 0:
            continue
        chars.append((l, r, (b + t) / 2, ch))

    chars.sort(key=lambda c: (-c[2], c[0]))
    lines = []
    for c in chars:
        if lines and abs(lines[-1][0][2] - c[2]) <= line_tol:
            lines[-1].append(c)
        else:
            lines.append([c])

    runs = []
    for line in lines:
        line.sort(key=lambda c: c[0])
        cur = None
        for l, r, y, ch in line:
            if cur and l - cur[1] <= gap:
                cur[1] = max(cur[1], r)
                cur[3] += ch
                cur[2] = (cur[2] + y) / 2
            else:
                if cur:
                    runs.append(tuple(cur))
                cur = [l, r, y, ch]
        if cur:
            runs.append(tuple(cur))
    return [(l, r, y, t.strip()) for l, r, y, t in runs if t.strip()]


def page_chars(page):
    """[(x_center, y_center, char), ...]"""
    tp = page.get_textpage()
    out = []
    for i in range(tp.count_chars()):
        try:
            l, b, r, t = tp.get_charbox(i, loose=False)
        except Exception:
            continue
        ch = tp.get_text_range(i, 1)
        if not ch or ch in ("\r", "\n", " ", "　"):
            continue
        if r - l <= 0 and t - b <= 0:
            continue
        out.append(((l + r) / 2, (b + t) / 2, ch))
    return out


def nearest(value, centers):
    return min(range(len(centers)), key=lambda i: abs(centers[i] - value))


def norm(s):
    return s.replace("版", "").replace(" ", "")


def split_cells(line_runs, gap=8.0):
    cells, cur = [], None
    for l, r, y, t in sorted(line_runs, key=lambda v: v[0]):
        if cur and l - cur[1] <= gap:
            cur[1] = max(cur[1], r)
            cur[2] += t
        else:
            if cur:
                cells.append(cur[2])
            cur = [l, r, t]
    if cur:
        cells.append(cur[2])
    return cells


# ---------------------------------------------------------------- 検証
with open(JS, encoding="utf-8") as f:
    src = f.read()
data = json.loads(re.search(r"var dipPricing = (\{.*\});\s*$", src, re.S).group(1))

problems = []
stats = {"pages": 0, "rows": 0, "cells": 0, "blanks": 0, "chars": 0}


def check_no_image_over_table(page, tag, money_runs):
    """表領域に画像オブジェクトが重なっていないことを確認する。

    文字レイヤーと見た目が食い違う現実的な原因は「数字を画像で描いている」ことだけ。
    表の範囲に画像が無ければ、抽出した文字＝実際に見える数字と断定できる。
    """
    if not money_runs:
        return
    x0 = min(r[0] for r in money_runs)
    x1 = max(r[1] for r in money_runs)
    y0 = min(r[2] for r in money_runs)
    y1 = max(r[2] for r in money_runs)
    for obj in page.get_objects(max_depth=15):
        if obj.type != pdfium_c.FPDF_PAGEOBJ_IMAGE:
            continue
        l, b, r, t = obj.get_bounds()
        if l < x1 and r > x0 and b < y1 and t > y0:
            problems.append(
                f"[{tag}] 表領域に画像が重なっている x={l:.0f}..{r:.0f} y={b:.0f}..{t:.0f}"
                "（数字が画像で描かれている可能性）")


def check_page(media_key, page, region, spec):
    tag = f"{spec['label']}/{region['name']}"
    runs = page_runs(page)
    chars = page_chars(page)
    check_no_image_over_table(page, tag, [r for r in runs if r[3].startswith("¥")])

    # ---- A. プラン名の並び ----
    plans = sorted([(r[2], r[3]) for r in runs if r[3] in PLAN_NAMES], key=lambda p: -p[0])
    order = []
    for _, n in plans:
        if n not in order:
            order.append(n)
    expected_plans = list(spec["topPlans"]) + list(spec["lowPlans"])
    if order != expected_plans:
        problems.append(f"[{tag}] A:プラン並び {order} ≠ {expected_plans}")
        return
    plan_y = {n: y for y, n in sorted(plans, key=lambda p: p[0])}

    slot_runs = [r for r in runs if r[3] in SLOT_NAMES]
    slot_x = min(r[0] for r in slot_runs)
    rows = sorted([(r[2], r[3]) for r in slot_runs if abs(r[0] - slot_x) < 12], key=lambda s: -s[0])

    totals_y = [r[2] for r in runs if r[3] == "総額"]
    if not totals_y:
        problems.append(f"[{tag}] 下段表の『総額』見出しが無い")
        return
    y_total = max(totals_y)
    top_rows = [r for r in rows if r[0] > y_total]
    low_rows = [r for r in rows if r[0] < y_total]

    # ---- B/C. 行のプラン割当と枠数の並び ----
    def assign(rs, plan_names, want_slots):
        idx, groups = 0, []
        for p in plan_names:
            got_y, got_s = [], []
            for s in want_slots:
                if idx < len(rs) and rs[idx][1] == s:
                    got_y.append(rs[idx][0])
                    got_s.append(rs[idx][1])
                    idx += 1
            groups.append((p, got_s, got_y))
        return groups, idx

    tg, used = assign(top_rows, spec["topPlans"], spec["topSlots"])
    if used != len(top_rows):
        problems.append(f"[{tag}] C:上段の枠数ラベル列 {[r[1] for r in top_rows]}")
    lg, used = assign(low_rows, spec["lowPlans"], spec["lowSlots"])
    if used != len(low_rows):
        problems.append(f"[{tag}] C:下段の枠数ラベル列 {[r[1] for r in low_rows]}")
    for p, s, _ in tg:
        if s != list(spec["topSlots"]):
            problems.append(f"[{tag}] C:上段 {p} の枠数 {s} ≠ {spec['topSlots']}")
    for p, s, ys in tg + lg:
        if not ys:
            problems.append(f"[{tag}] B:{p} に行が割り当てられていない")
            continue
        center = sum(ys) / len(ys)
        if abs(center - plan_y[p]) > 3.0:
            problems.append(f"[{tag}] B:{p} のラベル位置 y={plan_y[p]:.1f} "
                            f"が行群の中心 y={center:.1f} と一致しない")

    # ---- D/E/F. 見出し ----
    top_row_top = max(y for _, _, ys in tg for y in ys)
    top_heads = sorted([r for r in runs if r[3] in PERIODS and r[2] > top_row_top], key=lambda r: r[0])
    exp_top = list(spec["topPeriods"]) * len(region["columns"])
    if [r[3] for r in top_heads] != exp_top:
        problems.append(f"[{tag}] E:上段の期間見出し {[r[3] for r in top_heads]} ≠ {exp_top}")
    low_heads = sorted([r for r in runs if r[3] in PERIODS and y_total < r[2] < y_total + 25],
                       key=lambda r: r[0])
    if [r[3] for r in low_heads] != list(spec["lowPeriods"]):
        problems.append(f"[{tag}] E:下段の期間見出し {[r[3] for r in low_heads]} ≠ {spec['lowPeriods']}")

    sub = sorted([r for r in runs if r[3] in ("総額", "7日/1枠あたり") and abs(r[2] - y_total) < 3],
                 key=lambda r: r[0])
    if [r[3] for r in sub] != ["総額", "7日/1枠あたり"] * len(spec["lowPeriods"]):
        problems.append(f"[{tag}] F:下段の小見出し {[r[3] for r in sub]}")

    if top_heads:
        head_y = top_heads[0][2]
        band = [r for r in runs if head_y + 4 < r[2] < head_y + 24]
        cells = [norm(c) for c in split_cells(band)]
        cells = [c for c in cells if c not in ("エリア", "プラン", "", "高", "低", "露", "出", "度")]
        exp = [KNOWN_FIX.get((media_key, norm(c)), norm(c)) for c in region["columns"]]
        if cells != exp:
            joined = "".join(r[3] for r in runs)
            if not (len(exp) == 1 and exp[0] in norm(joined)):
                problems.append(f"[{tag}] D:エリア列見出し {cells} ≠ {exp}")

    # ---- G/H. セル値 ----
    def build(row_ys, anchors, y_lo, y_hi):
        grid = [[None] * len(anchors) for _ in row_ys]
        buckets = {}
        pitch = anchors[1] - anchors[0] if len(anchors) > 1 else 40.0
        x_min = anchors[0] - pitch * 0.5  # 枠数ラベル列を除外
        for cx, cy, ch in chars:
            if cx < x_min or not (y_lo < cy < y_hi):
                continue
            if not (ch.isdigit() or ch in "¥,"):
                continue
            ri = min(range(len(row_ys)), key=lambda i: abs(row_ys[i] - cy))
            if abs(row_ys[ri] - cy) > ROW_BAND:
                continue
            buckets.setdefault((ri, nearest(cx, anchors)), []).append((cx, ch))
            stats["chars"] += 1
        for (ri, ci), lst in buckets.items():
            digits = re.sub(r"[^\d]", "", "".join(c for _, c in sorted(lst)))
            grid[ri][ci] = int(digits) if digits else None
        return grid

    top_anchor = [(r[0] + r[1]) / 2 for r in top_heads]
    low_anchor = [(r[0] + r[1]) / 2 for r in sub]
    n_top = len(region["columns"]) * len(spec["topPeriods"])
    n_low = len(spec["lowPeriods"]) * 2

    if len(top_anchor) == n_top:
        grid = build([y for _, _, ys in tg for y in ys], top_anchor, y_total, 10 ** 6)
        k = 0
        for plan in spec["topPlans"]:
            for slot in spec["topSlots"]:
                exp_row = [v for col in region["top"][plan][slot] for v in col]
                if grid[k] != exp_row:
                    problems.append(f"[{tag}] G:上段 {plan} {slot}\n    PDF ={grid[k]}\n    収録={exp_row}")
                stats["cells"] += len(exp_row)
                k += 1
    else:
        problems.append(f"[{tag}] G:上段の列アンカー {len(top_anchor)} ≠ {n_top}")

    if len(low_anchor) == n_low:
        grid = build([y for _, _, ys in lg for y in ys], low_anchor, -(10 ** 6), y_total)
        k = 0
        for i, plan in enumerate(spec["lowPlans"]):
            for slot in lg[i][1]:
                if slot not in region["low"][plan]:
                    if any(v is not None for v in grid[k]):
                        problems.append(f"[{tag}] H:下段 {plan} {slot} は収録に無いがPDFに値がある")
                    stats["blanks"] += len(grid[k])
                    k += 1
                    continue
                totals = region["low"][plan][slot]
                ns = int(slot.replace("枠", ""))
                exp_row = []
                for pi, t in enumerate(totals):
                    if t is None:
                        exp_row += [None, None]
                        stats["blanks"] += 2
                    else:
                        exp_row += [t, t // (ns * spec["lowWeeks"][pi])]
                        stats["cells"] += 2
                if grid[k] != exp_row:
                    problems.append(f"[{tag}] G/H:下段 {plan} {slot}\n    PDF ={grid[k]}\n    収録={exp_row}")
                k += 1
    else:
        problems.append(f"[{tag}] G:下段の列アンカー {len(low_anchor)} ≠ {n_low}")

    stats["rows"] += len(rows)
    stats["pages"] += 1

    # ---- I. 見出し・該当エリア・注記 ----
    joined = "".join(r[3] for r in runs)
    if norm(region["name"]) not in joined:
        problems.append(f"[{tag}] I:ページ見出し『{region['name']}』が無い")
    for pref in region["area"].split("・"):
        if pref not in joined:
            problems.append(f"[{tag}] I:該当エリア『{pref}』がPDF本文に無い")
    for kw in ("別途消費税", "10,000", "露出度は変動", "予告なく変更", "2025"):
        if kw not in joined:
            problems.append(f"[{tag}] I:注記『{kw}』が無い")


for media_key, pdf in PDFS.items():
    spec = data[media_key]
    doc = pdfium.PdfDocument(pdf)
    if len(doc) != len(spec["regions"]):
        problems.append(f"[{spec['label']}] ページ数 {len(doc)} ≠ 収録 {len(spec['regions'])}")
    for idx, region in enumerate(spec["regions"]):
        check_page(media_key, doc[idx], region, spec)

print("=== 座標ベースの独立再構築 ⇔ 収録データ ===")
print(f"ページ {stats['pages']} / 行 {stats['rows']} / 金額セル {stats['cells']} "
      f"/ 空欄セル {stats['blanks']} / 割当文字 {stats['chars']}")
if problems:
    for p in problems[:30]:
        print("NG:", p)
    print(f"\n{len(problems)} 件の不一致")
    sys.exit(1)
print("A〜J すべて一致")

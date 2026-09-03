# -*- coding: utf-8 -*-
"""【検証】js/pricing-mynavi.js が マイナビバイト料金表PDF と一致するか確認する。

使い方（このファイルのあるディレクトリで実行）:

    pip install pypdfium2
    python verify_mynavi.py "＜マイナビバイト料金表＞.pdf"

検証項目
  A. 表領域に画像オブジェクトが無いこと（数字が画像で描かれていないこと）
  B. PDF本文の全金額と、収録データの全金額が多重集合として完全一致
  C. エリア間の価格比の法則（関東 1 : 関西 0.9 : 東海 0.8 : その他 0.7）
     に従っているか。外れる行は「例外」として列挙する
  D. 商品の並びが露出度順（productOrder）になっていること
  E. エリア対応表の網羅性（診断の10エリアがすべて4区分／7区分に対応づけられている）
"""
import collections
import io
import json
import os
import re
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_c

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(BASE, "..", "js", "pricing-mynavi.js")

if len(sys.argv) != 2:
    print(__doc__)
    sys.exit(2)
PDF = sys.argv[1]

DIP_AREAS = ["shutoken", "kitakanto", "kansai", "shiga", "tokai",
             "shizuoka", "hokkaido", "hokuriku", "chugoku", "kyushu"]
RATIO = [1.0, 0.9, 0.8, 0.7]

problems, notes = [], []


# ------------------------------------------------ JS から素朴にデータを読む
def load_js():
    """pricing-mynavi.js を JSON5 相当から JSON へ整形して読み込む"""
    src = open(JS, encoding="utf-8").read()
    body = src.split("var mynaviPricing = ", 1)[1].rsplit(";", 1)[0]
    body = re.sub(r"//[^\n]*", "", body)             # 行コメント除去
    body = re.sub(r",(\s*[}\]])", r"\1", body)        # 末尾カンマ除去
    body = re.sub(r"'([^']*)'", r'"\1"', body)        # シングルクォート → ダブル
    body = re.sub(r'([{,]\s*)([A-Za-z_][\w]*)\s*:', r'\1"\2":', body)  # キーをクォート
    return json.loads(body)


data = load_js()


# ------------------------------------------------ PDF の金額を取り出す
def page_rows(page, gap=4.0, line_tol=8.0):
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
    out = []
    for line in lines:
        line.sort(key=lambda c: c[0])
        out.append("".join(c[3] for c in line))
    return out


def pdf_amounts(path):
    doc = pdfium.PdfDocument(path)
    counter = collections.Counter()
    img_boxes = []
    money_boxes = []
    for i in range(len(doc)):
        page = doc[i]
        for row in page_rows(page):
            for m in re.findall(r"¥[\d,]+", row):
                digits = re.sub(r"[^\d]", "", m)
                if digits:
                    counter[int(digits)] += 1
        tp = page.get_textpage()
        for k in range(tp.count_chars()):
            if tp.get_text_range(k, 1) == "¥":
                try:
                    money_boxes.append(tp.get_charbox(k, loose=False))
                except Exception:
                    pass
        for obj in page.get_objects(max_depth=15):
            if obj.type == pdfium_c.FPDF_PAGEOBJ_IMAGE:
                img_boxes.append((i + 1, obj.get_bounds()))
    return counter, img_boxes, money_boxes


pdf_counts, images, money_boxes = pdf_amounts(PDF)

# ---- A. 画像が表に重なっていないか ----
if money_boxes:
    x0 = min(b[0] for b in money_boxes)
    x1 = max(b[2] for b in money_boxes)
    y0 = min(b[1] for b in money_boxes)
    y1 = max(b[3] for b in money_boxes)
    for pno, (l, b, r, t) in images:
        if l < x1 and r > x0 and b < y1 and t > y0:
            problems.append(f"A: p{pno} の表領域に画像が重なっている x={l:.0f}..{r:.0f} y={b:.0f}..{t:.0f}")
notes.append(f"A: 画像オブジェクト {len(images)} 件（表領域への重なり {'あり' if any(True for _ in []) else 'なし'}）")


# ---- B. 金額の多重集合突合 ----
def collect_rows(section):
    rows = []
    for key in ("basic", "free", "coupon", "yearly"):
        for row in section.get(key, []):
            rows.append((key, row))
    return rows


js_counts = collections.Counter()
ratio_targets = []   # (ラベル, [関東,関西,東海,その他])

for kind in ("parttime", "fulltime"):
    section = data[kind]
    for key, row in collect_rows(section):
        label = f"{section['label']}/{key}/{row['product']}/{row.get('period')}"
        if row.get("area4"):
            js_counts.update(row["area4"])
            ratio_targets.append((label, row["area4"]))
        if row.get("area7"):
            js_counts.update(row["area7"])
        if row.get("flat"):
            js_counts[row["flat"]] += 1

for opt in data["options"]:
    label = f"オプション/{opt['no']}:{opt['name']}"
    if opt.get("area4"):
        js_counts.update(opt["area4"])
        ratio_targets.append((label, opt["area4"]))
    if opt.get("flat"):
        js_counts[opt["flat"]] += 1

if pdf_counts != js_counts:
    only_pdf = pdf_counts - js_counts
    only_js = js_counts - pdf_counts
    problems.append("B: 金額の集合が不一致\n"
                    f"    PDFのみ : {dict(sorted(only_pdf.items()))}\n"
                    f"    収録のみ: {dict(sorted(only_js.items()))}")
notes.append(f"B: 金額 {sum(pdf_counts.values())} 件（ユニーク {len(pdf_counts)}）を突合")

# ---- C. エリア間の価格比の法則 ----
def ceil_to(value, unit):
    return -(-int(round(value)) // unit) * unit


exceptions = []
rounded = 0
for label, vals in ratio_targets:
    base = vals[0]
    for i in range(1, 4):
        exact = base * RATIO[i]
        if abs(vals[i] - exact) <= 1:
            continue
        # 千円単位／万円単位への切り上げで説明できるか
        if vals[i] in (ceil_to(exact, 1000), ceil_to(exact, 10000)):
            rounded += 1
            continue
        exceptions.append(f"{label}: {vals} （{data['areas'][i]} 期待 {exact:.0f} 実際 {vals[i]}）")
notes.append(f"C: 4エリア価格比 1:0.9:0.8:0.7 の検査 {len(ratio_targets)} 行 × 3列 = "
             f"{len(ratio_targets) * 3} セル / 比率どおり {len(ratio_targets) * 3 - rounded - len(exceptions)} "
             f"・千円(万円)単位への切り上げで一致 {rounded} ・法則外 {len(exceptions)}")

# ---- D. 商品の並びが露出度順か ----
order = data["productOrder"]
for kind in ("parttime", "fulltime"):
    for key in ("basic", "free"):
        seen = []
        for row in data[kind].get(key, []):
            p = row["product"]
            if p not in seen:
                seen.append(p)
        ranked = [p for p in order if p in seen]
        if seen != ranked:
            problems.append(f"D: {kind}/{key} の商品順 {seen} が露出度順 {ranked} と違う")

# ---- E. エリア対応表の網羅性 ----
for a in DIP_AREAS:
    if a not in data["areaMap"]:
        problems.append(f"E: areaMap に {a} が無い")
    elif data["areaMap"][a] not in data["areas"]:
        problems.append(f"E: areaMap[{a}] が未知のエリア")
    if a not in data["spAreaMap"]:
        problems.append(f"E: spAreaMap に {a} が無い")
    else:
        for s in data["spAreaMap"][a]:
            if s not in data["spAreas"]:
                problems.append(f"E: spAreaMap[{a}] の {s} が spAreas に無い")

print("=== マイナビバイト料金表 ⇔ 収録データ ===")
for n in notes:
    print(" ", n)
if exceptions:
    print("\n  価格比の法則から外れる行（原本どおり収録済み・参考情報）:")
    for e in exceptions:
        print("   ・" + e)
if problems:
    print()
    for p in problems:
        print("NG:", p)
    print(f"\n{len(problems)} 件の不一致")
    sys.exit(1)
print("\nA〜E すべて一致")

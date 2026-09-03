# -*- coding: utf-8 -*-
"""ディップ公式料金表PDF → js/pricing-data.js を生成・検証する。

使い方（このファイルのあるディレクトリで実行）:

    pip install pypdf
    python build_pricing.py "＜バイトル料金表＞.pdf" "＜バイトルNEXT料金表＞.pdf"

処理:
  1. PDFのテキストレイヤーから表を抽出
  2. 下位プラン（A〜D）の全セルで
     「総額 ÷ 枠数 ÷ 週数 = 公式表記載の 7日/1枠あたり単価」が成立するか検証
  3. PDF本文に現れる ¥ 金額の多重集合と、抽出データの多重集合が一致するか検証
  4. ../js/pricing-data.js を出力

いずれかの検証に失敗した場合はファイルを書き出さずに終了します。
料金改定時は新しいPDFでこのスクリプトを再実行してください（JSを直接編集しないこと）。
"""
import collections
import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(BASE, "..", "js", "pricing-data.js")

# ---- エリア列の定義（PDF記載順。PDFの構成が変わったらここも更新する）----------
BAITORU_REGIONS = [
    ("shutoken",  "首都圏版",           "東京都・千葉県・埼玉県・神奈川県",
     ["新宿・渋谷・池袋版", "東京都心6区版／横浜市西区・中区版", "首都圏版"]),
    ("kansai",    "大阪・京都・兵庫版",  "大阪府・京都府・兵庫県",
     ["梅田・難波・心斎橋版", "大阪市北区・中央区版／三宮版", "大阪・京都・兵庫版"]),
    ("kitakanto", "北関東版",           "群馬県・栃木県・茨城県",
     ["北関東版"]),
    ("tokai",     "愛知・岐阜・三重版",  "愛知県・岐阜県・三重県",
     ["名古屋市中区・中村区版", "その他愛知版", "岐阜・三重版"]),
    ("shiga",     "滋賀・奈良・和歌山版", "滋賀県・奈良県・和歌山県",
     ["滋賀・奈良・和歌山版"]),
    ("shizuoka",  "静岡版",             "静岡県",
     ["静岡版"]),
    ("kyushu",    "九州・沖縄版",        "福岡県・佐賀県・長崎県・熊本県・大分県・宮崎県・鹿児島県・沖縄県",
     ["福岡市博多区・中央区版", "その他福岡／九州・沖縄版"]),
    ("hokkaido",  "北海道・東北版",      "北海道・青森県・岩手県・宮城県・秋田県・山形県・福島県",
     ["北海道・東北版"]),
    ("hokuriku",  "甲信越・北陸版",      "新潟県・富山県・石川県・福井県・山梨県・長野県",
     ["甲信越・北陸版"]),
    ("chugoku",   "中国・四国版",        "鳥取県・島根県・岡山県・広島県・山口県・徳島県・香川県・愛媛県・高知県",
     ["中国・四国版"]),
]

# バイトルNEXTは 北関東 と 大阪 のページ順がバイトルと入れ替わっている点に注意
NEXT_REGIONS = [
    ("shutoken",  "首都圏版",           "東京都・千葉県・埼玉県・神奈川県",
     ["新宿・渋谷・池袋版", "東京都心6区版", "横浜市西区・中区版", "首都圏版"]),
    ("kitakanto", "北関東版",           "群馬県・栃木県・茨城県",
     ["北関東版"]),
    ("kansai",    "大阪・京都・兵庫版",  "大阪府・京都府・兵庫県",
     # 原本PDFの列見出しは「大証市北区・中央区」だが、バイトル側の表記に合わせている
     ["梅田・なんば・心斎橋版", "大阪市北区・中央区版", "三宮版", "大阪・京都・兵庫版"]),
    ("tokai",     "愛知・岐阜・三重版",  "愛知県・岐阜県・三重県",
     ["名古屋市中区・中村区版", "愛知・岐阜・三重版"]),
    ("shiga",     "滋賀・奈良・和歌山版", "滋賀県・奈良県・和歌山県",
     ["滋賀・奈良・和歌山版"]),
    ("shizuoka",  "静岡版",             "静岡県",
     ["静岡版"]),
    ("kyushu",    "九州・沖縄版",        "福岡県・佐賀県・長崎県・熊本県・大分県・宮崎県・鹿児島県・沖縄県",
     ["福岡市博多区・中央区版", "九州・沖縄版"]),
    ("hokkaido",  "北海道・東北版",      "北海道・青森県・岩手県・宮城県・秋田県・山形県・福島県",
     ["北海道・東北版"]),
    ("hokuriku",  "甲信越・北陸版",      "新潟県・富山県・石川県・福井県・山梨県・長野県",
     ["甲信越・北陸版"]),
    ("chugoku",   "中国・四国版",        "鳥取県・島根県・岡山県・広島県・山口県・徳島県・香川県・愛媛県・高知県",
     ["中国・四国版"]),
]

# プラン名は「露出度：高 → 低」＝ 表の上から下へ の順で並べること。
# 公式料金表では次の順序になっている（Aプランが最下位・最安である点に注意）:
#   バイトル      : Pプラン(EX) → Pプラン → PLプラン → Dプラン → Cプラン → Bプラン → Aプラン
#   バイトルNEXT  :              Pプラン → PLプラン → Dプラン → Cプラン → Bプラン → Aプラン
# この並びは全ページで PDF の文字座標から自動検証している（verify_plan_order）。
SPECS = {
    "baitoru": {
        "label": "バイトル",
        "regions": BAITORU_REGIONS,
        "top_plans": ["Pプラン(EX)", "Pプラン", "PLプラン"],
        "top_periods": ["7日", "14日", "1か月"],
        "top_slots": ["1枠", "5枠", "10枠"],
        "low_plans": ["Dプラン", "Cプラン", "Bプラン", "Aプラン"],
        "low_periods": ["14日間", "1か月", "3か月", "6か月", "12か月"],
        "low_weeks": [2, 4, 12, 24, 48],
        "low_slots": ["1枠", "3枠", "5枠", "10枠", "20枠"],
    },
    "next": {
        "label": "バイトルNEXT",
        "regions": NEXT_REGIONS,
        "top_plans": ["Pプラン", "PLプラン"],
        "top_periods": ["14日", "1か月"],
        "top_slots": ["1枠", "5枠", "10枠"],
        "low_plans": ["Dプラン", "Cプラン", "Bプラン", "Aプラン"],
        "low_periods": ["1か月", "2か月", "3か月", "6か月", "12か月"],
        "low_weeks": [4, 8, 12, 24, 48],
        "low_slots": ["1枠", "3枠", "5枠", "10枠", "20枠"],
    },
}

NOTES = [
    "掲載料金には別途消費税がかかります（表示はすべて税別）。",
    "＋プランは一律 ¥10,000／7日で、お仕事詳細に表示される大画像を掲載できます。",
    "掲載開始日、大画像の有無、動画の有無によっても露出度は変動します。",
    "本料金は2025年11月時点のものであり、予告なく変更となる場合があります。",
    "2025年12月1日よりお申込み開始、2026年1月13日ご掲載開始分より適用。",
    "「バイトル」「バイトルNEXT」はディップ株式会社の登録商標です。",
]

ROW_RE = re.compile(r"^(\d+枠)\s+(.*)$")
YEN_TOKEN_RE = re.compile(r"^¥([\d,]+)$")
YEN_RE = re.compile(r"¥([\d,]+)")

errors = []


def parse_tokens(rest):
    out = []
    for tok in rest.split():
        if tok in ("-", "‐", "―", "ー", "–"):
            out.append(None)
            continue
        m = YEN_TOKEN_RE.match(tok)
        if not m:
            return None
        out.append(int(m.group(1).replace(",", "")))
    return out


def verify_plan_order(page, spec, media_key, region_name):
    """PDFの文字座標からプラン名ラベルを上→下の順に取り出し、
    spec の top_plans + low_plans と一致するか検証する。

    テキスト抽出の並び順は表のレイアウトを保証しないため、
    「どの行がどのプランか」はここで座標により確定させる。
    """
    labels = set(spec["top_plans"]) | set(spec["low_plans"])
    found = []

    def visitor(text, cm, tm, font_dict, font_size):
        t = text.strip()
        if t in labels:
            found.append((tm[5], t))

    page.extract_text(visitor_text=visitor)
    found.sort(key=lambda h: -h[0])

    seen, order = set(), []
    for _, name in found:
        if name in seen:
            continue
        seen.add(name)
        order.append(name)

    expected = list(spec["top_plans"]) + list(spec["low_plans"])
    if order != expected:
        errors.append(
            f"[{media_key}/{region_name}] プラン名の並び順が定義と不一致\n"
            f"    PDF実配置(上→下): {' → '.join(order) or '(検出できず)'}\n"
            f"    スクリプト定義  : {' → '.join(expected)}")


def parse_pdf(path, spec, media_key):
    from pypdf import PdfReader

    reader = PdfReader(path)
    pages = [(p.extract_text() or "").splitlines() for p in reader.pages]
    if len(pages) != len(spec["regions"]):
        errors.append(f"[{media_key}] ページ数 {len(pages)} ≠ エリア定義 {len(spec['regions'])}")

    regions = []
    for idx, lines in enumerate(pages):
        if idx >= len(spec["regions"]):
            break
        key, name, area, cols = spec["regions"][idx]
        verify_plan_order(reader.pages[idx], spec, media_key, name)

        split_at = None
        for i, ln in enumerate(lines):
            if ln.startswith("枠数 総額"):
                split_at = i
                break
        if split_at is None:
            errors.append(f"[{media_key}/{name}] 下段表ヘッダが見つからない")
            continue

        top_rows, low_rows = [], []
        for i, ln in enumerate(lines):
            m = ROW_RE.match(ln.strip())
            if not m:
                continue
            vals = parse_tokens(m.group(2))
            if vals is None:
                continue
            (top_rows if i < split_at else low_rows).append((m.group(1), vals))

        # ---- 上段表 ----
        n_area, n_per = len(cols), len(spec["top_periods"])
        expect_top = len(spec["top_plans"]) * len(spec["top_slots"])
        if len(top_rows) != expect_top:
            errors.append(f"[{media_key}/{name}] 上段行数 {len(top_rows)} ≠ 期待 {expect_top}")
        top = {}
        for r, (slot, vals) in enumerate(top_rows):
            plan = spec["top_plans"][r // len(spec["top_slots"])]
            exp_slot = spec["top_slots"][r % len(spec["top_slots"])]
            if slot != exp_slot:
                errors.append(f"[{media_key}/{name}] 上段 {plan}: 枠 {slot} ≠ 期待 {exp_slot}")
            if len(vals) != n_area * n_per:
                errors.append(
                    f"[{media_key}/{name}] 上段 {plan} {slot}: 値 {len(vals)}個 ≠ "
                    f"エリア{n_area}×期間{n_per}")
                continue
            top.setdefault(plan, {})[slot] = [
                vals[a * n_per:(a + 1) * n_per] for a in range(n_area)]

        # ---- 下段表 ----
        # 公式表には値が入らない枠の行も「-」で存在する（バイトルNEXTのB・Aプラン）。
        # 原本と同じ見た目にするため、そうした行も null 埋めでそのまま収録する。
        # 逆にバイトルのB・Aプランは1／3／5枠の行自体が無いので、行が無ければ飛ばす。
        rows = [(slot, [(vals[i], vals[i + 1]) for i in range(0, len(vals) - 1, 2)])
                for slot, vals in low_rows]

        expect_seq = [(plan, s) for plan in spec["low_plans"] for s in spec["low_slots"]]
        low, idx = {}, 0
        for plan, exp_slot in expect_seq:
            if idx >= len(rows) or rows[idx][0] != exp_slot:
                continue  # PDF側にこの行が存在しない
            slot, pairs = rows[idx]
            idx += 1
            n_slot = int(slot.replace("枠", ""))
            offset = len(spec["low_periods"]) - len(pairs)
            totals = [None] * offset
            for k, (total, unit) in enumerate(pairs):
                pi = k + offset
                totals.append(total)
                if total is None or unit is None:
                    continue
                calc = total / (n_slot * spec["low_weeks"][pi])
                if abs(calc - unit) > 0.5:
                    errors.append(
                        f"[{media_key}/{name}] {plan} {slot} {spec['low_periods'][pi]}: "
                        f"総額{total} ÷ ({n_slot}枠×{spec['low_weeks'][pi]}週) = {calc:.1f} "
                        f"≠ 記載単価 {unit}")
            low.setdefault(plan, {})[slot] = totals
        if idx != len(rows):
            errors.append(
                f"[{media_key}/{name}] 下段の行が定義と対応しない "
                f"（消化 {idx} / 全 {len(rows)}: {[r[0] for r in rows]}）")
        for plan in spec["low_plans"]:
            if plan not in low:
                errors.append(f"[{media_key}/{name}] 下段 {plan} の行が1つも無い")

        regions.append({"key": key, "name": name, "area": area,
                        "columns": cols, "top": top, "low": low})

    # ---- PDF本文の¥金額と抽出結果の突合 ----
    for idx, region in enumerate(regions):
        text = reader.pages[idx].extract_text() or ""
        table_text = "\n".join(ln for ln in text.splitlines() if "＋プラン" not in ln)
        pdf_counts = collections.Counter(
            int(m.replace(",", "")) for m in YEN_RE.findall(table_text))
        json_counts = collections.Counter()
        for plan, slots in region["top"].items():
            for slot, cols_ in slots.items():
                for col in cols_:
                    json_counts.update(col)
        for plan, slots in region["low"].items():
            for slot, totals in slots.items():
                n_slot = int(slot.replace("枠", ""))
                for pi, total in enumerate(totals):
                    if total is None:
                        continue
                    json_counts[total] += 1
                    json_counts[total // (n_slot * spec["low_weeks"][pi])] += 1
        if pdf_counts != json_counts:
            errors.append(
                f"[{media_key}/{region['name']}] 金額突合が不一致 "
                f"PDFのみ={dict(sorted((pdf_counts - json_counts).items()))} "
                f"抽出のみ={dict(sorted((json_counts - pdf_counts).items()))}")

    return regions


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    paths = {"baitoru": sys.argv[1], "next": sys.argv[2]}

    payload = {}
    for media_key, pdf in paths.items():
        spec = SPECS[media_key]
        regions = parse_pdf(pdf, spec, media_key)
        payload[media_key] = {
            "label": spec["label"],
            "topPlans": spec["top_plans"],
            "topPeriods": spec["top_periods"],
            "topSlots": spec["top_slots"],
            "lowPlans": spec["low_plans"],
            "lowPeriods": spec["low_periods"],
            "lowWeeks": spec["low_weeks"],
            "lowSlots": spec["low_slots"],
            "regions": regions,
        }

    if errors:
        print("=== 検証エラー（ファイルは出力していません）===")
        for e in errors:
            print("NG:", e)
        sys.exit(1)

    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    notes = json.dumps(NOTES, ensure_ascii=False, indent=4)
    js = f"""// ========================================
// ディップ株式会社 掲載料金データ（2026年1月13日ご掲載開始分より適用）
//
// このファイルは公式料金表PDFから機械生成しています。手で編集しないでください。
//   出典: 【バ】【2026年1月13日以降】(全国版)バイトル料金表.pdf
//         【社】【2026年1月13日以降】バイトルNEXT掲載料金表.pdf
//   生成: tools/build_pricing.py（PDF本文と全金額一致・単価計算の整合を検証済み）
//
// 構造:
//   dipPricing[媒体].regions[].top[プラン][枠数]  = [[期間別金額…] × エリア列]
//   dipPricing[媒体].regions[].low[プラン][枠数]  = [期間別の総額…]（null = 設定なし）
//   「7日／1枠あたり」単価は 総額 ÷ 枠数 ÷ 週数 で算出できます（PDF記載値と一致を検証済み）。
// ========================================

var dipPricingNotes = {notes};

var dipPricing = {body};
"""
    with open(OUTPUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(js)

    print("検証OK: 単価計算の整合・PDF本文との金額突合、いずれも全件一致")
    for k, v in payload.items():
        print(f"  {v['label']}: {len(v['regions'])}エリア")
    print("出力:", os.path.normpath(OUTPUT), f"({os.path.getsize(OUTPUT)} bytes)")


if __name__ == "__main__":
    main()

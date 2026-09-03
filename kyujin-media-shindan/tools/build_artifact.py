# -*- coding: utf-8 -*-
"""index.html / css / js を1枚のHTMLにまとめ、限定公開用ファイルを書き出す。

    python build_artifact.py

出力: ../dist/kyujin-media-shindan.html

限定公開の実行環境では外部スタイルシートを読み込めないため、
CSSとJSはすべてファイル内に埋め込む。Font Awesome は
CSPで許可されている cdnjs から SVG版（JS）を読み込む。
Google Fonts は許可されているのでそのまま。

出力ファイルには <!DOCTYPE> / <html> / <head> / <body> を含めない
（公開時に外側が付与されるため）。
"""
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE, "..")
OUT_DIR = os.path.join(ROOT, "dist")
OUT = os.path.join(OUT_DIR, "kyujin-media-shindan.html")

FA = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"
FONTS = ("https://fonts.googleapis.com/css2?"
         "family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap")
JS_FILES = ["js/pricing-data.js", "js/pricing-mynavi.js", "js/script.js"]


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


html = read("index.html")
css = read("css/style.css")

# <body> の中身だけを取り出し、<script src> の読み込みは取り除く
m = re.search(r"<body[^>]*>(.*)</body>", html, re.S)
if not m:
    print("NG: <body> が見つかりません")
    sys.exit(1)
body = m.group(1)
body = re.sub(r'\s*<script src="js/[^"]+"></script>', "", body)

# </script> や </style> がそのまま入ると埋め込みが壊れるので確認
scripts = "\n".join("// ===== " + f + " =====\n" + read(f) for f in JS_FILES)
for name, text, closer in (("CSS", css, "</style>"), ("JS", scripts, "</script>")):
    if closer in text:
        print(f"NG: {name} に {closer} が含まれているため埋め込めません")
        sys.exit(1)

page = f"""<title>求人媒体適正活用診断</title>
<meta name="description" content="6つの質問で、貴社の採用条件にもっとも適した求人媒体をマッチ度スコア付きで提案します。株式会社JJS">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<!-- Font Awesome は SVG 版（JS）。外部CSSを読み込めない環境でもアイコンが出る -->
<script defer src="{FA}"></script>

<style>
/* 明るい配色に固定したデザインのため、フォーム部品も明るい系に揃える */
:root {{ color-scheme: light; }}

{css}
</style>
{body}
<script>
{scripts}
</script>
"""

os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write(page)

print("出力:", os.path.normpath(OUT))
print("サイズ:", f"{os.path.getsize(OUT):,} bytes")
import re as _re
for tag in ("<!doctype", "<html", "<head>", "<body"):
    if _re.search(_re.escape(tag) + r"[\s>]", page, _re.I):
        print(f"注意: {tag} が残っています")
print("外部読み込み:", "Google Fonts / Font Awesome(cdnjs) のみ")

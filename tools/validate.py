#!/usr/bin/env python3
"""リンク・画像・タイムライン整合性のチェック。リポジトリのルートで実行する。"""
import re, os, sys, glob, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

EXCLUDE_DIRS = {".git"}

def all_html_files():
    for f in sorted(glob.glob("**/*.html", recursive=True)):
        parts = f.split(os.sep)
        if any(p in EXCLUDE_DIRS for p in parts):
            continue
        yield f

problems = []
for f in all_html_files():
    s = io.open(f, encoding="utf-8").read()
    base = os.path.dirname(f)

    for href in re.findall(r'href="([^"#:]+\.html)[^"]*"', s):
        resolved = os.path.normpath(os.path.join(base, href))
        if not os.path.exists(resolved):
            problems.append((f, "dead link", href))
    for src in re.findall(r'src="([^"]+)"', s):
        if src.startswith("http"):
            continue
        resolved = os.path.normpath(os.path.join(base, src))
        if not os.path.exists(resolved):
            problems.append((f, "missing asset", src))
    for css in re.findall(r'<link rel="stylesheet" href="([^"]+)"', s):
        resolved = os.path.normpath(os.path.join(base, css))
        if not os.path.exists(resolved):
            problems.append((f, "missing css", css))

    secs   = len(re.findall(r'class="sec"', s))
    ticks  = len(re.findall(r'class="tl__tick"', s))
    starts = [int(x) for x in re.findall(r'data-start="(\d+)"', s)]
    dur    = re.search(r'data-duration="(\d+)"', s)

    if dur:
        d = int(dur.group(1))
        # タイムラインに載るのは「動画のどこかを指す節」だけ。
        # 動画に対応する時刻を持たない節（公式コース本文由来の要点・振り返り、演習）は
        # data-start を持たず、.sec__t には m:ss ではなく短いラベルを入れる。
        # よって tick と突き合わせるのは .sec 総数ではなく data-start を持つ節の数。
        if len(starts) != ticks:
            problems.append((f, "start/tick mismatch",
                             "data-start=%d tick=%d (sec=%d)" % (len(starts), ticks, secs)))
        if starts and max(starts) >= d:
            problems.append((f, "data-start >= duration", "max=%d dur=%d" % (max(starts), d)))
        if starts != sorted(starts):
            problems.append((f, "data-start not ascending", str(starts)))
        # 表示タイムコードと data-start のズレ。ナレーション開始に合わせて数秒ずらす
        # ことがあるので完全一致は求めず、明らかなコピペミスだけを拾う。
        TOLERANCE = 5
        for start, label in re.findall(r'data-start="(\d+)"[^>]*>\s*<div class="sec__mark"><div>'
                                       r'<span class="sec__t">([^<]+)</span>', s):
            m = re.match(r"(\d+):(\d{2})$", label.strip())
            if not m:
                problems.append((f, "sec__t not m:ss", label)); continue
            shown = int(m.group(1)) * 60 + int(m.group(2))
            if abs(shown - int(start)) > TOLERANCE:
                problems.append((f, "sec__t vs data-start (>%ds)" % TOLERANCE,
                                 "%s vs %ss" % (label, start)))
        print("%-34s sec=%d (timed %d) tick=%d dur=%ds"
              % (f, secs, len(starts), ticks, d))
    else:
        print("%-34s sec=%d (no timeline)" % (f, secs))

print()
if problems:
    for p in problems:
        print("  FAIL  %-32s %-24s %s" % p)
    sys.exit(1)
print("  OK — %d images on disk" % len(glob.glob("img/*.jpg") + glob.glob("img/*.png")))

#!/usr/bin/env python3
"""リンク・画像・タイムライン整合性のチェック。リポジトリのルートで実行する。"""
import re, os, sys, glob, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

problems = []
for f in sorted(glob.glob("*.html")):
    s = io.open(f, encoding="utf-8").read()

    for href in re.findall(r'href="([^"#:]+\.html)[^"]*"', s):
        if not os.path.exists(href):
            problems.append((f, "dead link", href))
    for src in re.findall(r'src="([^"]+)"', s):
        if not src.startswith("http") and not os.path.exists(src):
            problems.append((f, "missing asset", src))
    for css in re.findall(r'<link rel="stylesheet" href="([^"]+)"', s):
        if not os.path.exists(css):
            problems.append((f, "missing css", css))

    secs   = len(re.findall(r'class="sec"', s))
    ticks  = len(re.findall(r'class="tl__tick"', s))
    starts = [int(x) for x in re.findall(r'data-start="(\d+)"', s)]
    dur    = re.search(r'data-duration="(\d+)"', s)

    if dur:
        d = int(dur.group(1))
        if secs != ticks:
            problems.append((f, "sec/tick mismatch", "sec=%d tick=%d" % (secs, ticks)))
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
        print("%-34s sec=%d tick=%d dur=%ds" % (f, secs, ticks, d))
    else:
        print("%-34s sec=%d (no timeline)" % (f, secs))

print()
if problems:
    for p in problems:
        print("  FAIL  %-32s %-24s %s" % p)
    sys.exit(1)
print("  OK — %d images on disk" % len(glob.glob("img/*.jpg") + glob.glob("img/*.png")))

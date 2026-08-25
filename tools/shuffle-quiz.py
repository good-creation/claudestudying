#!/usr/bin/env python3
"""各セクションの小問題（.chk）の正解位置を散らす。リポジトリのルートで実行する。

偏ると「常にAを選べば当たる」状態になり、確認問題として機能しなくなる。
設問文のハッシュから「正解を置く位置」を絶対値で決めるので冪等。
--apply で書き込み、省略するとドライラン。
"""

#
# 設問文のハッシュから「正解を置く位置」を絶対値で決め、正解をその位置へ移す。
# （並べ替え方を決めるのではない。それだと2回かけると2回並べ替わって冪等にならない）
# 誤答2つの相対順は保つ。何度実行しても結果は同じ。
#
# 解説が「B・Cのような」「(=A)」のように選択肢の位置を参照している設問は壊れるので飛ばす。
# 「表 A」のような本文の表への参照は位置参照ではないので対象に含める。
import re, io, glob, hashlib, sys

APPLY = "--apply" in sys.argv
FILES = sorted(glob.glob("0*.html")+glob.glob("1*.html")+["cloudflare.html","summary.html"]
               +glob.glob("ai-fluency/*.html")+glob.glob("advanced/*.html")
               +glob.glob("educators/*.html"))
TABLE  = re.compile(r'表\s*[ABC]')
POSREF = re.compile(r'(?<!答え: )(?<!答え:)\b[ABC]\b|[123]つめ|[一二三]つめ|[123]番目|最初の選択肢|最後の選択肢')

skipped, moved, dist = [], 0, {"A":0,"B":0,"C":0}
for f in FILES:
    s = io.open(f, encoding="utf-8").read()
    edits = []
    for m in re.finditer(r'<details class="chk">(.*?)</details>', s, re.S):
        b = m.group(1)
        qm  = re.search(r'<b>確認</b>\s*(.*?)\s*<ul class="chk__c">', b, re.S)
        lis = re.findall(r'<li>.*?</li>', b, re.S)
        am  = re.search(r'(答え:\s*)([ABC])', b)
        if not (qm and am) or len(lis) != 3: continue
        q = re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',qm.group(1))).strip()
        tail = re.sub(r'答え:\s*[ABC]', '', b.split('chk__a')[-1])
        if POSREF.search(TABLE.sub('表', re.sub(r'<[^>]+>','',tail))):
            skipped.append((f, q[:50])); dist[am.group(2)] += 1; continue
        cur = ord(am.group(2)) - 65
        tgt = int(hashlib.sha256(q.encode("utf-8")).hexdigest(), 16) % 3   # 正解を置く位置（絶対）
        correct = lis[cur]
        others  = [x for i, x in enumerate(lis) if i != cur]              # 誤答の相対順は保つ
        new = others[:tgt] + [correct] + others[tgt:]
        nb = b.replace("".join(lis), "".join(new), 1)
        nb = re.sub(r'(答え:\s*)[ABC]', lambda mm: mm.group(1) + "ABC"[tgt], nb, count=1)
        if nb != b: moved += 1
        edits.append((m.start(1), m.end(1), nb)); dist["ABC"[tgt]] += 1
    if edits and APPLY:
        for a, z, nb in reversed(edits): s = s[:a] + nb + s[z:]
        io.open(f, "w", encoding="utf-8").write(s)

print("位置を動かした設問: %d 問" % moved)
print("正解の分布: A=%d B=%d C=%d" % (dist["A"], dist["B"], dist["C"]))
if skipped:
    print("\n位置参照があるため見送り: %d 問" % len(skipped))
    for f, q in skipped: print("  %-42s %s" % (f.split('/')[-1], q))
if not APPLY: print("\n（DRY RUN。--apply で書き込み）")

#!/usr/bin/env python3
"""各セクションの小問題（.chk）を検査する。リポジトリのルートで実行する。

拾うもの:
  - 答えラベル（A/B/C）と選択肢の対応ずれ、選択肢の数、解説の段落数
  - 正解に含まれる数値が本文に無い（言い換えが効かないので機械的に照合できる）
  - 正解が本文の丸写し（正解だけが「見覚えのある文」として浮き、考えずに選べてしまう）
  - 解説が選択肢の位置に言及している（tools/shuffle-quiz.py で並べ替えると静かに壊れる）
"""

# 内容の正しさ（答えが本文と合っているか）は文字列一致では判定できないので、
# ここでは扱わない —— 別文脈のレビュアーに読ませる。
# ただし「数値」は言い換えが効かないので、正解に含まれる数値だけは本文と照合する。
import re, io, glob

def strip(x): return re.sub(r'\s+', '', re.sub(r'<[^>]+>', '', x))
NUM = re.compile(r'\d[\d,]*')

files = sorted(glob.glob("0*.html")+glob.glob("1*.html")+["cloudflare.html","summary.html"]
               +glob.glob("ai-fluency/*.html")+glob.glob("advanced/*.html"))
tot = 0; problems = []
for f in files:
    s = io.open(f, encoding="utf-8").read()
    s = re.sub(r'<details class="tr">.*?</details>', '', s, flags=re.S)
    for sec in re.finditer(r'<section class="sec"([^>]*)>(.*?)</section>', s, re.S):
        body = sec.group(2)
        h = re.search(r'<h2 class="sec__h">(.*?)</h2>', body, re.S)
        title = re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',h.group(1))).strip() if h else '(無題)'
        prose = strip(re.sub(r'<details class="chk">.*?</details>', '', body, flags=re.S))
        for m in re.finditer(r'<details class="chk">(.*?)</details>', body, re.S):
            tot += 1; b = m.group(1); where = "%s / %s" % (f, title[:36])
            lis = re.findall(r'<li>(.*?)</li>', b, re.S)
            a = re.search(r'答え:\s*([A-Z])', b)
            if not a: problems.append((where, "答えラベルが無い")); continue
            i = ord(a.group(1)) - 65
            if not (0 <= i < len(lis)):
                problems.append((where, "答え%s だが選択肢%d個" % (a.group(1), len(lis)))); continue
            if len(lis) != 3: problems.append((where, "選択肢が%d個" % len(lis)))
            if b.count('<summary>') != 1: problems.append((where, "summary が%d個" % b.count('<summary>')))
            if 'class="chk__a"' not in b: problems.append((where, "chk__a が無い"))
            if re.search(r'<li>\s*[A-C][.．、]', b):
                problems.append((where, "選択肢に記号を手書きしている"))
            if len(re.findall(r'<p>', b.split('chk__a')[-1])) > 2:
                problems.append((where, "解説の段落が3つ以上"))
            # 数値の照合（言い換えが効かない部分だけ）
            for n in set(NUM.findall(strip(lis[i]))):
                if len(n) >= 2 and n.replace(",","") not in prose.replace(",",""):
                    problems.append((where, "正解の数値 %s が本文に無い" % n))
# 正解が本文の丸写しになっていないか（正解だけが「見覚えのある文」として浮くのを防ぐ）
def _lcs(a, b):
    if not a or not b: return 0
    prev = [0]*(len(b)+1); best = 0
    for i in range(1, len(a)+1):
        cur = [0]*(len(b)+1)
        for j in range(1, len(b)+1):
            if a[i-1] == b[j-1]:
                cur[j] = prev[j-1]+1
                if cur[j] > best: best = cur[j]
        prev = cur
    return best

for f in files:
    s = io.open(f, encoding="utf-8").read()
    s = re.sub(r'<details class="tr">.*?</details>', '', s, flags=re.S)
    for sec in re.finditer(r'<section class="sec"[^>]*>(.*?)</section>', s, re.S):
        body = sec.group(1)
        h = re.search(r'<h2 class="sec__h">(.*?)</h2>', body, re.S)
        title = re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',h.group(1))).strip() if h else '(無題)'
        prose = strip(re.sub(r'<details class="chk">.*?</details>', '', body, flags=re.S))
        for m in re.finditer(r'<details class="chk">(.*?)</details>', body, re.S):
            b = m.group(1)
            lis = re.findall(r'<li>(.*?)</li>', b, re.S)
            a = re.search(r'答え:\s*([ABC])', b)
            if not a or len(lis) != 3: continue
            i = ord(a.group(1)) - 65
            sc = [_lcs(strip(x), prose)/max(1, len(strip(x))) for x in lis]
            if sc[i] >= 0.75 and sc[i] - max(sc[j] for j in range(3) if j != i) >= 0.25:
                problems.append(("%s / %s" % (f, title[:36]),
                                 "正解が本文の丸写し（一致率%.2f）: %s" % (sc[i], strip(lis[i])[:30])))
            tail = re.sub(r'答え:\s*[ABC]', '', b.split('chk__a')[-1])
            tail = re.sub(r'表\s*[ABC]', '表', re.sub(r'<[^>]+>', '', tail))
            if re.search(r'(?<!答え: )\b[ABC]\b|[123]つめ|[123]番目', tail):
                problems.append(("%s / %s" % (f, title[:36]), "解説が選択肢の位置に言及している"))

print("検査した設問: %d 問" % tot)
if problems:
    print("要確認: %d 件\n" % len(problems))
    for w, p in problems: print("  %-56s %s" % (w, p))
else:
    print("構造の機械チェック: 問題なし")

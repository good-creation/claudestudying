#!/usr/bin/env python3
"""上部ナビを定義から一括で書き換える。

ルート直下のページ（Claude Code 入門コース）と、ai-fluency/ 配下の別コースは
それぞれ別の nav を持つ。両方をこのスクリプトで生成する。
"""
import re, os, io, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# サイト全体の玄関ページ。3コースを選ぶだけの入口で、レッスン番号は持たない。
HOME = ("index.html", "ホーム", "コースを選ぶ")

# Claude Code 入門コースの目次ページ（玄関から分離）。このページ自身も nav を持つ。
COURSE_INDEX = ("claude-code.html", "目次", "Claude Code 入門コース 目次")

LESSONS = [
    ("01-what-is-claude-code.html",      "01", "Claude Code とは何か"),
    ("02-how-claude-code-works.html",    "02", "どう動いているのか"),
    ("03-your-first-prompt.html",        "03", "最初のプロンプトを書く"),
    ("04-explore-plan-code-commit.html", "04", "探索 → 計画 → コード → コミット"),
    ("05-context-management.html",       "05", "コンテキストを管理する"),
    ("06-claude-md.html",                "06", "CLAUDE.md ファイル"),
    ("07-subagents.html",                "07", "サブエージェントとは何か"),
    ("08-skills.html",                   "08", "スキルとは何か"),
    ("09-mcp.html",                      "09", "MCP で外部につなぐ"),
    ("10-hooks.html",                    "10", "フックで確実に実行させる"),
    ("11-review-and-ship.html",          "11", "レビューして出荷する"),
]

# 公式コース外の付録。番号体系に混ぜず、ナビ上も区切って表示する。
# cloudflare.html はトップの独立コースカードに昇格したため、入門コースの nav には出さない
# （専用 nav は af_nav_for() に倣った cf_nav_for() で別途生成する）。
APPENDIX = [
    ("summary.html",    "まとめ", "まとめ：できることと、費用"),
    ("quiz.html",       "確認問題", "確認問題 20問"),
]

# 公式コース外の別コース。付録と同じ視覚的分離（is-appendix）で扱うが、
# 専用の nav を別に持つのでこのサイトの nav 書き換え対象（TARGETS）には含めない。
AI_FLUENCY = [
    ("ai-fluency/index.html", "AI", "AI活用力（別コース）"),
]

# 別コース ai-fluency/ 側のレッスン。相対パスがルートと違うので nav も別に生成する。
AF_LESSONS = [
    ("01-introduction.html",                "01", "AI活用力入門"),
    ("02-why-ai-fluency.html",              "02", "なぜAI活用力が必要なのか？"),
    ("03-4d-framework.html",                "03", "4D フレームワーク"),
    ("04-generative-ai-basics.html",        "04", "生成 AI の基礎"),
    ("05-capabilities-limits.html",         "05", "生成 AI の能力と限界"),
    ("06-delegation.html",                  "06", "委任力 (Delegation) を詳しく見る"),
    ("07-project-delegation.html",          "07", "プロジェクト計画と委任力"),
    ("08-description.html",                 "08", "記述力 (Description) を詳しく見る"),
    ("09-prompting-techniques.html",        "09", "効果的なプロンプト技法"),
    ("10-discernment.html",                 "10", "評価力 (Discernment) を詳しく見る"),
    ("11-description-discernment-loop.html","11", "記述・評価のループ"),
    ("12-diligence.html",                   "12", "倫理的責任 (Diligence) を詳しく見る"),
    ("13-conclusion.html",                  "13", "まとめ"),
]

# nav に載せる項目（表示用）
NAV_ITEMS = [HOME, COURSE_INDEX] + LESSONS + APPENDIX + AI_FLUENCY

# nav を書き換える対象ファイル（このサイト自身のページのみ。
# ai-fluency/ 配下はコース専用 nav を手書きで持つため対象外）
# index.html は玄関ページで nav を持たないため対象に含めない。
TARGETS = [COURSE_INDEX] + LESSONS + APPENDIX

def nav_for(current):
    rows = ["<nav>"]
    for href, num, ja in [HOME, COURSE_INDEX]:
        cur = ' aria-current="page"' if href == current else ""
        rows.append('      <a href="%s" title="%s" aria-label="%s"%s>%s</a>'
                    % (href, ja, ja, cur, num))
    for href, num, ja in LESSONS:
        cur = ' aria-current="page"' if href == current else ""
        rows.append('      <a href="%s" title="%s" aria-label="%s %s"%s>%s</a>'
                    % (href, ja, num, ja, cur, num))
    for href, num, ja in APPENDIX + AI_FLUENCY:
        cur = ' aria-current="page"' if href == current else ""
        rows.append('      <a class="is-appendix" href="%s" title="%s" aria-label="%s"%s>%s</a>'
                    % (href, ja, ja, cur, num))
    rows.append("    </nav>")
    return "\n".join(rows)

# ページ内で class を持たない <nav> は上部ナビだけ（レール側は <nav class="rail">）
pat = re.compile(r"<nav>.*?</nav>", re.S)

for href, num, ja in TARGETS:
    if not os.path.exists(href):
        print("  SKIP  %s (not found)" % href); continue
    s = io.open(href, encoding="utf-8").read()
    new, n = pat.subn(nav_for(href), s, count=1)
    if n != 1:
        print("  FAIL  %s — found %d bare <nav>" % (href, n)); sys.exit(1)
    io.open(href, "w", encoding="utf-8").write(new)
    print("  ok    %s" % href)


# --- 別コース ai-fluency/ の nav -------------------------------------------
# 配下のページは 1 階層下にあるので、親コースへのリンクだけ ../ を付ける。

def af_nav_for(current):
    rows = ["<nav>"]
    rows.append('      <a href="index.html" title="AI活用力コース 目次" aria-label="AI活用力コース 目次"%s>目次</a>'
                % (' aria-current="page"' if current == "index.html" else ""))
    for href, num, ja in AF_LESSONS:
        cur = ' aria-current="page"' if href == current else ""
        rows.append('      <a href="%s" title="%s" aria-label="%s %s"%s>%s</a>'
                    % (href, ja, num, ja, cur, num))
    rows.append('      <a class="is-appendix" href="../index.html" title="学習ノート ホームへ" aria-label="学習ノート ホームへ戻る">ホーム</a>')
    rows.append('      <a class="is-appendix" href="../claude-code.html" title="Claude Code 入門コースへ" aria-label="Claude Code 入門コースへ戻る">CC コース</a>')
    rows.append("    </nav>")
    return "\n".join(rows)

for href, num, ja in [("index.html", "目次", "AI活用力コース 目次")] + AF_LESSONS:
    path = os.path.join("ai-fluency", href)
    if not os.path.exists(path):
        print("  SKIP  %s (not found)" % path); continue
    s_page = io.open(path, encoding="utf-8").read()
    new, n = pat.subn(af_nav_for(href), s_page, count=1)
    if n != 1:
        print("  FAIL  %s — found %d bare <nav>" % (path, n)); sys.exit(1)
    io.open(path, "w", encoding="utf-8").write(new)
    print("  ok    %s" % path)


# --- 付録 cloudflare.html 専用の nav ----------------------------------------
# 入門コースの nav からは外したが、cloudflare.html 自身が孤立しないよう
# 最小限の専用 nav（玄関へ戻る + 自ページ）を持たせる。

def cf_nav_for(current):
    rows = ["<nav>"]
    rows.append('      <a href="index.html" title="コースを選ぶ" aria-label="コースを選ぶ">ホーム</a>')
    rows.append('      <a class="is-appendix" href="cloudflare.html" title="付録：Cloudflare × Claude Code" aria-label="付録：Cloudflare × Claude Code"%s>Cloudflare</a>'
                % (' aria-current="page"' if current == "cloudflare.html" else ""))
    rows.append("    </nav>")
    return "\n".join(rows)

if os.path.exists("cloudflare.html"):
    s_cf = io.open("cloudflare.html", encoding="utf-8").read()
    new, n = pat.subn(cf_nav_for("cloudflare.html"), s_cf, count=1)
    if n != 1:
        print("  FAIL  cloudflare.html — found %d bare <nav>" % n); sys.exit(1)
    io.open("cloudflare.html", "w", encoding="utf-8").write(new)
    print("  ok    cloudflare.html")
else:
    print("  SKIP  cloudflare.html (not found)")


# --- 別コース advanced/ の nav ----------------------------------------------
# アドバンスコース。ai-fluency/ と同じく専用の nav を持つ。
# 動画由来のレッスンとテキスト教材由来のレッスンが混在するが、nav 上は区別しない。

ADV_LESSONS = [
    ("01-what-happens-when-you-talk-to-ai.html", "01", "AIに話しかけると何が起きているのか"),
    ("02-tokens-and-embeddings.html",            "02", "トークンと埋め込み"),
    ("03-parametric-memory-and-context.html",    "03", "パラメトリックメモリとコンテキスト"),
    ("04-can-you-trust-ai.html",                 "04", "AIの答えは信じられるのか"),
    ("05-why-do-models-hallucinate.html",        "05", "なぜAIは幻覚を起こすのか"),
    ("06-what-is-sycophancy.html",               "06", "追従性 (sycophancy) とは何か"),
    ("07-why-does-bias-exist.html",              "07", "なぜAIにバイアスが存在するのか"),
    ("08-what-does-ai-know-about-you.html",      "08", "AIは自分について何を知っているのか"),
    ("09-diligence-statement.html",              "09", "AIデューデリジェンス声明の書き方"),
]

def adv_nav_for(current):
    rows = ["<nav>"]
    rows.append('      <a href="index.html" title="アドバンスコース 目次" aria-label="アドバンスコース 目次"%s>目次</a>'
                % (' aria-current="page"' if current == "index.html" else ""))
    for href, num, ja in ADV_LESSONS:
        cur = ' aria-current="page"' if href == current else ""
        rows.append('      <a href="%s" title="%s" aria-label="%s %s"%s>%s</a>'
                    % (href, ja, num, ja, cur, num))
    rows.append('      <a class="is-appendix" href="../index.html" title="コースを選ぶ" aria-label="ホームへ戻る">ホーム</a>')
    rows.append("    </nav>")
    return "\n".join(rows)

for href, num, ja in [("index.html", "目次", "アドバンスコース 目次")] + ADV_LESSONS:
    path = os.path.join("advanced", href)
    if not os.path.exists(path):
        print("  SKIP  %s (not found)" % path); continue
    s_page = io.open(path, encoding="utf-8").read()
    new, n = pat.subn(adv_nav_for(href), s_page, count=1)
    if n != 1:
        print("  FAIL  %s — found %d bare <nav>" % (path, n)); sys.exit(1)
    io.open(path, "w", encoding="utf-8").write(new)
    print("  ok    %s" % path)

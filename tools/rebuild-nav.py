#!/usr/bin/env python3
"""全レッスンページの上部ナビを LESSONS の定義から一括で書き換える。"""
import re, os, io, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

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

def nav_for(current):
    rows = ["<nav>"]
    for href, num, ja in LESSONS:
        cur = ' aria-current="page"' if href == current else ""
        rows.append('      <a href="%s" title="%s" aria-label="%s %s"%s>%s</a>'
                    % (href, ja, num, ja, cur, num))
    rows.append("    </nav>")
    return "\n".join(rows)

# ページ内で class を持たない <nav> は上部ナビだけ（レール側は <nav class="rail">）
pat = re.compile(r"<nav>.*?</nav>", re.S)

for href, num, ja in LESSONS:
    if not os.path.exists(href):
        print("  SKIP  %s (not found)" % href); continue
    s = io.open(href, encoding="utf-8").read()
    new, n = pat.subn(nav_for(href), s, count=1)
    if n != 1:
        print("  FAIL  %s — found %d bare <nav>" % (href, n)); sys.exit(1)
    io.open(href, "w", encoding="utf-8").write(new)
    print("  ok    %s" % href)

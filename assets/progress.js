/* 読んだレッスンを覚えておき、トップページで「つづきから」を出す。

   このサイトは静的配信でログインも無いので、進捗はこの端末の localStorage にだけ置く。
   サーバーには何も送らない。消えても学習内容には影響しない前提で作る（保存に失敗しても
   ページは普通に読める）。

   カタログはサイト直下からの相対パスを鍵にする。ai-fluency と educators に同名の
   01-introduction.html があるので、鍵はディレクトリを含めた形で持ち、照合も
   「一番長く一致したものを採る」ようにしてある。 */
window.NOTEPROGRESS = (function () {

  var KEY_READ = 'note.read.v1';   /* {鍵: 最後に開いた時刻} */
  var KEY_LAST = 'note.last.v1';   /* 最後に開いたレッスンの鍵 */

  var COURSES = [
    {
      id: 'claude-code',
      home: 'claude-code.html',
      lessons: [
        ['01-what-is-claude-code.html',      '01', 'Claude Code とは何か'],
        ['02-how-claude-code-works.html',    '02', 'どう動いているのか'],
        ['03-your-first-prompt.html',        '03', '最初のプロンプトを書く'],
        ['04-explore-plan-code-commit.html', '04', '探索 → 計画 → コード → コミット'],
        ['05-context-management.html',       '05', 'コンテキストを管理する'],
        ['06-claude-md.html',                '06', 'CLAUDE.md ファイル'],
        ['07-subagents.html',                '07', 'サブエージェントとは何か'],
        ['08-skills.html',                   '08', 'スキルとは何か'],
        ['09-mcp.html',                      '09', 'MCP で外部につなぐ'],
        ['10-hooks.html',                    '10', 'フックで確実に実行させる'],
        ['11-review-and-ship.html',          '11', 'レビューして出荷する']
      ]
    },
    {
      id: 'easy',
      home: 'easy/index.html',
      lessons: [
        ['easy/01-what-is-claude-code.html',      '01', 'Claude Code って何？'],
        ['easy/02-how-claude-code-works.html',    '02', '中では何が起きているの？'],
        ['easy/03-your-first-prompt.html',        '03', 'はじめてお願いしてみる'],
        ['easy/04-explore-plan-code-commit.html', '04', '進め方の型をおぼえる'],
        ['easy/05-context-management.html',       '05', '「机の広さ」を管理する'],
        ['easy/06-claude-md.html',                '06', 'プロジェクトのメモ帳'],
        ['easy/07-subagents.html',                '07', '調べ物をおまかせする'],
        ['easy/08-skills.html',                   '08', '一度教えれば、覚えてくれる'],
        ['easy/09-mcp.html',                      '09', '外の道具とつなぐ'],
        ['easy/10-hooks.html',                    '10', '「必ず」やらせる仕組み'],
        ['easy/11-review-and-ship.html',          '11', '見直して、世に出す']
      ]
    },
    {
      id: 'ai-fluency',
      home: 'ai-fluency/index.html',
      lessons: [
        ['ai-fluency/01-introduction.html',                 '01', 'AI活用力入門'],
        ['ai-fluency/02-why-ai-fluency.html',               '02', 'なぜAI活用力が必要なのか？'],
        ['ai-fluency/03-4d-framework.html',                 '03', '4D フレームワーク'],
        ['ai-fluency/04-generative-ai-basics.html',         '04', '生成 AI の基礎'],
        ['ai-fluency/05-capabilities-limits.html',          '05', '生成 AI の能力と限界'],
        ['ai-fluency/06-delegation.html',                   '06', '委任力 (Delegation) を詳しく見る'],
        ['ai-fluency/07-project-delegation.html',           '07', 'プロジェクト計画と委任力'],
        ['ai-fluency/08-description.html',                  '08', '記述力 (Description) を詳しく見る'],
        ['ai-fluency/09-prompting-techniques.html',         '09', '効果的なプロンプト技法'],
        ['ai-fluency/10-discernment.html',                  '10', '評価力 (Discernment) を詳しく見る'],
        ['ai-fluency/11-description-discernment-loop.html', '11', '記述・評価のループ'],
        ['ai-fluency/12-diligence.html',                    '12', '倫理的責任 (Diligence) を詳しく見る'],
        ['ai-fluency/13-conclusion.html',                   '13', 'まとめ']
      ]
    },
    {
      id: 'educators',
      home: 'educators/index.html',
      lessons: [
        ['educators/01-introduction.html',       '01', '教育者のための AI Fluency 入門'],
        ['educators/02-framework-review.html',   '02', 'AI Fluency フレームワークの復習'],
        ['educators/03-course-design.html',      '03', 'コース設計と学習成果への適用'],
        ['educators/04-learning-materials.html', '04', '学習教材と課題への AI Fluency の適用']
      ]
    },
    {
      id: 'advanced',
      home: 'advanced/index.html',
      lessons: [
        ['advanced/01-what-happens-when-you-talk-to-ai.html', '01', 'AIに話しかけると何が起きているのか'],
        ['advanced/02-tokens-and-embeddings.html',            '02', 'トークンと埋め込み'],
        ['advanced/03-parametric-memory-and-context.html',    '03', 'パラメトリックメモリとコンテキスト'],
        ['advanced/04-can-you-trust-ai.html',                 '04', 'AIの答えは信じられるのか'],
        ['advanced/05-why-do-models-hallucinate.html',        '05', 'なぜAIは幻覚を起こすのか'],
        ['advanced/06-what-is-sycophancy.html',               '06', '追従性（sycophancy）とは何か'],
        ['advanced/07-why-does-bias-exist.html',              '07', 'なぜAIにバイアスが存在するのか'],
        ['advanced/08-what-does-ai-know-about-you.html',      '08', 'AIは自分について何を知っているのか'],
        ['advanced/09-diligence-statement.html',              '09', 'AIデューデリジェンス声明の書き方']
      ]
    },
    {
      id: 'github',
      home: 'github/index.html',
      lessons: [
        ['github/01-what-is-git.html',      '01', 'Git とは何か'],
        ['github/02-commit-and-main.html',  '02', 'コミットと main'],
        ['github/03-branch-and-merge.html', '03', 'ブランチとマージ'],
        ['github/04-push-and-pull.html',    '04', 'ローカル・リモートと PUSH / PULL'],
        ['github/05-conflict.html',         '05', 'コンフリクト'],
        ['github/06-development-flow.html', '06', '実際の開発フロー']
      ]
    },
    {
      id: 'cloudflare',
      home: 'cloudflare.html',
      lessons: [
        ['cloudflare.html', '01', 'Cloudflare × Claude Code']
      ]
    }
  ];

  /* 鍵 → [コース, 番号, 題] の索引。照合と表示の両方で使う */
  var INDEX = {};
  var ORDER = [];
  COURSES.forEach(function (c) {
    c.lessons.forEach(function (l) {
      INDEX[l[0]] = { course: c.id, num: l[1], title: l[2], href: l[0] };
      ORDER.push(l[0]);
    });
  });

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function readMap() {
    return safe(function () {
      return JSON.parse(localStorage.getItem(KEY_READ) || '{}') || {};
    }, {});
  }

  function writeMap(m) {
    safe(function () { localStorage.setItem(KEY_READ, JSON.stringify(m)); });
  }

  /* いま開いているページがカタログのどれかを、パスの末尾一致で決める。
     GitHub Pages のようにサイトが下位ディレクトリに置かれても効くように、
     絶対パスの前半は見ない。一致が複数あるときは長いほうを採る。 */
  function currentKey() {
    var path = safe(function () { return decodeURIComponent(location.pathname); }, '') || '';
    var best = '';
    for (var k in INDEX) {
      if (!Object.prototype.hasOwnProperty.call(INDEX, k)) continue;
      if ((path === k || path.slice(-(k.length + 1)) === '/' + k) && k.length > best.length) best = k;
    }
    return best;
  }

  function record() {
    var k = currentKey();
    if (!k) return;
    var m = readMap();
    m[k] = Date.now();
    writeMap(m);
    safe(function () { localStorage.setItem(KEY_LAST, k); });
  }

  function stats() {
    var m = readMap();
    var total = ORDER.length;
    var done = 0;
    ORDER.forEach(function (k) { if (m[k]) done++; });

    var last = safe(function () { return localStorage.getItem(KEY_LAST); }, null);
    if (last && !INDEX[last]) last = null;

    /* 次にやるレッスン＝カタログ順でまだ読んでいない最初のもの。
       全部読み終えていたら、最後に開いたところを指す（無ければ先頭）。 */
    var next = null;
    for (var i = 0; i < ORDER.length; i++) {
      if (!m[ORDER[i]]) { next = ORDER[i]; break; }
    }
    if (!next) next = last || ORDER[0];

    var per = {};
    COURSES.forEach(function (c) {
      var n = 0;
      c.lessons.forEach(function (l) { if (m[l[0]]) n++; });
      per[c.id] = { done: n, total: c.lessons.length };
    });

    return {
      read: m, total: total, done: done,
      pct: total ? Math.round(done / total * 100) : 0,
      last: last, next: next, per: per, info: INDEX
    };
  }

  function reset() {
    safe(function () { localStorage.removeItem(KEY_READ); });
    safe(function () { localStorage.removeItem(KEY_LAST); });
  }

  record();

  return { stats: stats, reset: reset, info: INDEX, courses: COURSES };
})();

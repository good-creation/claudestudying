#!/usr/bin/env node
/* 解答集（answers/index.html）の中身を、試験の問題バンクから生成して暗号化する。

   入力  assets/quiz-data.js   … window.QUIZ（標準試験・全22問）
         assets/quiz-levels.js … window.QUIZ_SETS（レベル1〜3・各10問）
   出力  answers/answers.enc.js … window.ANSWERS_ENC（AES-GCM の暗号文）

   問題バンクを書き換えたら、必ずこれを実行し直すこと。実行しないと解答集は古いまま。

     node tools/build-answers.mjs <合言葉>    # 合言葉は必須。既定値は持たない
                                             # （このリポジトリは公開なので、
                                             #   合言葉をコードにもドキュメントにも書かない）

   平文を HTML に置くと閲覧ソースから答えが読めてしまうので、本文は丸ごと
   AES-GCM で暗号化して置き、ブラウザ側（answers/unlock.js）が合言葉から
   PBKDF2 で鍵を導出して復号する。4桁の合言葉は総当たりできる強度しかないので、
   目的は「うっかり目に入らないようにする」ことであって秘匿ではない。            */
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PASSPHRASE = process.argv[2];
if (!PASSPHRASE) {
  console.error("合言葉を引数で渡してください:  node tools/build-answers.mjs <合言葉>");
  process.exit(1);
}
const ITER = 250000;

/* --- 問題バンクを読む（JS のまま評価するのでバンクと必ず一致する） --- */
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["assets/quiz-data.js", "assets/quiz-levels.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const QUIZ = sandbox.window.QUIZ;
const SETS = sandbox.window.QUIZ_SETS;

const LESSON = {
  "01": ["01-what-is-claude-code.html",      "Claude Code とは何か"],
  "02": ["02-how-claude-code-works.html",    "どう動いているのか"],
  "03": ["03-your-first-prompt.html",        "最初のプロンプトを書く"],
  "04": ["04-explore-plan-code-commit.html", "探索 → 計画 → コード → コミット"],
  "05": ["05-context-management.html",       "コンテキストを管理する"],
  "06": ["06-claude-md.html",                "CLAUDE.md ファイル"],
  "07": ["07-subagents.html",                "サブエージェントとは何か"],
  "08": ["08-skills.html",                   "スキルとは何か"],
  "09": ["09-mcp.html",                      "MCP で外部につなぐ"],
  "10": ["10-hooks.html",                    "フックで確実に実行させる"],
  "11": ["11-review-and-ship.html",          "レビューして出荷する"]
};
const TYPE = { choice: "4択", truefalse: "正誤判定", order: "並べ替え" };
const KEYS = "ABCDEFGH";

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/* 解答集は answers/ の中にあるので、レッスンへは ../ を前置する */
const srcHtml = (src) => src
  .map((k) => '<a href="../' + LESSON[k][0] + '">' + k + " " + esc(LESSON[k][1]) + "</a>")
  .join(" / ");

/* --- 1問を描く。試験ページと同じクラス（.q / .q__opts / .q__exp）を使い、
       is-done を最初から付けて解説を開いた状態にする --- */
function renderQ(q, n) {
  let opts = "";
  let answerLine = "";

  if (q.type === "choice") {
    opts = q.options.map((t, i) =>
      '<li><button type="button" disabled data-k="' + KEYS[i] + '"' +
      (i === 0 ? ' class="is-correct"' : "") + ">" + esc(t) + "</button></li>"
    ).join("");
    answerLine = esc(q.options[0]);
  } else if (q.type === "truefalse") {
    opts = ["○ 正しい", "× 誤り"].map((t, i) =>
      '<li><button type="button" disabled' +
      ((i === 0) === !!q.a ? ' class="is-correct"' : "") + ">" + esc(t) + "</button></li>"
    ).join("");
    answerLine = q.a ? "○（記述は正しい）" : "×（記述は誤り）";
  } else {
    opts = q.items.map((t, i) =>
      '<li><button type="button" disabled class="is-correct" data-pick="' + (i + 1) + '">' +
      esc(t) + "</button></li>"
    ).join("");
    answerLine = q.items.map(esc).join(" → ");
  }

  return '<article class="q is-done">' +
    '<div class="q__head">' +
      '<span class="q__n">Q' + (n < 10 ? "0" + n : n) + "</span>" +
      '<span class="q__type" data-t="' + q.type + '">' + TYPE[q.type] + "</span>" +
      '<span class="q__src">出題範囲 — ' + srcHtml(q.src) + "</span>" +
    "</div>" +
    '<p class="q__t">' + esc(q.q) + "</p>" +
    '<ul class="q__opts' +
      (q.type === "truefalse" ? " q__opts--tf" : q.type === "order" ? " q__opts--order" : "") +
    '">' + opts + "</ul>" +
    '<p class="ans__a"><b>答え</b>' + answerLine + "</p>" +
    '<div class="q__exp"><b>解説</b><p>' + esc(q.exp) + "</p></div>" +
  "</article>";
}

/* --- 1バンクを描く --- */
function renderBank(id, k, title, lead, questions) {
  const counts = { choice: 0, truefalse: 0, order: 0 };
  questions.forEach((q) => counts[q.type]++);
  return '<section class="ansset" id="' + id + '">' +
    '<div class="ansset__head">' +
      '<p class="cards__k">' + esc(k) + "</p>" +
      "<h2>" + esc(title) + "</h2>" +
      '<p class="ansset__lead">' + esc(lead) + "</p>" +
      '<ul class="qlegend">' +
        '<li><b style="color:var(--signal)">4択</b>' + counts.choice + "問</li>" +
        '<li><b style="color:var(--caution)">正誤判定</b>' + counts.truefalse + "問</li>" +
        '<li><b style="color:#1F6F5C">並べ替え</b>' + counts.order + "問</li>" +
        "<li><b>合計</b>" + questions.length + "問</li>" +
      "</ul>" +
    "</div>" +
    questions.map((q, i) => renderQ(q, i + 1)).join("") +
  "</section>";
}

const banks = [
  { id: "std", k: "標準試験 / Standard", title: "標準試験（全" + QUIZ.length + "問）",
    lead: "レッスン01〜11の理解度を確認する、既定の試験。合格ラインは80%。",
    questions: QUIZ },
  ...SETS.map((s) => ({
    id: s.id,
    k: "レベル" + s.level + " " + s.levelName + " / " + s.badge,
    title: s.title + "（全" + s.questions.length + "問）",
    lead: s.lead,
    questions: s.questions
  }))
];

const total = banks.reduce((n, b) => n + b.questions.length, 0);

const toc = '<nav class="anstoc" aria-label="バンク一覧">' +
  banks.map((b) =>
    '<a href="#' + b.id + '"><b>' + esc(b.title) + "</b><em>" + esc(b.k) + "</em></a>"
  ).join("") + "</nav>";

const body =
  '<p class="ans__intro">この解答集は <code>assets/quiz-data.js</code> と <code>assets/quiz-levels.js</code> から' +
  '<strong>自動生成</strong>しています（<code>node tools/build-answers.mjs</code>）。' +
  '出題側を書き換えたら生成し直してください。<strong>全' + total + "問</strong>。" +
  "試験では出題順も選択肢の並びも毎回シャッフルされるので、ここでの並び順は作問時の順序です。" +
  '選択肢に付いた「正解」の印と、その下の<strong>答え</strong>・<strong>解説</strong>が答え合わせの本体です。</p>' +
  toc + banks.map((b) => renderBank(b.id, b.k, b.title, b.lead, b.questions)).join("");

/* --- 暗号化（PBKDF2-SHA256 → AES-GCM-256） --- */
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", enc.encode(PASSPHRASE), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(body)));

const b64 = (u8) => Buffer.from(u8).toString("base64");
const out =
  "/* 自動生成 — 直接編集しないこと。`node tools/build-answers.mjs` で作り直す。\n" +
  "   解答集の本文を AES-GCM で暗号化したもの。合言葉は answers/unlock.js が受け取る。 */\n" +
  "window.ANSWERS_ENC = {\n" +
  '  v: 1, iter: ' + ITER + ",\n" +
  '  salt: "' + b64(salt) + '",\n' +
  '  iv: "' + b64(iv) + '",\n' +
  '  ct: "' + b64(ct) + '"\n' +
  "};\n";

writeFileSync(join(ROOT, "answers/answers.enc.js"), out, "utf8");
console.log("  ok    answers/answers.enc.js — %d問 / %dバンク / 平文 %d bytes / 暗号文 %d bytes",
  total, banks.length, enc.encode(body).length, ct.length);

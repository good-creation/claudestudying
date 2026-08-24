# Project

Anthropic 公式の Claude Code 入門コース（YouTube 動画10本 + claude.com/courses の本文）を、
日本語で再構成した**静的な学習ノートサイト**。ビルドツールなし・依存パッケージなしの素の HTML/CSS/JS。

- 全11レッスン（うち10本が動画つき、11は本文のみ）
- 本文は「自動生成字幕の英語トランスクリプト」と「公式コース本文」を突き合わせて執筆
- 図版は academy.claude.com の公式素材を `img/` にローカル保存（外部参照しない）

# Commands

ローカルで開く（**ポートを使い回さないこと** — 過去プロジェクトの Service Worker が
同一オリジンに残っていると別サイトが表示される）:

```bash
python3 -m http.server 8791 --directory "$(pwd)"
open http://localhost:8791/
```

リンク・画像・タイムライン整合性のチェック:

```bash
python3 tools/validate.py
```

# Structure

```
index.html                  目次 + 用語インデックス
NN-<slug>.html              レッスンページ（01〜11）
assets/site.css             全ページ共通のスタイル（ここ以外に CSS を書かない）
assets/site.js              タイムライン再生ヘッドのスクロール追従
img/*.jpg                   公式図版（ページから相対パスで参照）
tools/validate.py           リンク・画像・タイムライン整合性チェック
```

# レッスンページの構造

各ページは**動画の実タイムコードを構造の軸**にしている。番号（01/02/03…）ではなく
時間が順序を表すので、新しいセクションを足すときは必ず動画内の実際の秒数を使う。

```html
<main class="doc shell" data-duration="191">     <!-- 動画の総秒数 -->
  <section class="sec" data-start="18" data-label="探索と計画">
    <div class="sec__mark"><div>
      <span class="sec__t">0:18</span>            <!-- data-start と一致させる -->
      <span class="sec__kind">段 1–2</span>
    </div></div>
    <div class="sec__body"> … </div>
  </section>
```

ヒーローのタイムライン `.tl__tick` は `left: (data-start / data-duration * 100)%` に置く。
**`.sec` の数と `.tl__tick` の数は必ず一致させる**（validate.py が検査する）。

`assets/site.js` は `[data-duration]` が無いページでは何もしない（11 はタイムラインなし）。

# 執筆の方針

- **動画が言っていることと、こちらの補足を混ぜない。** 補足は `.tip` / `.warn` ブロックに入れる
- 原文トランスクリプトは `<details class="tr">` に**手を加えず**掲載する
  （`claw.md` `contacts` `Cloud code` などの音声認識ミスもそのまま。日本語本文側では正しい語に直す）
- 図版の `figcaption` には、画面に実際に写っている文字列だけを書く（推測で補わない）
- レッスン間の相互リンクを積極的に張る（概念が別レッスンで再登場するのがこのコースの特徴）

# デザイン

製図フィルム調のクールグレー地 + ウルトラマリン。注意喚起にだけ焦げ金を使う。
**色は必ず `assets/site.css` の `:root` トークン経由で参照する**（生の16進数を各ページに書かない）。

| トークン | 用途 |
|---|---|
| `--ground` `--paper` | 地色・カード地 |
| `--ink` `--ink-2` | 本文・副次テキスト |
| `--signal` | タイムライン、リンク、強調（ウルトラマリン） |
| `--caution` `--caution-bg` | 警告のみ。他の用途に流用しない |

書体は3役 — 見出し=Zen Old Mincho / 本文=Zen Kaku Gothic New / タイムコード・端末=JetBrains Mono。
いずれも macOS のヒラギノ等にフォールバックするので**オフラインでも崩れない**。

# 新しいレッスンを追加するとき

1. 動画の尺・公開日・再生数と、タイムコード付きトランスクリプトを取得する
2. `NN-<slug>.html` を既存ページからコピーして作る
3. `index.html` の `.lessons` に1行、`.gloss` に必要なら用語を追加
4. 前後ページの `.pager` リンクを更新
5. 全ページの `<nav>` を更新（`tools/rebuild-nav.py` が一括で書き換える）
6. `python3 tools/validate.py` を通す

**IMPORTANT**
新しい CSS コンポーネントを足す前に、`assets/site.css` に流用できるものが無いか必ず確認すること
（`.cards` `.modes` `.acts` `.steps` `.chips` `.cmp` `.tip` `.warn` `.prompt` `.fig` が既にある）。

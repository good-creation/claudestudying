/* 用語ツールチップ：本文中の専門用語に下線を引き、ホバー／フォーカスで平易な説明を出す。
   説明文は「その言葉を初めて見た人が、その場で読み進められる」ことだけを目的に書く。 */
(function(){

  /* [表記, 併記ラベル（英語など。無ければ ''）, やさしい説明] */
  var TERMS = [
    /* --- エージェントの基本 --- */
    ['エージェンティックループ','Agentic loop','AI が「指示を読む → 必要な材料を集める → 実際に手を動かす → 結果を確かめる」を、終わるまで自分で何周も回す進め方。'],
    ['AIエージェント','AI agent','文章を返すだけでなく、自分でツールを使って目的の作業を進めるところまでやる AI。'],
    ['エージェント','Agent','自分でツールを使い、目的を達成するまで作業を続ける AI のこと。'],
    ['コンテキストウィンドウ','Context window','AI が一度に覚えていられる文章の量。作業机の広さのようなもので、あふれると古い話は要約に置き換わる。'],
    ['コンテキスト','Context','いま AI が読んでいる材料すべて。あなたの指示・ファイルの中身・コマンドの実行結果などが入る。'],
    ['トークン','Token','AI が文章を数えるときの単位。日本語なら 1 文字前後、英語なら 1 単語前後。料金や上限はこれで計算する。'],
    ['プロンプト','Prompt','AI への指示文のこと。'],
    ['ツール','Tool','AI が外の世界に触るための道具。ファイルを読む、コマンドを実行する、Web を検索する、といった動作の実体。'],
    ['サブエージェント','Subagent','本体とは別の作業机を持つ、調べ物担当の AI。細かい作業は向こうで済ませ、要約だけが本体に返る。'],
    ['スキル','Skill','「どんなときに使うか」を書いた手順書。ふだんは名前と説明だけが置かれ、必要になった時に全文が読み込まれる。'],
    ['フック','Hooks','決まった場面（ツールを使う前後、セッションの開始時など）で必ず自動実行されるコマンド。AI の判断に左右されない。'],
    ['PreToolUse','',  'ツールを実行する直前に走るフック。危ない操作をここで止められる。'],
    ['PostToolUse','', 'ツールを実行した直後に走るフック。整形やテストを自動で走らせるのに使う。'],
    ['Model Context Protocol','MCP','AI を外部のサービスやデータベースにつなぐための共通規格。差し込み口の形をそろえた USB のようなもの。'],
    ['MCPサーバー','MCP server','MCP の規格にそって、AI に機能やデータを渡す側のプログラム。'],
    ['MCP','Model Context Protocol','AI を外部のサービスやデータベースにつなぐための共通規格。差し込み口の形をそろえた USB のようなもの。'],
    ['プランモード','Plan mode','読むだけで書き換えはせず、「これからこうする」という計画だけを出させるモード。'],
    ['権限モード','Permission modes','AI にどこまで任せるかの設定。毎回確認する／自動で承認する／計画だけ立てる、を切り替える。'],
    ['CLAUDE.md','',  'プロジェクトの決まりごとを書いておくメモ。セッションのたびに自動で読まれ、指示文の先頭に足される。'],
    ['SKILL.md','',   'スキルの本体になるファイル。冒頭に名前と説明、続けて手順を書く。'],
    ['スラッシュコマンド','Slash command','「/」から始まる短い呼び出し。よく使う操作に名前を付けておくもの。'],
    ['セッション','Session','起動してから終わるまでの、ひとつながりのやりとり。閉じると作業机の中身は消える。'],
    ['フィードバックループ','Feedback loop','出す → 確かめる → 直して出し直す、を短く繰り返す進め方。'],
    ['ワークフロー','Workflow','ある仕事を片付けるまでの、決まった一連の手順。'],

    /* --- 開発まわり --- */
    ['コードベース','Codebase','そのプロジェクトのソースコード全体のこと。'],
    ['リポジトリ','Repository','コードと、その変更履歴をまとめて置いておく場所。'],
    ['コミットメッセージ','Commit message','その変更で何を、なぜ変えたのかを書き残す一文。'],
    ['コミット','Commit','変更に説明をつけて、履歴のひと区切りとして保存すること。'],
    ['プルリクエスト','Pull request','「この変更を取り込んでほしい」という提案。レビューを受けてから本体に反映する。'],
    ['コードレビュー','Code review','他の人（や AI）が変更を読んで、問題がないか確かめること。'],
    ['プッシュ','Push','手元に貯めたコミットを、ネット上のリポジトリへ送ること。'],
    ['GitHub','',     'コードの変更履歴をネット上で共有し、レビューやリリースまで行う場所。'],
    ['CLI','Command line interface','マウスではなく、文字を打ち込んで操作する道具のこと。'],
    ['ターミナル','Terminal','コマンドを文字で打ち込むための画面。'],
    ['Markdown','',   '記号だけで見出しや箇条書きを表す、素のテキストの書き方。「# 見出し」「- 箇条書き」など。'],
    ['フロントマター','Front matter','ファイルの冒頭に置く設定欄。「---」で挟んで、名前や説明を書く。'],
    ['YAML','',       '字下げで階層を表す、設定を書くための書式。'],
    ['API','',        'ソフト同士が決まった形でやり取りするための窓口。'],
    ['大規模言語モデル','LLM','大量の文章で訓練し、次に来る言葉を予測することで文章を作る AI。'],
    ['LLM','大規模言語モデル','大量の文章で訓練し、次に来る言葉を予測することで文章を作る AI。'],
    ['生成AI','Generative AI','学習した内容をもとに、文章や画像を新しく作り出す AI。'],
    ['ハルシネーション','Hallucination','AI がもっともらしい誤りを、自信たっぷりに書いてしまう現象。'],
    ['ファインチューニング','Fine-tuning','できあがった AI に追加で学習させ、特定の用途に合わせて寄せること。'],
    ['学習データ','Training data','AI を訓練するために読ませた、大量の文章や画像。'],
    ['環境変数','Environment variable','プログラムに外から渡す設定値。パスワードなどをコードに書かずに済ませるために使う。'],
    ['データベース','Database','データをまとめて保存し、条件を指定して取り出せるようにしたしくみ。'],
    ['ディレクトリ','Directory','フォルダのこと。'],
    ['リファクタリング','Refactoring','動きは変えずに、コードを読みやすく整理し直すこと。'],
    ['デプロイ','Deploy','作ったものを、実際に動く場所へ配って公開すること。'],
    ['ローカル','Local','ネット上ではなく、自分のパソコンの中のこと。'],
    ['スコープ','Scope','その決まりや設定が効く範囲のこと。'],
    ['stdio','',      '手元で起動したプログラムと、標準入出力を通じて直接やり取りする接続方式。'],
    ['HTTP','',       'Web 上でデータをやり取りするときの決まりごと。'],
    ['DNS','',        'ドメイン名を、実際のサーバーの住所に変換するしくみ。ネットの電話帳にあたる。'],

    /* --- Cloudflare（付録） --- */
    ['Cloudflare Workers','', 'Cloudflare の世界中のサーバー上で動く小さなプログラム。自分でサーバーを用意しなくてよい。'],
    ['Cloudflare Pages','',   '作った Web サイトを Cloudflare 上で公開するしくみ。'],
    ['Workers','Cloudflare Workers','Cloudflare の世界中のサーバー上で動く小さなプログラム。自分でサーバーを用意しなくてよい。'],
    ['Wrangler','',   'Cloudflare Workers を手元から操作するためのコマンド道具。'],
    ['AI Gateway','', 'AI へのリクエストをまとめて通す中継地点。記録・制限・使い回しをここで行える。'],
    ['D1','',         'Cloudflare が用意している SQL データベース。'],
    ['R2','',         'Cloudflare のファイル置き場。画像や動画などをまとめて保管する。'],

    /* --- AI活用力（AI Fluency） --- */
    ['4Dフレームワーク','4D framework','AI との協働を「委任・記述・評価・誠実」の 4 つの D で捉える枠組み。'],
    ['委任力','Delegation','何を自分でやり、何を AI に任せるかを見極める力。'],
    ['記述力','Description','望むものを、AI に伝わる言葉で具体的に説明する力。'],
    ['評価力','Discernment','返ってきた結果の質を見抜き、鵜呑みにしない力。'],
    ['Delegation','委任','何を自分でやり、何を AI に任せるかを見極めること。'],
    ['Description','記述','望むものを、AI に伝わる言葉で具体的に説明すること。'],
    ['Discernment','評価','返ってきた結果の質を見抜き、鵜呑みにしないこと。'],
    ['Diligence','誠実','AI の使い方に責任を持つこと。出典を確かめ、AI を使ったことを隠さない。'],
    ['倫理的責任','Diligence','AI を使う責任を自分で引き受けること。どう使ったかを明かし、内容の正しさを自分の目で確かめる。'],
    ['ナレッジカットオフ','Knowledge cutoff','AI が学習した情報の締め切り日。それより後に起きたことは知らない。'],
    ['事前学習','Pre-training','大量の文章を読ませて、言葉の一般的な使い方を身につけさせる最初の学習段階。'],
    ['Automation','自動化','手順ごと AI に任せてしまい、こちらは結果を受け取る使い方。'],
    ['Augmentation','拡張','人と AI が行き来しながら、一緒に考えて進める使い方。'],
    ['Agency','自律','AI に役割や振る舞い方を与えて、自分で判断させる使い方。']
  ];

  /* 用語を入れない場所。コード・原文トランスクリプト・ナビ・用語集そのものなど */
  var SKIP_SEL = 'a,code,pre,kbd,button,summary,h1,label,input,textarea,select,' +
                 '.tr,.gloss,.chrome,.tl,.rail,.pager,.foot,.meta,.hero__title,' +
                 '.examlock,.quizbar,.term,.termtip';
  var SKIP_TAG = {SCRIPT:1,STYLE:1,NOSCRIPT:1,CODE:1,PRE:1,KBD:1,A:1,BUTTON:1,TEXTAREA:1};
  var MAX_PER_TERM = 3;   /* 1ページで同じ語に何度も下線を引かない */

  var byLen = TERMS.slice().sort(function(a,b){ return b[0].length - a[0].length; });
  var DEF = {};
  byLen.forEach(function(t){ DEF[t[0]] = t; });
  var RE = new RegExp(byLen.map(function(t){
    return t[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }).join('|'), 'g');

  var W = /[A-Za-z0-9]/;
  function boundaryOK(text, start, end, word){
    /* 英数字で始まる／終わる語は、単語の途中で拾わない（PR が PROJECT に当たらないように） */
    if (W.test(word[0]) && start > 0 && W.test(text[start-1])) return false;
    if (W.test(word[word.length-1]) && end < text.length && W.test(text[end])) return false;
    return true;
  }

  var used = {};
  var busy = false;

  function skipped(el){
    for (var n = el; n && n !== document.body; n = n.parentElement){
      if (SKIP_TAG[n.tagName]) return true;
      if (n.matches && n.matches(SKIP_SEL)) return true;
    }
    return false;
  }

  function annotate(root){
    if (!root || root.nodeType !== 1) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node){
        if (!node.nodeValue || node.nodeValue.length < 2) return NodeFilter.FILTER_REJECT;
        if (!/[^\s]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return skipped(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var targets = [], n;
    while ((n = walker.nextNode())) targets.push(n);

    targets.forEach(function(node){
      var text = node.nodeValue, m, last = 0, frag = null;
      RE.lastIndex = 0;
      while ((m = RE.exec(text))){
        var word = m[0], start = m.index, end = start + word.length;
        if (!boundaryOK(text, start, end, word)) continue;
        if ((used[word] || 0) >= MAX_PER_TERM) continue;
        used[word] = (used[word] || 0) + 1;
        frag = frag || document.createDocumentFragment();
        if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
        var t = DEF[word];
        var span = document.createElement('span');
        span.className = 'term';
        span.tabIndex = 0;
        span.setAttribute('role','button');
        span.setAttribute('aria-label', word + ' — ' + t[2]);
        span.dataset.def = t[2];
        span.dataset.en = t[1] || '';
        span.textContent = word;
        frag.appendChild(span);
        last = end;
      }
      if (frag){
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  /* ---- 吹き出し ---- */
  var tip = document.createElement('div');
  tip.className = 'termtip';
  tip.id = 'termtip';
  tip.setAttribute('role','tooltip');
  tip.hidden = true;
  tip.innerHTML = '<b class="termtip__w"></b><i class="termtip__en"></i><p class="termtip__d"></p>';
  var tw = tip.querySelector('.termtip__w'), te = tip.querySelector('.termtip__en'), td = tip.querySelector('.termtip__d');
  var open = null;

  function show(el){
    if (open === el) return;
    open = el;
    tw.textContent = el.textContent;
    var en = el.dataset.en || '';
    te.textContent = en;
    te.style.display = en ? '' : 'none';
    te.classList.toggle('is-ja', /[^\x00-\x7F]/.test(en));   /* 日本語の併記は等幅・大文字組みにしない */
    td.textContent = el.dataset.def;
    tip.hidden = false;
    el.setAttribute('aria-describedby','termtip');
    el.classList.add('is-open');
    place(el);
  }
  function hide(){
    if (!open) return;
    open.removeAttribute('aria-describedby');
    open.classList.remove('is-open');
    open = null;
    tip.hidden = true;
  }
  function place(el){
    var r = el.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px';
    var t = tip.getBoundingClientRect();
    var pad = 10;
    var left = Math.min(Math.max(pad, r.left + r.width/2 - t.width/2), innerWidth - t.width - pad);
    var top = r.top - t.height - 10;
    tip.classList.toggle('is-below', top < pad);
    if (top < pad) top = r.bottom + 10;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  function bind(){
    document.addEventListener('mouseover', function(e){
      var el = e.target.closest && e.target.closest('.term');
      if (el) show(el); else if (open && !tip.contains(e.target)) hide();
    });
    document.addEventListener('focusin', function(e){
      var el = e.target.closest && e.target.closest('.term');
      if (el) show(el); else hide();
    });
    document.addEventListener('click', function(e){
      var el = e.target.closest && e.target.closest('.term');
      if (el){ e.preventDefault(); (open === el) ? hide() : show(el); }   /* スマホ用：タップで開閉 */
      else if (!tip.contains(e.target)) hide();
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') hide(); });
    addEventListener('scroll', function(){ if (open) place(open); }, {passive:true});
    addEventListener('resize', hide);
  }

  function run(){
    document.body.appendChild(tip);
    busy = true;
    annotate(document.body);
    busy = false;
    bind();

    /* 確認問題のように後から差し込まれる本文にも同じ処理をかける */
    if (window.MutationObserver){
      var mo = new MutationObserver(function(list){
        if (busy) return;
        var roots = [];
        list.forEach(function(mu){
          Array.prototype.forEach.call(mu.addedNodes, function(nd){
            if (nd.nodeType === 1 && !nd.classList.contains('term') && !nd.classList.contains('termtip')) roots.push(nd);
          });
        });
        if (!roots.length) return;
        busy = true;
        used = {};            /* 後から差し込まれた塊には、その塊ぶんの上限を与える */
        roots.forEach(annotate);
        busy = false;
      });
      mo.observe(document.body, {childList:true, subtree:true});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

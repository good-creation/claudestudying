/* 確認問題のレンダリングと採点。
   問題の並び順と選択肢の並び順は、読み込みのたびにシャッフルされる。 */
(function(){
  var host = document.getElementById('quizList');
  if (!host || !window.QUIZ) return;

  var LESSON = {
    "01":["01-what-is-claude-code.html","Claude Code とは何か"],
    "02":["02-how-claude-code-works.html","どう動いているのか"],
    "03":["03-your-first-prompt.html","最初のプロンプトを書く"],
    "04":["04-explore-plan-code-commit.html","探索 → 計画 → コード → コミット"],
    "05":["05-context-management.html","コンテキストを管理する"],
    "06":["06-claude-md.html","CLAUDE.md ファイル"],
    "07":["07-subagents.html","サブエージェントとは何か"],
    "08":["08-skills.html","スキルとは何か"],
    "09":["09-mcp.html","MCP で外部につなぐ"],
    "10":["10-hooks.html","フックで確実に実行させる"],
    "11":["11-review-and-ship.html","Review & Ship"]
  };
  var TYPE = {choice:"4択", truefalse:"正誤判定", order:"並べ替え"};
  var KEYS = "ABCDEFGH";

  var PASS = 0.8;                       // 合格ライン 80%

  var bar     = document.querySelector('.quizbar');
  var elDone  = document.getElementById('qDone');
  var elRight = document.getElementById('qRight');
  var elTotal = document.getElementById('qTotal');
  var elNeed  = document.getElementById('qNeed');
  var elVerd  = document.getElementById('qVerdict');
  var elReset = document.getElementById('qReset');
  var elQuit  = document.getElementById('qQuit');
  var result  = document.getElementById('quizResult');
  var answered = 0, correct = 0, total = 0, need = 0, missed = [], finished = false;
  var smooth = !matchMedia('(prefers-reduced-motion:reduce)').matches;

  function shuffle(a){
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }
  function srcHtml(src){
    return src.map(function(k){
      return '<a href="' + LESSON[k][0] + '">' + k + ' ' + esc(LESSON[k][1]) + '</a>';
    }).join(' / ');
  }
  function score(ok, q, n){
    answered++;
    if (ok) correct++; else missed.push({n:n, q:q});
    elDone.textContent = answered;
    elRight.textContent = correct;

    // 合否が確定した時点でバーに反映する（残り全問正解でも届かない／すでに到達した）
    var wrong = answered - correct;
    if (correct >= need)                 setVerdict('pass');
    else if (wrong > total - need)       setVerdict('fail');

    if (answered === total) showResult(false);
  }

  function setVerdict(state){          // 'pass' | 'fail' | 'abort'
    bar.classList.remove('is-pass','is-fail');
    if (state === 'pass') bar.classList.add('is-pass');
    if (state === 'fail') bar.classList.add('is-fail');
    elVerd.textContent = {pass:'合格', fail:'不合格', abort:'中断'}[state];
  }

  function showResult(aborted){
    if (finished) return;
    finished = true;
    bar.classList.add('is-over');

    var pct   = Math.round(correct / total * 100);
    var pass  = correct >= need;
    var state = pass ? 'pass' : (aborted ? 'abort' : 'fail');
    var label = {pass:'合格', fail:'不合格', abort:'中断'}[state];
    setVerdict(state);

    // 間違えた問題の出題範囲レッスンを重複なく集める
    var seen = {}, weak = [];
    missed.forEach(function(m){
      m.q.src.forEach(function(k){
        if (!seen[k]) { seen[k] = 1; weak.push(k); }
      });
    });
    weak.sort();

    result.className = 'qresult is-on is-' + state;
    result.innerHTML =
      '<img class="clawd clawd--md" src="img/clawd.png" alt="" aria-hidden="true" style="margin-bottom:18px">' +
      '<p class="qresult__k">Result — 合格ライン ' + Math.round(PASS * 100) + '%</p>' +
      '<p class="qresult__v">' + label + '</p>' +
      '<p class="qresult__s">正解 <b>' + correct + '</b> / ' + total + '　（' + pct + '%）　' +
        '合格に必要 ' + need + '問' +
        (aborted ? '　·　未回答 ' + (total - answered) + '問' : '') + '</p>' +
      '<div class="qresult__bar">' +
        '<div class="qresult__fill" style="width:' + pct + '%"></div>' +
        '<div class="qresult__mark"><span>合格ライン ' + Math.round(PASS * 100) + '%</span></div>' +
      '</div>' +
      '<p class="qresult__msg">' + (
        state === 'pass'  ? '合格ラインを超えています。取りこぼした問題があれば、下のレッスンだけ読み直しておくと確実です。' :
        state === 'abort' ? '途中で終了しました。合格には残り <strong>' + Math.max(0, need - correct) + '問</strong>の正解が必要でした。続きから再開する機能はないため、やり直す場合は最初からになります。' :
                            'あと <strong>' + (need - correct) + '問</strong>で合格ラインでした。下のレッスンを読み直してから、もう一度挑戦してください。') + '</p>' +
      (weak.length
        ? '<ul class="qresult__weak">' + weak.map(function(k){
            return '<li>復習 → <a href="' + LESSON[k][0] + '">' + k + ' ' + esc(LESSON[k][1]) + '</a></li>';
          }).join('') + '</ul>'
        : '<ul class="qresult__weak"><li>' +
            (answered === 0 ? '1問も回答していません。' : '全問正解です。復習の必要はありません。') +
          '</li></ul>') +
      '<div class="qresult__acts">' +
        '<button type="button" class="qresult__again">シャッフルしてもう一度</button>' +
        '<a class="qresult__link" href="index.html">目次に戻る</a>' +
        '<a class="qresult__link" href="summary.html">まとめを読む</a>' +
      '</div>';

    if (window.EXAM && window.EXAM.isActive()) {
      var lv = window.EXAM.leaves();
      result.querySelector('.qresult__s').insertAdjacentHTML('beforeend',
        '　·　離席 ' + lv + '回');
      window.EXAM.finish();
    }

    result.querySelector('.qresult__again').addEventListener('click', restart);
    result.scrollIntoView({behavior: smooth ? 'smooth' : 'auto', block:'center'});
  }

  function frame(q, n, bodyHtml){
    var el = document.createElement('article');
    el.className = 'q';
    el.id = 'q' + n;
    el.innerHTML =
      '<div class="q__head">' +
        '<span class="q__n">Q' + (n < 10 ? '0' + n : n) + '</span>' +
        '<span class="q__type" data-t="' + q.type + '">' + TYPE[q.type] + '</span>' +
        '<span class="q__src">出題範囲 — ' + srcHtml(q.src) + '</span>' +
      '</div>' +
      '<p class="q__t">' + esc(q.q) + '</p>' +
      bodyHtml +
      '<div class="q__exp"><b>解説</b><p>' + esc(q.exp) + '</p></div>';
    return el;
  }

  /* --- 4択 / 正誤判定 --- */
  function buildPick(q, n){
    var opts, tf = q.type === 'truefalse';
    if (tf) {
      opts = [{t:'○　正しい', ok:q.a === true}, {t:'×　誤り', ok:q.a === false}];
    } else {
      opts = shuffle(q.options.map(function(t, i){ return {t:t, ok:i === 0}; }));
    }
    var lis = opts.map(function(o, i){
      return '<li><button type="button" data-k="' + KEYS[i] + '">' + esc(o.t) + '</button></li>';
    }).join('');
    var el = frame(q, n, '<ul class="q__opts' + (tf ? ' q__opts--tf' : '') + '">' + lis + '</ul>');

    var btns = [].slice.call(el.querySelectorAll('button'));
    btns.forEach(function(b, i){
      b.addEventListener('click', function(){
        if (el.classList.contains('is-done')) return;
        el.classList.add('is-done');
        btns.forEach(function(other, j){
          other.disabled = true;
          if (opts[j].ok) other.classList.add('is-correct');
          else if (j === i) other.classList.add('is-wrong');
        });
        score(opts[i].ok, q, n);
      });
    });
    return el;
  }

  /* --- 並べ替え --- */
  function buildOrder(q, n){
    var shown = shuffle(q.items);
    var lis = shown.map(function(t, i){
      return '<li><button type="button" data-k="' + KEYS[i] + '">' + esc(t) + '</button></li>';
    }).join('');
    var el = frame(q, n,
      '<p class="q__hint">正しいと思う順にクリックしてください（全 ' + q.items.length + ' 項目）。</p>' +
      '<ul class="q__opts q__opts--order">' + lis + '</ul>' +
      '<button type="button" class="q__undo">選び直す</button>');

    var btns = [].slice.call(el.querySelectorAll('.q__opts button'));
    var undo = el.querySelector('.q__undo');
    var picks = [];

    function reset(){
      picks = [];
      btns.forEach(function(b){
        b.classList.remove('is-picked','is-correct','is-wrong');
        b.removeAttribute('data-pick');
      });
    }
    undo.addEventListener('click', function(){ if (!el.classList.contains('is-done')) reset(); });

    btns.forEach(function(b){
      b.addEventListener('click', function(){
        if (el.classList.contains('is-done') || b.classList.contains('is-picked')) return;
        picks.push(b);
        b.classList.add('is-picked');
        b.setAttribute('data-pick', picks.length);

        if (picks.length !== q.items.length) return;
        el.classList.add('is-done');
        var ok = true;
        picks.forEach(function(p, i){
          var hit = p.textContent === q.items[i];
          p.classList.remove('is-picked');
          p.classList.add(hit ? 'is-correct' : 'is-wrong');
          if (!hit) ok = false;
        });
        btns.forEach(function(x){ x.disabled = true; });
        if (!ok) {
          var right = q.items.map(function(t, i){ return (i + 1) + '. ' + t; }).join(' → ');
          el.querySelector('.q__exp p').insertAdjacentHTML('beforebegin',
            '<p style="margin:0 0 10px;font-size:14px;color:var(--caution);font-weight:700">正しい順序 — ' + esc(right) + '</p>');
        }
        score(ok, q, n);
      });
    });
    return el;
  }

  function render(){
    host.innerHTML = '';
    result.className = 'qresult';
    result.innerHTML = '';
    answered = 0; correct = 0; missed = []; finished = false;
    bar.classList.remove('is-pass','is-fail','is-over');
    elVerd.textContent = '判定前';
    elDone.textContent = 0; elRight.textContent = 0;

    var qs = shuffle(window.QUIZ);
    total = qs.length;
    need  = Math.ceil(total * PASS);
    elTotal.textContent = total;
    elNeed.textContent  = need;

    qs.forEach(function(q, i){
      host.appendChild(q.type === 'order' ? buildOrder(q, i + 1) : buildPick(q, i + 1));
    });
  }

  function restart(){
    render();
    host.scrollIntoView({behavior: smooth ? 'smooth' : 'auto', block:'start'});
  }

  elQuit.addEventListener('click', function(){
    if (finished) return;
    var left = total - answered;
    var msg = left
      ? '未回答が ' + left + '問あります。ここで採点して終了しますか。\n（未回答は不正解として扱われます）'
      : '採点して終了しますか。';
    if (!confirm(msg)) return;
    showResult(true);
  });

  elReset.addEventListener('click', restart);

  render();
})();

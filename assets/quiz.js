/* 試験のレンダリングと採点。
   問題の並び順と選択肢の並び順は、読み込みのたびにシャッフルされる。
   解答は選び直せる。正誤・得点・解説は採点操作（採点する / ここまでで採点する）を
   押すまで一切表示しない。 */
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

  var bar       = document.querySelector('.quizbar');
  var elDone    = document.getElementById('qDone');
  var elRight   = document.getElementById('qRight');
  var elTotal   = document.getElementById('qTotal');
  var elNeed    = document.getElementById('qNeed');
  var elVerd    = document.getElementById('qVerdict');
  var elScore   = document.getElementById('qScoreLine');
  var elBank    = document.getElementById('qBankLabel');
  var elSubmit  = document.getElementById('qSubmit');
  var elReset   = document.getElementById('qReset');
  var elQuit    = document.getElementById('qQuit');
  var bankHost  = document.getElementById('bankCards');
  var result    = document.getElementById('quizResult');

  var SETS = Array.isArray(window.QUIZ_SETS) ? window.QUIZ_SETS : [];
  var SETS_BY_ID = {};
  SETS.forEach(function(s){ SETS_BY_ID[s.id] = s; });

  var currentBank = null;               // null = 既定（window.QUIZ）。それ以外は QUIZ_SETS の要素
  var states = [];                      // render() のたびに作り直す、各問題の {isAnswered, grade}
  var total = 0, need = 0, correct = 0, missed = [], finished = false;
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
  function rankOf(pct){
    if (pct >= 100) return 'S';
    if (pct >= 90)  return 'A';
    if (pct >= 80)  return 'B';
    return 'C';
  }

  /* --- 出題バンクの選択 --- */
  function activeQuestions(){
    return currentBank ? currentBank.questions : window.QUIZ;
  }
  function bankLabel(b){
    return b ? (b.title + ' ' + b.levelName + ' — ' + b.badge) : '標準試験（全問）';
  }
  function updateBankLabel(){
    if (elBank) elBank.textContent = '（' + bankLabel(currentBank) + '）';
  }
  function buildBankCard(set){
    var el = document.createElement('article');
    el.className = 'bankcard';
    el.setAttribute('data-bank', set.id);
    el.setAttribute('role', 'radio');
    el.setAttribute('aria-checked', 'false');
    var n = (set.questions || []).length;
    if (!n) {
      el.classList.add('is-empty');
      el.setAttribute('aria-disabled', 'true');
    } else {
      el.setAttribute('tabindex', '0');
    }
    el.innerHTML =
      '<p class="cards__k">レベル' + esc(set.level) + ' ' + esc(set.levelName) +
        ' <span class="bankcard__badge">' + esc(set.badge) + '</span></p>' +
      '<h3>' + esc(set.title) + '</h3>' +
      '<p>' + esc(set.lead) + '</p>' +
      '<p class="bankcard__n">' + (n ? n + '問' : '準備中') + '</p>';
    return el;
  }
  function selectBank(id){
    var next = id ? (SETS_BY_ID[id] || null) : null;
    if (id && !next) return;                 // 不明な id は無視
    if (next && !(next.questions && next.questions.length)) return; // 未収録のバンクは選べない
    currentBank = next;
    if (bankHost) {
      [].slice.call(bankHost.children).forEach(function(card){
        var on = (card.getAttribute('data-bank') || '') === (id || '');
        card.classList.toggle('is-selected', on);
        card.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    render();
  }
  function buildBankUI(){
    if (!bankHost) return;
    SETS.forEach(function(set){
      bankHost.appendChild(buildBankCard(set));
    });
    bankHost.addEventListener('click', function(e){
      var card = e.target.closest ? e.target.closest('.bankcard') : null;
      if (!card || card.classList.contains('is-empty')) return;
      selectBank(card.getAttribute('data-bank') || '');
    });
    bankHost.addEventListener('keydown', function(e){
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest ? e.target.closest('.bankcard') : null;
      if (!card || card.classList.contains('is-empty')) return;
      e.preventDefault();
      selectBank(card.getAttribute('data-bank') || '');
    });
  }

  /* --- 進捗（採点前は得点・合否を出さない） --- */
  function updateProgress(){
    var answered = states.filter(function(s){ return s.isAnswered(); }).length;
    elDone.textContent = answered;
    elSubmit.disabled = finished || answered < total;
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
    if (elScore) elScore.hidden = false;
    elSubmit.disabled = true;

    correct = 0; missed = [];
    states.forEach(function(s){
      var g = s.grade();
      if (g.ok) correct++; else missed.push({n:s.n, q:s.q});
    });
    elRight.textContent = correct;

    var pct   = total ? Math.round(correct / total * 100) : 0;
    var pass  = correct >= need;
    var state = pass ? 'pass' : (aborted ? 'abort' : 'fail');
    var label = {pass:'合格', fail:'不合格', abort:'中断'}[state];
    var rank  = rankOf(pct);
    setVerdict(state);

    var answered = states.filter(function(s){ return s.isAnswered(); }).length;

    // 間違えた問題の出題範囲レッスンを重複なく集める
    var seen = {}, weak = [];
    missed.forEach(function(m){
      m.q.src.forEach(function(k){
        if (!seen[k]) { seen[k] = 1; weak.push(k); }
      });
    });
    weak.sort();

    var levelHtml = currentBank
      ? '<p class="qresult__level">' + esc(currentBank.title) + ' ' + esc(currentBank.levelName) +
          ' — ' + esc(currentBank.badge) + '</p>'
      : '';

    result.className = 'qresult is-on is-' + state;
    result.innerHTML =
      '<img class="clawd clawd--md" src="img/clawd.png" alt="" aria-hidden="true" style="margin-bottom:18px">' +
      levelHtml +
      '<p class="qresult__k">Result — 合格ライン ' + Math.round(PASS * 100) + '%</p>' +
      '<p class="qresult__v">' + label +
        '<span class="qresult__rank" data-r="' + rank + '">ランク ' + rank + '</span></p>' +
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

    var exam = !!(window.EXAM && window.EXAM.isActive());
    var leaves = exam ? window.EXAM.leaves() : 0;
    if (exam) {
      result.querySelector('.qresult__s').insertAdjacentHTML('beforeend',
        '　·　離席 ' + leaves + '回');
      window.EXAM.finish();
    }

    /* 修了証メール。送り先が未入力なら何も送らず、その旨だけ表示する */
    if (window.RESULTMAIL) {
      var mail = document.createElement('div');
      mail.className = 'qmail';
      result.querySelector('.qresult__acts').insertAdjacentElement('beforebegin', mail);
      window.RESULTMAIL.deliver({
        total: total, correct: correct, need: need,
        passLine: Math.round(PASS * 100),
        state: state, mode: exam ? 'exam' : 'practice',
        leaves: leaves, weak: weak,
        rank: rank || '',
        bank: (currentBank && currentBank.id) ? String(currentBank.id) : ''
      }, mail);
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

  /* --- 4択 / 正誤判定 ---
     選ぶと「選ばれている」状態になるだけ。正誤の色付け・解説は採点まで出さない。
     選び直しは自由（disabled にしない）。 */
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
    var selected = -1;
    btns.forEach(function(b, i){
      b.addEventListener('click', function(){
        if (el.classList.contains('is-done')) return;
        selected = i;
        btns.forEach(function(other, j){ other.classList.toggle('is-picked', j === i); });
        updateProgress();
      });
    });

    return {
      el: el, q: q, n: n,
      isAnswered: function(){ return selected !== -1; },
      grade: function(){
        el.classList.add('is-done');
        var ok = selected !== -1 && opts[selected].ok;
        btns.forEach(function(b, i){
          b.disabled = true;
          if (opts[i].ok) b.classList.add('is-correct');
          else if (i === selected) b.classList.add('is-wrong');
        });
        return { ok: ok };
      }
    };
  }

  /* --- 並べ替え ---
     全項目をクリックし終えても、採点前は判定しない。「選び直す」はいつでも使える。 */
  function buildOrder(q, n){
    var shown = shuffle(q.items);
    var lis = shown.map(function(t, i){
      return '<li><button type="button" data-k="' + KEYS[i] + '">' + esc(t) + '</button></li>';
    }).join('');
    var el = frame(q, n,
      '<p class="q__hint">正しいと思う順にクリックしてください（全 ' + q.items.length + ' 項目）。採点前なら何度でも選び直せます。</p>' +
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
    undo.addEventListener('click', function(){
      if (el.classList.contains('is-done')) return;
      reset();
      updateProgress();
    });

    btns.forEach(function(b){
      b.addEventListener('click', function(){
        if (el.classList.contains('is-done') || b.classList.contains('is-picked')) return;
        picks.push(b);
        b.classList.add('is-picked');
        b.setAttribute('data-pick', picks.length);
        updateProgress();
      });
    });

    return {
      el: el, q: q, n: n,
      isAnswered: function(){ return picks.length === q.items.length; },
      grade: function(){
        el.classList.add('is-done');
        btns.forEach(function(b){ b.disabled = true; });
        var ok = picks.length === q.items.length;
        picks.forEach(function(p, i){
          var hit = p.textContent === q.items[i];
          if (!hit) ok = false;
          p.classList.add(hit ? 'is-correct' : 'is-wrong');
        });
        if (!ok) {
          var right = q.items.map(function(t, i){ return (i + 1) + '. ' + t; }).join(' → ');
          el.querySelector('.q__exp p').insertAdjacentHTML('beforebegin',
            '<p style="margin:0 0 10px;font-size:14px;color:var(--caution);font-weight:700">正しい順序 — ' + esc(right) + '</p>');
        }
        return { ok: ok };
      }
    };
  }

  function render(){
    host.innerHTML = '';
    result.className = 'qresult';
    result.innerHTML = '';
    correct = 0; missed = []; finished = false; states = [];
    bar.classList.remove('is-pass','is-fail','is-over');
    elVerd.textContent = '判定前';
    elDone.textContent = 0; elRight.textContent = 0;
    if (elScore) elScore.hidden = true;
    if (elSubmit) elSubmit.disabled = true;
    updateBankLabel();

    var qs = shuffle(activeQuestions());
    total = qs.length;
    need  = Math.ceil(total * PASS);
    elTotal.textContent = total;
    elNeed.textContent  = need;

    qs.forEach(function(q, i){
      var st = q.type === 'order' ? buildOrder(q, i + 1) : buildPick(q, i + 1);
      states.push(st);
      host.appendChild(st.el);
    });
  }

  function restart(){
    render();
    host.scrollIntoView({behavior: smooth ? 'smooth' : 'auto', block:'start'});
  }

  elSubmit.addEventListener('click', function(){
    if (finished || elSubmit.disabled) return;
    showResult(false);
  });

  elQuit.addEventListener('click', function(){
    if (finished) return;
    var answered = states.filter(function(s){ return s.isAnswered(); }).length;
    var left = total - answered;
    var msg = left
      ? '未回答が ' + left + '問あります。ここで採点して終了しますか。\n（未回答は不正解として扱われます）'
      : '採点して終了しますか。';
    if (!confirm(msg)) return;
    showResult(!!left);
  });

  elReset.addEventListener('click', restart);

  buildBankUI();
  render();
})();

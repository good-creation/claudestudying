/* 試験モード。
   注意: Web ページは他のタブやアプリを開くこと自体を禁止できない。
   ここでできるのは「ページから離れたことを検知して、即座に内容を隠す」ことまで。 */
window.EXAM = (function(){
  var body   = document.body;
  var gate   = document.getElementById('examGate');
  var lock   = document.getElementById('examLock');
  var main   = document.getElementById('quizMain');
  var bar    = document.querySelector('.quizbar');
  var elLeave= document.getElementById('qLeave');
  var lockN  = document.getElementById('examLockCount');

  var active = false;     // 試験中か
  var leaves = 0;         // 離席回数

  function fullscreen(){
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) { try { fn.call(el); } catch (e) {} }
  }
  function exitFullscreen(){
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      var fn = document.exitFullscreen || document.webkitExitFullscreen;
      if (fn) { try { fn.call(document); } catch (e) {} }
    }
  }

  function hide(count){
    if (!active || lock.classList.contains('is-on')) return;
    lock.classList.add('is-on');
    if (count) {
      leaves++;
      elLeave.textContent = leaves;
      lockN.textContent = leaves;
    }
  }
  function resume(){
    lock.classList.remove('is-on');
    fullscreen();
  }

  /* --- 検知 --- */
  // タブ切り替え・最小化
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) hide(true);
  });
  // 他のアプリ／ウィンドウへフォーカスが移った
  addEventListener('blur', function(){ hide(true); });
  // フルスクリーンを抜けた
  document.addEventListener('fullscreenchange', function(){
    if (active && !document.fullscreenElement) hide(true);
  });
  // 閉じる・再読み込み・戻る
  addEventListener('beforeunload', function(e){
    if (!active) return;
    e.preventDefault();
    e.returnValue = '';
  });
  // 右クリック・選択・コピーの抑止（あくまで抑止であって防止ではない）
  ['contextmenu','copy','cut','selectstart','dragstart'].forEach(function(ev){
    document.addEventListener(ev, function(e){ if (active) e.preventDefault(); });
  });

  lock.querySelector('button').addEventListener('click', resume);

  function start(exam){
    active = !!exam;
    gate.hidden = true;
    main.hidden = false;
    if (active) {
      body.classList.add('exam');
      bar.classList.add('is-exam');
      fullscreen();
    }
    main.scrollIntoView({block:'start'});
  }

  /* 開始前に修了証の送り先を確かめる（本番モードは必須、練習モードは任意） */
  function begin(exam){
    if (window.RESULTMAIL && !window.RESULTMAIL.gate(exam)) return;
    start(exam);
  }
  document.getElementById('examStart').addEventListener('click', function(){ begin(true); });
  document.getElementById('examPractice').addEventListener('click', function(){ begin(false); });

  return {
    isActive: function(){ return active; },
    leaves:   function(){ return leaves; },
    // 採点が終わったら拘束を解く
    finish: function(){
      if (!active) return;
      active = false;
      body.classList.remove('exam');
      lock.classList.remove('is-on');
      exitFullscreen();
    }
  };
})();

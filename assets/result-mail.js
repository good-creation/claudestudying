/* 採点結果を「修了証」としてメールで送る。
   このサイトは静的配信なので、送信そのものは Google Apps Script のウェブアプリが受け持つ。
   tools/gas/Code.gs をデプロイして、その URL を下の ENDPOINT に貼る。

   送信する内容は「点数・合否・復習すべきレッスン番号・氏名」だけ。
   問題文や解説といった自由文はクライアントから一切送らない（メール本文に
   任意の文字列を混ぜ込める＝迷惑メールの踏み台にされる作りにしないため）。 */
window.RESULTMAIL = (function(){

  /* ===== 設定（デプロイ後にここだけ書き換える） ===== */
  var ENDPOINT = '';                       // 例: https://script.google.com/macros/s/AKfy.../exec
  var TOKEN    = 'claudestudying-quiz';    // Code.gs の TOKEN と同じ文字列にする
  /* ================================================ */

  var LS_MAIL = 'quiz.mail.addr';
  var LS_NAME = 'quiz.mail.name';
  var startedAt = 0;

  function $(id){ return document.getElementById(id); }
  function ls(fn){ try { return fn(); } catch (e) { return null; } }

  function fields(){ return { mail: $('qEmail'), name: $('qName'), err: $('qIdErr') }; }

  function valid(addr){
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr) && addr.length <= 120;
  }

  function read(){
    var f = fields();
    return {
      email: f.mail ? f.mail.value.trim() : '',
      name:  f.name ? f.name.value.trim().slice(0, 40) : ''
    };
  }

  function restore(){
    var f = fields();
    if (!f.mail) return;
    var a = ls(function(){ return localStorage.getItem(LS_MAIL); });
    var n = ls(function(){ return localStorage.getItem(LS_NAME); });
    if (a && !f.mail.value) f.mail.value = a;
    if (n && f.name && !f.name.value) f.name.value = n;
    if (!ENDPOINT) {
      var box = document.getElementById('quizId');
      if (box) box.classList.add('is-off');   // 未設定のときは「送信されません」と出す
    }
  }

  function remember(v){
    ls(function(){ localStorage.setItem(LS_MAIL, v.email); });
    ls(function(){ localStorage.setItem(LS_NAME, v.name); });
  }

  function showErr(msg){
    var f = fields();
    if (!f.err) return;
    f.err.textContent = msg;
    f.err.hidden = !msg;
    if (msg && f.mail) { f.mail.setAttribute('aria-invalid','true'); f.mail.focus(); }
    else if (f.mail)   { f.mail.removeAttribute('aria-invalid'); }
  }

  /* 開始ボタンの門番。本番モードは必須、練習モードは任意（空なら送らない） */
  function gate(isExam){
    var v = read();
    if (!v.email) {
      if (!isExam) { startedAt = Date.now(); return true; }
      showErr('修了証の送り先が必要です。メールアドレスを入力してください。');
      return false;
    }
    if (!valid(v.email)) {
      showErr('メールアドレスの形式を確認してください。');
      return false;
    }
    showErr('');
    remember(v);
    startedAt = Date.now();
    return true;
  }

  function post(payload){
    var body = JSON.stringify(payload);
    /* Content-Type を text/plain にして preflight を避ける。
       Apps Script は独自レスポンスヘッダを返せず、preflight に応答できないため。 */
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: body
    }).then(function(res){
      return res.json().catch(function(){ return {ok:true, opaque:true}; });
    }).catch(function(){
      /* CORS で読めない環境向けの保険。送信自体は届くが、結果は確認できない */
      return fetch(ENDPOINT, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:body})
        .then(function(){ return {ok:true, opaque:true}; });
    });
  }

  /* 採点後に quiz.js から呼ばれる。戻り値は表示用の状態 */
  function deliver(r, mount){
    var v = read();
    if (!mount) return;

    if (!ENDPOINT || !v.email) {
      mount.className = 'qmail is-idle';
      mount.innerHTML = !v.email
        ? '<b>メール送信</b><p>送り先が未入力のため、修了証は送っていません。</p>'
        : '<b>メール送信</b><p>送信先の設定（<code>assets/result-mail.js</code> の ENDPOINT）が空のため、修了証は送っていません。</p>';
      return;
    }

    var payload = {
      v: 1,
      token: TOKEN,
      email: v.email,
      name:  v.name,
      total: r.total, correct: r.correct, need: r.need,
      passLine: r.passLine,
      state: r.state,              // pass | fail | abort
      mode:  r.mode,               // exam | practice
      leaves: r.leaves,
      sec: startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0,
      weak: r.weak,                // ["05","07"] レッスン番号だけ
      rank: r.rank || '',          // S / A / B …
      bank: r.bank || ''           // 出題セットの id
    };

    function attempt(){
      mount.className = 'qmail is-sending';
      mount.innerHTML = '<b>メール送信</b><p>' + esc(v.email) + ' 宛に修了証を送信しています…</p>';
      post(payload).then(function(res){
        if (res && res.ok === false) throw new Error(res.error || 'rejected');
        mount.className = 'qmail is-done';
        mount.innerHTML = '<b>送信しました</b><p><strong>' + esc(v.email) + '</strong> 宛に修了証を送りました。' +
          (res && res.opaque ? '（送信の完了までは確認できていません。数分待っても届かない場合は迷惑メールを確認してください）' :
                               '数分たっても届かない場合は、迷惑メールフォルダを確認してください。') + '</p>';
      }).catch(function(e){
        mount.className = 'qmail is-fail';
        mount.innerHTML = '<b>送信できませんでした</b><p>' + esc(String(e && e.message || e)) +
          '</p><button type="button" class="qmail__retry">もう一度送る</button>';
        mount.querySelector('.qmail__retry').addEventListener('click', attempt);
      });
    }
    attempt();
  }

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore);
  else restore();

  return {
    gate: gate,
    deliver: deliver,
    configured: function(){ return !!ENDPOINT; }
  };
})();

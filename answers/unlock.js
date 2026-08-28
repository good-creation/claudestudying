/* 解答集のロック解除。合言葉から PBKDF2 で鍵を導き、
   answers.enc.js に入っている AES-GCM の暗号文を復号して本文に差し込む。

   平文をページに置かないので、閲覧ソースからは答えが読めない。ただし合言葉は4桁なので
   総当たりは容易で、これは秘匿ではなく「うっかり目に入らないようにする」ための鍵。 */
(function () {
  'use strict';

  var gate  = document.getElementById('ansGate');
  var form  = document.getElementById('ansForm');
  var input = document.getElementById('ansPass');
  var err   = document.getElementById('ansErr');
  var body  = document.getElementById('ansBody');
  var btn   = document.getElementById('ansBtn');
  var out   = document.getElementById('ansLock');
  if (!gate || !form || !input || !body) return;

  var KEY = 'answers.pass';
  var subtle = window.crypto && window.crypto.subtle;

  function fail(msg) {
    err.textContent = msg;
    err.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  }
  function clearFail() {
    err.hidden = true;
    input.removeAttribute('aria-invalid');
  }

  function b64(s) {
    var raw = atob(s), u8 = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    return u8;
  }

  function open(pass) {
    var enc = window.ANSWERS_ENC;
    if (!enc) return Promise.reject(new Error('data'));
    return subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) {
        return subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.ct));
      })
      .then(function (buf) {
        return new TextDecoder().decode(buf);
      });
  }

  function reveal(html) {
    body.innerHTML = html;
    body.hidden = false;
    gate.hidden = true;
    document.body.classList.add('is-unlocked');
    if (out) out.hidden = false;
  }

  function submit(pass, fromStore) {
    if (!pass) { fail('合言葉を入力してください。'); return; }
    clearFail();
    btn.disabled = true;
    btn.textContent = '確認中…';
    open(pass).then(function (html) {
      try { sessionStorage.setItem(KEY, pass); } catch (e) {}
      reveal(html);
    }).catch(function () {
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      btn.disabled = false;
      btn.textContent = '解除する';
      if (!fromStore) { fail('合言葉が違います。'); input.select(); }
    });
  }

  if (!subtle) {
    fail('このブラウザでは復号できません。https:// か http://localhost で開いてください（file:// では動きません）。');
    input.disabled = true;
    btn.disabled = true;
    return;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submit(input.value.trim(), false);
  });
  input.addEventListener('input', clearFail);

  /* 同じタブの間は開いたままにする（タブを閉じれば再びロックされる） */
  var saved = null;
  try { saved = sessionStorage.getItem(KEY); } catch (e) {}
  if (saved) submit(saved, true);

  /* 「閉じる」でこのタブのロックを掛け直す */
  var lock = document.getElementById('ansRelock');
  if (lock) lock.addEventListener('click', function () {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  });
})();

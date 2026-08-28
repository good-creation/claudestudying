/* 合言葉のゲート（見た目だけ）。

   このサイトは公開リポジトリの GitHub Pages で配信している。したがって
   **これは中身を守る仕組みではない。** 画像やHTMLの直リンク、ソース表示、
   GitHub 上のファイル閲覧、検索エンジンのクロールは、どれもこの画面を通らない。
   JS を切れば素通りする。目的は「一覧からうっかり開かない」ことだけ。

   本当に読ませたくないものは、リポジトリを非公開にするか、
   answers/ のように本文そのものを暗号化すること。 */
(function () {
  'use strict';

  var PASS = '1245';
  var KEY  = 'gate.v1';          /* タブを閉じれば掛け直る（sessionStorage） */

  function stored() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  if (stored()) return;

  var root = document.documentElement;
  root.classList.add('is-gated');   /* CSS が本文を伏せる。組み立て前に掛ける */

  function open() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    root.classList.remove('is-gated');
    var g = document.querySelector('.gate');
    if (g) g.parentNode.removeChild(g);
  }

  function build() {
    var g = document.createElement('div');
    g.className = 'gate';
    g.innerHTML =
      '<form class="gate__box">' +
        '<p class="gate__k">合言葉</p>' +
        '<h1 class="gate__t">このページは合言葉で閉じています</h1>' +
        '<p class="gate__lead">4桁の数字を入れてください。' +
          'このタブを閉じるまで、同じコース内は再入力なしで読めます。</p>' +
        '<div class="gate__row">' +
          '<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" ' +
                 'autocomplete="off" aria-label="合言葉" placeholder="････">' +
          '<button type="submit">開く</button>' +
        '</div>' +
        '<p class="gate__err" hidden>合言葉が違います。</p>' +
        '<p class="gate__back"><a href="' + (root.getAttribute('data-gate-home') || 'index.html') +
          '">← コースを選ぶ画面に戻る</a></p>' +
      '</form>';
    document.body.appendChild(g);

    var form  = g.querySelector('form');
    var input = g.querySelector('input');
    var err   = g.querySelector('.gate__err');

    input.focus();
    input.addEventListener('input', function () {
      err.hidden = true;
      input.removeAttribute('aria-invalid');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value.trim() === PASS) { open(); return; }
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.select();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();

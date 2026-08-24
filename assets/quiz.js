/* 確認問題。各問の正解番号は data-a に入っている（0 始まり）。 */
(function(){
  var qs = Array.prototype.slice.call(document.querySelectorAll('.q'));
  if (!qs.length) return;

  var total   = qs.length;
  var elDone  = document.getElementById('qDone');
  var elRight = document.getElementById('qRight');
  var elTotal = document.getElementById('qTotal');
  var elReset = document.getElementById('qReset');
  elTotal.textContent = total;

  var answered = 0, correct = 0;

  function render(){
    elDone.textContent  = answered;
    elRight.textContent = correct;
  }

  qs.forEach(function(q){
    var right = +q.dataset.a;
    var btns  = Array.prototype.slice.call(q.querySelectorAll('.q__opts button'));

    btns.forEach(function(b, i){
      b.addEventListener('click', function(){
        if (q.classList.contains('is-done')) return;
        q.classList.add('is-done');
        answered++;
        if (i === right) correct++;
        btns.forEach(function(other, j){
          other.disabled = true;
          if (j === right) other.classList.add('is-correct');
          else if (j === i) other.classList.add('is-wrong');
        });
        render();
      });
    });
  });

  elReset.addEventListener('click', function(){
    answered = 0; correct = 0;
    qs.forEach(function(q){
      q.classList.remove('is-done');
      q.querySelectorAll('.q__opts button').forEach(function(b){
        b.disabled = false;
        b.classList.remove('is-correct','is-wrong');
      });
    });
    render();
    qs[0].scrollIntoView({behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block:'start'});
  });

  render();
})();

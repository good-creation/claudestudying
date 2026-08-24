/* タイムラインの再生ヘッド：スクロール位置を動画の経過秒にマップする */
(function(){
  var doc = document.querySelector('[data-duration]');
  if (!doc) return;
  var DUR = +doc.dataset.duration;
  var secs = Array.prototype.slice.call(document.querySelectorAll('.sec'));
  if (!secs.length) return;

  var rail = document.getElementById('rail');
  var line = rail.querySelector('.rail__line');
  var prog = document.getElementById('railProg');
  var head = document.getElementById('railHead');
  var fill = document.getElementById('tlFill');
  var topbar = document.getElementById('topbar');
  var H = 290;
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  var dots = secs.map(function(s){
    var b = document.createElement('button');
    b.className = 'rail__dot';
    b.style.top = (+s.dataset.start / DUR * H) + 'px';
    b.setAttribute('data-l', s.dataset.label);
    b.setAttribute('aria-label', s.dataset.label + ' へ移動');
    b.addEventListener('click', function(){
      s.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'});
    });
    line.appendChild(b);
    return b;
  });

  function fmt(t){
    t = Math.max(0, Math.min(DUR, Math.round(t)));
    return Math.floor(t/60) + ':' + String(t%60).padStart(2,'0');
  }

  function currentTime(){
    var probe = scrollY + innerHeight * 0.42;
    var first = secs[0], last = secs[secs.length-1];
    if (probe < first.offsetTop) return (probe / Math.max(first.offsetTop,1)) * +first.dataset.start;
    for (var i = 0; i < secs.length; i++){
      var top = secs[i].offsetTop;
      var end = (i < secs.length-1) ? secs[i+1].offsetTop : last.offsetTop + last.offsetHeight;
      if (probe < end || i === secs.length-1){
        var t0 = +secs[i].dataset.start;
        var t1 = (i < secs.length-1) ? +secs[i+1].dataset.start : DUR;
        var f = Math.min(1, Math.max(0, (probe - top) / Math.max(end - top, 1)));
        return t0 + (t1 - t0) * f;
      }
    }
    return DUR;
  }

  var ticking = false;
  function draw(){
    ticking = false;
    var t = currentTime(), p = t / DUR;
    prog.style.height = (p * H) + 'px';
    head.style.top = (p * H) + 'px';
    head.setAttribute('data-t', fmt(t));
    if (fill) fill.style.width = (p * 100) + '%';
    if (topbar) topbar.style.width = (p * 100) + '%';
    rail.classList.add('is-on');   // ページ上部から常に表示する
    var ai = 0;
    for (var i = 0; i < secs.length; i++) if (t >= +secs[i].dataset.start - 0.5) ai = i;
    dots.forEach(function(d,i){ d.classList.toggle('is-here', i === ai); });
  }
  addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(draw); } }, {passive:true});
  addEventListener('resize', draw);
  draw();
})();

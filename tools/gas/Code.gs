/**
 * 確認問題の修了証メール — Google Apps Script ウェブアプリ
 *
 * 静的サイト（GitHub Pages）からはメールを送れないので、送信だけをここが受け持つ。
 * デプロイ手順は同じフォルダの README.md を参照。
 *
 * 設計の前提:
 *   - 受け取るのは「点数・合否・復習レッスン番号・氏名」だけ。
 *     本文になる自由文はクライアントから受け取らない（任意の文面を送らせない）。
 *   - 宛先は 1 リクエストにつき 1 件。管理者への控えは送らない。
 *   - URL は公開されるので、TOKEN は「いたずら避け」程度のもの。
 *     実際の歯止めは下の送信数の上限で掛ける。
 */

/* ===================== 設定 ===================== */
var TOKEN        = 'claudestudying-quiz';   // assets/result-mail.js の TOKEN と同じ文字列
var SITE_URL     = 'https://good-creation.github.io/claudestudying/';  // 例 'https://good-creation.github.io/claudestudying/'（空なら復習リンクを張らない）
var SENDER_NAME  = 'Claude Code 入門コース 学習ノート';
var COURSE_NAME  = 'Claude Code 入門コース（全11レッスン）試験';
var TIMEZONE     = 'Asia/Tokyo';
var MAX_PER_ADDR = 5;    // 同じアドレスへ 6 時間あたり何通まで
var MAX_PER_DAY  = 80;   // 1 日の総数（Gmail の 1 日 100 通制限に対する余裕分）

/* 出題セットの id → 修了証に印字する名前。未登録の id はそのまま印字する。
   id は assets/quiz-levels.js の window.QUIZ_SETS と合わせること
   （空にすると修了証に 'l2' のような生の id が出る） */
var BANKS = {
  'l1a': 'レベル1-A 基礎（見習い）',
  'l1b': 'レベル1-B 基礎（見習い）',
  'l2' : 'レベル2 実践（実務者）',
  'l3' : 'レベル3 応用（手練れ）'
};
/* =============================================== */

var LESSONS = {
  '01': ['01-what-is-claude-code.html',       'Claude Code とは何か'],
  '02': ['02-how-claude-code-works.html',     'どう動いているのか'],
  '03': ['03-your-first-prompt.html',         '最初のプロンプトを書く'],
  '04': ['04-explore-plan-code-commit.html',  '探索 → 計画 → コード → コミット'],
  '05': ['05-context-management.html',        'コンテキストを管理する'],
  '06': ['06-claude-md.html',                 'CLAUDE.md ファイル'],
  '07': ['07-subagents.html',                 'サブエージェントとは何か'],
  '08': ['08-skills.html',                    'スキルとは何か'],
  '09': ['09-mcp.html',                       'MCP で外部につなぐ'],
  '10': ['10-hooks.html',                     'フックで確実に実行させる'],
  '11': ['11-review-and-ship.html',           'レビューして出荷する']
};

/* ---------- 入口 ---------- */

function doGet() {
  return json({ ok: true, service: 'quiz-certificate', note: '結果の送信は POST で受け付けます' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > 4000) return json({ ok: false, error: '要求が大きすぎます' });

    var p = JSON.parse(raw);
    if (p.token !== TOKEN)   return json({ ok: false, error: '合言葉が違います' });

    var d = clean(p);
    if (d.error) return json({ ok: false, error: d.error });

    var gate = allow(d.email);
    if (gate) return json({ ok: false, error: gate });

    var cert = certId(d.email);
    MailApp.sendEmail({
      to:       d.email,
      subject:  subject(d),
      body:     textBody(d, cert),
      htmlBody: htmlBody(d, cert),
      name:     SENDER_NAME
    });
    return json({ ok: true, id: cert.id });

  } catch (err) {
    return json({ ok: false, error: '送信に失敗しました: ' + err });
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 検証 ---------- */

function clean(p) {
  var email = String(p.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120)
    return { error: 'メールアドレスの形式が不正です' };

  // 氏名は唯一の自由文。改行・URL を落として、迷惑メールの本文に使えないようにする
  var name = String(p.name || '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);

  var total = int(p.total, 1, 500);
  var correct = int(p.correct, 0, total || 500);
  var need = int(p.need, 0, total || 500);
  if (!total || correct === null || need === null) return { error: '点数の値が不正です' };

  var state = ['pass', 'fail', 'abort'].indexOf(p.state) >= 0 ? p.state : 'fail';
  var mode  = p.mode === 'exam' ? 'exam' : 'practice';

  var weak = [];
  if (Object.prototype.toString.call(p.weak) === '[object Array]') {
    p.weak.slice(0, 11).forEach(function (k) {
      k = String(k);
      if (LESSONS[k] && weak.indexOf(k) < 0) weak.push(k);
    });
    weak.sort();
  }

  var rank = /^[A-Z]$/.test(String(p.rank || '')) ? String(p.rank) : '';
  var bankId = /^[A-Za-z0-9_-]{1,24}$/.test(String(p.bank || '')) ? String(p.bank) : '';

  return {
    email: email, name: name, rank: rank,
    bank: BANKS[bankId] || bankId,
    total: total, correct: correct, need: need,
    passLine: int(p.passLine, 0, 100) || 80,
    state: state, mode: mode,
    leaves: int(p.leaves, 0, 999) || 0,
    sec: int(p.sec, 0, 86400) || 0,
    weak: weak
  };
}

function int(v, min, max) {
  var n = Math.round(Number(v));
  if (!isFinite(n) || n < min || n > max) return null;
  return n;
}

/* ---------- 送信数の上限 ---------- */

function allow(email) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (e) { return '混み合っています。少し待って再送してください'; }
  try {
    var cache = CacheService.getScriptCache();
    var key = 'a' + digest(email);
    var n = Number(cache.get(key) || 0);
    if (n >= MAX_PER_ADDR) return '同じアドレスへの送信が続いたため、しばらく送れません（6時間で解除）';
    cache.put(key, String(n + 1), 21600);

    var props = PropertiesService.getScriptProperties();
    var today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd');
    var dk = 'day' + today;
    var d = Number(props.getProperty(dk) || 0);
    if (d >= MAX_PER_DAY) return '本日の送信上限に達しました。明日以降に再送してください';
    props.setProperty(dk, String(d + 1));

    // 前日以前のカウンタは残さない
    props.getKeys().forEach(function (k) {
      if (k.indexOf('day') === 0 && k !== dk) props.deleteProperty(k);
    });
    return null;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function digest(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s)
    .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); })
    .join('');
}

function certId(email) {
  var now = new Date();
  var day = Utilities.formatDate(now, TIMEZONE, 'yyyyMMdd');
  return {
    id: 'CC-' + day + '-' + digest(email + now.getTime()).slice(0, 6).toUpperCase(),
    at: Utilities.formatDate(now, TIMEZONE, 'yyyy年M月d日 HH:mm')
  };
}

/* ---------- 本文 ---------- */

function pct(d)   { return Math.round(d.correct / d.total * 100); }
function passed(d){ return d.state === 'pass'; }
function verdict(d){ return { pass: '合格', fail: '不合格', abort: '中断' }[d.state]; }

function duration(sec) {
  if (!sec) return '—';
  var m = Math.floor(sec / 60), s = sec % 60;
  return m ? (m + '分' + (s ? s + '秒' : '')) : (s + '秒');
}

function subject(d) {
  return (passed(d) ? '【修了証】' : '【結果】') + COURSE_NAME +
         ' — ' + verdict(d) + '（' + d.correct + '/' + d.total + '）';
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function lessonLine(k) {
  var l = LESSONS[k];
  return SITE_URL ? '<a href="' + SITE_URL + l[0] + '" style="color:#AA4400">' + k + ' ' + esc(l[1]) + '</a>'
                  : k + ' ' + esc(l[1]);
}

function textBody(d, cert) {
  var out = [];
  out.push(passed(d) ? '修了証' : '確認問題の結果');
  out.push(COURSE_NAME);
  out.push('');
  out.push('受講者　　: ' + (d.name || d.email));
  out.push('判定　　　: ' + verdict(d) + (d.rank ? '（ランク ' + d.rank + '）' : ''));
  out.push('スコア　　: ' + d.correct + ' / ' + d.total + '（' + pct(d) + '%）');
  out.push('合格ライン: ' + d.passLine + '%（' + d.need + '問以上）');
  out.push('出題セット: ' + (d.bank || '既定（全11レッスン）'));
  out.push('受験方法　: ' + (d.mode === 'exam' ? '本番モード（離席 ' + d.leaves + ' 回）' : '練習'));
  out.push('所要時間　: ' + duration(d.sec));
  out.push('発行日時　: ' + cert.at);
  out.push('証明書番号: ' + cert.id);
  if (d.weak.length) {
    out.push('');
    out.push('復習するとよいレッスン:');
    d.weak.forEach(function (k) { out.push('  ' + k + ' ' + LESSONS[k][1]); });
  }
  out.push('');
  out.push('※ この修了証は学習ノートサイトが自動発行したもので、公的な資格ではありません。');
  return out.join('\n');
}

function htmlBody(d, cert) {
  var ok = passed(d);
  var accent = ok ? '#AA4400' : '#A02B25';
  var rows = [
    ['判定',       '<strong style="color:' + accent + '">' + verdict(d) + '</strong>' +
                   (d.rank ? '<span style="margin-left:10px;font-size:12px;color:#4A514A">ランク ' + esc(d.rank) + '</span>' : '')],
    ['合格ライン', d.passLine + '%（' + d.need + '問以上）'],
    ['受験方法',   d.mode === 'exam' ? '本番モード（離席 ' + d.leaves + ' 回）' : '練習'],
    ['所要時間',   duration(d.sec)],
    ['出題セット', d.bank ? esc(d.bank) : '既定（全11レッスン）'],
    ['発行日時',   cert.at],
    ['証明書番号', '<span style="font-family:ui-monospace,Menlo,Consolas,monospace">' + cert.id + '</span>']
  ].map(function (r) {
    return '<tr>' +
      '<td style="padding:9px 0;border-bottom:1px solid #D6DAD2;font-size:12px;letter-spacing:.08em;color:#4A514A;width:110px">' + r[0] + '</td>' +
      '<td style="padding:9px 0;border-bottom:1px solid #D6DAD2;font-size:14px;color:#171A17">' + r[1] + '</td>' +
    '</tr>';
  }).join('');

  var weak = d.weak.length
    ? '<div style="margin-top:26px;padding:18px 20px;background:#EFF0EB;border-left:2px solid ' + accent + '">' +
        '<p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;color:#4A514A">復習するとよいレッスン</p>' +
        '<p style="margin:0;font-size:14px;line-height:1.9;color:#171A17">' +
          d.weak.map(lessonLine).join('<br>') +
        '</p></div>'
    : '<p style="margin:26px 0 0;font-size:14px;color:#171A17">取りこぼしはありません。全問正解です。</p>';

  return '' +
  '<div style="margin:0;padding:28px 16px;background:#E9EBE6;' +
       'font-family:-apple-system,BlinkMacSystemFont,\'Hiragino Sans\',\'Yu Gothic\',Meiryo,sans-serif">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto">' +
      '<tr><td style="background:#F5F6F2;border:1px solid #171A17;padding:34px 32px 36px">' +

        '<p style="margin:0;font-size:11px;letter-spacing:.18em;color:' + accent + '">' +
          (ok ? 'CERTIFICATE OF COMPLETION' : 'RESULT') + '</p>' +
        '<h1 style="margin:10px 0 0;font-size:30px;line-height:1.3;color:#171A17;letter-spacing:-.01em">' +
          (ok ? '修了証' : '確認問題の結果') + '</h1>' +
        '<p style="margin:18px 0 0;font-size:14px;line-height:1.9;color:#4A514A">' +
          esc(COURSE_NAME) + '</p>' +

        '<p style="margin:26px 0 0;font-size:11px;letter-spacing:.14em;color:#4A514A">受講者</p>' +
        '<p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#171A17">' + esc(d.name || d.email) + '</p>' +
        (d.name ? '<p style="margin:4px 0 0;font-size:12px;color:#4A514A">' + esc(d.email) + '</p>' : '') +

        '<div style="margin:28px 0 0;padding:22px 0;border-top:1px solid #171A17;border-bottom:1px solid #171A17;text-align:center">' +
          '<p style="margin:0;font-size:44px;font-weight:700;line-height:1;color:' + accent + '">' +
            d.correct + '<span style="font-size:22px;color:#4A514A"> / ' + d.total + '</span></p>' +
          '<p style="margin:10px 0 0;font-size:13px;color:#4A514A">正答率 ' + pct(d) + '%</p>' +
        '</div>' +

        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:22px">' +
          rows +
        '</table>' +

        weak +

        (SITE_URL
          ? '<p style="margin:26px 0 0;font-size:13px"><a href="' + SITE_URL + 'quiz.html" style="color:' + accent + '">' +
            'もう一度解く（出題順はシャッフルされます）</a></p>'
          : '') +

        '<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #D6DAD2;font-size:11.5px;line-height:1.8;color:#4A514A">' +
          'この修了証は学習ノートサイトが自動発行したもので、公的な資格ではありません。' +
          'このメールは確認問題の採点時に、入力されたアドレス宛に送信されています。' +
        '</p>' +

      '</td></tr>' +
    '</table>' +
  '</div>';
}

/* レベル別チャレンジの問題バンク。
   既存の window.QUIZ（23問）とは完全に独立していて、そちらには一切影響しない。

   1問の書式は window.QUIZ とまったく同じ:
     type: "choice"（4択）/ "truefalse"（正誤判定）/ "order"（並べ替え）
     choice    … options の先頭が正解。表示時にシャッフルされる
     truefalse … a: true = 記述が正しい
     order     … items が正しい順序。表示時にシャッフルされる
     src       … 出題範囲のレッスン番号の配列（例 ["06","10"]）
     exp       … 解答後に出す一言解説

   レベルの考え方:
     レベル1 基礎  見習い  … 用語と事実。読んでいれば答えられる
     レベル2 実践  実務者  … 「この状況でどうするか」の使い分けと手順
     レベル3 応用  手練れ  … トレードオフ判断・機能の組み合わせ・失敗の診断 */
window.QUIZ_SETS = [

  { id:"l1a", level:1, levelName:"基礎", badge:"見習い", title:"レベル1-A",
    lead:"用語と仕組みの土台を確認する。レッスン01〜06の範囲から。",
    questions:[
      /* TODO: 10問 */
    ]},

  { id:"l1b", level:1, levelName:"基礎", badge:"見習い", title:"レベル1-B",
    lead:"拡張機能まわりの土台を確認する。レッスン07〜11の範囲から。",
    questions:[
      /* TODO: 10問 */
    ]},

  { id:"l2", level:2, levelName:"実践", badge:"実務者", title:"レベル2",
    lead:"「この状況でどう動くか」を問う。手順の順序と、機能の使い分け。",
    questions:[
      /* TODO: 10問 */
    ]},

  { id:"l3", level:3, levelName:"応用", badge:"手練れ", title:"レベル3",
    lead:"トレードオフの判断、複数機能の組み合わせ、うまくいかないときの切り分け。",
    questions:[
      /* TODO: 10問 */
    ]}

];

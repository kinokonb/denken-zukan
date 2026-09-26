# 電験ずかん

電験の4科目（理論・電力・機械・法規）を、iPhoneで数値を動かしながら図で見る学習用Webアプリ。一度開けばオフラインで使える。
目的・約束・ロードマップは [SPEC.md](SPEC.md)、確認の記録は [docs/verification.md](docs/verification.md)。

## 開き方
- iPhone：Safari（Edgeでも可）で https://kinokonb.github.io/denken-zukan/ を開き、共有 →「ホーム画面に追加」。以後はホーム画面から開けば機内モードでも使える。目次のいちばん下に「✓ オフラインで使えます」と版が出る。
- 更新：通信のある所で開くと裏で新しい版を取り込み、次に開いた時から新しい版になる。
- Mac：`open -na "Microsoft Edge" --args --new-window "https://kinokonb.github.io/denken-zukan/"`。repoの `index.html` を直接開いても動く（その開き方ではオフライン保存はしない）。

## 今あるレッスン（v0.3.11）
目次は 科目 › 単元 › 番号つきレッスン で、学ぶ順（前提になるものが先）に並び、いちばん上から1タップで始められる（2回目からは前回の続き）。どのレッスンも「ことば → 動く図と計算結果 → やってみよう（予想を選ぶと図が動き、当たり外れと理由が出る）→ つまみ → 3行でわかる・図の見かた・式と記号 → 確かめ問題（ふり返り）→ 試験では（よく出る形・まちがえやすい所）」の形。目次のいちばん上の「基礎」は電気に要る数学・理科で、ミッションはない。理論からは図の下の「ミッション 5問に挑戦」で5問の1セット（1〜2分）を遊べる。理論1〜4は「現場の依頼」の形（値や個数を決めてからスイッチを入れると、電球が光る・切れる・ヒューズが飛ぶ・ブレーカーが落ちる）で、その前に「準備 6問（前提の知識）」（使う知識を読み、計器の針を予想して置いてからスイッチ）がある。ほかのレッスンはつまみを動かして目標に合わせる旧形式。クリア回数とベストタイムは端末のブラウザに残り、目次に印が付く。

| 番号 | 単元 | レッスン | 図 |
|---|---|---|---|
| 基礎1 | 数と式 | かけ算・割り算と式の変形 | 長方形のマス（面積 = 縦 × 横）、隠すと式が出る三角 |
| 基礎2 | 数と式 | 比例と反比例 | 同じ a・x で比例の直線と反比例の曲線を上下に |
| 基礎3 | 数と式 | 大きい数・小さい数（k・M・m・μ） | 接頭語のはしご、小数点が何けた動くか |
| 基礎4 | 数と式 | 2乗とルート | 正方形のマス（面積 = 辺²）、2乗とルートの行き帰り |
| 基礎5 | 理科 | 電気の正体（電子・電荷・電流の向き） | 電子が電流と反対に流れる（自動で動く）、電荷 Q = I × t の長方形 |
| 基礎6 | 理科 | 仕事・エネルギー・熱（J と W） | ヒーターで水 1 L を温める、温度計、電力 × 秒 = 熱量の計算 |
| 基礎7 | 図形と波 | 直角三角形（三平方の定理） | 3辺の正方形（a² + b² = c²） |
| 基礎8 | 図形と波 | 三角比（sin・cos・tan） | 斜辺と角の直角三角形、横 ÷ 斜め・縦 ÷ 斜め |
| 理論1 | 直流回路 | 電圧・電流・抵抗とオームの法則 | 回路を電流の点が流れる（自動で動く）、V–I グラフ |
| 理論2 | 直流回路 | 直列と並列 | 直列と並列を並べて電流が流れる（自動で動く）、電圧・電流の分かれ方 |
| 理論3 | 直流回路 | 電力と電力量 | P = V²/R の放物線、電力量＝長方形の面積 |
| 理論4 | 交流回路 | RLC直列回路とフェーザ図 | 矢印が回り電圧・電流の波形が流れる（自動で動く）、共振曲線 |
| 電力1 | 送電・配電 | 送電線の電圧降下 | 1相分のフェーザ図 |
| 機械1 | 誘導機 | 誘導電動機のトルクとすべり | トルク曲線、回転磁界と回転子（自動で動く）、二次入力の行き先 |
| 法規1 | 電気設備管理（計算） | 力率改善とコンデンサ | 電力の三角形 |

## 変更したい内容 → 担当
| 変えたいこと | 担当 |
|---|---|
| レッスンの文章（`explain`：3行でわかる・図の見かた・式・記号、`exam`：試験では）・ことば・やってみよう・確かめ問題・つまみ・図 | [js/topics/](js/topics/)（1レッスン1ファイル）。説明の組み立てと見た目は [js/app.js](js/app.js) の `explainHtml`・`examHtml`（[tests/explain.test.js](tests/explain.test.js) が形を照合） |
| 計算式 | [js/calc/](js/calc/)（DOMなしの関数。[tests/calc.test.js](tests/calc.test.js) で教科書の値と照合） |
| 目次（科目・単元・番号）、レッスンの画面の組み立て、つまみ → 計算 → 図の流れ、動く図の再生、やってみよう・確かめ問題の動き | [js/app.js](js/app.js) の `SUBJECTS` ほか |
| 図の部品（方眼・矢印・量記号のラベル・角度の弧・導線・電池・抵抗・電流の点・帯グラフ） | [js/svg.js](js/svg.js) |
| ミッション（現場の依頼）の出題の組み立て（DOMなし） | [js/job.js](js/job.js)（[tests/job.test.js](tests/job.test.js) が、どの依頼も成功する入力がちょうど1つかを照合） |
| ミッション（現場の依頼）の画面と演出（欄・スイッチの後の時間割・針のバネ・火花・煙・揺れ・浮かぶ文字・タイム・記録） | [js/job-play.js](js/job-play.js) |
| 効果音と、その切り替え | [js/sound.js](js/sound.js) |
| 依頼と準備の中身（数値の組・依頼の文・使う知識・結果の計算・現場の図） | レッスンごとの遊び [js/plays/](js/plays/)（`Plays[レッスンid]` の `jobs` と `basics`。例：[js/plays/ohm.js](js/plays/ohm.js)・[js/plays/series-parallel.js](js/plays/series-parallel.js)）。遊びで共通の道具（数の書き方・予想とくらべる判定・計器と読み）は [js/plays/kit.js](js/plays/kit.js)、現場の部品（電池・交流電源・電球・電熱線・コイル・コンデンサ・ヒューズ・ブレーカー・スイッチ・針の計器・テスターのリード線）は [js/svg.js](js/svg.js) |
| 旧形式のミッション（理論1〜4以外、置き換え待ち）の出題と画面 | [js/mission.js](js/mission.js)（[tests/mission.test.js](tests/mission.test.js)）と [js/app.js](js/app.js) の `createMissionPlay` |
| 量記号（斜体・添字）と数値の書き方 | [js/notation.js](js/notation.js) |
| 見た目・色（ライト／ダーク） | [style.css](style.css) |
| オフライン保存 | [sw.js](sw.js)（ファイルを足したら `ASSETS` へ。[tests/offline.test.js](tests/offline.test.js) が照合） |
| 画面に出す版 | [js/version.js](js/version.js) |
| アイコン | [icons/icon.svg](icons/icon.svg) を直して `node tools/make-icons.mjs` |
| 資料（過去問題集）を読む | [tools/reference.swift](tools/reference.swift) |

### レッスンの足し方
0. 資料（過去問題集、[AGENTS.md](AGENTS.md) の「資料」）でそのテーマの過去問を探し（`swift tools/reference.swift find <科目> <語>`）、問われ方・記号・単位・典型値を合わせる。本文・図・問題は写さない。
1. `js/calc/` に計算を置き、`tests/calc.test.js` に教科書の値で確かめるテストを足す。
2. `js/topics/` にレッスンを置く（`params`・`presets`・`compute`・`draw`・`caption`・`readouts`・`conditions`・`explain`（`points`：3行でわかる3つ、`look`：図の見かた [印, 量の色の class, 文]、`formulas`：[式, ことばで言うと, 使う時]、`symbols`：[記号, 意味, 単位]。文の中の量記号は `$R_1$` と書く）、初心者向けの `terms`（ことば）・`tries`（やってみよう：問い `text`・予想の選択肢 `choices`・正解の番号 `answer`・`set` は初期値からの変更・`look` は結果の理由）・`quiz`（3問、`answer` は正解の番号）・`exam`（試験では：`lead` 出方の1文・`often` よく出る形・`traps` まちがえやすい所））。説明文（caption）は2行に収める。ミッション（現場の依頼）は `js/plays/<レッスンid>.js` に置き（`index.html` と `sw.js` の `ASSETS` にも足す）、`jobs` に型を並べる（型の決まりは [js/job.js](js/job.js) の先頭：決め方 `kind`（`dial`・`count`・`probe`）・数値の組 `cases`・依頼の文 `request`・正しい入力 `answer`・結果 `run`（成功か・計器の針・電球の明るさ・壊れる所・計器の読み・理由）・現場の図 `draw`）。成功する入力がちょうど1つになる数だけを `cases` に入れ、`tests/job.test.js` のレッスン一覧にも足す。準備は `basics` に学ぶ順で並べ（型は `dial` と同じで、名前 `title`・使う知識 `know` を足す。予想を置く段は `run` で予想と本物をくらべ、`draw` で計器の `ghost` に予想の針を描く）、ミッションの型の `needs` に「失敗したら始める準備の段」の番号を書く。旧形式のミッションは `missions`（型の並び。型は動かすつまみ `free`・数値の組 `cases`・固定する値 `setup`・答えのつまみの値 `answer`・目標 `text`・動かし方 `how`・今の値 `now`・当たり `hit`・理由 `reason`）。答えがつまみの目盛りに乗る数だけを `cases` に入れ、`tests/mission.test.js` のレッスン一覧にも足す。理由は幅375pxでも3行に収める（`tools/sim/check.mjs` が照合）。交流の時間変化や回転のように、動くこと自体に意味がある図だけ `motion: { draw(g, params, result, time) }` を足す（動く部分だけを描く。開いたら自動で動き、止める／動かすボタンが付く）。
3. `index.html` に `<script>`、`js/app.js` の `SUBJECTS` の単元に学ぶ順で登録（番号は自動）、`sw.js` の `ASSETS` に追加。
4. `tools/sim/check.mjs` の `TOPICS`（動くなら `MOVING` にも）に追加。

## 検証
```sh
node --test tests/*.test.js
for f in js/*.js js/*/*.js sw.js; do node --check "$f"; done
node ~/.claude/tools/playtest/playtest.mjs .
node tools/sim/check.mjs <出力フォルダ>
```
`tools/sim/check.mjs` は iPhone幅（430×932）のライト・ダークで、目次と全レッスンを開き、動く図の再生・停止、やってみよう・確かめ問題・ことばを操作し、ミッションを実際に5問解き切り（現場の依頼は、準備を全段解いてから「ミッションへ」で5問。各問でわざと1回失敗してから答えを入れる。幅375pxで全問題の文が欄に収まるかも）、つまみを両端まで動かし、ボタンを押し、通信を切って開き直す。図の NaN、横のはみ出し、操作中の図の高さの変化、コンソールのエラーを失敗として数え、目次と各テーマを並べた一覧画像（`light.png`・`dark.png`）を書き出す。
配備後は `node tools/sim/check.mjs <出力フォルダ> https://kinokonb.github.io/denken-zukan/` で公開版を同じように確かめ、保存一覧の全ファイルがrepoと同じかも照合する。

## 配備
`main` を push すると GitHub Pages（`main` の直下）が1分ほどで公開する。出荷のたびに `js/version.js` の版を上げ、公開版の目次の下の版表示で確かめる。

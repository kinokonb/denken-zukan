# 電験ずかん

電験の4科目（理論・電力・機械・法規）を、iPhoneで数値を動かしながら図で見る学習用Webアプリ。一度開けばオフラインで使える。
目的・約束・ロードマップは [SPEC.md](SPEC.md)、確認の記録は [docs/verification.md](docs/verification.md)。

## 開き方
- iPhone：Safari（Edgeでも可）で https://kinokonb.github.io/denken-zukan/ を開き、共有 →「ホーム画面に追加」。以後はホーム画面から開けば機内モードでも使える。目次のいちばん下に「✓ オフラインで使えます」と版が出る。
- 更新：通信のある所で開くと裏で新しい版を取り込み、次に開いた時から新しい版になる。
- Mac：`open -a "Microsoft Edge" https://kinokonb.github.io/denken-zukan/`。repoの `index.html` を直接開いても動く（その開き方ではオフライン保存はしない）。

## 今あるレッスン（v0.3.1）
目次は 科目 › 単元 › 番号つきレッスン で、学ぶ順（前提になるものが先）に並び、いちばん上から1タップで始められる（2回目からは前回の続き）。どのレッスンも「ことば → 動く図と計算結果 → やってみよう（予想を選ぶと図が動き、当たり外れと理由が出る）→ つまみ → しくみ・式 → 確かめ問題（ふり返り）→ 試験では」の形。図の下の「ミッション 5問に挑戦」で、つまみを動かして目標に合わせる1セット（1〜2分）を遊べる。理論2のセットには「故障探し」（電流計の値から、切れた抵抗を図でタップして当てる）が混ざる。クリア回数とベストタイムは端末のブラウザに残り、目次に印が付く。

| 番号 | 単元 | レッスン | 図 |
|---|---|---|---|
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
| レッスンの文章・ことば・やってみよう・確かめ問題・試験では・つまみ・図 | [js/topics/](js/topics/)（1レッスン1ファイル） |
| 計算式 | [js/calc/](js/calc/)（DOMなしの関数。[tests/calc.test.js](tests/calc.test.js) で教科書の値と照合） |
| 目次（科目・単元・番号）、レッスンの画面の組み立て、つまみ → 計算 → 図の流れ、動く図の再生、やってみよう・確かめ問題の動き | [js/app.js](js/app.js) の `SUBJECTS` ほか |
| 図の部品（方眼・矢印・量記号のラベル・角度の弧・導線・電池・抵抗・電流の点・帯グラフ） | [js/svg.js](js/svg.js) |
| ミッションの出題の組み立てと当たりの判定（DOMなし） | [js/mission.js](js/mission.js)（[tests/mission.test.js](tests/mission.test.js) が全問題を照合） |
| ミッションの画面（欄・つまみの固定・故障探しのタップと丸つけ・タイム・記録） | [js/app.js](js/app.js) の `createMissionPlay` |
| 故障探しの図（電流計・タップできる所・答え合わせ後の流れ） | 各レッスンの `compute`・`draw`・`motion.draw` の `fault` 引数（例：[js/topics/series-parallel.js](js/topics/series-parallel.js)）。丸つけと枠は [js/svg.js](js/svg.js) の `tapTarget` |
| 量記号（斜体・添字）と数値の書き方 | [js/notation.js](js/notation.js) |
| 見た目・色（ライト／ダーク） | [style.css](style.css) |
| オフライン保存 | [sw.js](sw.js)（ファイルを足したら `ASSETS` へ。[tests/offline.test.js](tests/offline.test.js) が照合） |
| 画面に出す版 | [js/version.js](js/version.js) |
| アイコン | [icons/icon.svg](icons/icon.svg) を直して `node tools/make-icons.mjs` |
| 資料（過去問題集）を読む | [tools/reference.swift](tools/reference.swift) |

### レッスンの足し方
0. 資料（過去問題集、[AGENTS.md](AGENTS.md) の「資料」）でそのテーマの過去問を探し（`swift tools/reference.swift find <科目> <語>`）、問われ方・記号・単位・典型値を合わせる。本文・図・問題は写さない。
1. `js/calc/` に計算を置き、`tests/calc.test.js` に教科書の値で確かめるテストを足す。
2. `js/topics/` にレッスンを置く（`params`・`presets`・`compute`・`draw`・`caption`・`readouts`・`conditions`・`notesHtml`、初心者向けの `terms`（ことば）・`tries`（やってみよう：問い `text`・予想の選択肢 `choices`・正解の番号 `answer`・`set` は初期値からの変更・`look` は結果の理由）・`quiz`（3問、`answer` は正解の番号）・`exam`（試験では））。説明文（caption）は2行に収める。ミッションは `missions`（型の並び。型は動かすつまみ `free`・数値の組 `cases`・固定する値 `setup`・答えのつまみの値 `answer`・目標 `text`・動かし方 `how`・今の値 `now`・当たり `hit`・理由 `reason`）。答えがつまみの目盛りに乗る数だけを `cases` に入れ、`tests/mission.test.js` のレッスン一覧にも足す。理由は幅375pxでも3行に収める（`tools/sim/check.mjs` が照合）。故障探しの型は `tap: true` で、`answer` は壊れた所（レッスンの `targets` のどれか）、`fault(所)` はその所が壊れた故障（`compute(params, fault)`・`draw(svg, params, result, fault)` に渡る。`fault.revealed` は答え合わせの後、`fault.marks` はタップした所の丸・線）、`miss(values, 所, そこが壊れた時の計算結果, 今の計算結果)` はちがう所をタップした時の1行。`now` は図に出す計器の値で、答え以外のどの所が壊れても `now` が変わること（壊れた所が計器だけで1つに決まること）を `tests/mission.test.js` が照合する。交流の時間変化や回転のように、動くこと自体に意味がある図だけ `motion: { draw(g, params, result, time) }` を足す（動く部分だけを描く。開いたら自動で動き、止める／動かすボタンが付く）。
3. `index.html` に `<script>`、`js/app.js` の `SUBJECTS` の単元に学ぶ順で登録（番号は自動）、`sw.js` の `ASSETS` に追加。
4. `tools/sim/check.mjs` の `TOPICS`（動くなら `MOVING` にも）に追加。

## 検証
```sh
node --test tests/*.test.js
for f in js/*.js js/*/*.js sw.js; do node --check "$f"; done
node ~/.claude/tools/playtest/playtest.mjs .
node tools/sim/check.mjs <出力フォルダ>
```
`tools/sim/check.mjs` は iPhone幅（430×932）のライト・ダークで、目次と全レッスンを開き、動く図の再生・停止、やってみよう・確かめ問題・ことばを操作し、ミッションを実際に5問解き切り（故障探しの型があるレッスンは1問以上を実際のタップで解く。幅375pxで全問題の文面が欄に収まるかも）、つまみを両端まで動かし、ボタンを押し、通信を切って開き直す。図の NaN、横のはみ出し、操作中の図の高さの変化、コンソールのエラーを失敗として数え、目次と各テーマを並べた一覧画像（`light.png`・`dark.png`）を書き出す。
配備後は `node tools/sim/check.mjs <出力フォルダ> https://kinokonb.github.io/denken-zukan/` で公開版を同じように確かめ、保存一覧の全ファイルがrepoと同じかも照合する。

## 配備
`main` を push すると GitHub Pages（`main` の直下）が1分ほどで公開する。出荷のたびに `js/version.js` の版を上げ、公開版の目次の下の版表示で確かめる。

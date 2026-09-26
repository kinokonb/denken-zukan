# 電験ずかん

電験の4科目（理論・電力・機械・法規）を、iPhoneで数値を動かしながら図で見る学習用Webアプリ。一度開けばオフラインで使える。
目的・約束・ロードマップは [SPEC.md](SPEC.md)、確認の記録は [docs/verification.md](docs/verification.md)。

## 開き方
- iPhone：Safari（Edgeでも可）で https://kinokonb.github.io/denken-zukan/ を開き、共有 →「ホーム画面に追加」。以後はホーム画面から開けば機内モードでも使える。目次のいちばん下に「✓ オフラインで使えます」と版が出る。
- 更新：通信のある所で開くと裏で新しい版を取り込み、次に開いた時から新しい版になる。
- Mac：`open -a "Microsoft Edge" https://kinokonb.github.io/denken-zukan/`。repoの `index.html` を直接開いても動く（その開き方ではオフライン保存はしない）。

## 今あるテーマ（v0.1.1）
| 科目 | テーマ | 動かせるもの |
|---|---|---|
| 理論 | RLC直列回路とフェーザ図 | R・L・C・周波数、「共振させる」。矢印が回り、電圧・電流の波形が流れる |
| 電力 | 送電線の電圧降下 | 負荷電流・力率・1線のR・X |
| 機械 | 誘導電動機のトルクとすべり | すべり・二次抵抗、「起動の瞬間」「最大トルクで起動」。回転磁界と回転子が回る |
| 法規 | 力率改善とコンデンサ | 有効電力・改善前の力率・コンデンサ容量、「力率0.95にする」「力率1にする」 |

## 変更したい内容 → 担当
| 変えたいこと | 担当 |
|---|---|
| テーマの文章・つまみ・図・計算結果の欄 | [js/topics/](js/topics/)（1テーマ1ファイル） |
| 計算式 | [js/calc/](js/calc/)（DOMなしの関数。[tests/calc.test.js](tests/calc.test.js) で教科書の値と照合） |
| 目次、テーマの画面の組み立て、つまみ → 計算 → 図の流れ、動く図の再生 | [js/app.js](js/app.js) |
| 図の部品（方眼・矢印・量記号のラベル・角度の弧） | [js/svg.js](js/svg.js) |
| 量記号（斜体・添字）と数値の書き方 | [js/notation.js](js/notation.js) |
| 見た目・色（ライト／ダーク） | [style.css](style.css) |
| オフライン保存 | [sw.js](sw.js)（ファイルを足したら `ASSETS` へ。[tests/offline.test.js](tests/offline.test.js) が照合） |
| 画面に出す版 | [js/version.js](js/version.js) |
| アイコン | [icons/icon.svg](icons/icon.svg) を直して `node tools/make-icons.mjs` |
| 資料（過去問題集）を読む | [tools/reference.swift](tools/reference.swift) |

### テーマの足し方
0. 資料（過去問題集、[AGENTS.md](AGENTS.md) の「資料」）でそのテーマの過去問を探し（`swift tools/reference.swift find <科目> <語>`）、問われ方・記号・単位・典型値を合わせる。本文・図・問題は写さない。
1. `js/calc/` に計算を置き、`tests/calc.test.js` に教科書の値で確かめるテストを足す。
2. `js/topics/` にテーマを置く（`params`・`presets`・`compute`・`draw`・`caption`・`readouts`・`conditions`・`notesHtml`）。交流の時間変化や回転のように、動くこと自体に意味がある図だけ `motion: { draw(g, params, result, time) }` を足す（動く部分だけを描く。開いたら自動で動き、止める／動かすボタンが付く）。
3. `index.html` に `<script>`、`js/app.js` の `SUBJECTS` に登録、`sw.js` の `ASSETS` に追加。
4. `tools/sim/check.mjs` の `TOPICS`（動くなら `MOVING` にも）に追加。

## 検証
```sh
node --test tests/*.test.js
for f in js/*.js js/*/*.js sw.js; do node --check "$f"; done
node ~/.claude/tools/playtest/playtest.mjs .
node tools/sim/check.mjs <出力フォルダ>
```
`tools/sim/check.mjs` は iPhone幅（430×932）のライト・ダークで、目次と全テーマを開き、つまみを両端まで動かし、ボタンを押し、通信を切って開き直す。図の NaN、横のはみ出し、操作中の図の高さの変化、コンソールのエラーを失敗として数え、目次と各テーマを並べた一覧画像（`light.png`・`dark.png`）を書き出す。
配備後は `node tools/sim/check.mjs <出力フォルダ> https://kinokonb.github.io/denken-zukan/` で公開版を同じように確かめ、保存一覧の全ファイルがrepoと同じかも照合する。

## 配備
`main` を push すると GitHub Pages（`main` の直下）が1分ほどで公開する。出荷のたびに `js/version.js` の版を上げ、公開版の目次の下の版表示で確かめる。

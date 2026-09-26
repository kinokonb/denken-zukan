# 製品の事実

- 正本path: `/Users/kinoko/Development/電験ずかん`
- remote: `https://github.com/kinokonb/denken-zukan.git`（public。GitHub Pagesで配信するため、2026-09-26にユーザーが選択）
- 統合branch: `main`
- 起動・配備: 公開版 `open -a "Microsoft Edge" https://kinokonb.github.io/denken-zukan/`、ローカル `open -a "Microsoft Edge" index.html`。`main` へ push すると GitHub Pages に配備される。
- 検証: `node --test tests/*.test.js`、`for f in js/*.js js/*/*.js sw.js; do node --check "$f"; done`、`node ~/.claude/tools/playtest/playtest.mjs .`、`node tools/sim/check.mjs <出力フォルダ>`
- [README](README.md)（変更したい内容 → 担当の表）。仕様・決定・ロードマップ: [SPEC.md](SPEC.md)。検証記録: [docs/verification.md](docs/verification.md)。
- 製品固有条件: 公開repoなので個人データ・秘密情報・教材の転載を入れない。実行時に外部通信・外部ライブラリを使わない（オフラインで動くこと）。計算は `js/calc/` の純粋関数に置き、教科書の値でテストする。図で誇張・省略した所は図か条件欄に書く。
- 資料: ユーザーの過去問題集4冊（Google Drive同期の `マイドライブ/den3-4sub_20221011/`、H23〜R4上期の12回分、電験王ベース）を正の資料にし続ける（2026-09-26 ユーザー指示）。テーマ選び・問われ方・記号・単位・典型値をここで確かめる。読むのは `swift tools/reference.swift toc|pages|find <科目> …`（オンラインのみのファイルなのでサンドボックス外）。本文・図・問題はrepoに写さず、抜き出した文字もcommitしない。
- 共通方針: `~/.claude/CLAUDE.md`。

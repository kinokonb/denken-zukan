// iPhone幅（430×932）で全画面を開き、つまみ・ボタン・オフライン再読み込みを確かめる。
// 使い方: node tools/sim/check.mjs [出力フォルダ] [公開URL]
//   出力フォルダに light.png / dark.png（目次と4テーマを横に並べた一覧）を書き出す。
//   公開URLを渡すと、repoの代わりに公開版を確かめ、sw.js の保存一覧の全ファイルがrepoと同じかも照合する。
// 失敗があれば一覧を出して終了コード1で終わる。playwright は playtest ツールのものを借りる。
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(path.join(os.homedir(), '.claude/tools/playtest/package.json'));
const { chromium } = require('playwright');

const root = fileURLToPath(new URL('../../', import.meta.url));
const outDir = path.resolve(process.argv[2] || os.tmpdir());
const publishedUrl = process.argv[3];
const TOPICS = ['ohm', 'series-parallel', 'electric-power', 'rlc', 'voltage-drop', 'induction-motor', 'power-factor'];
const MOVING = ['ohm', 'series-parallel', 'rlc', 'induction-motor']; // 開いたら自動で動くテーマ
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, rel.endsWith('/') ? `${rel}index.html` : rel);
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = publishedUrl ? publishedUrl.replace(/\/?$/, '/') : `http://127.0.0.1:${server.address().port}/`;

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

if (publishedUrl) {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const assets = [...sw.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  for (const asset of ['sw.js', ...assets.filter((a) => a !== './')]) {
    const response = await fetch(new URL(asset, base), { cache: 'no-store' });
    const published = Buffer.from(await response.arrayBuffer());
    expect(response.ok && published.equals(fs.readFileSync(path.join(root, asset))), `公開版の ${asset} がrepoと違う（${response.status}）`);
  }
}
const browser = await chromium.launch();

async function run(colorScheme) {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const shots = [];

  await page.goto(base);
  await page.waitForFunction(() => document.getElementById('offline-status')?.dataset.state === 'ready', null, { timeout: 15000 })
    .catch(() => expect(false, `${colorScheme}: オフライン保存が ready にならない`));
  expect((await page.locator('.topic-link').count()) === TOPICS.length, `${colorScheme}: 目次のレッスンが ${TOPICS.length} こない`);
  expect(await page.evaluate(() => [...document.querySelectorAll('svg.thumb')].every((svg) => svg.childElementCount > 0)), `${colorScheme}: 目次の小さな図が空`);
  shots.push(await page.screenshot());

  for (const id of TOPICS) {
    await page.goto(`${base}#/topic/${id}`);
    await page.waitForSelector('svg.figure > *');
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      nan: /NaN|Infinity/.test(document.querySelector('svg.figure').outerHTML),
      stage: document.querySelector('.stage').getBoundingClientRect().height,
    }));
    expect(layout.overflow <= 0, `${colorScheme} ${id}: 横にはみ出している（${layout.overflow}px）`);
    expect(!layout.nan, `${colorScheme} ${id}: 図に NaN がある`);
    await checkMotion(page, id, colorScheme);
    shots.push(await page.screenshot());

    // 各つまみを両端へ。図が壊れず、上の図の高さが変わらない（操作中のつまみが動かない）
    const sliders = await page.locator('input[type="range"]').count();
    for (let i = 0; i < sliders; i++) {
      for (const end of ['min', 'max']) {
        const state = await page.evaluate(([index, which]) => {
          const input = document.querySelectorAll('input[type="range"]')[index];
          input.value = input[which];
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return {
            key: input.dataset.key,
            nan: /NaN|Infinity/.test(document.querySelector('svg.figure').outerHTML + document.querySelector('.readouts').textContent),
            stage: document.querySelector('.stage').getBoundingClientRect().height,
            output: document.querySelector(`output[data-key="${input.dataset.key}"]`).textContent,
            captionFits: (() => {
              const caption = document.querySelector('.caption');
              return caption.getBoundingClientRect().height <= parseFloat(getComputedStyle(caption).minHeight) + 0.5;
            })(),
          };
        }, [i, end]);
        expect(!state.nan, `${colorScheme} ${id}: ${state.key}=${end} で NaN`);
        expect(Math.abs(state.stage - layout.stage) < 1, `${colorScheme} ${id}: ${state.key}=${end} で図の高さが ${layout.stage}→${state.stage}`);
        expect(state.captionFits, `${colorScheme} ${id}: ${state.key}=${end} で説明が2行に収まらない`);
      }
    }
    // やってみよう：予想を選ぶと図が変わり（NaNなし・図の高さそのまま）、当たり外れと理由が出て、その問いは締まる
    const tries = await page.locator('.tries li[data-try]').count();
    expect(tries >= 2, `${colorScheme} ${id}: やってみようが2つ未満`);
    for (let i = 0; i < tries; i++) {
      await page.locator('.tries li[data-try]').nth(i).locator('button[data-guess]').last().click();
      const state = await page.evaluate((index) => {
        const item = document.querySelectorAll('.tries li[data-try]')[index];
        return {
          nan: /NaN|Infinity/.test(document.querySelector('svg.figure').outerHTML + document.querySelector('.readouts').textContent),
          look: !item.querySelector('.try-look').hidden && item.querySelector('.verdict').textContent.length > 0,
          closed: [...item.querySelectorAll('button[data-guess]')].every((b) => b.disabled) && item.querySelectorAll('button.correct').length === 1,
          replay: !item.querySelector('.replay').hidden,
          stage: document.querySelector('.stage').getBoundingClientRect().height,
        };
      }, i);
      expect(!state.nan, `${colorScheme} ${id}: やってみよう${i + 1}で NaN`);
      expect(state.look, `${colorScheme} ${id}: やってみよう${i + 1}で当たり外れと理由が出ない`);
      expect(state.closed, `${colorScheme} ${id}: やってみよう${i + 1}の丸つけが正しくない`);
      expect(state.replay, `${colorScheme} ${id}: やってみよう${i + 1}で「もう一度」が出ない`);
      expect(Math.abs(state.stage - layout.stage) < 1, `${colorScheme} ${id}: やってみよう${i + 1}で図の高さが変わる`);
    }
    // 確かめ問題：選ぶと答えが出て、その問題のボタンは押せなくなる
    const questions = await page.locator('.quiz .question').count();
    expect(questions >= 3, `${colorScheme} ${id}: 確かめ問題が3問未満`);
    for (let i = 0; i < questions; i++) {
      await page.locator('.quiz .question').nth(i).locator('button').first().click();
      const answered = await page.evaluate((index) => {
        const item = document.querySelectorAll('.quiz .question')[index];
        return !item.querySelector('.answer').hidden && [...item.querySelectorAll('button')].every((b) => b.disabled) && item.querySelectorAll('button.correct').length === 1;
      }, i);
      expect(answered, `${colorScheme} ${id}: 確かめ問題${i + 1}の答えが正しく出ない`);
    }
    expect((await page.locator('.terms .term').count()) >= 3, `${colorScheme} ${id}: ことばが3つ未満`);
    await page.locator('.terms summary').click();
    expect(await page.locator('.terms').evaluate((d) => d.open), `${colorScheme} ${id}: ことばが開かない`);
    expect((await page.locator('.exam').count()) === 1, `${colorScheme} ${id}: 試験では がない`);

    // ボタンを順に押す（最後は初期値に戻す）
    const buttons = await page.locator('.presets button').count();
    for (let i = 0; i < buttons; i++) {
      await page.locator('.presets button').nth(i).click();
      const nan = await page.evaluate(() => /NaN|Infinity/.test(document.querySelector('svg.figure').outerHTML + document.querySelector('.readouts').textContent));
      expect(!nan, `${colorScheme} ${id}: ボタン${i + 1}で NaN`);
    }
  }

  // 目次に、最後に開いたレッスンが「前回の続き」として出る
  await page.goto(base);
  const resume = await page.locator('.start-link').evaluate((a) => ({ text: a.textContent, href: a.getAttribute('href') }));
  expect(resume.text.includes('前回の続き') && resume.href === `#/topic/${TOPICS[TOPICS.length - 1]}`, `${colorScheme}: 目次に前回の続きが出ない（${resume.text}）`);

  // 通信を切って開き直しても表示できる
  await context.setOffline(true);
  await page.goto(base);
  await page.reload();
  expect((await page.locator('.topic-link').count()) === TOPICS.length, `${colorScheme}: オフラインで目次が開けない`);
  await page.goto(`${base}#/topic/power-factor`);
  await page.reload();
  expect(await page.locator('svg.figure > *').count() > 0, `${colorScheme}: オフラインでテーマが開けない`);
  await context.setOffline(false);

  expect(errors.length === 0, `${colorScheme}: コンソールのエラー ${errors.join(' / ')}`);
  await context.close();
  return shots;
}

// 動くテーマは開いたら動き、「止める」で止まり、「動かす」でまた動く。動かないテーマにはボタンがない
async function checkMotion(page, id, label) {
  const snapshot = () => page.evaluate(() => document.querySelector('svg.figure .motion')?.innerHTML ?? null);
  const toggle = page.locator('.motion-toggle');
  if (!MOVING.includes(id)) {
    expect((await toggle.count()) === 0, `${label} ${id}: 動かないテーマに再生ボタンがある`);
    return;
  }
  const first = await snapshot();
  await page.waitForTimeout(400);
  expect(first !== null && (await snapshot()) !== first, `${label} ${id}: 開いても動いていない`);
  await toggle.click();
  expect((await toggle.textContent()).includes('動かす'), `${label} ${id}: 止めた後のボタンが「動かす」でない`);
  const paused = await snapshot();
  await page.waitForTimeout(400);
  expect((await snapshot()) === paused, `${label} ${id}: 止めても動いている`);
  await toggle.click();
  await page.waitForTimeout(300);
  expect((await snapshot()) !== paused, `${label} ${id}: もう一度押しても動かない`);
}

// 視差効果を減らす設定では、止まった状態で開く
async function checkReducedMotion() {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const id of MOVING) {
    await page.goto(`${base}#/topic/${id}`);
    await page.waitForSelector('svg.figure .motion > *');
    const before = await page.evaluate(() => document.querySelector('svg.figure .motion').innerHTML);
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.querySelector('svg.figure .motion').innerHTML);
    expect(before === after, `視差効果を減らす設定なのに ${id} が動いている`);
    expect((await page.locator('.motion-toggle').textContent()).includes('動かす'), `視差効果を減らす設定で ${id} のボタンが「動かす」でない`);
  }
  await context.close();
}

async function contactSheet(shots, file) {
  const page = await browser.newPage({ viewport: { width: 430 * shots.length * 0.5 + 8 * (shots.length + 1), height: 932 * 0.5 + 16 } });
  const imgs = shots.map((b) => `<img src="data:image/png;base64,${b.toString('base64')}">`).join('');
  await page.setContent(`<style>body{margin:0;padding:8px;display:flex;gap:8px;background:#888}img{width:215px;height:466px}</style>${imgs}`);
  await page.screenshot({ path: file });
  await page.close();
}

await checkReducedMotion();
for (const scheme of ['light', 'dark']) {
  const shots = await run(scheme);
  await contactSheet(shots, path.join(outDir, `${scheme}.png`));
}
await browser.close();
server.close();

if (failures.length) {
  console.log(`NG ${failures.length}件\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK：目次と全${TOPICS.length}レッスン（ライト・ダーク）、動く図の再生・停止、つまみの両端・ボタン・オフライン再読み込み。一覧: ${outDir}/light.png, dark.png`);

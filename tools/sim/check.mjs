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
    await checkMissions(page, id, colorScheme);
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

  // 目次に、最後に開いたレッスンが「前回の続き」として出る。ミッションをクリアしたレッスンには印
  await page.goto(base);
  expect((await page.locator('.cleared-mark').count()) === WITH_MISSIONS.length, `${colorScheme}: 目次にクリアの印が ${WITH_MISSIONS.length} こない`);
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

// ミッション：始める → 動かせるのは1つのつまみだけ → 目盛りを順に動かすと当たりが出る（欄の高さは変わらない）
// → 次へ … 5問でクリアと記録 → 閉じると元に戻る。ミッションのないレッスンには入口がない
const WITH_MISSIONS = TOPICS;
async function checkMissions(page, id, label) {
  const start = page.locator('.mission-start');
  if (!WITH_MISSIONS.includes(id)) {
    expect((await start.count()) === 0, `${label} ${id}: ミッションのないレッスンに入口がある`);
    return;
  }
  await start.click();
  const stageHeight = await page.evaluate(() => document.querySelector('.stage').getBoundingClientRect().height);
  for (let n = 1; n <= 5; n++) {
    const solved = await page.evaluate((expectedHeight) => {
      const inputs = [...document.querySelectorAll('input[type="range"]')];
      const free = inputs.filter((i) => !i.disabled);
      if (free.length !== 1) return { error: `動かせるつまみが ${free.length} 個` };
      const input = free[0];
      const steps = Math.round((Number(input.max) - Number(input.min)) / Number(input.step));
      for (let i = 0; i <= steps; i++) {
        input.value = String(Number(input.min) + i * Number(input.step));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const height = document.querySelector('.stage').getBoundingClientRect().height;
        if (Math.abs(height - expectedHeight) >= 1) return { error: `ミッション中に図の欄の高さが変わる（${expectedHeight}→${height}）` };
        if (/NaN|Infinity/.test(document.querySelector('.mission-panel').textContent)) return { error: 'ミッションの欄に NaN' };
        const panel = document.querySelector('.mission-panel');
        if (panel.classList.contains('solved')) {
          const sub = panel.querySelector('.mission-sub');
          const fits = panel.scrollHeight <= panel.clientHeight + 1 && sub.scrollHeight <= sub.clientHeight + 1;
          return { ok: true, locked: inputs.every((x) => x.disabled), fits, text: panel.querySelector('.mission-text').textContent };
        }
      }
      return { error: '目盛りを全部動かしても当たらない' };
    }, stageHeight);
    expect(solved.ok, `${label} ${id}: ミッション${n}：${solved.error}`);
    if (!solved.ok) {
      await page.locator('.mission-quit').click(); // 開いたままだと後の確かめが隠れた部品を待って止まる
      return;
    }
    expect(solved.locked, `${label} ${id}: ミッション${n}で当たった後もつまみが動く`);
    expect(solved.fits, `${label} ${id}: ミッション${n}「${solved.text}」の理由が欄に収まらない`);
    await page.locator('.mission-next').click();
  }
  const cleared = await page.evaluate(() => ({
    cleared: document.querySelector('.mission-panel').classList.contains('cleared'),
    again: !document.querySelector('.mission-again').hidden,
    record: JSON.parse(localStorage.getItem('denken-zukan:missions') || '{}'),
  }));
  expect(cleared.cleared && cleared.again, `${label} ${id}: 5問の後にクリアともう1セットが出ない`);
  expect(cleared.record[id]?.clears >= 1, `${label} ${id}: クリアが記録されない`);
  await page.locator('.mission-quit').click();
  const closed = await page.evaluate(() => ({
    hidden: document.querySelector('.mission-panel').hidden,
    enabled: [...document.querySelectorAll('input[type="range"]')].every((i) => !i.disabled),
    readouts: getComputedStyle(document.querySelector('.readouts')).display !== 'none',
  }));
  expect(closed.hidden && closed.enabled && closed.readouts, `${label} ${id}: 閉じても元に戻らない`);
}

// 幅の狭い iPhone（375px）で、全問題の文面（目標・今の値・当たりの理由）がミッションの欄に収まる
async function checkMissionTextFits() {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const id of WITH_MISSIONS) {
    await page.goto(`${base}#/topic/${id}`);
    await page.waitForSelector('svg.figure > *');
    await page.locator('.mission-start').click();
    const overflows = await page.evaluate((topicId) => {
      const topic = Object.values(window).find((v) => v && v.id === topicId && v.missions);
      const panel = document.querySelector('.mission-panel');
      const text = panel.querySelector('.mission-text');
      const sub = panel.querySelector('.mission-sub');
      const fits = () => panel.scrollHeight <= panel.clientHeight + 1 && sub.scrollHeight <= sub.clientHeight + 1;
      const bad = [];
      topic.missions.forEach((template) => {
        for (const values of template.cases) {
          const params = { ...Mission.initialParams(topic), ...template.setup(values), [template.free]: template.answer(values) };
          const result = topic.compute(params);
          text.innerHTML = template.text(values);
          sub.innerHTML = `${template.how(values)}　<strong>${template.now(result)}</strong>`;
          if (!fits()) bad.push(`${text.textContent}（今の値）`);
          sub.innerHTML = `<strong>○ ぴったり</strong>　${template.reason(values)}`;
          if (!fits()) bad.push(`${text.textContent}（理由）`);
        }
      });
      return bad;
    }, id);
    expect(overflows.length === 0, `375px の ${id}: 欄に収まらない文面 ${overflows.slice(0, 3).join(' / ')}${overflows.length > 3 ? ` ほか${overflows.length - 3}件` : ''}`);
  }
  await context.close();
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
await checkMissionTextFits();
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

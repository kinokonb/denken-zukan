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
const BASICS = ['math-formula', 'math-proportion', 'math-prefix', 'math-square', 'science-charge', 'science-energy', 'math-pythagoras', 'math-trig', 'math-vector', 'math-wave']; // 基礎（数学・理科）：ミッションのないレッスン
const TOPICS = [...BASICS, 'ohm', 'series-parallel', 'electric-power', 'kirchhoff', 'bridge', 'rlc', 'voltage-drop', 'induction-motor', 'power-factor'];
const MOVING = ['science-charge', 'math-wave', 'ohm', 'series-parallel', 'kirchhoff', 'bridge', 'rlc', 'induction-motor']; // 開いたら自動で動くテーマ
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
    // 説明の形：3行でわかる・図の見かた（印の見本つき）・式・記号の表・試験では の2つの見出し。どこにも undefined や はみ出しがない
    const explain = await page.evaluate(() => {
      const notes = document.querySelector('.notes');
      const exam = document.querySelector('.exam');
      return {
        points: notes.querySelectorAll('.points li').length,
        looks: notes.querySelectorAll('.look li').length,
        emptyMarks: [...notes.querySelectorAll('.look-mark')].filter((svg) => svg.childElementCount === 0).length,
        // 印の色は、付けた量の class の色と同じ（ほかの指定に上書きされていない）
        wrongColors: [...notes.querySelectorAll('.look-mark')].filter((svg) => {
          const probe = document.createElement('span');
          probe.className = [...svg.classList].find((c) => c !== 'look-mark');
          document.body.append(probe);
          const want = getComputedStyle(probe).color;
          probe.remove();
          return getComputedStyle(svg).color !== want;
        }).length,
        formulas: notes.querySelectorAll('.formula-rows li').length,
        symbols: notes.querySelectorAll('.symbol-table tbody tr').length,
        examHeads: exam.querySelectorAll('h3').length,
        bad: /undefined|NaN|\$/.test(notes.textContent + exam.textContent),
        wide: [notes, exam].some((el) => el.scrollWidth > el.clientWidth + 1),
      };
    });
    expect(explain.points === 3 && explain.looks >= 2 && explain.emptyMarks === 0 && explain.wrongColors === 0 && explain.formulas >= 1 && explain.symbols >= 1 && explain.examHeads === 2,
      `${colorScheme} ${id}: 説明の形がそろっていない ${JSON.stringify(explain)}`);
    expect(!explain.bad && !explain.wide, `${colorScheme} ${id}: 説明に undefined・$ の残り・横のはみ出しがある`);

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

// ミッションのないレッスン（基礎）には入口がなく、あるレッスンは準備とミッションを解き切る（checkJobs）
const WITH_MISSIONS = TOPICS.filter((id) => !BASICS.includes(id));
async function checkMissions(page, id, label) {
  if (!WITH_MISSIONS.includes(id)) {
    expect((await page.locator('.mission-start').count()) === 0, `${label} ${id}: ミッションのないレッスンに入口がある`);
    return;
  }
  await checkJobs(page, id, label);
}

// ミッション（現場の依頼）と準備：準備があれば先に準備を全段解き（→「ミッションへ」）、続けてミッション5問を解く。
// 各問で、わざと1回失敗（✗・理由・やり直す。ミッションなら「準備 ○から」も出る）してから答えを入れて成功（○・理由・次へ）。
// 決める部品は実際に操作する（つまみ・＋−・図の電球のタップ）。図の欄の高さは変わらず、図と欄に NaN がなく、文は欄に収まる。
// 終わるとクリアと記録 → 閉じるとレッスンの図・つまみに戻る
async function checkJobs(page, id, label) {
  if (await page.locator('.basics-start').count()) {
    await page.locator('.basics-start').click();
    const steps = await page.evaluate((topicId) => window.Plays[topicId].basics.length, id);
    if (!(await solveJobs(page, id, `${label} 準備`, steps, false))) return;
    const done = await page.evaluate((topicId) => ({
      cleared: document.querySelector('.job-panel').classList.contains('cleared'),
      again: document.querySelector('.job-again').textContent,
      record: JSON.parse(localStorage.getItem('denken-zukan:missions') || '{}')[`${topicId}:basics`],
    }), id);
    expect(done.cleared && done.again.includes('ミッションへ'), `${label} ${id}: 準備の後に「ミッションへ」が出ない`);
    expect(done.record?.clears >= 1, `${label} ${id}: 準備のクリアが記録されない`);
    await page.locator('.job-again').click();
  } else {
    await page.locator('.mission-start').click();
  }
  if (!(await solveJobs(page, id, `${label} ミッション`, 5, true))) return;
  const cleared = await page.evaluate(() => ({
    cleared: document.querySelector('.job-panel').classList.contains('cleared'),
    again: !document.querySelector('.job-again').hidden,
    record: JSON.parse(localStorage.getItem('denken-zukan:missions') || '{}'),
  }));
  expect(cleared.cleared && cleared.again, `${label} ${id}: 5問の後にクリアともう1セットが出ない`);
  expect(cleared.record[id]?.clears >= 1, `${label} ${id}: クリアが記録されない`);
  await page.locator('.job-quit').click();
  const closed = await page.evaluate(() => ({
    panel: document.querySelector('.job-panel').hidden,
    scene: document.querySelector('.job-scene').hasAttribute('hidden'),
    figure: getComputedStyle(document.querySelector('svg.figure')).display !== 'none',
    controls: getComputedStyle(document.querySelector('.controls')).display !== 'none',
  }));
  expect(closed.panel && closed.scene && closed.figure && closed.controls, `${label} ${id}: 閉じてもレッスンの図に戻らない`);
}

// 始まっている1セットを count 問解く。失敗を見つけたら閉じて false
async function solveJobs(page, id, label, count, expectBasicsButton) {
  const stageHeight = await page.evaluate(() => document.querySelector('.stage').getBoundingClientRect().height);
  const current = () => page.evaluate(() => {
    const job = document.querySelector('.job-panel').currentJob;
    return { kind: job.template.kind, answer: job.template.answer(job.values), input: job.input, count: job.template.count, parts: job.template.probe?.parts, needs: job.template.needs };
  });
  const setInput = async (job, value) => {
    if (job.kind === 'dial') {
      // 答えは計算の誤差を含むことがある（3.5000000000000004 など）ので、人がつまみで置けるいちばん近い目盛りに直して入れる
      const input = page.locator('.job-control input');
      const [min, step] = await input.evaluate((el) => [Number(el.min), el.step]);
      const digits = step.includes('.') ? step.split('.')[1].length : 0;
      await input.fill(String(Number((min + Math.round((value - min) / Number(step)) * Number(step)).toFixed(digits))));
    }
    else if (job.kind === 'count') {
      const now = (await current()).input;
      const button = page.locator(`.job-control [data-step="${value > now ? 1 : -1}"]`);
      for (let i = 0; i < Math.abs(value - now); i++) await button.click();
    } else await page.locator(`.job-scene [data-part="${value}"]`).click();
  };
  const runAndRead = async () => {
    await page.locator('.job-run').click();
    await page.waitForFunction(() => !document.querySelector('.job-result').hidden, null, { timeout: 5000 });
    return page.evaluate((expectedHeight) => {
      const panel = document.querySelector('.job-panel');
      const result = panel.querySelector('.job-result');
      return {
        solved: panel.classList.contains('solved'),
        failed: panel.classList.contains('failed'),
        basicsButton: !panel.querySelector('.job-basics').hidden,
        moved: Math.abs(document.querySelector('.stage').getBoundingClientRect().height - expectedHeight) >= 1,
        nan: /NaN|undefined|Infinity/.test(panel.textContent + document.querySelector('.job-scene').innerHTML),
        fits: panel.scrollHeight <= panel.clientHeight + 1 && result.scrollHeight <= result.clientHeight + 1,
        text: result.textContent,
      };
    }, stageHeight);
  };
  for (let n = 1; n <= count; n++) {
    const job = await current();
    const wrong = job.kind === 'dial' ? job.input
      : job.kind === 'count' ? (job.answer < job.count.max ? job.answer + 1 : job.answer - 1)
        : (job.answer + 1) % job.parts;
    await setInput(job, wrong);
    if (job.kind === 'probe') {
      // タップした部品の読み（型の probe.reading が出す文字）が図に出る
      const shown = await page.evaluate((index) => {
        const { template, values } = document.querySelector('.job-panel').currentJob;
        const expected = template.probe.reading(template.probe.measure(values, index));
        return [...document.querySelectorAll('.job-scene text')].some((t) => t.textContent === expected);
      }, wrong);
      expect(shown, `${label} ${id}: ${n}問目：テスターの読みが出ない`);
    }
    const miss = await runAndRead();
    expect(miss.failed && !miss.solved, `${label} ${id}: ${n}問目：まちがった入力で失敗にならない（${miss.text}）`);
    if (expectBasicsButton) expect(miss.basicsButton === (job.needs !== undefined), `${label} ${id}: ${n}問目：失敗の後の「準備 ○から」`);
    await page.locator('.job-retry').click();
    await setInput(job, job.answer);
    const hit = await runAndRead();
    expect(hit.solved, `${label} ${id}: ${n}問目：答えで成功にならない（${hit.text}）`);
    for (const [name, r] of [['失敗', miss], ['成功', hit]]) {
      expect(!r.moved, `${label} ${id}: ${n}問目の${name}で図の欄の高さが変わる`);
      expect(!r.nan, `${label} ${id}: ${n}問目の${name}で NaN`);
      expect(r.fits, `${label} ${id}: ${n}問目の${name}「${r.text}」が欄に収まらない`);
    }
    if (!hit.solved) {
      await page.locator('.job-quit').click(); // 開いたままだと後の確かめが隠れた部品を待って止まる
      return false;
    }
    await page.locator('.job-next').click();
  }
  return true;
}

// 幅の狭い iPhone（375px）で、準備とミッション（現場の依頼）の全問題・全入力の文（依頼・使う知識・結果の理由）が欄に収まる
async function checkJobTextFits(page, id) {
  for (const mode of ['basics', 'mission']) {
    const button = page.locator(mode === 'basics' ? '.basics-start' : '.mission-start');
    if (!(await button.count())) continue;
    await button.click();
    const overflows = await page.evaluate(([topicId, which]) => {
      const play = window.Plays[topicId];
      const panel = document.querySelector('.job-panel');
      const request = panel.querySelector('.job-request');
      const know = panel.querySelector('.job-know');
      const result = panel.querySelector('.job-result');
      const control = panel.querySelector('.job-control');
      const fits = () => panel.scrollHeight <= panel.clientHeight + 1 && result.scrollHeight <= result.clientHeight + 1;
      const bad = [];
      for (const template of which === 'basics' ? play.basics : play.jobs) {
        for (const values of template.cases) {
          request.innerHTML = template.request(values);
          know.hidden = !template.know;
          know.innerHTML = template.know ? `<strong>${template.title}</strong>　${template.know}` : '';
          control.hidden = false;
          result.hidden = true;
          if (!fits()) bad.push(`${request.textContent}（決める時）`);
          control.hidden = true;
          result.hidden = false;
          for (const input of Job.inputs(template)) {
            const r = template.run(values, input);
            result.innerHTML = `<strong>${r.ok ? '○' : '✗'}</strong>　${r.reason}`;
            if (!fits()) bad.push(`${result.textContent}`);
          }
        }
      }
      return [...new Set(bad)];
    }, [id, mode]);
    expect(overflows.length === 0, `375px の ${id}（${mode === 'basics' ? '準備' : 'ミッション'}）: 欄に収まらない文 ${overflows.slice(0, 3).join(' / ')}${overflows.length > 3 ? ` ほか${overflows.length - 3}件` : ''}`);
    await page.locator('.job-quit').click();
  }
}

// 幅の狭い iPhone（375px）で、全レッスンの準備とミッションの文が欄に収まる
async function checkMissionTextFits() {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const id of WITH_MISSIONS) {
    await page.goto(`${base}#/topic/${id}`);
    await page.waitForSelector('svg.figure > *');
    await checkJobTextFits(page, id);
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

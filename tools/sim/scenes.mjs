// 1つのレッスンの図と、ミッション・準備の場面（決める前・入力ごとの結果の後）を並べた画像を、ライト・ダークで書き出す。
// 現場の図を足した時に、文字の重なり・切れを見るため（SPEC の「作業の注意」）。
// 使い方: node tools/sim/scenes.mjs <出力フォルダ> <レッスンid> <Topic名> [図のつまみの組のJSON] [jobs|basics] [型の番号,…]
//   例: node tools/sim/scenes.mjs out magnetic-force TopicMagneticForce '[{},{"r":0.1}]' jobs
//   jobs は図（つまみの組ごと）とミッションの型、basics は準備の段。番号（0から）を渡すとその型・段だけ描く。
//   書き出すのは <jobs|basics>-light.png と <jobs|basics>-dark.png。
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(os.homedir(), '.claude/tools/playtest/package.json'));
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = process.argv[2];
const topicId = process.argv[3];
const topicName = process.argv[4];
const paramSets = JSON.parse(process.argv[5] || '[{}]');
const part = process.argv[6] || 'jobs'; // jobs：図とミッション、basics：準備
const only = process.argv[7] ? process.argv[7].split(',').map(Number) : null; // 描く型の番号（0から）

const browser = await chromium.launch({ args: ['--disable-audio-output'] });
for (const colorScheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, colorScheme });
  await page.goto(`file://${path.join(root, 'index.html')}`);
  await page.waitForTimeout(300);
  await page.evaluate(({ topicId, topicName, paramSets, part, only }) => {
    document.body.innerHTML = '<div id="grid" style="display:grid;grid-template-columns:repeat(4,360px);gap:8px;padding:8px;background:var(--paper)"></div>';
    const grid = document.getElementById('grid');
    const add = (title, viewBox, paint) => {
      const box = document.createElement('div');
      box.innerHTML = `<div style="font:11px sans-serif;color:var(--ink)">${title}</div>`;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${viewBox[0]} ${viewBox[1]}`);
      svg.setAttribute('width', viewBox[0]);
      svg.setAttribute('class', 'job-scene');
      box.appendChild(svg);
      grid.appendChild(box);
      paint(svg);
    };
    const topic = window[topicName];
    const base = Object.fromEntries(topic.params.map((p) => [p.key, p.value]));
    if (part === 'jobs' && !only) for (const set of paramSets) {
      const p = { ...base, ...set };
      add(`図 ${JSON.stringify(set)}`, topic.viewBox, (svg) => topic.draw(svg, p, topic.compute(p)));
    }
    const play = Plays[topicId];
    const scene = (svg, template, values, input, look) => {
      Svg.paper(svg, 360, 270);
      const g = Svg.el(svg, 'g');
      template.draw(g, values, input, look);
    };
    const lookOf = (template, values, input, result) => ({
      deciding: false, switchOn: 1, lamps: result.lamps, broken: { lamps: [], fuse: !!(result.burst && result.burst.fuse) },
      meter: result.meter, reading: result.reading,
      probe: template.kind === 'probe' ? { index: input, needle: template.probe.measure(values, input), reading: template.probe.reading(template.probe.measure(values, input)) } : null,
    });
    const deciding = { deciding: true, switchOn: 0, lamps: [], broken: { lamps: [], fuse: false }, meter: 0, reading: null, probe: null };
    const show = (label, template, values) => {
      const answer = template.answer(values);
      const inputs = template.kind === 'dial' ? [template.dial.min, answer, template.dial.max] : template.kind === 'probe' ? [answer, (answer + 1) % template.probe.parts] : [answer];
      add(`${label} 決める前`, [360, 270], (svg) => scene(svg, template, values, template.kind === 'probe' ? null : inputs[0], deciding));
      for (const input of inputs) {
        const result = template.run(values, input);
        add(`${label} 入力 ${input} ${result.ok ? 'OK' : 'NG'}`, [360, 270], (svg) => scene(svg, template, values, input, lookOf(template, values, input, result)));
      }
    };
    if (part === 'jobs') play.jobs.forEach((template, t) => (only && !only.includes(t)) || show(`依頼${t + 1}`, template, template.cases[1]));
    if (part === 'basics') play.basics.forEach((template, t) => (only && !only.includes(t)) || show(`準備${t + 1}`, template, template.cases[0]));
  }, { topicId, topicName, paramSets, part, only });
  const grid = await page.$('#grid');
  await grid.screenshot({ path: path.join(out, `${part}-${colorScheme}.png`) });
  await page.close();
}
await browser.close();

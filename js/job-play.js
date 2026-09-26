// ミッション（現場の依頼）の画面：欄（依頼・決める部品・スイッチ・結果）と、現場の図の動き。
// スイッチを入れると、レバーが倒れ → 接点が付いた瞬間に一瞬止まり → 電流計の針がバネのように振れて電球が明るくなる。
// 壊れる時は少し遅れて、もう一度止まってから火花と煙が出て図が揺れ、電球が消えて針が 0 に戻る。
// 視差効果を減らす設定では、止まり・揺れ・火花・煙を省き、針と電球はすぐに結果の位置へ行く。
// 出題は js/job.js、結果の計算と現場の図はレッスンごとの遊び（js/plays/<レッスンid>.js）の型（run・draw）が持つ。
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  // スイッチを入れてからの時間割（秒）
  const LEVER = 0.08; // レバーが倒れきって接点が付く
  const CONTACT_STOP = 0.06; // 接点が付いた瞬間の止まり
  const BURST_AFTER = 0.26; // 流れ始めてから壊れるまで
  const BURST_STOP = 0.09; // 壊れた瞬間の止まり
  const RESULT_AFTER = 0.45; // 最後の出来事から結果の欄を出すまで
  // 計器の針は減衰の弱いバネ（行き過ぎてから止まる）。電球の明るさは指数的に目標へ寄る
  const SPRING = 240;
  const DAMPING = 2 * 0.3 * Math.sqrt(SPRING);
  const LAMP_RATE = 14;
  const SHAKE = 7; // 揺れの最大（図の座標）

  function sceneHtml() {
    return `<svg class="job-scene" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="ミッションの現場の図" hidden></svg>`;
  }

  function panelHtml() {
    return `
      <div class="job-panel" hidden>
        <div class="job-head">
          <span class="job-count"></span>
          <span class="job-time"></span>
          <span class="job-combo"></span>
          <span class="job-actions">
            <button type="button" class="job-sound"></button>
            <button type="button" class="job-quit">やめる</button>
          </span>
        </div>
        <p class="job-request"></p>
        <div class="job-body" aria-live="polite">
          <div class="job-control"></div>
          <p class="job-result" hidden></p>
        </div>
        <div class="job-go">
          <button type="button" class="job-run"></button>
          <button type="button" class="job-retry" hidden>やり直す</button>
          <button type="button" class="job-next" hidden></button>
          <button type="button" class="job-again" hidden>もう1セット</button>
        </div>
      </div>`;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // records：{ load() → { レッスンid: { clears, best } }, saveClear(id, 秒) → { clears, best, isBest } }
  // onEnter・onLeave：ミッションに入る時・出る時（レッスンの動く図を止めて、戻す）
  function create({ view, topic, play, records, formatSeconds, onEnter, onLeave }) {
    const lab = view.querySelector('.lab');
    const entry = view.querySelector('.mission-entry');
    const panel = view.querySelector('.job-panel');
    const scene = view.querySelector('.job-scene');
    const $ = (selector) => panel.querySelector(selector);
    Svg.glowDefs(scene);
    const world = Svg.el(scene, 'g');

    let set = null;
    let index = 0;
    let startedAt = 0;
    let timer = null;
    let combo = 0; // 続けて1発で成功した数
    let firstTries = 0; // このセットで1発で成功した数
    let job = null; // 今の問題：{ template, values, input, attempts, phase: 'decide' | 'run' | 'result', result }
    let fx = null; // 図の動きの状態（針・電球・壊れた所・火花・煙・揺れ・浮かぶ文字）
    let frameId = null;
    let lastFrame = null;

    // ---- 図の動き ----

    function freshFx() {
      return {
        time: 0,
        stopLeft: 0,
        contact: false,
        burst: false,
        done: false,
        switchOn: job.template.kind === 'probe' ? 1 : 0, // テスターの型は、スイッチを入れたのにつかない所から始まる
        lamps: [],
        lampTargets: [],
        broken: { lamps: [], fuse: false },
        meter: { x: 0, v: 0, target: 0 },
        probe: null,
        reading: null,
        sparks: [],
        smoke: [],
        pops: [],
        trauma: 0,
        anchors: { lamps: [] },
      };
    }

    function springStep(spring, dt) {
      if (prefersReducedMotion()) {
        spring.x = spring.target;
        spring.v = 0;
        return;
      }
      spring.v += (SPRING * (spring.target - spring.x) - DAMPING * spring.v) * dt;
      spring.x += spring.v * dt;
    }

    function spawnBurst([x, y]) {
      for (let i = 0; i < 24; i++) {
        const angle = -Math.PI * Math.random(); // 上向きの半円に飛ぶ
        const speed = 90 + Math.random() * 190;
        fx.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 0.35 + Math.random() * 0.35 });
      }
      for (let i = 0; i < 5; i++) {
        fx.smoke.push({ x: x + (Math.random() - 0.5) * 10, y, r: 4, age: -i * 0.08, life: 1.2 + Math.random() * 0.4, seed: Math.random() * 6 });
      }
    }

    function addPop(text) {
      const lamps = fx.anchors.lamps;
      const [x, y] = lamps.length > 0 ? lamps[Math.floor(lamps.length / 2)] : [WIDTH / 2, HEIGHT / 2];
      fx.pops.push({ text, x: Math.min(Math.max(x, 60), WIDTH - 60), y: Math.max(y - 34, 24), age: 0, life: 1.1 });
    }

    // スイッチを入れた後の時間割を進める
    function advanceRun(dt) {
      const { result } = job;
      fx.time += dt;
      if (job.template.kind !== 'probe') fx.switchOn = Math.min(1, fx.time / LEVER);
      if (!fx.contact && fx.time >= LEVER) {
        fx.contact = true;
        if (!prefersReducedMotion()) fx.stopLeft = CONTACT_STOP;
        fx.meter.target = result.meter;
        fx.lampTargets = result.lamps.slice();
      }
      if (result.burst && !fx.burst && fx.time >= LEVER + BURST_AFTER) {
        fx.burst = true;
        const at = result.burst.fuse ? fx.anchors.fuse : fx.anchors.lamps[result.burst.lamp];
        if (result.burst.fuse) fx.broken.fuse = true;
        else fx.broken.lamps[result.burst.lamp] = true;
        fx.lamps = fx.lamps.map(() => 0);
        fx.lampTargets = fx.lampTargets.map(() => 0);
        fx.meter.target = 0;
        Sound.play('pop');
        if (!prefersReducedMotion()) {
          fx.stopLeft = BURST_STOP;
          fx.trauma = 0.8;
          spawnBurst(at);
        }
      }
      if (!fx.done && fx.time >= LEVER + (result.burst ? BURST_AFTER : 0) + RESULT_AFTER) {
        fx.done = true;
        showResult();
      }
    }

    function step(dt) {
      // 止まり（ヒットストップ）の間は何も進めない
      if (fx.stopLeft > 0) {
        fx.stopLeft -= dt;
        return;
      }
      if (job.phase === 'run') advanceRun(dt);
      springStep(fx.meter, dt);
      if (fx.probe) springStep(fx.probe, dt);
      const approach = prefersReducedMotion() ? 1 : 1 - Math.exp(-LAMP_RATE * dt);
      fx.lamps = fx.lampTargets.map((target, i) => {
        const now = fx.lamps[i] || 0;
        return Math.abs(target - now) < 1e-3 ? target : now + (target - now) * approach;
      });
      for (const s of fx.sparks) {
        s.age += dt;
        s.vy += 520 * dt; // 重力
        s.vx *= 1 - 2.5 * dt; // 空気抵抗
        s.vy *= 1 - 2.5 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      fx.sparks = fx.sparks.filter((s) => s.age < s.life);
      for (const p of fx.smoke) {
        p.age += dt;
        if (p.age < 0) continue;
        p.y -= 22 * dt;
        p.r += 9 * dt;
      }
      fx.smoke = fx.smoke.filter((p) => p.age < p.life);
      for (const p of fx.pops) p.age += dt;
      fx.pops = fx.pops.filter((p) => p.age < p.life);
      fx.trauma = Math.max(0, fx.trauma - 1.6 * dt);
    }

    function settled() {
      const still = (spring) => Math.abs(spring.target - spring.x) < 1e-3 && Math.abs(spring.v) < 1e-3;
      return job.phase !== 'run' && fx.stopLeft <= 0 && still(fx.meter) && (!fx.probe || still(fx.probe))
        && fx.lamps.every((level, i) => level === fx.lampTargets[i])
        && fx.sparks.length === 0 && fx.smoke.length === 0 && fx.pops.length === 0 && fx.trauma === 0;
    }

    function draw() {
      Svg.clear(world);
      Svg.paper(world, WIDTH, HEIGHT);
      // 揺れは紙の上の回路だけに付ける（揺れの大きさは trauma の2乗）
      const shake = SHAKE * fx.trauma * fx.trauma;
      const content = Svg.el(world, 'g', {
        transform: shake > 0 ? `translate(${((Math.random() * 2 - 1) * shake).toFixed(2)} ${((Math.random() * 2 - 1) * shake).toFixed(2)})` : null,
      });
      const look = {
        switchOn: fx.switchOn,
        lamps: fx.lamps,
        broken: fx.broken,
        meter: fx.meter.x,
        reading: fx.reading,
        probe: fx.probe && { index: fx.probe.index, needle: fx.probe.x, reading: fx.probe.reading },
        deciding: job.phase === 'decide',
      };
      fx.anchors = job.template.draw(content, job.values, job.input, look);
      const effects = Svg.el(content, 'g', { class: 'job-fx' });
      for (const s of fx.sparks) {
        Svg.el(effects, 'line', { x1: s.x, y1: s.y, x2: s.x - s.vx * 0.035, y2: s.y - s.vy * 0.035, class: 'spark', opacity: (1 - s.age / s.life).toFixed(2) });
      }
      for (const p of fx.smoke) {
        if (p.age < 0) continue;
        Svg.el(effects, 'circle', { cx: p.x + Math.sin(p.age * 3 + p.seed) * 4, cy: p.y, r: p.r, class: 'smoke', opacity: (0.45 * (1 - p.age / p.life)).toFixed(2) });
      }
      for (const p of fx.pops) {
        // 浮かぶ文字：出た瞬間は大きく、すぐ元の大きさに縮んで上へ流れ、最後に消える
        const scale = p.age < 0.12 ? 1.7 - 0.7 * (p.age / 0.12) : 1;
        const fade = p.age > p.life - 0.35 ? (p.life - p.age) / 0.35 : 1;
        Svg.el(effects, 'text', {
          transform: `translate(${p.x} ${(p.y - 16 * p.age).toFixed(1)}) scale(${scale.toFixed(2)})`,
          class: 'job-pop', 'text-anchor': 'middle', 'dominant-baseline': 'middle', opacity: fade.toFixed(2),
        }, p.text);
      }
    }

    function frame(now) {
      if (!scene.isConnected) {
        frameId = null;
        return;
      }
      const dt = lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      step(dt);
      draw();
      if (settled()) {
        frameId = null;
        return;
      }
      frameId = requestAnimationFrame(frame);
    }

    // 動きを始める（止まっていれば）。決めている間の入力の変化は draw だけで足りる
    function animate() {
      if (frameId !== null) return;
      lastFrame = null;
      frameId = requestAnimationFrame(frame);
    }

    // ---- 欄 ----

    function showRecord() {
      const record = records.load()[topic.id];
      entry.querySelector('.mission-record').textContent = record ? `クリア ${record.clears}回・ベスト ${formatSeconds(record.best)}` : 'まだクリアなし';
    }

    function showSoundButton() {
      const on = Sound.enabled();
      $('.job-sound').textContent = on ? '♪ オン' : '♪ オフ';
      $('.job-sound').setAttribute('aria-pressed', String(on));
    }

    function showTime() {
      if (!panel.isConnected) {
        clearInterval(timer);
        return;
      }
      $('.job-time').textContent = formatSeconds((performance.now() - startedAt) / 1000);
    }

    function showInput() {
      const { template } = job;
      if (template.kind === 'dial') {
        const { unit, min, max } = template.dial;
        const input = $('.job-control input');
        input.value = String(job.input);
        input.style.setProperty('--fill', `${((job.input - min) / (max - min)) * 100}%`);
        $('.job-control output').textContent = `${job.input} ${unit}`;
      } else if (template.kind === 'count') {
        $('.job-control output').textContent = `${job.input}個`;
        $('.job-control [data-step="-1"]').disabled = job.input <= template.count.min;
        $('.job-control [data-step="1"]').disabled = job.input >= template.count.max;
      }
      $('.job-run').disabled = template.kind === 'probe' && job.input === null;
    }

    function renderControl() {
      const { template } = job;
      const control = $('.job-control');
      if (template.kind === 'dial') {
        const { name, symbol, min, max, step } = template.dial;
        control.innerHTML = `
          <label class="job-dial">
            <span class="job-dial-name">${name} ${Notation.html(symbol)}</span>
            <input type="range" min="${min}" max="${max}" step="${step}">
            <output></output>
          </label>`;
      } else if (template.kind === 'count') {
        control.innerHTML = `
          <div class="job-stepper">
            <button type="button" data-step="-1" aria-label="1個へらす">−</button>
            <output></output>
            <button type="button" data-step="1" aria-label="1個ふやす">＋</button>
          </div>`;
      } else {
        control.innerHTML = '<p class="job-hint">電球をタップすると、テスターがその電球にかかる電圧を測る</p>';
      }
    }

    // 決めている間：部品を動かせ、スイッチを押せる
    function showDeciding() {
      job.phase = 'decide';
      panel.classList.remove('solved', 'failed');
      $('.job-control').hidden = false;
      for (const control of $('.job-control').querySelectorAll('input, button')) control.disabled = false;
      $('.job-result').hidden = true;
      $('.job-run').hidden = false;
      $('.job-run').textContent = job.template.action || 'スイッチを入れる';
      $('.job-retry').hidden = true;
      $('.job-next').hidden = true;
      showInput();
    }

    function showJob() {
      const item = set[index];
      const template = play.jobs[item.templateIndex];
      job = { template, values: item.values, input: item.start, attempts: 0, phase: 'decide', result: null };
      panel.currentJob = job; // 検査（tools/sim/check.mjs）が今の問題を知るため
      panel.dataset.kind = template.kind;
      fx = freshFx();
      $('.job-count').textContent = `ミッション ${index + 1} / ${set.length}`;
      $('.job-request').innerHTML = template.request(item.values);
      renderControl();
      showDeciding();
      draw();
    }

    function run() {
      if (!job || job.phase !== 'decide' || $('.job-run').disabled) return;
      job.attempts += 1;
      job.result = job.template.run(job.values, job.input);
      job.phase = 'run';
      for (const control of $('.job-control').querySelectorAll('input, button')) control.disabled = true;
      $('.job-run').disabled = true;
      fx.time = 0;
      Sound.play('click');
      animate();
    }

    function showResult() {
      job.phase = 'result';
      const { result } = job;
      fx.reading = result.reading;
      const first = result.ok && job.attempts === 1;
      combo = first ? combo + 1 : 0;
      if (first) firstTries += 1;
      panel.classList.toggle('solved', result.ok);
      panel.classList.toggle('failed', !result.ok);
      $('.job-combo').textContent = combo >= 2 ? `コンボ ${combo}` : '';
      $('.job-result').innerHTML = `<strong>${result.ok ? '○' : '✗'}</strong>　${result.reason}`;
      $('.job-control').hidden = true;
      $('.job-result').hidden = false;
      $('.job-run').hidden = true;
      $('.job-retry').hidden = result.ok;
      $('.job-next').hidden = !result.ok;
      $('.job-next').textContent = index + 1 < set.length ? '次へ ›' : 'けっか ›';
      if (result.ok) {
        Sound.play(combo >= 2 ? 'combo' : 'ok');
        if (first) addPop(combo >= 2 ? `1発！ ${combo}連続` : '1発！');
      } else if (!result.burst) {
        Sound.play('dim');
      }
      animate();
    }

    // やり直し：壊れた部品は新しくし、決めた値はそのまま残す（テスターは外す）
    function retry() {
      fx = freshFx();
      if (job.template.kind === 'probe') job.input = null;
      showDeciding();
      draw();
    }

    function next() {
      index += 1;
      if (index < set.length) showJob();
      else finish();
    }

    function finish() {
      clearInterval(timer);
      const seconds = (performance.now() - startedAt) / 1000;
      const record = records.saveClear(topic.id, seconds);
      set = null;
      panel.classList.remove('solved', 'failed');
      panel.classList.add('cleared');
      $('.job-count').textContent = 'クリア';
      $('.job-time').textContent = formatSeconds(seconds);
      $('.job-combo').textContent = '';
      $('.job-request').textContent = `${Job.SET_SIZE}問クリア！ ${formatSeconds(seconds)}　1発 ${firstTries} / ${Job.SET_SIZE}`;
      $('.job-result').textContent = record.isBest ? `ベスト更新（クリア ${record.clears}回目）` : `ベスト ${formatSeconds(record.best)}（クリア ${record.clears}回目）`;
      $('.job-result').hidden = false;
      $('.job-control').hidden = true;
      $('.job-next').hidden = true;
      $('.job-again').hidden = false;
      $('.job-quit').textContent = '閉じる';
      Sound.play('combo');
      showRecord();
    }

    function begin() {
      set = Job.buildSet(play.jobs);
      index = 0;
      combo = 0;
      firstTries = 0;
      startedAt = performance.now();
      clearInterval(timer);
      timer = setInterval(showTime, 500);
      showTime();
      lab.classList.add('in-job');
      onEnter();
      panel.hidden = false;
      scene.toggleAttribute('hidden', false); // SVG の要素には hidden プロパティがないので属性で切り替える
      panel.classList.remove('cleared');
      $('.job-again').hidden = true;
      $('.job-quit').textContent = 'やめる';
      $('.job-combo').textContent = '';
      showSoundButton();
      showJob();
    }

    function quit() {
      clearInterval(timer);
      cancelAnimationFrame(frameId);
      frameId = null;
      set = null;
      job = null;
      panel.currentJob = null;
      panel.hidden = true;
      scene.toggleAttribute('hidden', true);
      lab.classList.remove('in-job');
      onLeave();
    }

    // テスター：決めている間に電球をタップすると、その電球にかかる電圧を測る（選んだ電球が「交換」の相手になる）
    function probe(i) {
      if (!job || job.phase !== 'decide' || job.template.kind !== 'probe') return;
      job.input = i;
      const volts = job.template.probe.measure(job.values, i);
      fx.probe = { index: i, x: fx.probe ? fx.probe.x : 0, v: 0, target: volts, reading: `${Notation.number(volts, 0)} V` };
      Sound.play('tick');
      showInput();
      draw();
      animate();
    }

    $('.job-control').addEventListener('input', (event) => {
      if (!job || event.target.type !== 'range') return;
      job.input = event.target.valueAsNumber;
      showInput();
      draw();
    });
    $('.job-control').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-step]');
      if (!button || !job) return;
      const { min, max } = job.template.count;
      job.input = Math.min(max, Math.max(min, job.input + Number(button.dataset.step)));
      showInput();
      draw();
    });
    scene.addEventListener('click', (event) => {
      const part = event.target.closest('[data-part]');
      if (part) probe(Number(part.dataset.part));
    });
    $('.job-run').addEventListener('click', run);
    $('.job-retry').addEventListener('click', retry);
    $('.job-next').addEventListener('click', next);
    $('.job-again').addEventListener('click', begin);
    $('.job-quit').addEventListener('click', quit);
    $('.job-sound').addEventListener('click', () => {
      Sound.setEnabled(!Sound.enabled());
      showSoundButton();
      Sound.play('tick');
    });
    entry.querySelector('.mission-start').addEventListener('click', begin);
    showRecord();
  }

  global.JobPlay = { sceneHtml, panelHtml, create };
})(this);

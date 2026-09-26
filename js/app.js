// 画面：目次とテーマのページ、つまみ → 計算 → 図の更新、動く図の再生、オフライン保存の状態表示。
// 各テーマの中身（数値・図・文章）は js/topics/*.js、計算は js/calc/*.js が持つ。
// 動くこと自体に意味がある図（交流の時間変化・回転）は、テーマの motion が動く部分だけを描き、開いたら自動で動く。
(function () {
  'use strict';

  // 科目 › 単元 › レッスン。学ぶ順（前提になるものが先）に並べる。番号は科目ごとの通し番号
  const SUBJECTS = [
    {
      id: 'kiso', mark: '基', name: '基礎', summary: '電気に要る数学と理科。知識ゼロから',
      units: [
        { name: '数と式', topics: [TopicMathFormula, TopicMathProportion, TopicMathPrefix, TopicMathSquare] },
        { name: '理科', topics: [TopicScienceCharge, TopicScienceEnergy] },
        { name: '図形と波', topics: [TopicMathPythagoras, TopicMathTrig, TopicMathVector, TopicMathWave] },
      ],
    },
    {
      id: 'riron', mark: '理', name: '理論', summary: '電気・磁気・回路の基本。ほかの3科目の土台',
      units: [
        { name: '直流回路', topics: [TopicOhm, TopicSeriesParallel, TopicElectricPower, TopicKirchhoff] },
        { name: '交流回路', topics: [TopicRlc] },
      ],
    },
    { id: 'denryoku', mark: '電', name: '電力', summary: '発電・変電・送電・配電', units: [{ name: '送電・配電', topics: [TopicVoltageDrop] }] },
    { id: 'kikai', mark: '機', name: '機械', summary: 'モータ・変圧器・パワエレ', units: [{ name: '誘導機', topics: [TopicInductionMotor] }] },
    { id: 'hoki', mark: '法', name: '法規', summary: '法令と施設管理の計算', units: [{ name: '電気設備管理（計算）', topics: [TopicPowerFactor] }] },
  ];
  const ALL_TOPICS = SUBJECTS.flatMap((subject) => {
    let number = 0;
    return subject.units.flatMap((unit) => unit.topics.map((topic) => ({ subject, unit, topic, number: ++number })));
  });

  const OFFLINE_TEXT = {
    checking: 'オフライン用に保存しています…',
    ready: '✓ オフラインで使えます',
    unavailable: 'この開き方ではオフライン保存しません',
    failed: 'オフライン保存に失敗しました。通信のある所で開き直してください',
  };

  const view = document.getElementById('view');
  let offlineState = 'checking';

  function initialParams(topic) {
    return Object.fromEntries(topic.params.map((param) => [param.key, param.value]));
  }

  // 止まっている部分を描き、動く部分（motion）はいちばん上の層に time 秒の姿で描く
  function drawFigure(svg, topic, params, time) {
    const [width, height] = topic.viewBox;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    Svg.clear(svg);
    const result = topic.compute(params);
    topic.draw(svg, params, result);
    const motionLayer = topic.motion ? Svg.el(svg, 'g', { class: 'motion' }) : null;
    if (motionLayer) topic.motion.draw(motionLayer, params, result, time);
    return { result, motionLayer };
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---- 目次 ----

  function renderHome() {
    document.title = '電験ずかん';
    view.innerHTML = `
      <header class="masthead">
        <p class="overline">電験の4科目</p>
        <h1>電験ずかん</h1>
        <p class="tagline">理論・電力・機械・法規を、数値を動かしながら図で見る。</p>
        <ul class="color-key" aria-label="図の色の決まり">
          <li class="q-current">電流</li>
          <li class="q-voltage">電圧</li>
          <li class="q-active">抵抗・有効分</li>
          <li class="q-reactive">リアクタンス・無効分</li>
          <li class="q-mech">機械の量</li>
        </ul>
      </header>
      ${startHtml()}
      ${SUBJECTS.map(subjectHtml).join('')}
      <p class="install-hint" hidden>ホーム画面に追加すると、アプリのように全画面で開けて、ネットがなくても確実に使えます。共有ボタン →「ホーム画面に追加」。</p>
      <footer class="app-footer">
        <span>v${APP_VERSION}</span>
        <span id="offline-status"></span>
      </footer>`;
    for (const svg of view.querySelectorAll('svg.thumb')) {
      const { topic } = ALL_TOPICS.find((entry) => entry.topic.id === svg.dataset.topic);
      drawFigure(svg, topic, initialParams(topic), 0);
    }
    view.querySelector('.install-hint').hidden = !shouldSuggestInstall();
    showOfflineState();
  }

  // 前回開いたレッスンがあれば、それを1タップで開けるようにする（端末のブラウザにだけ覚える）
  const LAST_LESSON_KEY = 'denken-zukan:last-lesson';

  function rememberLesson(id) {
    try { localStorage.setItem(LAST_LESSON_KEY, id); } catch { /* 保存できない開き方でも使える */ }
  }

  function lastLesson() {
    try { return ALL_TOPICS.find((entry) => entry.topic.id === localStorage.getItem(LAST_LESSON_KEY)) || null; } catch { return null; }
  }

  function startHtml() {
    const last = lastLesson();
    if (last) {
      return `
        <section class="start">
          <a class="start-link" href="#/topic/${last.topic.id}"><span class="start-label">前回の続き</span>${last.subject.name}${last.number}　${last.topic.title} ›</a>
        </section>`;
    }
    return `
      <section class="start">
        <p><strong>はじめての人へ</strong>　基礎（数学・理科）から順に進み、理論へ。理論が電験の土台で、ほかの科目の図も読めるようになる。</p>
        <a class="start-link" href="#/topic/${ALL_TOPICS[0].topic.id}"><span class="start-label">はじめる</span>${ALL_TOPICS[0].subject.name}${ALL_TOPICS[0].number}　${ALL_TOPICS[0].topic.title} ›</a>
      </section>`;
  }

  function subjectHtml(subject) {
    return `
      <section class="subject" aria-labelledby="subject-${subject.id}">
        <h2 class="subject-head" id="subject-${subject.id}">
          <span class="seal" aria-hidden="true">${subject.mark}</span>
          <span class="subject-name">${subject.name}</span>
          <span class="subject-summary">${subject.summary}</span>
        </h2>
        ${subject.units.map((unit) => `
          <h3 class="unit-head">${unit.name}</h3>
          <ul class="topic-list">
            ${ALL_TOPICS.filter((entry) => entry.unit === unit).map(({ topic, number }) => `
              <li>
                <a class="topic-link" href="#/topic/${topic.id}">
                  <svg class="thumb" data-topic="${topic.id}" aria-hidden="true"></svg>
                  <span class="topic-text">
                    <span class="topic-number">${subject.name}${number}${missionRecords()[topic.id] ? '<span class="cleared-mark">ミッション ○</span>' : ''}</span>
                    <span class="topic-title">${topic.title}</span>
                    <span class="topic-lead">${topic.lead}</span>
                  </span>
                </a>
              </li>`).join('')}
          </ul>`).join('')}
      </section>`;
  }

  function shouldSuggestInstall() {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    return isIos && !standalone && location.protocol !== 'file:';
  }

  // ---- テーマのページ ----

  function renderTopic({ subject, unit, topic, number }) {
    document.title = `${topic.title} – 電験ずかん`;
    rememberLesson(topic.id);
    const params = initialParams(topic);
    const play = window.Plays?.[topic.id]; // ミッション（現場の依頼）のあるレッスンだけ（js/plays/）
    const index = ALL_TOPICS.findIndex((entry) => entry.topic === topic);
    const next = ALL_TOPICS[(index + 1) % ALL_TOPICS.length];

    view.innerHTML = `
      <nav class="topbar">
        <a class="back" href="#/">‹ 目次</a>
        <span class="crumb"><span class="seal small" aria-hidden="true">${subject.mark}</span>${subject.name}${number}・${unit.name}</span>
      </nav>
      <header class="topic-head">
        <h1>${topic.title}</h1>
        <p class="lead">${topic.lead}</p>
      </header>
      ${termsHtml(topic)}
      <section class="lab">
        <div class="stage">
          <figure class="figure-card">
            <svg class="figure" role="img" aria-label="${topic.title}の図"></svg>
            ${play ? JobPlay.sceneHtml() : ''}
            <figcaption class="caption">
              <span class="caption-text" aria-live="polite"></span>
              ${topic.motion ? '<button type="button" class="motion-toggle"></button>' : ''}
            </figcaption>
          </figure>
          <dl class="readouts"></dl>
          ${play ? JobPlay.panelHtml() : ''}
        </div>
        ${play ? `
          <section class="mission-entry">
            ${play?.basics ? `<button type="button" class="basics-start">準備 ${play.basics.length}問（前提の知識）</button>` : ''}
            <button type="button" class="mission-start">ミッション ${Job.SET_SIZE}問に挑戦</button>
            <span class="mission-record"></span>
          </section>` : ''}
        ${triesHtml(topic)}
        <div class="controls">
          ${topic.params.map(controlHtml).join('')}
          <div class="presets">
            ${topic.presets.map((preset, i) => `<button type="button" data-preset="${i}">${preset.name}</button>`).join('')}
            <button type="button" class="reset" data-reset>初期値に戻す</button>
          </div>
          <p class="conditions">${topic.conditions}</p>
        </div>
      </section>
      ${explainHtml(topic)}
      ${quizHtml(topic)}
      ${examHtml(topic)}
      <nav class="next">
        <a href="#/topic/${next.topic.id}"><span class="next-label">次のレッスン（${next.subject.name}${next.number}・${next.unit.name}）</span>${next.topic.title} ›</a>
      </nav>`;

    const svg = view.querySelector('svg.figure');
    const caption = view.querySelector('.caption-text');
    const readouts = view.querySelector('.readouts');
    const inputs = [...view.querySelectorAll('input[type="range"]')];
    let figure = null;
    const motion = createMotion(topic, svg, () => ({ params, figure }));

    function update() {
      figure = drawFigure(svg, topic, params, motion.time());
      const { result } = figure;
      caption.innerHTML = topic.caption(params, result);
      readouts.innerHTML = topic.readouts(params, result).map(readoutHtml).join('');
      for (const input of inputs) {
        const param = topic.params.find((p) => p.key === input.dataset.key);
        const value = params[param.key];
        const unit = param.unit ? ` ${param.unit}` : '';
        view.querySelector(`output[data-key="${param.key}"]`).textContent = `${Notation.number(value, Notation.decimalsOf(param.step))}${unit}`;
        input.style.setProperty('--fill', `${((value - param.min) / (param.max - param.min)) * 100}%`);
      }
    }

    // つまみを動かした値は、入力欄が丸めた値（step・範囲に合わせた値）をそのまま使う
    function setParam(key, value) {
      const input = inputs.find((i) => i.dataset.key === key);
      input.value = String(value);
      params[key] = input.valueAsNumber;
    }

    // ミッション（現場の依頼）の間は、レッスンの動く図を止めておく
    if (play) {
      JobPlay.create({
        view, topic, play, formatSeconds,
        records: { load: missionRecords, saveClear: saveMissionClear },
        onEnter: motion.hold,
        onLeave: motion.release,
      });
    }

    for (const input of inputs) {
      input.addEventListener('input', () => {
        params[input.dataset.key] = input.valueAsNumber;
        update();
      });
    }
    view.querySelector('.presets').addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const changes = button.hasAttribute('data-reset') ? initialParams(topic) : topic.presets[Number(button.dataset.preset)].apply({ ...params });
      for (const [key, value] of Object.entries(changes)) setParam(key, value);
      update();
    });

    // やってみよう：先に予想を選ぶと、初期値から指定の値に変えて図を動かし、当たり外れと理由を出す
    view.querySelector('.tries')?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-guess], button[data-replay]');
      if (!button) return;
      const item = button.closest('li');
      const step = topic.tries[Number(item.dataset.try)];
      for (const [key, value] of Object.entries({ ...initialParams(topic), ...step.set })) setParam(key, value);
      update();
      if (button.hasAttribute('data-replay')) return;
      markAnswer(item, Number(button.dataset.guess), step.answer, step.choices, 'guess');
      item.querySelector('.try-look').hidden = false;
      item.querySelector('.replay').hidden = false;
    });

    // 確かめ問題：1回選んだら答えと理由を出して、その問題は締める
    view.querySelector('.quiz')?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-choice]');
      if (!button) return;
      const item = button.closest('.question');
      const question = topic.quiz[Number(item.dataset.question)];
      markAnswer(item, Number(button.dataset.choice), question.answer, question.choices, 'choice');
      const answer = item.querySelector('.answer');
      answer.insertAdjacentHTML('beforeend', `　${question.why}`);
      answer.hidden = false;
    });

    update();
    motion.start();
  }

  // ---- ミッション（つまみを動かして目標に合わせる1セット） ----

  // クリアの記録（端末のブラウザにだけ覚える）：{ レッスンid: { clears, best（秒） } }
  const MISSION_RECORD_KEY = 'denken-zukan:missions';

  function missionRecords() {
    try { return JSON.parse(localStorage.getItem(MISSION_RECORD_KEY)) || {}; } catch { return {}; }
  }

  function saveMissionClear(id, seconds) {
    const records = missionRecords();
    const before = records[id] || { clears: 0, best: null };
    const isBest = before.best === null || seconds < before.best;
    records[id] = { clears: before.clears + 1, best: isBest ? seconds : before.best };
    try { localStorage.setItem(MISSION_RECORD_KEY, JSON.stringify(records)); } catch { /* 保存できない開き方でも遊べる */ }
    return { ...records[id], isBest };
  }

  function formatSeconds(seconds) {
    const whole = Math.round(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  // 動く図の再生。time は再生している間だけ進む（止めると、その瞬間の姿で止まる）。
  // 視差効果を減らす設定の時は止めた状態で開く。ページを離れたら（図が画面から外れたら）止まる。
  function createMotion(topic, svg, current) {
    const button = view.querySelector('.motion-toggle');
    let time = 0;
    let playing = false;
    let frameId = null;
    let lastFrame = null;

    function showButton() {
      if (!button) return;
      button.textContent = playing ? '⏸ 止める' : '▶ 動かす';
      button.setAttribute('aria-pressed', String(playing));
    }

    function frame(now) {
      if (!svg.isConnected) return;
      // 画面を裏にしていた間の空白で一気に進まないよう、1コマは0.1秒まで
      if (lastFrame !== null) time += Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;
      const { params, figure } = current();
      Svg.clear(figure.motionLayer);
      topic.motion.draw(figure.motionLayer, params, figure.result, time);
      frameId = requestAnimationFrame(frame);
    }

    function play() {
      playing = true;
      lastFrame = null;
      frameId = requestAnimationFrame(frame);
      showButton();
    }

    function pause() {
      playing = false;
      cancelAnimationFrame(frameId);
      showButton();
    }

    if (button) button.addEventListener('click', () => (playing ? pause() : play()));

    let heldWhilePlaying = false;

    return {
      time: () => time,
      start() {
        if (!topic.motion) return;
        if (prefersReducedMotion()) showButton();
        else play();
      },
      // ほかの画面（ミッション）を出している間だけ止め、戻ったら止める前の状態に戻す
      hold() {
        heldWhilePlaying = playing;
        if (playing) pause();
      },
      release() {
        if (heldWhilePlaying) play();
        heldWhilePlaying = false;
      },
    };
  }

  // 丸つけ：選んだものと正解に印をつけ、その問いは締める。結果の一言は .verdict に出す
  function markAnswer(item, chosen, correct, choices, attribute) {
    const buttons = [...item.querySelectorAll(`button[data-${attribute}]`)];
    buttons.forEach((b) => { b.disabled = true; });
    buttons[correct].classList.add('correct');
    buttons[chosen].classList.add('chosen');
    const verdict = item.querySelector('.verdict');
    verdict.innerHTML = chosen === correct ? '<strong>○ 当たり</strong>' : `<strong>✗ 実は「${choices[correct]}」</strong>`;
    item.classList.add(chosen === correct ? 'hit' : 'miss');
  }

  // ことばは図を遠ざけないよう、用語名だけを見せてたたんでおく（押すと開く）
  function termsHtml(topic) {
    if (!topic.terms) return '';
    const names = topic.terms.map(([word]) => word.replace(/<[^>]+>/g, '').replace(/\s.*$/, '')).join('・');
    return `
      <details class="terms">
        <summary><span class="terms-title">ことば</span><span class="terms-names">${names}</span></summary>
        <dl>${topic.terms.map(([word, meaning]) => `<div class="term"><dt>${word}</dt><dd>${meaning}</dd></div>`).join('')}</dl>
      </details>`;
  }

  const MARKS = ['①', '②', '③', '④'];

  function choicesHtml(choices, attribute) {
    return `<div class="choices">${choices.map((choice, j) => `<button type="button" data-${attribute}="${j}"><span class="mark" aria-hidden="true">${MARKS[j]}</span>${choice}</button>`).join('')}</div>`;
  }

  function triesHtml(topic) {
    if (!topic.tries) return '';
    return `
      <section class="tries">
        <h2>やってみよう<span class="section-note">予想を選ぶと、図がその通りに動く</span></h2>
        <ol>${topic.tries.map((step, i) => `
          <li data-try="${i}">
            <p class="try-text">${step.text}</p>
            ${choicesHtml(step.choices, 'guess')}
            <p class="try-look" hidden><span class="verdict"></span>　${step.look}</p>
            <button type="button" class="replay" data-replay hidden>もう一度この状態にする</button>
          </li>`).join('')}
        </ol>
      </section>`;
  }

  // ---- 説明（3行でわかる・図の見かた・式と記号）と試験では ----
  // どのレッスンも同じ形で組み立てる。文の中の $R_1$ は量記号（斜体・添字）にする

  function rich(text) {
    return text.replace(/\$([^$]+)\$/g, (_, symbol) => Notation.html(symbol));
  }

  // 図の見かたの印（図の中の描き方と同じ形の小さな見本）。色は量の色の class で決まる
  const LOOK_MARKS = {
    dots: '<circle cx="5" cy="7" r="2.4"/><circle cx="14" cy="7" r="2.4"/><circle cx="23" cy="7" r="2.4"/>',
    arrow: '<line x1="2" y1="7" x2="21" y2="7"/><polygon points="28,7 20,3 20,11"/>',
    dashed: '<line x1="2" y1="7" x2="21" y2="7" stroke-dasharray="4 3"/><polygon points="28,7 20,3 20,11"/>',
    line: '<line x1="2" y1="7" x2="28" y2="7"/>',
    curve: '<path d="M2,12 Q16,12 28,2" class="open"/>',
    bar: '<rect x="2" y="3" width="26" height="8" rx="1" class="soft"/>',
    area: '<rect x="4" y="2" width="20" height="10" class="soft"/>',
    dot: '<circle cx="15" cy="7" r="4"/>',
    ring: '<circle cx="15" cy="7" r="4.5" class="open"/>',
    arc: '<path d="M8,12 A10,10 0 0 1 18,2" class="open"/>',
    text: '<rect x="9" y="2" width="10" height="10" rx="2"/>',
  };

  function explainHtml(topic) {
    const { points, look, formulas, symbols } = topic.explain;
    return `
      <article class="notes">
        <h2>3行でわかる</h2>
        <ol class="points">${points.map((point) => `<li>${rich(point)}</li>`).join('')}</ol>
        <h2>図の見かた</h2>
        <ul class="look">
          ${look.map(([mark, cls, text]) => `<li><svg class="look-mark ${cls}" viewBox="0 0 30 14" aria-hidden="true">${LOOK_MARKS[mark]}</svg><span>${rich(text)}</span></li>`).join('')}
        </ul>
        <h2>式</h2>
        <ul class="formula-rows">
          ${formulas.map(([formula, say, when]) => `<li><span class="formula">${Notation.html(formula)}</span><span class="say">${rich(say)}</span><span class="when">使う時：${rich(when)}</span></li>`).join('')}
        </ul>
        <table class="symbol-table">
          <thead><tr><th>記号</th><th>意味</th><th>単位</th></tr></thead>
          <tbody>${symbols.map(([symbol, meaning, unit]) => `<tr><td>${Notation.html(symbol)}</td><td>${rich(meaning)}</td><td>${unit}</td></tr>`).join('')}</tbody>
        </table>
      </article>`;
  }

  function examHtml(topic) {
    const { lead, often, traps } = topic.exam;
    const list = (items) => `<ul>${items.map((item) => `<li>${rich(item)}</li>`).join('')}</ul>`;
    return `
      <section class="exam">
        <h2>試験では</h2>
        <p>${rich(lead)}</p>
        <h3>よく出る形</h3>
        ${list(often)}
        <h3>まちがえやすい所</h3>
        ${list(traps)}
      </section>`;
  }

  function quizHtml(topic) {
    if (!topic.quiz) return '';
    return `
      <section class="quiz">
        <h2>確かめ問題<span class="section-note">ふり返り</span></h2>
        <ol>${topic.quiz.map((question, i) => `
          <li class="question" data-question="${i}">
            <p class="q">${question.q}</p>
            ${choicesHtml(question.choices, 'choice')}
            <p class="answer" hidden aria-live="polite"><span class="verdict"></span></p>
          </li>`).join('')}
        </ol>
      </section>`;
  }

  function controlHtml(param) {
    return `
      <label class="control">
        <span class="control-name">${param.name}<span class="symbol">${Notation.html(param.symbol)}</span></span>
        <output data-key="${param.key}"></output>
        <input type="range" data-key="${param.key}" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}">
      </label>`;
  }

  function readoutHtml(item) {
    return `
      <div class="readout ${item.cls || ''}">
        <dt>${item.name}<span class="symbol">${Notation.html(item.symbol)}</span></dt>
        <dd><span class="value">${item.value}</span><span class="unit">${item.unit}</span></dd>
      </div>`;
  }

  // ---- 画面の切り替え ----

  function route() {
    const match = location.hash.match(/^#\/topic\/([\w-]+)$/);
    const entry = match && ALL_TOPICS.find((e) => e.topic.id === match[1]);
    if (entry) renderTopic(entry);
    else renderHome();
    window.scrollTo(0, 0);
  }

  // ---- オフライン保存（Service Worker） ----

  function showOfflineState() {
    const status = document.getElementById('offline-status');
    if (!status) return;
    status.textContent = OFFLINE_TEXT[offlineState];
    status.dataset.state = offlineState;
  }

  function registerOffline() {
    if (location.protocol === 'file:' || !('serviceWorker' in navigator)) {
      offlineState = 'unavailable';
      showOfflineState();
      return;
    }
    navigator.serviceWorker
      .register('sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        offlineState = 'ready';
        showOfflineState();
      })
      .catch(() => {
        offlineState = 'failed';
        showOfflineState();
      });
  }

  window.addEventListener('hashchange', route);
  route();
  registerOffline();
})();

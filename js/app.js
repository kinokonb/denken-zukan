// 画面：目次とテーマのページ、つまみ → 計算 → 図の更新、オフライン保存の状態表示。
// 各テーマの中身（数値・図・文章）は js/topics/*.js、計算は js/calc/*.js が持つ。
(function () {
  'use strict';

  const SUBJECTS = [
    { id: 'riron', mark: '理', name: '理論', summary: '電気・磁気・回路の基本', topics: [TopicRlc] },
    { id: 'denryoku', mark: '電', name: '電力', summary: '発電・変電・送電・配電', topics: [TopicVoltageDrop] },
    { id: 'kikai', mark: '機', name: '機械', summary: 'モータ・変圧器・パワエレ', topics: [TopicInductionMotor] },
    { id: 'hoki', mark: '法', name: '法規', summary: '法令と施設管理の計算', topics: [TopicPowerFactor] },
  ];
  const ALL_TOPICS = SUBJECTS.flatMap((subject) => subject.topics.map((topic) => ({ subject, topic })));

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

  function drawFigure(svg, topic, params) {
    const [width, height] = topic.viewBox;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    Svg.clear(svg);
    const result = topic.compute(params);
    topic.draw(svg, params, result);
    return result;
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
      ${SUBJECTS.map(subjectHtml).join('')}
      <p class="install-hint" hidden>ホーム画面に追加すると、アプリのように全画面で開けて、ネットがなくても確実に使えます。共有ボタン →「ホーム画面に追加」。</p>
      <footer class="app-footer">
        <span>v${APP_VERSION}</span>
        <span id="offline-status"></span>
      </footer>`;
    for (const svg of view.querySelectorAll('svg.thumb')) {
      const { topic } = ALL_TOPICS.find((entry) => entry.topic.id === svg.dataset.topic);
      drawFigure(svg, topic, initialParams(topic));
    }
    view.querySelector('.install-hint').hidden = !shouldSuggestInstall();
    showOfflineState();
  }

  function subjectHtml(subject) {
    return `
      <section class="subject" aria-labelledby="subject-${subject.id}">
        <h2 class="subject-head" id="subject-${subject.id}">
          <span class="seal" aria-hidden="true">${subject.mark}</span>
          <span class="subject-name">${subject.name}</span>
          <span class="subject-summary">${subject.summary}</span>
        </h2>
        <ul class="topic-list">
          ${subject.topics.map((topic) => `
            <li>
              <a class="topic-link" href="#/topic/${topic.id}">
                <svg class="thumb" data-topic="${topic.id}" aria-hidden="true"></svg>
                <span class="topic-text">
                  <span class="topic-title">${topic.title}</span>
                  <span class="topic-lead">${topic.lead}</span>
                </span>
              </a>
            </li>`).join('')}
        </ul>
      </section>`;
  }

  function shouldSuggestInstall() {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    return isIos && !standalone && location.protocol !== 'file:';
  }

  // ---- テーマのページ ----

  function renderTopic(subject, topic) {
    document.title = `${topic.title} – 電験ずかん`;
    const params = initialParams(topic);
    const index = ALL_TOPICS.findIndex((entry) => entry.topic === topic);
    const next = ALL_TOPICS[(index + 1) % ALL_TOPICS.length];

    view.innerHTML = `
      <nav class="topbar">
        <a class="back" href="#/">‹ 目次</a>
        <span class="crumb"><span class="seal small" aria-hidden="true">${subject.mark}</span>${subject.name}</span>
      </nav>
      <header class="topic-head">
        <h1>${topic.title}</h1>
        <p class="lead">${topic.lead}</p>
      </header>
      <section class="lab">
        <div class="stage">
          <figure class="figure-card">
            <svg class="figure" role="img" aria-label="${topic.title}の図"></svg>
            <figcaption class="caption" aria-live="polite"></figcaption>
          </figure>
          <dl class="readouts"></dl>
        </div>
        <div class="controls">
          ${topic.params.map(controlHtml).join('')}
          <div class="presets">
            ${topic.presets.map((preset, i) => `<button type="button" data-preset="${i}">${preset.name}</button>`).join('')}
            <button type="button" class="reset" data-reset>初期値に戻す</button>
          </div>
          <p class="conditions">${topic.conditions}</p>
        </div>
      </section>
      <article class="notes">${topic.notesHtml}</article>
      <nav class="next">
        <a href="#/topic/${next.topic.id}"><span class="next-label">次のテーマ（${next.subject.name}）</span>${next.topic.title} ›</a>
      </nav>`;

    const svg = view.querySelector('svg.figure');
    const caption = view.querySelector('.caption');
    const readouts = view.querySelector('.readouts');
    const inputs = [...view.querySelectorAll('input[type="range"]')];

    function update() {
      const result = drawFigure(svg, topic, params);
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

    update();
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
    if (entry) renderTopic(entry.subject, entry.topic);
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

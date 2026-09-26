// 効果音。WebAudio で合成するので音のファイルがいらず、オフラインでも鳴る。ミッションの「音」ボタンで切り替え、端末のブラウザに覚える
(function (global) {
  'use strict';

  const KEY = 'denken-zukan:sound';
  let context = null;

  function enabled() {
    try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
  }

  function setEnabled(on) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* 覚えられない開き方でも、今の画面では切り替わる */ }
  }

  // 最初に音を出す時（ボタンを押した時）に作る。ブラウザは操作の後でないと音を出させないため
  function audio() {
    if (!context) {
      const AudioContext = global.AudioContext || global.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone(ctx, { type = 'sine', from, to = from, start = 0, length, gain }) {
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + length);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + length + 0.02);
  }

  // だんだん消えるザーッという音（火花・接点）
  function crackle(ctx, { length, gain, filter = 'bandpass', frequency }) {
    const frames = Math.floor(ctx.sampleRate * length);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const shape = ctx.createBiquadFilter();
    shape.type = filter;
    shape.frequency.value = frequency;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(shape).connect(amp).connect(ctx.destination);
    source.start();
  }

  const SOUNDS = {
    // スイッチの「カチッ」
    click(ctx) {
      crackle(ctx, { length: 0.03, gain: 0.6, filter: 'highpass', frequency: 2500 });
      tone(ctx, { type: 'square', from: 1600, to: 700, length: 0.025, gain: 0.04 });
    },
    // テスターを当てた
    tick(ctx) {
      tone(ctx, { type: 'triangle', from: 1500, length: 0.04, gain: 0.07 });
    },
    // 成功
    ok(ctx) {
      tone(ctx, { type: 'triangle', from: 880, length: 0.12, gain: 0.12 });
      tone(ctx, { type: 'triangle', from: 1318.5, start: 0.08, length: 0.22, gain: 0.12 });
    },
    // 続けて1発で成功
    combo(ctx) {
      tone(ctx, { type: 'triangle', from: 880, length: 0.1, gain: 0.11 });
      tone(ctx, { type: 'triangle', from: 1108.7, start: 0.07, length: 0.1, gain: 0.11 });
      tone(ctx, { type: 'triangle', from: 1318.5, start: 0.14, length: 0.26, gain: 0.12 });
    },
    // 失敗（何も壊れない時）
    dim(ctx) {
      tone(ctx, { from: 330, to: 220, length: 0.24, gain: 0.08 });
    },
    // 電球が切れる・ヒューズが飛ぶ「バチッ」
    pop(ctx) {
      crackle(ctx, { length: 0.28, gain: 1.1, frequency: 1800 });
      tone(ctx, { from: 140, to: 45, length: 0.2, gain: 0.3 });
    },
  };

  function play(name) {
    if (!enabled()) return;
    const ctx = audio();
    if (ctx) SOUNDS[name](ctx);
  }

  global.Sound = { play, enabled, setEnabled };
})(this);

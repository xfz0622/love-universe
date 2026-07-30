/* ===== 【我们的恋爱小宇宙】游戏音效模块 ===== */
const SFX = {
  ctx: null,
  enabled: true,

  // 初始化音频上下文（必须在用户交互后调用）
  init() {
    if (this.ctx) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.ctx = new AudioContext();
      return true;
    } catch (e) {
      console.warn('SFX init failed:', e);
      return false;
    }
  },

  // 用户第一次点击时初始化
  ensureInit() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  setEnabled(v) { this.enabled = v; },
  isEnabled() { return this.enabled; },

  _now() { return this.ctx ? this.ctx.currentTime : 0; },

  _osc(type, freq, start, duration, gain = 0.1, fadeOut = true) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(gain, start);
    if (fadeOut) g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  },

  _noise(duration, start, gain = 0.15) {
    if (!this.ctx || !this.enabled) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    src.buffer = buffer;
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(start);
  },

  // 短促点击反馈
  tap() {
    this.ensureInit();
    const t = this._now();
    this._osc('sine', 800, t, 0.06, 0.12);
  },

  // 摇骰子：连续短促碰撞声
  shake() {
    this.ensureInit();
    if (!this.ctx || !this.enabled) return;
    const t = this._now();
    const count = 12;
    for (let i = 0; i < count; i++) {
      const start = t + i * 0.045;
      this._noise(0.05, start, 0.08);
      this._osc('triangle', 120 + Math.random() * 200, start, 0.04, 0.06);
    }
  },

  // 开盅：清脆揭开声
  cupOpen() {
    this.ensureInit();
    const t = this._now();
    this._noise(0.08, t, 0.1);
    this._osc('sine', 600, t, 0.1, 0.12);
    this._osc('sine', 900, t + 0.04, 0.1, 0.08);
  },

  // 胜利：明亮三音阶
  win() {
    this.ensureInit();
    const t = this._now();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      this._osc('sine', freq, t + i * 0.08, 0.35, 0.12);
      this._osc('triangle', freq, t + i * 0.08, 0.25, 0.06);
    });
  },

  // 失败/输了：低沉下行
  lose() {
    this.ensureInit();
    const t = this._now();
    [392, 311, 233].forEach((freq, i) => {
      this._osc('sawtooth', freq, t + i * 0.12, 0.35, 0.08);
    });
  },

  // 答题正确：清脆叮
  correct() {
    this.ensureInit();
    const t = this._now();
    this._osc('sine', 880, t, 0.12, 0.15);
    this._osc('sine', 1760, t + 0.06, 0.2, 0.08);
  },

  // 答题错误：低沉嗡
  wrong() {
    this.ensureInit();
    const t = this._now();
    this._osc('sawtooth', 150, t, 0.25, 0.12);
    this._osc('square', 100, t + 0.08, 0.25, 0.08);
  },

  // 翻牌/抽题：轻快手风琴式
  flip() {
    this.ensureInit();
    const t = this._now();
    this._noise(0.06, t, 0.08);
    this._osc('sine', 520, t + 0.02, 0.15, 0.1);
    this._osc('sine', 740, t + 0.06, 0.15, 0.08);
  },

  // 口算提交：短促确认
  submit() {
    this.ensureInit();
    const t = this._now();
    this._osc('sine', 660, t, 0.08, 0.1);
  },

  // 游戏结束：根据输赢
  finish(isWin) {
    isWin ? this.win() : this.lose();
  }
};

// 全局点击自动初始化音效
window.addEventListener('pointerdown', () => SFX.ensureInit(), { once: true });

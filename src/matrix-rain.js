/**
 * Matrix Rain — canvas falling chars. ES module, zero deps.
 */

export class MatrixRain {
  static DEFAULT_CHARS = [
    "0", "1", "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ",
    "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト", "ヴ", "ヵ", "ヶ",
    "■", "█", "▓", "▒", "░", "Ξ", "ℙ", "𝔹", "ー", "ヽ", "ヾ"
  ];

  /** @param {Partial<MatrixRainOptions>} [options] */
  constructor(options = {}) {
    this.opts = { ...DEFAULTS, ...options };

    this.canvas = null;
    this.ctx = null;
    this._raf = null;
    this._running = false;

    this._columns = 0;
    this._drops = [];
    this._speeds = [];
    this._counts = [];
    this._chars = [];
    this._brightHead = [];
    this._lastSwitch = [];

    this._dpr = 1;
    this._w = 0;
    this._h = 0;
    this._lastTs = 0;
    this._onResize = null;
    this._onVis = this._onVis.bind(this);
  }

  /** @param {HTMLElement} [parent] */
  mount(parent = document.body) {
    if (this.canvas) return this;

    const c = document.createElement("canvas");
    c.className = "matrix-rain-canvas";
    c.setAttribute("aria-hidden", "true");
    Object.assign(c.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      display: "block"
    });

    let container = c;
    if (this.opts.blurPx > 0) {
      const wrap = document.createElement("div");
      wrap.className = "matrix-rain-wrapper";
      wrap.setAttribute("aria-hidden", "true");
      Object.assign(wrap.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: `${this.opts.heightVh}vh`,
        pointerEvents: this.opts.pointerEvents,
        zIndex: String(this.opts.zIndex),
        overflow: "hidden",
        filter: `blur(${this.opts.blurPx}px)`,
        transform: "translateZ(0)"
      });
      wrap.appendChild(c);
      container = wrap;
    } else {
      Object.assign(c.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: `${this.opts.heightVh}vh`,
        pointerEvents: this.opts.pointerEvents,
        zIndex: String(this.opts.zIndex)
      });
    }

    parent.appendChild(container);

    const ctx = c.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("MatrixRain: Canvas 2D unavailable");

    this.canvas = c;
    this.ctx = ctx;

    this._setupCanvas();
    this._initColumns();

    window.addEventListener("resize", (this._onResize = this._createResizeHandler()));
    if (this.opts.autoPauseOnHidden) {
      document.addEventListener("visibilitychange", this._onVis);
    }

    this.start();
    return this;
  }

  start() {
    if (!this.ctx || this._running) return this;
    this._running = true;
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame((t) => this._draw(t));
    return this;
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    return this;
  }

  destroy() {
    this.stop();
    if (this.opts.autoPauseOnHidden) document.removeEventListener("visibilitychange", this._onVis);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
    const el = this.canvas?.parentElement?.classList?.contains("matrix-rain-wrapper")
      ? this.canvas.parentElement
      : this.canvas;
    el?.remove();
    this.canvas = null;
    this.ctx = null;
    return this;
  }

  _setupCanvas() {
    const { fontSize, heightVh, bgColor, dprCap } = this.opts;

    const cssW = window.innerWidth;
    const cssH = Math.round((heightVh * window.innerHeight) / 100);
    const dpr = clamp(window.devicePixelRatio || 1, 1, dprCap);

    this._dpr = dpr;
    this._w = cssW;
    this._h = cssH;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.ctx.font = `${fontSize}px ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, cssW, cssH);
  }

  _initColumns() {
    const { fontSize, columnSpacing, minSpeed, maxSpeed, minChars, maxChars, chars } = this.opts;

    const spacingPx = fontSize * columnSpacing;
    const cols = Math.max(1, Math.floor(this._w / spacingPx));
    const now = performance.now();

    this._columns = cols;
    this._drops = new Array(cols);
    this._speeds = new Array(cols);
    this._counts = new Array(cols);
    this._chars = new Array(cols);
    this._brightHead = new Array(cols);
    this._lastSwitch = new Array(cols);

    for (let i = 0; i < cols; i++) {
      const spread = (i / cols) * this._h * 1.2;
      this._drops[i] = -this._h * 0.2 + spread * 0.5 + Math.random() * (this._h * 0.3);
      this._speeds[i] = minSpeed + Math.random() * (maxSpeed - minSpeed);

      const n = randInt(minChars, maxChars);
      this._counts[i] = n;

      const arr = new Array(n);
      for (let j = 0; j < n; j++) arr[j] = chars[randInt(0, chars.length - 1)];
      this._chars[i] = arr;
      this._brightHead[i] = Math.random() < this.opts.headBrightChance;
      this._lastSwitch[i] = now;
    }
  }

  _draw(ts) {
    if (!this._running || !this.ctx) return;

    const { bgColor, matrixColor, headColor, fontSize, columnSpacing, charSpacingY, charSwitchMs, chars, minSpeed, maxSpeed, minChars, maxChars } = this.opts;
    const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
    this._lastTs = ts;

    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;
    const spacingX = fontSize * columnSpacing;
    const cols = this._columns;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < cols; i++) {
      const x = i * spacingX;
      let y = this._drops[i];
      const n = this._counts[i];
      const arr = this._chars[i];

      if (ts - this._lastSwitch[i] >= charSwitchMs) {
        for (let j = 0; j < n; j++) arr[j] = chars[randInt(0, chars.length - 1)];
        this._brightHead[i] = Math.random() < this.opts.headBrightChance;
        this._lastSwitch[i] = ts;
      }

      ctx.globalAlpha = 1;

      for (let j = 0; j < n; j++) {
        const cy = y - j * charSpacingY;
        if (cy < -charSpacingY || cy > h + charSpacingY) continue;

        const isHead = j === 0;
        ctx.fillStyle = isHead && this._brightHead[i] ? headColor : matrixColor;
        ctx.globalAlpha = clamp(1 - j / n, 0.25, 0.9);
        ctx.fillText(arr[j], x, cy);
      }

      this._drops[i] += this._speeds[i] * charSpacingY * dt;
      y = this._drops[i];

      const resetThreshold = h + n * charSpacingY;
      if (y > resetThreshold && Math.random() > 0.98) {
        this._drops[i] = Math.random() * -200;
        this._speeds[i] = minSpeed + Math.random() * (maxSpeed - minSpeed);

        const newN = randInt(minChars, maxChars);
        this._counts[i] = newN;

        const newArr = new Array(newN);
        for (let j = 0; j < newN; j++) newArr[j] = chars[randInt(0, chars.length - 1)];
        this._chars[i] = newArr;
        this._brightHead[i] = Math.random() < this.opts.headBrightChance;
        this._lastSwitch[i] = ts;
      }
    }

    this._raf = requestAnimationFrame((t) => this._draw(t));
  }

  _createResizeHandler() {
    let t = null;
    const delay = this.opts.resizeDebounceMs;

    return () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!this.canvas || !this.ctx) return;
        const wasRunning = this._running;
        this.stop();
        this._setupCanvas();
        this._initColumns();
        if (wasRunning) this.start();
      }, delay);
    };
  }

  _onVis() {
    document.hidden ? this.stop() : this.start();
  }
}

const DEFAULTS = {
  heightVh: 100,
  fontSize: 18,
  columnSpacing: 4,
  charSpacingY: 24,
  minChars: 2,
  maxChars: 12,
  minSpeed: 2,
  maxSpeed: 8,
  charSwitchMs: 200,
  headBrightChance: 0.5,
  bgColor: "#000000",
  matrixColor: "#6EE7B7",
  headColor: "#F0D84D",
  blurPx: 0.5,
  zIndex: -1,
  pointerEvents: "none",
  dprCap: 2,
  autoPauseOnHidden: true,
  resizeDebounceMs: 200,
  chars: MatrixRain.DEFAULT_CHARS
};

/** @typedef {{ heightVh?: number, fontSize?: number, columnSpacing?: number, charSpacingY?: number, minChars?: number, maxChars?: number, minSpeed?: number, maxSpeed?: number, charSwitchMs?: number, headBrightChance?: number, bgColor?: string, matrixColor?: string, headColor?: string, blurPx?: number, zIndex?: number, pointerEvents?: string, dprCap?: number, autoPauseOnHidden?: boolean, resizeDebounceMs?: number, chars?: string[] }} MatrixRainOptions */

function randInt(min, max) {
  return (Math.random() * (max - min + 1) + min) | 0;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

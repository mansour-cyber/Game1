// game.js — Main Game class: bootstraps all systems, runs the loop

import { SaveSystem }    from './save.js';
import { AudioSystem }   from './audio.js';
import { InputSystem }   from './input.js';
import { UISystem }      from './ui.js';
import { LevelManager }  from './levelManager.js';
import { StateManager, STATE } from './stateManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W = canvas.width;   // 800
    this.H = canvas.height;  // 500

    // Systems (initialized in init())
    this.save         = null;
    this.audio        = null;
    this.input        = null;
    this.ui           = null;
    this.levelManager = null;
    this.state        = null;

    // UI button registry — rebuilt every render frame
    this._uiButtons = [];

    // Loop
    this._running  = false;
    this._lastTime = 0;
    this._boundLoop = this._loop.bind(this);
    this._musicStarted = false;
  }

  // ── Bootstrap ─────────────────────────────────────────
  init() {
    // 1. Pure-data systems (no DOM needed)
    this.save  = new SaveSystem();
    this.audio = new AudioSystem();
    this.audio.setEnabled(this.save.getSoundOn());

    // 2. Input (needs canvas)
    this.input = new InputSystem(this.canvas);

    // 3. UI (needs game reference for button hit-testing)
    this.ui = new UISystem(this);

    // 4. Level & state managers
    this.levelManager = new LevelManager(this);
    this.state        = new StateManager(this);

    // 5. Click routing: canvas click → UISystem button list
    this.canvas.addEventListener('click', (e) => {
      this._handleClick(e);
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._handleTouchEnd(e);
    }, { passive: false });

    // 6. First user-gesture → start audio
    const startAudio = () => {
      if (!this._musicStarted) {
        this._musicStarted = true;
        if (this.save.getSoundOn()) this.audio.startMusic();
        // Remove after first interaction
        window.removeEventListener('keydown', startAudio);
        window.removeEventListener('click',   startAudio);
        window.removeEventListener('touchstart', startAudio);
      }
    };
    window.addEventListener('keydown',   startAudio, { once: true });
    window.addEventListener('click',     startAudio, { once: true });
    window.addEventListener('touchstart',startAudio, { once: true });

    // 7. Start state machine
    this.state.setState(STATE.MENU);

    // 8. Game loop
    this._running  = true;
    this._lastTime = performance.now();
    requestAnimationFrame(this._boundLoop);
  }

  // ── Main loop ─────────────────────────────────────────
  _loop(timestamp) {
    if (!this._running) return;

    // Delta time — capped to 100ms to prevent physics explosions on tab-switch
    const rawDt = (timestamp - this._lastTime) / 1000;
    const dt = Math.min(rawDt, 0.1);
    this._lastTime = timestamp;

    this._update(dt);
    this._render();

    // Clear per-frame input state AFTER everything processed
    this.input.endFrame();

    requestAnimationFrame(this._boundLoop);
  }

  _update(dt) {
    this.state.update(dt);
  }

  _render() {
    const ctx = this.ctx;
    // Clear
    ctx.clearRect(0, 0, this.W, this.H);
    // Delegate to state machine
    this.state.render(ctx);
  }

  // ── Click routing ─────────────────────────────────────
  _handleClick(e) {
    const r   = this.canvas.getBoundingClientRect();
    const scX = this.W / r.width;
    const scY = this.H / r.height;
    const x   = (e.clientX - r.left) * scX;
    const y   = (e.clientY - r.top)  * scY;
    this._dispatchUIClick(x, y);
  }

  _handleTouchEnd(e) {
    const r   = this.canvas.getBoundingClientRect();
    const scX = this.W / r.width;
    const scY = this.H / r.height;
    for (const t of e.changedTouches) {
      const x = (t.clientX - r.left) * scX;
      const y = (t.clientY - r.top)  * scY;
      this._dispatchUIClick(x, y);
    }
  }

  /**
   * Walk the _uiButtons list (populated each frame during render)
   * and fire the first matching button's callback.
   */
  _dispatchUIClick(x, y) {
    for (const btn of this._uiButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (typeof btn.cb === 'function') btn.cb();
        break; // only fire first hit
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────
  destroy() {
    this._running = false;
    this.input.destroy();
    this.audio.stopMusic();
  }
}

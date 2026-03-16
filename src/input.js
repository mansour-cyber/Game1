// input.js — Unified keyboard + mouse/touch input
// Tracks held keys and clicked positions. Never accumulates duplicate listeners.

export class InputSystem {
  constructor(canvas) {
    this.canvas = canvas;

    // Keyboard state
    this.keys = {};          // code → held
    this.justPressed = {};   // code → consumed once
    this._keysDown = {};     // raw set for justPressed tracking

    // Mouse / touch
    this.mouseX = 0;
    this.mouseY = 0;
    this.clicks = [];        // Array of {x,y} — consumed by game each frame

    // Virtual button state (mobile)
    this.vLeft  = false;
    this.vRight = false;
    this.vJump  = false;
    this.vAction = false;

    this._setupListeners();
  }

  // ── Setup ─────────────────────────────────────────────
  _setupListeners() {
    // Keyboard
    this._onKeyDown = (e) => {
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this._keysDown[e.code]) {
        this.justPressed[e.code] = true;
      }
      this._keysDown[e.code] = true;
      this.keys[e.code] = true;
    };
    this._onKeyUp = (e) => {
      this._keysDown[e.code] = false;
      this.keys[e.code] = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);

    // Canvas click
    this._onClick = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width  / r.width;
      const scaleY = this.canvas.height / r.height;
      const x = (e.clientX - r.left) * scaleX;
      const y = (e.clientY - r.top)  * scaleY;
      this.clicks.push({ x, y });
    };
    this.canvas.addEventListener('click', this._onClick);

    // Canvas mousemove
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (this.canvas.width  / r.width);
      this.mouseY = (e.clientY - r.top)  * (this.canvas.height / r.height);
    };
    this.canvas.addEventListener('mousemove', this._onMouseMove);

    // Touch tap on canvas
    this._onTouchEnd = (e) => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width  / r.width;
      const scaleY = this.canvas.height / r.height;
      for (const t of e.changedTouches) {
        this.clicks.push({
          x: (t.clientX - r.left) * scaleX,
          y: (t.clientY - r.top)  * scaleY,
        });
      }
    };
    this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });

    // Virtual buttons
    this._setupVirtualButtons();
  }

  _setupVirtualButtons() {
    const map = [
      ['vbtn-left',   () => { this.vLeft  = true;  }, () => { this.vLeft  = false; }],
      ['vbtn-right',  () => { this.vRight = true;  }, () => { this.vRight = false; }],
      ['vbtn-jump',   () => { this.vJump  = true; this.justPressed['Space'] = true; },
                      () => { this.vJump  = false; }],
      ['vbtn-action', () => { this.vAction = true; this.justPressed['KeyE'] = true; },
                      () => { this.vAction = false; }],
    ];
    for (const [id, onDown, onUp] of map) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
      el.addEventListener('touchend',   (e) => { e.preventDefault(); onUp();   }, { passive: false });
      el.addEventListener('mousedown',  onDown);
      el.addEventListener('mouseup',    onUp);
    }
  }

  // ── Per-frame API ─────────────────────────────────────

  /** Returns true while key is held. Also checks virtual buttons for directional. */
  held(code) {
    if (code === 'ArrowLeft'  || code === 'KeyA') return this.keys[code] || this.keys['ArrowLeft'] || this.keys['KeyA'] || this.vLeft;
    if (code === 'ArrowRight' || code === 'KeyD') return this.keys[code] || this.keys['ArrowRight'] || this.keys['KeyD'] || this.vRight;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      return this.keys[code] || this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.vJump;
    }
    return !!this.keys[code];
  }

  /** Returns true once per press, then resets. */
  pressed(code) {
    if (this.justPressed[code]) {
      delete this.justPressed[code];
      return true;
    }
    return false;
  }

  /** Consume all clicks and return them. */
  consumeClicks() {
    const c = this.clicks.slice();
    this.clicks.length = 0;
    return c;
  }

  /** Call at start of each frame to clear one-frame state. */
  endFrame() {
    // justPressed consumed by pressed() calls — any leftovers cleared here
    this.justPressed = {};
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    this.canvas.removeEventListener('click',     this._onClick);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('touchend',  this._onTouchEnd);
  }
}

// audio.js — Web Audio API synthesizer (zero asset files needed)
// All sounds are generated procedurally. Safe start/stop, no stacking.

export class AudioSystem {
  constructor() {
    this._ctx = null;
    this._bgGain = null;
    this._bgTimer = null;
    this._enabled = true;
    this._bgPlaying = false;
  }

  // ── Enable / disable ──────────────────────────────────
  setEnabled(val) {
    this._enabled = !!val;
    if (!this._enabled) {
      this._stopBg();
    } else {
      this._startBg();
    }
  }

  isEnabled() { return this._enabled; }

  // ── Lazy AudioContext (needs user gesture first) ──────
  _ctx_get() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) { return null; }
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  // ── Core tone synthesizer ─────────────────────────────
  _tone(freq, dur, type = 'sine', vol = 0.3, when = 0) {
    if (!this._enabled) return;
    const ctx = this._ctx_get();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // ── Sound effects ─────────────────────────────────────
  sfxJump() {
    this._tone(350, 0.08, 'square', 0.18);
    this._tone(500, 0.10, 'square', 0.15, 0.07);
  }

  sfxCollect() {
    this._tone(900, 0.06, 'sine', 0.28);
    this._tone(1200, 0.10, 'sine', 0.22, 0.05);
  }

  sfxWin() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.25, 'sine', 0.35, i * 0.12));
  }

  sfxFail() {
    this._tone(280, 0.10, 'sawtooth', 0.28);
    this._tone(200, 0.15, 'sawtooth', 0.25, 0.10);
    this._tone(140, 0.25, 'sawtooth', 0.22, 0.22);
  }

  sfxClick() {
    this._tone(900, 0.05, 'sine', 0.18);
  }

  sfxHit() {
    this._tone(180, 0.12, 'sawtooth', 0.3);
    this._tone(120, 0.18, 'sawtooth', 0.25, 0.08);
  }

  sfxCorrect() {
    this._tone(660, 0.08, 'sine', 0.25);
    this._tone(880, 0.12, 'sine', 0.22, 0.07);
  }

  sfxWrong() {
    this._tone(220, 0.15, 'sawtooth', 0.28);
  }

  sfxPop() {
    this._tone(600, 0.05, 'triangle', 0.2);
    this._tone(200, 0.08, 'triangle', 0.15, 0.04);
  }

  sfxFunny() {
    [440, 494, 440, 392].forEach((f, i) => this._tone(f, 0.12, 'triangle', 0.22, i * 0.10));
  }

  // ── Background music ──────────────────────────────────
  // A simple cheerful looping arpeggio
  _startBg() {
    if (!this._enabled || this._bgPlaying) return;
    const ctx = this._ctx_get();
    if (!ctx) return;

    this._bgPlaying = true;
    this._bgGain = ctx.createGain();
    this._bgGain.gain.value = 0.06;
    this._bgGain.connect(ctx.destination);

    const melody = [523, 659, 784, 659, 523, 440, 494, 523, 587, 659, 784, 880, 784, 659, 587, 523];
    const bass   = [130, 130, 165, 165, 130, 110, 123, 130, 147, 165, 196, 220, 196, 165, 147, 130];
    let beat = 0;
    const BPM = 0.22; // seconds per note

    const tick = () => {
      if (!this._bgPlaying || !this._bgGain) return;
      const c = ctx.currentTime;

      // Melody note
      const o1 = ctx.createOscillator();
      o1.type = 'triangle';
      o1.frequency.value = melody[beat % melody.length];
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.12, c);
      g1.gain.exponentialRampToValueAtTime(0.0001, c + BPM * 0.85);
      o1.connect(g1); g1.connect(this._bgGain);
      o1.start(c); o1.stop(c + BPM);

      // Bass note (every 4 beats)
      if (beat % 4 === 0) {
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = bass[Math.floor(beat / 4) % bass.length];
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.18, c);
        g2.gain.exponentialRampToValueAtTime(0.0001, c + BPM * 3.5);
        o2.connect(g2); g2.connect(this._bgGain);
        o2.start(c); o2.stop(c + BPM * 4);
      }

      beat++;
      this._bgTimer = setTimeout(tick, BPM * 1000);
    };

    tick();
  }

  _stopBg() {
    this._bgPlaying = false;
    if (this._bgTimer) { clearTimeout(this._bgTimer); this._bgTimer = null; }
    if (this._bgGain) {
      try { this._bgGain.gain.value = 0; this._bgGain.disconnect(); } catch (_) {}
      this._bgGain = null;
    }
  }

  // Call once after first user gesture
  startMusic() {
    this._startBg();
  }

  stopMusic() {
    this._stopBg();
  }

  restartMusic() {
    this._stopBg();
    setTimeout(() => this._startBg(), 50);
  }
}

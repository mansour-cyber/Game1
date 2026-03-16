// stateManager.js — Game state machine
// States: MENU | LEVEL_SELECT | PLAYING | PAUSED | LEVEL_WIN | LEVEL_FAIL | GAME_COMPLETE

import { LEVELS, getLevelById, TOTAL_LEVELS } from './levels.js';

export const STATE = {
  MENU:           'MENU',
  LEVEL_SELECT:   'LEVEL_SELECT',
  PLAYING:        'PLAYING',
  PAUSED:         'PAUSED',
  LEVEL_WIN:      'LEVEL_WIN',
  LEVEL_FAIL:     'LEVEL_FAIL',
  GAME_COMPLETE:  'GAME_COMPLETE',
};

export class StateManager {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.currentLevelId = 1;
    this.selectZone = 0;         // level-select page (0-5)

    // Transition flash
    this._flashAlpha = 0;
    this._flashDir   = 0;

    // Win/fail timer (auto-advance)
    this._panelTimer = 0;
    this._panelDelay = 0.5;   // brief pause before showing panel

    // UI buttons registered by UISystem each frame
    // (cleared + repopulated every render pass)
  }

  // ── Current state query ──────────────────────────────
  is(s) { return this.current === s; }

  // ── Transition to a new state ────────────────────────
  setState(newState) {
    this.current = newState;
    this._panelTimer = 0;

    switch (newState) {
      case STATE.MENU:
        this.game.levelManager.unloadLevel();
        this.game.audio.restartMusic();
        break;

      case STATE.PLAYING: {
        const lv = getLevelById(this.currentLevelId);
        if (!lv) { this.setState(STATE.MENU); return; }
        this.game.levelManager.loadLevel(lv);
        break;
      }

      case STATE.LEVEL_WIN: {
        // Award star + unlock next
        this.game.save.awardStar(this.currentLevelId);
        const nextId = this.currentLevelId + 1;
        if (nextId <= TOTAL_LEVELS) this.game.save.unlockLevel(nextId);
        break;
      }

      case STATE.GAME_COMPLETE:
        this.game.audio.stopMusic();
        break;
    }
  }

  // ── Update ────────────────────────────────────────────
  update(dt) {
    // Flash fade
    if (this._flashAlpha > 0) this._flashAlpha = Math.max(0, this._flashAlpha - dt * 3);

    // ESC → pause / unpause
    if (this.game.input.pressed('Escape')) {
      if (this.is(STATE.PLAYING)) { this.setState(STATE.PAUSED); return; }
      if (this.is(STATE.PAUSED))  { this.setState(STATE.PLAYING); return; }
    }

    switch (this.current) {
      case STATE.PLAYING:
        this._updatePlaying(dt);
        break;

      case STATE.LEVEL_WIN:
      case STATE.LEVEL_FAIL:
        this._panelTimer += dt;
        break;

      case STATE.PAUSED:
        // Check pause-panel clicks (handled via UI buttons in render)
        break;
    }
  }

  _updatePlaying(dt) {
    const lm = this.game.levelManager;

    // Intercept pause button click BEFORE level mechanics consume clicks
    const rawClicks = this.game.input.consumeClicks();
    let pauseClicked = false;
    for (const c of rawClicks) {
      if (c.x > 756 && c.x < 800 && c.y > 0 && c.y < 48) {
        pauseClicked = true;
      } else {
        this.game.input.clicks.push(c); // return non-pause clicks for level use
      }
    }
    if (pauseClicked) {
      this.setState(STATE.PAUSED);
      this.game.audio.sfxClick();
      return;
    }

    lm.update(dt);

    // Discard any unconsumed clicks (prevents phantom presses on win/fail panels)
    this.game.input.clicks.length = 0;

    // Check won / failed
    if (lm.isWon()) {
      this._panelTimer += dt; // accumulate during brief celebration
      if (this._panelTimer > this._panelDelay) {
        this._flashAlpha = 0.8;
        if (this.currentLevelId >= TOTAL_LEVELS) {
          this.setState(STATE.GAME_COMPLETE);
        } else {
          this.setState(STATE.LEVEL_WIN);
        }
      }
    } else if (lm.isFailed()) {
      this._panelTimer += dt;
      if (this._panelTimer > this._panelDelay) {
        this.setState(STATE.LEVEL_FAIL);
      }
    }
  }

  // ── Render ────────────────────────────────────────────
  render(ctx) {
    // Clear the UI button registry each frame
    this.game._uiButtons = [];

    const ui  = this.game.ui;
    const sv  = this.game.save;
    const lm  = this.game.levelManager;

    switch (this.current) {
      case STATE.MENU:
        ui.drawMenu(ctx, sv,
          () => this._startFromBeginning(),
          () => { this.setState(STATE.LEVEL_SELECT); this.game.audio.sfxClick(); },
          () => { this._toggleSound(); },
          () => { this._confirmReset(); }
        );
        break;

      case STATE.LEVEL_SELECT:
        ui.drawLevelSelect(ctx, sv, this.selectZone,
          (val) => {
            if (val === -1)  { this.selectZone = Math.max(0, this.selectZone - 1); this.game.audio.sfxClick(); }
            else if (val === 6) { this.selectZone = Math.min(5, this.selectZone + 1); this.game.audio.sfxClick(); }
            else if (sv.isUnlocked(val)) {
              this.currentLevelId = val;
              this.setState(STATE.PLAYING);
              this.game.audio.sfxClick();
            }
          },
          () => { this.setState(STATE.MENU); this.game.audio.sfxClick(); }
        );
        // Level tile clicks
        this._registerLevelTileClicks(ctx, sv);
        break;

      case STATE.PLAYING:
        lm.render(ctx);
        // HUD
        const lv = getLevelById(this.currentLevelId);
        const lmState = lm.state;
        ui.drawHUD(ctx,
          lv ? lv.name : '',
          lv ? lv.objective : '',
          sv.getTotalStars(),
          TOTAL_LEVELS,
          lmState ? lmState.timeLeft : null,
          () => this.setState(STATE.PAUSED)
        );
        break;

      case STATE.PAUSED:
        // Draw level underneath
        lm.render(ctx);
        const lvp = getLevelById(this.currentLevelId);
        if (lvp) ui.drawHUD(ctx, lvp.name, lvp.objective, sv.getTotalStars(), TOTAL_LEVELS, null, null);
        ui.drawPausePanel(ctx,
          () => { this.setState(STATE.PLAYING); this.game.audio.sfxClick(); },
          () => { this.setState(STATE.MENU);    this.game.audio.sfxClick(); }
        );
        break;

      case STATE.LEVEL_WIN:
        lm.render(ctx);
        ui.drawWinPanel(ctx, this.currentLevelId,
          () => { this._goNextLevel(); },
          () => { this.setState(STATE.MENU); this.game.audio.sfxClick(); }
        );
        break;

      case STATE.LEVEL_FAIL:
        lm.render(ctx);
        ui.drawFailPanel(ctx,
          () => { this.setState(STATE.PLAYING); this.game.audio.sfxClick(); },
          () => { this.setState(STATE.MENU);    this.game.audio.sfxClick(); }
        );
        break;

      case STATE.GAME_COMPLETE:
        ui.drawGameComplete(ctx, sv.getTotalStars(),
          () => { this.setState(STATE.MENU); this.game.audio.sfxClick(); }
        );
        break;
    }

    // Flash overlay
    if (this._flashAlpha > 0) ui.drawFlash(ctx, this._flashAlpha);
  }

  // ── Helpers ───────────────────────────────────────────

  _startFromBeginning() {
    this.game.audio.sfxClick();
    // Start from highest unlocked or level 1
    this.currentLevelId = this.game.save.data.highestUnlocked || 1;
    this.setState(STATE.PLAYING);
  }

  _goNextLevel() {
    this.game.audio.sfxClick();
    const next = this.currentLevelId + 1;
    if (next <= TOTAL_LEVELS) {
      this.currentLevelId = next;
      this.setState(STATE.PLAYING);
    } else {
      this.setState(STATE.GAME_COMPLETE);
    }
  }

  _toggleSound() {
    const sv = this.game.save;
    const newVal = !sv.getSoundOn();
    sv.setSoundOn(newVal);
    this.game.audio.setEnabled(newVal);
    if (newVal) this.game.audio.startMusic();
    this.game.audio.sfxClick();
  }

  _confirmReset() {
    // Simple inline confirm (no blocking popup)
    if (window.confirm('هل تريد إعادة تعيين كل التقدم؟')) {
      this.game.save.resetAll();
      this.game.audio.sfxClick();
    }
  }

  _registerLevelTileClicks(ctx, sv) {
    // Register click areas for the 5 level tiles on the current zone page
    const zone = this.selectZone;
    const startId = zone * 5 + 1;
    const positions = [
      { x: 60,  y: 90  }, { x: 220, y: 90  }, { x: 380, y: 90  },
      { x: 140, y: 220 }, { x: 300, y: 220 },
    ];
    for (let i = 0; i < 5; i++) {
      const levelId = startId + i;
      const pos = positions[i];
      const unlocked = sv.isUnlocked(levelId);
      if (unlocked) {
        const id = levelId; // capture
        this.game._uiButtons.push({
          x: pos.x, y: pos.y, w: 140, h: 110,
          cb: () => {
            this.currentLevelId = id;
            this.setState(STATE.PLAYING);
            this.game.audio.sfxClick();
          }
        });
      }
    }
  }
}

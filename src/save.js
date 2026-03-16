// save.js — LocalStorage save/load system
// Robust: never corrupts; always falls back to default data.

const SAVE_KEY = 'prank_island_v1';

function defaultData() {
  return {
    unlockedLevels: [1],   // Set of unlocked level IDs (1-based)
    stars: {},             // { "1": true, "5": true, ... }
    soundOn: true,
    highestUnlocked: 1,
  };
}

export class SaveSystem {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults to handle missing fields in old saves
        return Object.assign(defaultData(), parsed);
      }
    } catch (_) { /* ignore parse errors */ }
    return defaultData();
  }

  _persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (_) { /* ignore storage errors */ }
  }

  // ── Level unlock ──────────────────────────────────────
  isUnlocked(levelId) {
    return this.data.unlockedLevels.includes(levelId);
  }

  unlockLevel(levelId) {
    if (!this.isUnlocked(levelId)) {
      this.data.unlockedLevels.push(levelId);
    }
    if (levelId > this.data.highestUnlocked) {
      this.data.highestUnlocked = levelId;
    }
    this._persist();
  }

  // ── Stars ─────────────────────────────────────────────
  hasStar(levelId) {
    return !!this.data.stars[String(levelId)];
  }

  awardStar(levelId) {
    this.data.stars[String(levelId)] = true;
    this._persist();
  }

  getTotalStars() {
    return Object.values(this.data.stars).filter(Boolean).length;
  }

  // ── Sound ─────────────────────────────────────────────
  getSoundOn() { return this.data.soundOn; }

  setSoundOn(val) {
    this.data.soundOn = !!val;
    this._persist();
  }

  // ── Reset ─────────────────────────────────────────────
  resetAll() {
    this.data = defaultData();
    this._persist();
  }
}

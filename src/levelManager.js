// levelManager.js — Level loading, updating, rendering, and unloading
// Each mechanic type is a self-contained mini-engine driven by level config data.

import {
  aabbOverlap, fillRoundRect, strokeRoundRect, drawText, drawEmoji,
  drawPlatform, drawStar, drawCloud, roundRectPath,
  clamp, randInt, randFloat, dist, lerp
} from './utils.js';
import { Player, GRAVITY, PW, PH } from './player.js';
import { M } from './levels.js';

const W = 800, H = 500;

// ─────────────────────────────────────────────────────────────────────────────
//  LevelManager
// ─────────────────────────────────────────────────────────────────────────────
export class LevelManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = null;  // level config
    this.state = null;          // live state object (fresh per load)
    this._timers = [];          // [ timeoutId ]  cleaned on unload
    this._intervals = [];       // [ intervalId ] cleaned on unload
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  loadLevel(levelConfig) {
    this._cleanup();
    this.currentLevel = levelConfig;
    this.state = this._buildState(levelConfig);
  }

  unloadLevel() {
    this._cleanup();
    this.currentLevel = null;
    this.state = null;
  }

  update(dt) {
    if (!this.state || this.state.done) return;
    const lv = this.currentLevel;
    switch (lv.type) {
      case M.PLATFORM_RUN:  this._updatePlatformRun(dt);  break;
      case M.COLLECTOR:     this._updateCollector(dt);     break;
      case M.CHASE:         this._updateChase(dt);         break;
      case M.PATTERN:       this._updatePattern(dt);       break;
      case M.CHOICE:        this._updateChoice(dt);        break;
      case M.AVOID_COLLECT: this._updateAvoidCollect(dt);  break;
      case M.BOSS:          this._updateBoss(dt);          break;
    }
  }

  render(ctx) {
    if (!this.state) return;
    const lv = this.currentLevel;
    this._drawBackground(ctx, lv.theme);
    switch (lv.type) {
      case M.PLATFORM_RUN:  this._renderPlatformRun(ctx);  break;
      case M.COLLECTOR:     this._renderCollector(ctx);     break;
      case M.CHASE:         this._renderChase(ctx);         break;
      case M.PATTERN:       this._renderPattern(ctx);       break;
      case M.CHOICE:        this._renderChoice(ctx);        break;
      case M.AVOID_COLLECT: this._renderAvoidCollect(ctx);  break;
      case M.BOSS:          this._renderBoss(ctx);          break;
    }
  }

  isWon()  { return this.state && this.state.won;  }
  isFailed() { return this.state && this.state.failed; }

  // ── State builder ───────────────────────────────────────────────────────────

  _buildState(lv) {
    const platforms = lv.platforms ? lv.platforms(W, H) : [];
    const spawnX = lv.spawnX || 60;
    const spawnY = typeof lv.spawnY === 'function' ? lv.spawnY(H) : (lv.spawnY || H - 90);

    const s = {
      done: false, won: false, failed: false,
      platforms,
      player: new Player(spawnX, spawnY, 0),
      time: 0,
      timeLeft: lv.timeLimit || null,
      winTimer: 0,
      failTimer: 0,
      // mechanic-specific filled below
    };

    switch (lv.type) {
      case M.PLATFORM_RUN:  this._initPlatformRun(s, lv);  break;
      case M.COLLECTOR:     this._initCollector(s, lv);     break;
      case M.CHASE:         this._initChase(s, lv);         break;
      case M.PATTERN:       this._initPattern(s, lv);       break;
      case M.CHOICE:        this._initChoice(s, lv);        break;
      case M.AVOID_COLLECT: this._initAvoidCollect(s, lv);  break;
      case M.BOSS:          this._initBoss(s, lv);          break;
    }
    return s;
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  _cleanup() {
    this._timers.forEach(id => clearTimeout(id));
    this._intervals.forEach(id => clearInterval(id));
    this._timers = [];
    this._intervals = [];
  }

  _setTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  }

  _triggerWin() {
    if (this.state.done) return;
    this.state.done = true;
    this.state.won = true;
    this.state.player.celebrate();
    if (this.game.audio) this.game.audio.sfxWin();
  }

  _triggerFail() {
    if (this.state.done) return;
    this.state.done = true;
    this.state.failed = true;
    this.state.player.die();
    if (this.game.audio) this.game.audio.sfxFail();
  }

  _updatePlayerPhysics(dt) {
    const s = this.state;
    s.player.update(dt, s.platforms, this.game.input, this.game.audio, this.game);
  }

  _checkFallDeath(player) {
    if (player.y > H + 60) { this._triggerFail(); }
  }

  _randomPos(margin = 60) {
    return { x: randFloat(margin, W - margin), y: randFloat(60, H - 100) };
  }

  _drawBackground(ctx, theme) {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);
    if (theme.cloud) {
      drawCloud(ctx, 80,  50, 1.0);
      drawCloud(ctx, 350, 35, 0.85);
      drawCloud(ctx, 650, 55, 1.1);
    }
  }

  _drawPlatforms(ctx, theme) {
    for (const p of this.state.platforms) {
      if (p.invisible) continue;
      drawPlatform(ctx, p.x, p.y, p.w, p.h, theme.platform || '#43A047', theme.accent || '#FFD54F');
    }
  }

  _drawGoal(ctx, lv) {
    const gx = lv.goalX;
    const gy = typeof lv.goalY === 'function' ? lv.goalY(H) : lv.goalY;
    if (gx === undefined) return;
    // Flag pole
    ctx.fillStyle = '#888';
    ctx.fillRect(gx + 14, gy - 40, 4, 60);
    drawEmoji(ctx, lv.goalEmoji || '🏁', gx + 16, gy - 50, 30);
    // Goal zone glow
    ctx.fillStyle = 'rgba(255,220,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(gx + 16, gy + 15, 32, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _checkGoalReached(player, lv) {
    const gx = lv.goalX;
    const gy = typeof lv.goalY === 'function' ? lv.goalY(H) : lv.goalY;
    if (gx === undefined) return false;
    return aabbOverlap(player.x, player.y, player.w, player.h, gx - 20, gy - 10, 60, 40);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MECHANIC: PLATFORM_RUN
  // ════════════════════════════════════════════════════════════════════════════

  _initPlatformRun(s, lv) {
    s.eggs = [];
    s.eggTimer = 0;
    s.cart = lv.hasCart ? {
      x: lv.cartX || 200,
      y: typeof lv.cartY === 'function' ? lv.cartY(H) : H - 75,
      w: 48, h: 32, vx: 0, emoji: lv.cartEmoji || '🛒',
    } : null;
    s.enemies = [];
    if (lv.enemyCount > 0) {
      for (let i = 0; i < lv.enemyCount; i++) {
        s.enemies.push({ x: 300 + i * 200, y: H - 90, vx: 80, w: 32, h: 32, emoji: '🐔' });
      }
    }
    s.movingTiles = null;
    if (lv.movingTiles) {
      // 8 tiles across, alternating safe/danger, cycling
      s.movingTiles = Array.from({ length: 8 }, (_, i) => ({
        x: 60 + i * 90, y: lv.tileY ? lv.tileY(H) : H - 80,
        w: 70, h: 24, safe: true, timer: 0, period: 2 + i * 0.3,
      }));
    }
  }

  _updatePlatformRun(dt) {
    const s = this.state;
    const lv = this.currentLevel;
    if (s.done) return;

    // Timer
    if (s.timeLeft !== null) {
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) { this._triggerFail(); return; }
    }

    // Player physics
    this._updatePlayerPhysics(dt);
    this._checkFallDeath(s.player);

    // Cart pushing
    if (s.cart) {
      const c = s.cart;
      // If player overlaps cart, push it
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, c.x, c.y, c.w, c.h)) {
        c.vx = s.player.vx * 0.6;
      } else {
        c.vx *= 0.85;
      }
      c.x += c.vx * dt;
      c.x = clamp(c.x, 0, W - c.w);
      // Goal: cart reaches right side
      if (c.x > W - 80) { this._triggerWin(); return; }
    }

    // Falling eggs
    if (lv.eggsDropping || lv.hazards === 'mixed') {
      s.eggTimer += dt;
      if (s.eggTimer > 2.0) {
        s.eggTimer = 0;
        s.eggs.push({ x: randFloat(40, W - 40), y: -20, vy: randFloat(200, 350), emoji: '🥚', w: 24, h: 24 });
      }
    }
    for (const egg of s.eggs) {
      egg.y += egg.vy * dt;
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, egg.x - 12, egg.y - 12, egg.w, egg.h)) {
        this._triggerFail(); return;
      }
    }
    s.eggs = s.eggs.filter(e => e.y < H + 40);

    // Moving enemies
    for (const en of s.enemies) {
      en.x += en.vx * dt;
      if (en.x < 40 || en.x > W - 80) en.vx *= -1;
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, en.x, en.y, en.w, en.h)) {
        this._triggerFail(); return;
      }
    }

    // Moving tiles
    if (s.movingTiles) {
      let playerOnTile = false;
      for (const tile of s.movingTiles) {
        tile.timer += dt;
        // Each tile alternates safe/danger with offset period
        tile.safe = Math.sin(tile.timer * (Math.PI / tile.period)) > 0;
        if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, tile.x, tile.y, tile.w, tile.h)) {
          if (!tile.safe) { this._triggerFail(); return; }
          playerOnTile = true;
          // Simple landing
          if (s.player.vy >= 0 && s.player.y + s.player.h > tile.y && s.player.y < tile.y + tile.h) {
            s.player.y = tile.y - s.player.h;
            s.player.vy = 0;
            s.player.onGround = true;
          }
        }
      }
      // If player is above the tile area and not on any tile, and below platforms → fall to death floor
    }

    // Goal check
    if (lv.goalX !== undefined && !s.cart && this._checkGoalReached(s.player, lv)) {
      this._triggerWin();
    }

    // Ice cream melt timer (cosmetic)
    if (lv.iceCreamMelt && s.timeLeft !== null && s.timeLeft <= 0) {
      this._triggerFail();
    }
  }

  _renderPlatformRun(ctx) {
    const s = this.state;
    const lv = this.currentLevel;
    const theme = lv.theme;

    this._drawPlatforms(ctx, theme);

    // Moving tiles
    if (s.movingTiles) {
      for (const tile of s.movingTiles) {
        ctx.fillStyle = tile.safe ? 'rgba(76,175,80,0.9)' : 'rgba(244,67,54,0.9)';
        roundRectPath(ctx, tile.x, tile.y, tile.w, tile.h, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        roundRectPath(ctx, tile.x + 2, tile.y + 2, tile.w - 4, 6, 3);
        ctx.fill();
      }
    }

    // Cart
    if (s.cart) {
      drawEmoji(ctx, s.cart.emoji, s.cart.x + s.cart.w / 2, s.cart.y + s.cart.h / 2, 36);
      // Wheels
      ctx.fillStyle = '#444';
      ctx.beginPath(); ctx.arc(s.cart.x + 10, s.cart.y + s.cart.h + 6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s.cart.x + s.cart.w - 10, s.cart.y + s.cart.h + 6, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Goal
    this._drawGoal(ctx, lv);

    // Falling eggs
    for (const egg of s.eggs) drawEmoji(ctx, egg.emoji, egg.x, egg.y, 26);

    // Enemies
    for (const en of s.enemies) drawEmoji(ctx, en.emoji, en.x + 16, en.y + 16, 32);

    // Ice cream melt indicator
    if (lv.iceCreamMelt && s.timeLeft !== null) {
      const pct = s.timeLeft / lv.timeLimit;
      drawEmoji(ctx, pct > 0.4 ? '🍦' : pct > 0.2 ? '😰' : '💧', s.player.x + s.player.w / 2, s.player.y - 26, 22);
    }

    s.player.render(ctx);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MECHANIC: COLLECTOR
  // ════════════════════════════════════════════════════════════════════════════

  _initCollector(s, lv) {
    const count = lv.itemCount || 4;
    const emoji = lv.itemEmoji || '⭐';
    const items = lv.items || null; // array of { emoji, label }

    s.items = Array.from({ length: count }, (_, i) => {
      const itemEmoji = items ? items[i % items.length].emoji : emoji;
      const pos = this._randomItemPos(i, count);
      return {
        x: pos.x, y: pos.y, w: 32, h: 32,
        emoji: itemEmoji,
        collected: false,
        bobOffset: randFloat(0, Math.PI * 2),
        vx: lv.itemBounce ? randFloat(-80, 80) : 0,
        vy: lv.itemBounce ? randFloat(-40, 40) : 0,
      };
    });
    s.collected = 0;
    s.npcX = W - 80;
    s.npcY = H - 90;
    // Monkey enemy (for level 6)
    s.monkeyX = lv.monkeyEnemy ? 400 : -1000;
    s.monkeyY = H - 80;
    s.monkeyVx = lv.monkeyEnemy ? 100 : 0;
  }

  _randomItemPos(i, total) {
    // Distribute items across screen to avoid spawn stacking
    const cols = 4, rows = 2;
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const x = 80 + col * 170 + randFloat(-40, 40);
    const y = 120 + row * 160 + randFloat(-30, 30);
    return { x: clamp(x, 40, W - 60), y: clamp(y, 60, H - 80) };
  }

  _updateCollector(dt) {
    const s = this.state;
    const lv = this.currentLevel;
    if (s.done) return;

    if (s.timeLeft !== null) {
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) { this._triggerFail(); return; }
    }
    s.time += dt;

    this._updatePlayerPhysics(dt);
    this._checkFallDeath(s.player);

    // Monkey enemy (for L6)
    if (lv.monkeyEnemy) {
      s.monkeyX += s.monkeyVx * dt;
      if (s.monkeyX < 50 || s.monkeyX > W - 80) s.monkeyVx *= -1;
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, s.monkeyX - 20, s.monkeyY - 20, 40, 40)) {
        this._triggerFail(); return;
      }
    }

    // Bouncing items
    for (const item of s.items) {
      if (item.collected) continue;
      if (lv.itemBounce) {
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        if (item.x < 30 || item.x > W - 60)   { item.vx *= -1; item.x = clamp(item.x, 30, W - 60); }
        if (item.y < 50 || item.y > H - 60)    { item.vy *= -1; item.y = clamp(item.y, 50, H - 60); }
      } else {
        item.y += Math.sin(s.time * 2 + item.bobOffset) * 0.6;
      }

      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, item.x - 16, item.y - 16, item.w, item.h)) {
        item.collected = true;
        s.collected++;
        if (this.game.audio) this.game.audio.sfxCollect();
        if (s.collected >= lv.itemCount) {
          this._setTimeout(() => this._triggerWin(), 400);
        }
      }
    }
  }

  _renderCollector(ctx) {
    const s = this.state;
    const lv = this.currentLevel;
    const theme = lv.theme;

    this._drawPlatforms(ctx, theme);

    // Items
    for (const item of s.items) {
      if (item.collected) continue;
      // Glow ring
      ctx.fillStyle = 'rgba(255,220,50,0.2)';
      ctx.beginPath(); ctx.arc(item.x, item.y, 22, 0, Math.PI * 2); ctx.fill();
      drawEmoji(ctx, item.emoji, item.x, item.y, 30);
    }

    // NPC (robot/monkey) waiting for items
    if (lv.npcEmoji) {
      drawEmoji(ctx, lv.npcEmoji, s.npcX, s.npcY, 40);
      drawText(ctx, `${s.collected}/${lv.itemCount}`, s.npcX, s.npcY - 30, 14, '#fff', 'center', false);
    }

    // Monkey enemy
    if (lv.monkeyEnemy) {
      drawEmoji(ctx, '🐒', s.monkeyX, s.monkeyY, 38);
    }

    // Counter badge
    fillRoundRect(ctx, 10, 58, 130, 30, 8, 'rgba(0,0,0,0.5)');
    drawText(ctx, `جُمع: ${s.collected}/${lv.itemCount}`, 75, 73, 15, '#FFD700', 'center', false);

    s.player.render(ctx);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MECHANIC: CHASE
  // ════════════════════════════════════════════════════════════════════════════

  _initChase(s, lv) {
    if (lv.chasePlayer) {
      // Enemy chases player (L14 vacuum)
      s.enemy = { x: 0, y: H - 80, w: 40, h: 40, emoji: lv.enemyEmoji || '🌀', speed: lv.enemySpeed || 100 };
      s.safeZone = { x: lv.safeZoneX || 650, y: H - 80, w: lv.safeZoneW || 120, h: 80 };
      s.safeReached = false;
    } else {
      // Player chases target (L1 chicken)
      const tx = typeof lv.targetStartX === 'function' ? lv.targetStartX : (lv.targetStartX || 500);
      const ty = typeof lv.targetStartY === 'function' ? lv.targetStartY(H) : (H - 80);
      s.target = { x: tx, y: ty, w: 36, h: 36, vx: lv.targetSpeed || 130, emoji: lv.targetEmoji || '🐔', caught: false };
      s.eggs = [];
      s.eggTimer = 0;
    }
  }

  _updateChase(dt) {
    const s = this.state;
    const lv = this.currentLevel;
    if (s.done) return;

    s.time += dt;
    if (s.timeLeft !== null) {
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) { this._triggerFail(); return; }
    }

    this._updatePlayerPhysics(dt);
    this._checkFallDeath(s.player);

    if (lv.chasePlayer) {
      // Enemy moves toward player
      const en = s.enemy;
      const dx = s.player.x - en.x;
      const sign = dx > 0 ? 1 : -1;
      en.x += sign * en.speed * dt;
      en.x = clamp(en.x, 0, W - en.w);

      // Caught by enemy → fail
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, en.x, en.y, en.w, en.h)) {
        this._triggerFail(); return;
      }

      // Safe zone → win
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, s.safeZone.x, s.safeZone.y, s.safeZone.w, s.safeZone.h)) {
        this._triggerWin();
      }
    } else {
      // Target runs away from player
      const tgt = s.target;
      const dx = tgt.x - s.player.x;
      const runDir = dx > 0 ? 1 : -1;
      tgt.vx = runDir * lv.targetSpeed;
      if (lv.targetZigzag) {
        tgt.vx += Math.sin(s.time * 3) * 60;
      }
      tgt.x += tgt.vx * dt;
      tgt.x = clamp(tgt.x, 30, W - 60);

      // Eggs drop
      s.eggTimer += dt;
      if (s.eggTimer > lv.hazardFreq) {
        s.eggTimer = 0;
        s.eggs.push({ x: tgt.x, y: tgt.y - 10, vy: 300, emoji: lv.hazardEmoji || '🥚', w: 24, h: 24 });
      }
      for (const egg of s.eggs) {
        egg.y += egg.vy * dt;
        if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, egg.x - 12, egg.y - 12, egg.w, egg.h)) {
          this._triggerFail(); return;
        }
      }
      s.eggs = s.eggs.filter(e => e.y < H + 40);

      // Player catches target
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, tgt.x - 18, tgt.y - 18, tgt.w, tgt.h)) {
        tgt.caught = true;
        this._triggerWin();
      }
    }
  }

  _renderChase(ctx) {
    const s = this.state;
    const lv = this.currentLevel;
    const theme = lv.theme;
    this._drawPlatforms(ctx, theme);

    if (lv.chasePlayer) {
      // Safe zone
      ctx.fillStyle = 'rgba(0,200,80,0.3)';
      roundRectPath(ctx, s.safeZone.x, s.safeZone.y - 50, s.safeZone.w, s.safeZone.h + 50, 10);
      ctx.fill();
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 3;
      ctx.stroke();
      drawText(ctx, 'آمن!', s.safeZone.x + s.safeZone.w / 2, s.safeZone.y - 20, 16, '#4CAF50', 'center', false);
      drawEmoji(ctx, s.enemy.emoji, s.enemy.x + s.enemy.w / 2, s.enemy.y + s.enemy.h / 2, 36);
    } else {
      const tgt = s.target;
      drawEmoji(ctx, tgt.emoji, tgt.x, tgt.y, 38);
      for (const egg of s.eggs) drawEmoji(ctx, egg.emoji, egg.x, egg.y, 26);
    }

    s.player.render(ctx);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MECHANIC: PATTERN (Simon Says)
  // ════════════════════════════════════════════════════════════════════════════

  _initPattern(s, lv) {
    s.phase = 'showing';   // 'showing' | 'input' | 'feedback'
    s.round = 0;
    s.totalRounds = lv.rounds || 3;
    s.sequence = [];
    s.playerInput = [];
    s.showIndex = 0;
    s.showTimer = 0;
    s.showInterval = 0.75;
    s.feedbackTimer = 0;
    s.feedbackOk = false;
    s.buttons = this._makePatternButtons(lv);
    s.npcAnim = 0;
    s.activeButton = -1;
    s.pendingClicks = [];
    this._generateRound(s, lv);
  }

  _makePatternButtons(lv) {
    const colors = lv.colors || ['#F44336','#2196F3','#4CAF50','#FF9800'];
    const n = colors.length;
    const bw = 100, bh = 70, gap = 20;
    const totalW = n * bw + (n - 1) * gap;
    const startX = W / 2 - totalW / 2;
    return colors.map((color, i) => ({
      x: startX + i * (bw + gap), y: H / 2 + 30,
      w: bw, h: bh, color,
      label: lv.colorNames ? lv.colorNames[i] : String(i + 1),
      lit: false,
    }));
  }

  _generateRound(s, lv) {
    const n = lv.colors ? lv.colors.length : 4;
    const len = (lv.patternLength || 3) + s.round;
    s.sequence = Array.from({ length: len }, () => randInt(0, n - 1));
    s.playerInput = [];
    s.showIndex = 0;
    s.showTimer = 0;
    s.phase = 'showing';
    s.activeButton = -1;
    for (const btn of s.buttons) btn.lit = false;
  }

  _updatePattern(dt) {
    const s = this.state;
    const lv = this.currentLevel;
    if (s.done) return;

    s.time += dt;
    s.npcAnim = Math.sin(s.time * 3) * 4;

    if (s.phase === 'showing') {
      s.showTimer += dt;
      if (s.showTimer > s.showInterval) {
        s.showTimer = 0;
        if (s.activeButton >= 0) { s.buttons[s.activeButton].lit = false; s.activeButton = -1; }
        if (s.showIndex < s.sequence.length) {
          s.activeButton = s.sequence[s.showIndex];
          s.buttons[s.activeButton].lit = true;
          if (this.game.audio) this.game.audio.sfxCollect();
          s.showIndex++;
        } else {
          s.phase = 'input';
          s.activeButton = -1;
          for (const btn of s.buttons) btn.lit = false;
        }
      }
    } else if (s.phase === 'input') {
      // Process clicks
      const clicks = this.game.input ? this.game.input.consumeClicks() : [];
      for (const click of clicks) {
        for (let i = 0; i < s.buttons.length; i++) {
          const btn = s.buttons[i];
          if (click.x >= btn.x && click.x <= btn.x + btn.w && click.y >= btn.y && click.y <= btn.y + btn.h) {
            s.playerInput.push(i);
            btn.lit = true;
            this._setTimeout(() => { if (s.buttons[i]) s.buttons[i].lit = false; }, 200);

            const expected = s.sequence[s.playerInput.length - 1];
            if (i !== expected) {
              s.phase = 'feedback'; s.feedbackOk = false; s.feedbackTimer = 0;
              if (this.game.audio) this.game.audio.sfxWrong();
            } else if (s.playerInput.length === s.sequence.length) {
              s.round++;
              s.phase = 'feedback'; s.feedbackOk = true; s.feedbackTimer = 0;
              if (this.game.audio) this.game.audio.sfxCorrect();
            } else {
              if (this.game.audio) this.game.audio.sfxCollect();
            }
          }
        }
      }
    } else if (s.phase === 'feedback') {
      s.feedbackTimer += dt;
      if (s.feedbackTimer > 1.0) {
        if (s.feedbackOk) {
          if (s.round >= s.totalRounds) { this._triggerWin(); }
          else { this._generateRound(s, lv); }
        } else {
          this._triggerFail();
        }
      }
    }
  }

  _renderPattern(ctx) {
    const s = this.state;
    const lv = this.currentLevel;

    // NPC display
    ctx.fillStyle = lv.theme.bg;
    ctx.fillRect(0, 0, W, H);
    fillRoundRect(ctx, W / 2 - 200, 30, 400, 130, 16, 'rgba(0,0,0,0.4)');
    drawEmoji(ctx, lv.npcEmoji || '🐸', W / 2 - 150, 95 + s.npcAnim, 56);

    // Phase label
    const phaseLabel = s.phase === 'showing' ? 'شاهد النمط...' : s.phase === 'input' ? '🎯 كرر الآن!' : s.feedbackOk ? '✅ صح!' : '❌ غلط!';
    const phaseColor = s.phase === 'feedback' ? (s.feedbackOk ? '#4CAF50' : '#F44336') : '#FFD700';
    drawText(ctx, phaseLabel, W / 2, 65, 22, phaseColor, 'center');

    // Round indicator
    drawText(ctx, `جولة ${s.round + 1} / ${s.totalRounds}`, W / 2 + 100, 90, 16, '#aaa', 'center', false);

    // Sequence dots
    for (let i = 0; i < s.sequence.length; i++) {
      const filled = i < s.playerInput.length;
      const current = s.phase === 'showing' && i < s.showIndex;
      ctx.fillStyle = filled ? '#4CAF50' : current ? '#FFD700' : 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(W / 2 - s.sequence.length * 12 + i * 24, 130, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Pattern buttons
    for (const btn of s.buttons) {
      const alpha = btn.lit ? 1.0 : 0.65;
      ctx.globalAlpha = alpha;
      fillRoundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12, btn.color);
      if (btn.lit) {
        ctx.shadowColor = btn.color; ctx.shadowBlur = 18;
        strokeRoundRect(ctx, btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 14, '#fff', 3);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      drawText(ctx, btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, 18, '#fff', 'center');
    }

    // Feedback flash
    if (s.phase === 'feedback') {
      ctx.fillStyle = s.feedbackOk ? 'rgba(0,200,80,0.15)' : 'rgba(244,67,54,0.15)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MECHANIC: CHOICE (Multiple Choice / Pick Correct)
  // ════════════════════════════════════════════════════════════════════════════

  _initChoice(s, lv) {
    s.round = 0;
    s.totalRounds = lv.rounds || 3;
    s.phase = 'pick';   // 'pick' | 'feedback'
    s.feedbackTimer = 0;
    s.feedbackOk = false;
    s.selected = [];
    s.options = [];
    s.question = '';
    s.npcAnim = 0;
    this._buildChoiceRound(s, lv);
  }

  _buildChoiceRound(s, lv) {
    s.selected = [];
    s.phase = 'pick';
    s.feedbackTimer = 0;
    s.timeLeft = lv.timePerRound || null;

    if (lv.questions && lv.questions.length > 0) {
      // Fixed Q&A (L26)
      const q = lv.questions[s.round % lv.questions.length];
      s.question = q.q;
      s.options = q.options.map((label, i) => ({
        emoji: '', label, correct: i === q.correct, fakeHint: false,
      }));
    } else if (lv.multiSelect) {
      // Pick N correct from shuffled options (L17)
      s.question = `اختار ${lv.selectCount} مكونات صح!`;
      s.options = [...lv.options].sort(() => Math.random() - 0.5).map(o => ({ ...o }));
      s.selectCount = lv.selectCount;
    } else if (lv.options) {
      // Fixed option list
      s.question = lv.npcMessage || 'اختار!';
      s.options = [...lv.options].sort(() => Math.random() - 0.5).map(o => ({ ...o }));
    } else if (lv.foodOptions) {
      // Random food request (L18)
      const chosen = lv.foodOptions[randInt(0, lv.foodOptions.length - 1)];
      s.question = (lv.npcMessage || 'أريد: ') + chosen.emoji;
      s.options = [...lv.foodOptions].sort(() => Math.random() - 0.5).map(o => ({ ...o, correct: o.emoji === chosen.emoji }));
    } else if (lv.correctEmoji && lv.fakeEmoji) {
      // Find the correct one among fakes (L20)
      const choiceCount = lv.choiceCount || 4;
      s.question = lv.npcMessage || 'أين الصح؟';
      const correctIdx = randInt(0, choiceCount - 1);
      s.options = Array.from({ length: choiceCount }, (_, i) => ({
        emoji: i === correctIdx ? lv.correctEmoji : lv.fakeEmoji,
        label: i === correctIdx ? 'الحقيقية' : 'مزيفة',
        correct: i === correctIdx,
      }));
    } else if (lv.correctEmoji && lv.fakeEmojis) {
      // Chair / door pick (L21, L23)
      const choiceCount = lv.choiceCount || 3;
      s.question = lv.npcMessage || 'اختار!';
      const correctIdx = randInt(0, choiceCount - 1);
      s.options = Array.from({ length: choiceCount }, (_, i) => ({
        emoji: i === correctIdx ? lv.correctEmoji : lv.fakeEmojis[(i) % lv.fakeEmojis.length],
        label: i === correctIdx ? '✔' : '✘',
        correct: i === correctIdx,
      }));
    } else {
      // Generic button choice (L12 Wrong Button)
      const choiceCount = lv.choiceCount || 4;
      s.question = lv.npcMessage || 'اضغط الصح!';
      const correctIdx = randInt(0, choiceCount - 1);
      s.options = Array.from({ length: choiceCount }, (_, i) => ({
        emoji: i === correctIdx ? '✅' : '❌',
        label: i === correctIdx ? (lv.hintLabel || '✔') : '?',
        correct: i === correctIdx,
      }));
    }

    // Build button positions
    const n = s.options.length;
    const bw = Math.min(150, (W - 80) / n - 10);
    const bh = 80;
    const totalW = n * bw + (n - 1) * 14;
    const startX = W / 2 - totalW / 2;
    s.optionButtons = s.options.map((opt, i) => ({
      x: startX + i * (bw + 14), y: H / 2 + 40,
      w: bw, h: bh, opt,
      state: 'idle', // 'idle' | 'correct' | 'wrong'
    }));
  }

  _updateChoice(dt) {
    const s = this.state;
    const lv = this.currentLevel;
    if (s.done) return;

    s.time += dt;
    s.npcAnim = Math.sin(s.time * 2.5) * 4;

    // Time per round
    if (s.phase === 'pick' && s.timeLeft !== null) {
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) {
        s.phase = 'feedback'; s.feedbackOk = false; s.feedbackTimer = 0;
        if (this.game.audio) this.game.audio.sfxWrong();
      }
    }

    if (s.phase === 'pick') {
      const clicks = this.game.input ? this.game.input.consumeClicks() : [];
      for (const click of clicks) {
        for (const btn of s.optionButtons) {
          if (click.x >= btn.x && click.x <= btn.x + btn.w && click.y >= btn.y && click.y <= btn.y + btn.h) {
            if (lv.multiSelect) {
              // Toggle selection
              const idx = s.selected.indexOf(btn);
              if (idx >= 0) { s.selected.splice(idx, 1); btn.state = 'idle'; }
              else if (s.selected.length < (lv.selectCount || 3)) { s.selected.push(btn); btn.state = 'selected'; }
              // Check if enough selected
              if (s.selected.length === (lv.selectCount || 3)) {
                const allCorrect = s.selected.every(b => b.opt.correct);
                s.phase = 'feedback'; s.feedbackOk = allCorrect; s.feedbackTimer = 0;
                s.selected.forEach(b => b.state = allCorrect ? 'correct' : 'wrong');
                if (this.game.audio) (allCorrect ? this.game.audio.sfxCorrect() : this.game.audio.sfxWrong());
              }
            } else {
              btn.state = btn.opt.correct ? 'correct' : 'wrong';
              s.feedbackOk = btn.opt.correct;
              s.phase = 'feedback'; s.feedbackTimer = 0;
              if (this.game.audio) (btn.opt.correct ? this.game.audio.sfxCorrect() : this.game.audio.sfxWrong());
            }
            break;
          }
        }
        if (s.phase === 'feedback') break;
      }
    } else if (s.phase === 'feedback') {
      s.feedbackTimer += dt;
      if (s.feedbackTimer > 1.2) {
        if (!s.feedbackOk) { this._triggerFail(); return; }
        s.round++;
        if (s.round >= s.totalRounds) { this._triggerWin(); return; }
        this._buildChoiceRound(s, lv);
      }
    }
  }

  _renderChoice(ctx) {
    const s = this.state;
    const lv = this.currentLevel;
    ctx.fillStyle = lv.theme.bg;
    ctx.fillRect(0, 0, W, H);

    // NPC
    fillRoundRect(ctx, W / 2 - 220, 25, 440, 140, 16, 'rgba(0,0,0,0.45)');
    drawEmoji(ctx, lv.npcEmoji || '🤖', W / 2 - 170, 95 + s.npcAnim, 56);
    drawText(ctx, s.question, W / 2 + 20, 90, 18, '#FFD700', 'center');
    drawText(ctx, `جولة ${s.round + 1} / ${s.totalRounds}`, W / 2, 130, 14, '#aaa', 'center', false);

    // Timer bar
    if (s.timeLeft !== null && lv.timePerRound) {
      const pct = clamp(s.timeLeft / lv.timePerRound, 0, 1);
      fillRoundRect(ctx, W / 2 - 150, 148, 300, 8, 4, '#333');
      fillRoundRect(ctx, W / 2 - 150, 148, 300 * pct, 8, 4, pct > 0.4 ? '#4CAF50' : '#F44336');
    }

    // Option buttons
    for (const btn of s.optionButtons) {
      let bg = '#1565C0';
      if (btn.state === 'correct') bg = '#2E7D32';
      else if (btn.state === 'wrong') bg = '#B71C1C';
      else if (btn.state === 'selected') bg = '#F57F17';
      fillRoundRect(ctx, btn.x, btn.y, btn.w, btn.h, 14, bg);
      strokeRoundRect(ctx, btn.x, btn.y, btn.w, btn.h, 14, 'rgba(255,255,255,0.4)', 2);
      if (btn.opt.emoji) drawEmoji(ctx, btn.opt.emoji, btn.x + btn.w / 2, btn.y + 28, 28);
      drawText(ctx, btn.opt.label, btn.x + btn.w / 2, btn.y + (btn.opt.emoji ? 60 : btn.h / 2), 14, '#fff', 'center');
    }

    // Feedback flash
    if (s.phase === 'feedback') {
      ctx.fillStyle = s.feedbackOk ? 'rgba(0,200,80,0.15)' : 'rgba(244,67,54,0.2)';
      ctx.fillRect(0, 0, W, H);
      drawText(ctx, s.feedbackOk ? '✅ صح!' : '❌ غلط!', W / 2, H / 2 - 30, 38,
        s.feedbackOk ? '#4CAF50' : '#F44336', 'center');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MECHANIC: AVOID_COLLECT
  // ════════════════════════════════════════════════════════════════════════════

  _initAvoidCollect(s, lv) {
    const itemCount = lv.targetCount || 5;
    const enemyCount = lv.enemyCount || 3;

    s.items = Array.from({ length: itemCount }, (_, i) => {
      const pos = this._randomItemPos(i, itemCount);
      return { x: pos.x, y: pos.y, w: 28, h: 28, emoji: lv.targetEmoji || '🟢', collected: false,
        vx: randFloat(-70, 70), vy: randFloat(-50, 50) };
    });
    s.enemies = Array.from({ length: Math.max(1, enemyCount) }, (_, i) => ({
      x: randFloat(200, W - 80), y: randFloat(80, H - 100),
      w: 32, h: 32, emoji: lv.enemyEmoji || '🐝',
      vx: randFloat(-80, 80) || 80, vy: randFloat(-60, 60),
      speed: (lv.enemySpeed || 100) + i * 15,
      targetPlayer: lv.calmOnCollect ? false : true,
    }));
    s.collected = 0;
    s.calmed = false;
  }

  _updateAvoidCollect(dt) {
    const s = this.state;
    const lv = this.currentLevel;
    if (s.done) return;

    s.time += dt;
    if (s.timeLeft !== null) {
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) { this._triggerFail(); return; }
    }

    this._updatePlayerPhysics(dt);
    this._checkFallDeath(s.player);

    // Enemies
    for (const en of s.enemies) {
      if (s.calmed) { en.vx *= 0.9; en.vy *= 0.9; }
      else if (en.targetPlayer) {
        const dx = s.player.x - en.x, dy = s.player.y - en.y;
        const d = Math.hypot(dx, dy) || 1;
        en.vx = (dx / d) * en.speed;
        en.vy = (dy / d) * en.speed;
      } else {
        en.x += en.vx * dt;
        en.y += en.vy * dt;
        if (en.x < 20 || en.x > W - 60) { en.vx *= -1; }
        if (en.y < 55 || en.y > H - 60) { en.vy *= -1; }
        en.x = clamp(en.x, 10, W - 50); en.y = clamp(en.y, 55, H - 60);
        continue;
      }
      en.x += en.vx * dt; en.y += en.vy * dt;
      en.x = clamp(en.x, 10, W - 50); en.y = clamp(en.y, 55, H - 60);

      if (!s.calmed && aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, en.x - 12, en.y - 12, en.w, en.h)) {
        this._triggerFail(); return;
      }
    }

    // Items (bouncing)
    for (const item of s.items) {
      if (item.collected) continue;
      item.x += item.vx * dt; item.y += item.vy * dt;
      if (item.x < 20 || item.x > W - 50) { item.vx *= -1; }
      if (item.y < 55 || item.y > H - 60) { item.vy *= -1; }
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, item.x - 14, item.y - 14, item.w, item.h)) {
        item.collected = true;
        s.collected++;
        if (this.game.audio) this.game.audio.sfxCollect();
        if (lv.calmOnCollect && s.collected >= (lv.targetCount || 1)) {
          s.calmed = true;
          this._setTimeout(() => this._triggerWin(), 600);
        } else if (!lv.calmOnCollect && s.collected >= (lv.targetCount || 5)) {
          this._setTimeout(() => this._triggerWin(), 400);
        }
      }
    }
  }

  _renderAvoidCollect(ctx) {
    const s = this.state;
    const lv = this.currentLevel;
    const theme = lv.theme;
    this._drawPlatforms(ctx, theme);

    for (const item of s.items) {
      if (item.collected) continue;
      ctx.fillStyle = 'rgba(255,220,50,0.18)';
      ctx.beginPath(); ctx.arc(item.x, item.y, 20, 0, Math.PI * 2); ctx.fill();
      drawEmoji(ctx, item.emoji, item.x, item.y, 28);
    }
    for (const en of s.enemies) {
      drawEmoji(ctx, en.emoji, en.x + en.w / 2, en.y + en.h / 2, 32);
    }
    if (s.calmed) {
      drawText(ctx, '😊 هادي!', W / 2, H / 2 - 40, 26, '#4CAF50', 'center');
    }

    fillRoundRect(ctx, 10, 58, 130, 28, 8, 'rgba(0,0,0,0.5)');
    drawText(ctx, `جُمع: ${s.collected}/${lv.targetCount}`, 75, 72, 14, '#FFD700', 'center', false);

    s.player.render(ctx);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MECHANIC: BOSS (Level 30 – King Farfoosh)
  // ════════════════════════════════════════════════════════════════════════════

  _initBoss(s, lv) {
    s.bossHp = lv.bossHp || 3;
    s.bossMaxHp = lv.bossHp || 3;
    s.bossX = W / 2 - 30;
    s.bossY = H - 110;
    s.bossVx = lv.bossSpeed || 90;
    s.bossDir = 1;
    s.bossPhase = 0;
    s.projectiles = [];
    s.attackTimer = 0;
    s.attackFreq = lv.phases ? lv.phases[0].attackFreq : 2.0;
    s.hitCooldown = 0;
    s.invincible = false;
    s.stars = []; // stars the player throws
    s.hittable = false;
    s.hittableTimer = 0;
    s.bossState = 'moving'; // 'moving' | 'stunned' | 'laughing'
    s.laughTimer = 0;
    s.hitCount = 0;
    // Stars are collectibles on the ground; player picks one up and can throw it
    s.groundStar = { x: W / 2, y: H - 75, w: 28, h: 28, available: true };
  }

  _updateBoss(dt) {
    const s = this.state;
    const lv = this.currentLevel;
    if (s.done) return;

    s.time += dt;
    this._updatePlayerPhysics(dt);
    this._checkFallDeath(s.player);

    // Phase from HP
    const phase = Math.min(lv.phases ? lv.phases.length - 1 : 0, lv.bossHp - s.bossHp);
    if (lv.phases) {
      s.attackFreq = lv.phases[phase].attackFreq;
      s.bossVx = lv.phases[phase].speed;
    }

    // Boss movement
    if (s.bossState === 'moving') {
      s.bossX += s.bossVx * s.bossDir * dt;
      if (s.bossX < 60) { s.bossX = 60; s.bossDir = 1; }
      if (s.bossX > W - 100) { s.bossX = W - 100; s.bossDir = -1; }

      // Attack: shoot projectile toward player
      s.attackTimer += dt;
      if (s.attackTimer > s.attackFreq) {
        s.attackTimer = 0;
        const dx = s.player.x - s.bossX, dy = s.player.y - s.bossY;
        const d = Math.hypot(dx, dy) || 1;
        const speed = 200;
        s.projectiles.push({ x: s.bossX + 30, y: s.bossY, vx: (dx / d) * speed, vy: (dy / d) * speed, w: 24, h: 24 });
      }
    } else if (s.bossState === 'stunned') {
      s.hittableTimer -= dt;
      if (s.hittableTimer <= 0) s.bossState = 'moving';
    } else if (s.bossState === 'laughing') {
      s.laughTimer += dt;
      if (s.laughTimer > 1.5) {
        if (this.game.audio) this.game.audio.sfxFunny();
        s.laughTimer = 0;
      }
    }

    // Projectiles
    for (const p of s.projectiles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, p.x - 12, p.y - 12, p.w, p.h)) {
        this._triggerFail(); return;
      }
    }
    s.projectiles = s.projectiles.filter(p => p.x > -40 && p.x < W + 40 && p.y > -40 && p.y < H + 40);

    // Ground star pickup
    if (s.groundStar.available && !s.player.carrying) {
      if (aabbOverlap(s.player.x, s.player.y, s.player.w, s.player.h, s.groundStar.x - 14, s.groundStar.y - 14, 28, 28)) {
        s.player.carrying = { emoji: '⭐', id: 'star' };
        s.groundStar.available = false;
        if (this.game.audio) this.game.audio.sfxCollect();
      }
    }

    // Throw star (E key or action)
    if (s.player.carrying && (this.game.input.pressed('KeyE') || this.game.input.pressed('KeyF'))) {
      const dir = s.player.facingLeft ? -1 : 1;
      s.stars.push({ x: s.player.x + s.player.w / 2, y: s.player.y + s.player.h / 2, vx: dir * 380, vy: -150, w: 20, h: 20 });
      s.player.carrying = null;
      // Star respawns after 3s
      this._setTimeout(() => { if (s && !s.done) s.groundStar.available = true; }, 3000);
    }

    // Thrown stars hitting boss
    for (const star of s.stars) {
      star.x += star.vx * dt; star.y += star.vy * dt;
      star.vy += 400 * dt; // arc
      if (aabbOverlap(star.x - 10, star.y - 10, star.w, star.h, s.bossX, s.bossY, 64, 80)) {
        star.x = -999;
        s.bossHp--;
        s.bossState = 'stunned';
        s.hittableTimer = 1.5;
        if (this.game.audio) this.game.audio.sfxHit();
        if (s.bossHp <= 0) { this._triggerWin(); return; }
      }
    }
    s.stars = s.stars.filter(st => st.x > -100 && st.y < H + 60);
  }

  _renderBoss(ctx) {
    const s = this.state;
    const lv = this.currentLevel;
    const theme = lv.theme;
    this._drawPlatforms(ctx, theme);

    // Boss
    const phase = Math.min(lv.phases ? lv.phases.length - 1 : 0, lv.bossHp - s.bossHp);
    const bossColor = lv.phases ? lv.phases[phase].color : '#E53935';
    const wobble = s.bossState === 'stunned' ? Math.sin(s.time * 20) * 6 : Math.sin(s.time * 2) * 3;

    fillRoundRect(ctx, s.bossX + wobble, s.bossY, 64, 80, 10, bossColor);
    drawEmoji(ctx, '👑', s.bossX + 32 + wobble, s.bossY - 10, 36);
    // Eyes (angry or stunned)
    ctx.fillStyle = s.bossState === 'stunned' ? '#FFD700' : '#fff';
    ctx.beginPath(); ctx.arc(s.bossX + 20 + wobble, s.bossY + 28, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.bossX + 44 + wobble, s.bossY + 28, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(s.bossX + 22 + wobble, s.bossY + 30, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.bossX + 46 + wobble, s.bossY + 30, 4, 0, Math.PI * 2); ctx.fill();
    // Mouth
    if (s.bossState === 'stunned') {
      drawEmoji(ctx, '😵', s.bossX + 32 + wobble, s.bossY + 58, 24);
    } else {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.bossX + 32 + wobble, s.bossY + 55, 12, 0.1, Math.PI - 0.1); ctx.stroke();
    }

    // HP bar
    const hpPct = clamp(s.bossHp / s.bossMaxHp, 0, 1);
    fillRoundRect(ctx, W / 2 - 120, 55, 240, 16, 8, '#333');
    fillRoundRect(ctx, W / 2 - 120, 55, 240 * hpPct, 16, 8, '#F44336');
    drawText(ctx, `الملك فرفوش ❤️ ${s.bossHp}/${s.bossMaxHp}`, W / 2, 75, 13, '#fff', 'center', false);

    // Projectiles
    for (const p of s.projectiles) drawEmoji(ctx, lv.projectileEmoji || '🌟', p.x, p.y, 24);

    // Ground star
    if (s.groundStar.available) {
      const bob = Math.sin(s.time * 4) * 4;
      drawEmoji(ctx, '⭐', s.groundStar.x, s.groundStar.y + bob, 28);
      drawText(ctx, 'اضغط E', s.groundStar.x, s.groundStar.y - 20, 12, '#FFD700', 'center', false);
    }

    // Thrown stars
    for (const star of s.stars) drawEmoji(ctx, '⭐', star.x, star.y, 20);

    // Instruction
    if (!s.player.carrying) {
      drawText(ctx, 'خذ النجمة واضغط E لرميها!', W / 2, H - 20, 14, '#FFD700', 'center', false);
    } else {
      drawText(ctx, 'اضغط E لرمي النجمة! 🎯', W / 2, H - 20, 14, '#FFD700', 'center', false);
    }

    s.player.render(ctx);
  }
}

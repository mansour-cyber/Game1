// player.js — Player controller: physics, animation, rendering

import { resolveBodyBox, aabbOverlap, clamp, drawCharacter } from './utils.js';

// Physics constants
export const GRAVITY      = 1800;  // px/s²
export const MOVE_SPEED   = 230;   // px/s horizontal
export const JUMP_VEL     = -560;  // px/s initial jump velocity
export const MAX_FALL     = 900;   // px/s terminal velocity
export const COYOTE_TIME  = 0.10;  // seconds of "late jump" grace

export const PW = 32;   // player width
export const PH = 42;   // player height

export const PLAYER_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'];

export class Player {
  constructor(x, y, colorIndex = 0) {
    // Position & size
    this.x = x;
    this.y = y;
    this.w = PW;
    this.h = PH;

    // Velocity
    this.vx = 0;
    this.vy = 0;

    // State flags
    this.onGround = false;
    this.coyoteTimer = 0;
    this.alive = true;
    this.celebrating = false;
    this.celebrateTimer = 0;
    this.dead = false;
    this.deadTimer = 0;

    // Visual
    this.bodyColor = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    this.facingLeft = false;
    this.bounceAnim = 0; // oscillates for run animation
    this.bounceDir  = 1;

    // Carrying item (for placement levels)
    this.carrying = null; // { emoji, id }
  }

  /** Call every frame with dt and array of solid platforms. */
  update(dt, platforms, input, audio, game) {
    if (!this.alive) {
      if (this.dead) {
        this.deadTimer += dt;
        this.vy += GRAVITY * dt * 0.5;
        this.y  += this.vy * dt;
      }
      return;
    }

    if (this.celebrating) {
      this.celebrateTimer += dt;
      this.bounceAnim = Math.sin(this.celebrateTimer * 12) * 5;
      return;
    }

    // ── Horizontal movement ──────────────────────────────
    const moveLeft  = input.held('ArrowLeft');
    const moveRight = input.held('ArrowRight');

    if (moveLeft)  { this.vx = -MOVE_SPEED; this.facingLeft = true;  }
    else if (moveRight) { this.vx = MOVE_SPEED; this.facingLeft = false; }
    else { this.vx = 0; }

    // ── Coyote time ──────────────────────────────────────
    if (this.onGround) this.coyoteTimer = COYOTE_TIME;
    else if (this.coyoteTimer > 0) this.coyoteTimer -= dt;

    // ── Jump ─────────────────────────────────────────────
    const jumpPressed = input.pressed('Space') || input.pressed('ArrowUp') || input.pressed('KeyW');
    if (jumpPressed && this.coyoteTimer > 0) {
      this.vy = JUMP_VEL;
      this.coyoteTimer = 0;
      if (audio) audio.sfxJump();
    }

    // ── Gravity ──────────────────────────────────────────
    this.vy += GRAVITY * dt;
    this.vy  = clamp(this.vy, -1200, MAX_FALL);

    // ── Move X first, resolve, then Y ────────────────────
    this.x += this.vx * dt;
    this.onGround = false;
    for (const p of platforms) {
      if (!p.solid) continue;
      // Horizontal resolution
      if (aabbOverlap(this.x, this.y + 2, this.w, this.h - 4, p.x, p.y, p.w, p.h)) {
        const cx = (this.x + this.w / 2) - (p.x + p.w / 2);
        const halfW = (this.w + p.w) / 2;
        const pen = halfW - Math.abs(cx);
        if (pen > 0 && pen < 16) {
          this.x += cx > 0 ? pen : -pen;
          this.vx = 0;
        }
      }
    }

    this.y += this.vy * dt;
    for (const p of platforms) {
      if (!p.solid) continue;
      resolveBodyBox(this, p, p.oneWay || false);
    }

    // ── Canvas bounds ────────────────────────────────────
    if (game) {
      if (this.x < 0) { this.x = 0; this.vx = 0; }
      if (this.x + this.w > game.W) { this.x = game.W - this.w; this.vx = 0; }
    }

    // ── Walk bounce animation ────────────────────────────
    if (this.onGround && (moveLeft || moveRight)) {
      this.bounceAnim += dt * 18 * this.bounceDir;
      if (this.bounceAnim > 3)  this.bounceDir = -1;
      if (this.bounceAnim < -3) this.bounceDir =  1;
    } else {
      this.bounceAnim *= 0.85;
    }
  }

  celebrate() {
    this.alive = true;
    this.celebrating = true;
    this.celebrateTimer = 0;
    this.vx = 0; this.vy = 0;
  }

  die() {
    this.alive = false;
    this.dead  = true;
    this.deadTimer = 0;
    this.vy = -350;
    this.vx = 0;
  }

  /** Render the player on canvas */
  render(ctx) {
    if (!this.alive && this.dead) {
      // Spinning dead animation
      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      ctx.rotate(this.deadTimer * 8);
      ctx.globalAlpha = Math.max(0, 1 - this.deadTimer);
      drawCharacter(ctx, -this.w / 2, -this.h / 2, this.w, this.h, this.bodyColor, '😵', false, 0);
      ctx.restore();
      return;
    }

    const bounce = this.bounceAnim;
    const face = this.celebrating ? '🎉' : null;
    drawCharacter(ctx, this.x, this.y, this.w, this.h, this.bodyColor, face, this.facingLeft, bounce);

    // Carrying indicator
    if (this.carrying) {
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.carrying.emoji, this.x + this.w / 2, this.y - 14);
    }
  }

  /** Get center position */
  centerX() { return this.x + this.w / 2; }
  centerY() { return this.y + this.h / 2; }

  /** AABB for collision queries */
  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

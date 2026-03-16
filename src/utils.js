// utils.js — Drawing helpers, AABB collision, math utilities

// ── Canvas Drawing Helpers ────────────────────────────────────────────────────

/** Rounded rectangle path */
export function roundRectPath(ctx, x, y, w, h, r = 8) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Fill a rounded rectangle */
export function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

/** Stroke a rounded rectangle */
export function strokeRoundRect(ctx, x, y, w, h, r, color, lw = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

/** Draw platform with top highlight */
export function drawPlatform(ctx, x, y, w, h, color, topColor) {
  topColor = topColor || lighten(color, 40);
  fillRoundRect(ctx, x, y, w, h, 6, color);
  // Top strip highlight
  ctx.fillStyle = topColor;
  roundRectPath(ctx, x + 3, y + 2, w - 6, 7, 3);
  ctx.fill();
}

/** Draw a simple flat button */
export function drawButton(ctx, x, y, w, h, label, bgColor, textColor, hovered = false) {
  const col = hovered ? lighten(bgColor, 30) : bgColor;
  fillRoundRect(ctx, x, y, w, h, 12, col);
  strokeRoundRect(ctx, x, y, w, h, 12, 'rgba(255,255,255,0.5)', 2);
  ctx.fillStyle = textColor || '#fff';
  ctx.font = `bold ${Math.min(h * 0.45, 22)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

/** Draw text with outline for readability */
export function drawText(ctx, text, x, y, size, color, align = 'center', outline = true) {
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Draw emoji at position */
export function drawEmoji(ctx, emoji, x, y, size = 32) {
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

/** Draw a star shape */
export function drawStar(ctx, cx, cy, r, color = '#FFD700') {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    else ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = darken(color, 30);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** Draw a simple cartoon character (player / NPC) */
export function drawCharacter(ctx, x, y, w, h, bodyColor, faceEmoji, flipX = false, bounce = 0) {
  const bx = flipX ? x + w : x;
  ctx.save();
  ctx.translate(bx, y + bounce);
  if (flipX) ctx.scale(-1, 1);

  // Body
  fillRoundRect(ctx, 0, h * 0.3, w, h * 0.7, 8, bodyColor);
  // Head
  ctx.fillStyle = '#FFDAB9';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.22, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken('#FFDAB9', 20);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(w * 0.38, h * 0.20, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.62, h * 0.20, 2.5, 0, Math.PI * 2); ctx.fill();

  // Smile
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.24, w * 0.12, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Hat (small triangle on head)
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.04);
  ctx.lineTo(w * 0.72, h * 0.04);
  ctx.lineTo(w / 2, -h * 0.10);
  ctx.closePath();
  ctx.fill();

  if (faceEmoji) {
    ctx.font = `${h * 0.28}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(faceEmoji, w / 2, h * 0.22);
  }

  ctx.restore();
}

/** Draw a simple cloud */
export function drawCloud(ctx, x, y, scale = 1) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const draw = (dx, dy, r) => { ctx.beginPath(); ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2); ctx.fill(); };
  draw(0, 0, 22); draw(-22, 5, 16); draw(22, 5, 16); draw(-10, -10, 14); draw(12, -8, 18);
}

/** Lighten a hex color by amount (0-255) */
export function lighten(hex, amount) {
  return adjustColor(hex, amount);
}

/** Darken a hex color by amount (0-255) */
export function darken(hex, amount) {
  return adjustColor(hex, -amount);
}

function adjustColor(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (n & 0xFF) + amount));
  return `rgb(${r},${g},${b})`;
}

// ── AABB Collision ────────────────────────────────────────────────────────────

/** Returns true if two axis-aligned boxes overlap */
export function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/**
 * Resolve collision between a moving body and a static box.
 * Separates on the minimum penetration axis.
 * @param {Object} body  — { x, y, w, h, vx, vy, onGround }
 * @param {Object} box   — { x, y, w, h }
 * @param {boolean} onlyTop — if true, only resolve top surface (one-way platform)
 */
export function resolveBodyBox(body, box, onlyTop = false) {
  if (!aabbOverlap(body.x, body.y, body.w, body.h, box.x, box.y, box.w, box.h)) return false;

  const overlapX = (body.x + body.w / 2) - (box.x + box.w / 2);
  const overlapY = (body.y + body.h / 2) - (box.y + box.h / 2);
  const halfW = (body.w + box.w) / 2;
  const halfH = (body.h + box.h) / 2;
  const penX = halfW - Math.abs(overlapX);
  const penY = halfH - Math.abs(overlapY);

  if (onlyTop) {
    // Only collide when body is landing on top
    if (overlapY < 0 && body.vy >= 0 && penY < penX) {
      body.y -= penY;
      body.vy = Math.min(body.vy, 0);
      body.onGround = true;
    }
    return true;
  }

  if (penX < penY) {
    // Push out horizontally
    body.x += overlapX > 0 ? penX : -penX;
    body.vx = 0;
  } else {
    // Push out vertically
    if (overlapY < 0) {
      // Landing on top
      body.y -= penY;
      if (body.vy > 0) { body.vy = 0; body.onGround = true; }
    } else {
      // Hitting ceiling
      body.y += penY;
      if (body.vy < 0) body.vy = 0;
    }
  }
  return true;
}

// ── Math Utilities ────────────────────────────────────────────────────────────

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t)    { return a + (b - a) * t; }
export function randInt(lo, hi)  { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
export function randFloat(lo, hi){ return Math.random() * (hi - lo) + lo; }
export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

/** Linear interpolation with clamping */
export function lerpClamped(a, b, t) { return lerp(a, b, clamp(t, 0, 1)); }

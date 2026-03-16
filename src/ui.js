// ui.js — All menus, HUD, overlays drawn on canvas

import {
  fillRoundRect, strokeRoundRect, drawButton, drawText,
  drawStar, drawEmoji, roundRectPath, drawCloud
} from './utils.js';

export const ZONE_NAMES = [
  'قرية الفوضى',
  'غابة المقالب',
  'مدينة الروبوتات',
  'مهرجان الطعام',
  'قلعة الضحك',
  'النهاية الكبرى',
];

export const ZONE_COLORS = [
  '#4CAF50', '#2E7D32', '#607D8B', '#FF9800', '#7B1FA2', '#B71C1C',
];

export class UISystem {
  constructor(game) {
    this.game = game;
    this.W = game.W;
    this.H = game.H;
    // Hover state for buttons
    this._hover = {};
  }

  // ── Main Menu ─────────────────────────────────────────
  drawMenu(ctx, save, onPlay, onLevelSelect, onToggleSound, onReset) {
    const W = this.W, H = this.H;

    // Sky gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0D47A1');
    grad.addColorStop(1, '#1565C0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Clouds
    drawCloud(ctx, 80,  60, 1.2);
    drawCloud(ctx, 300, 40, 0.9);
    drawCloud(ctx, 600, 70, 1.1);
    drawCloud(ctx, 700, 30, 0.7);

    // Island platform
    ctx.fillStyle = '#4CAF50';
    roundRectPath(ctx, 150, H - 130, W - 300, 90, 40);
    ctx.fill();
    ctx.fillStyle = '#388E3C';
    ctx.beginPath(); ctx.ellipse(W / 2, H - 100, 260, 30, 0, 0, Math.PI * 2); ctx.fill();

    // Title banner
    fillRoundRect(ctx, W / 2 - 270, 40, 540, 100, 20, 'rgba(0,0,0,0.55)');
    drawText(ctx, 'جزيرة المقالب', W / 2, 80, 42, '#FFD700', 'center');
    drawText(ctx, 'Prank Island', W / 2, 120, 22, '#FFF9C4', 'center');

    // Total stars
    const stars = save.getTotalStars();
    drawText(ctx, `⭐ ${stars} / 30`, W / 2, 155, 20, '#FFD700', 'center', false);

    // Buttons
    const bw = 220, bh = 52, bx = W / 2 - bw / 2;
    this._btn(ctx, bx, 185, bw, bh, '▶  العب الآن', '#E91E63', '#fff', onPlay);
    this._btn(ctx, bx, 248, bw, bh, '🗺  اختار المستوى', '#1976D2', '#fff', onLevelSelect);

    // Sound toggle
    const soundLabel = save.getSoundOn() ? '🔊  الصوت: شغال' : '🔇  الصوت: مطفي';
    this._btn(ctx, bx, 311, bw, bh, soundLabel, '#00796B', '#fff', onToggleSound);

    // Reset
    this._btn(ctx, bx, 374, bw, bh, '🔄  إعادة تعيين', '#616161', '#fff', onReset);

    // Decorative emoji NPCs on island
    const npcs = ['🐔','🐒','🤖','👨‍🍳','🐝'];
    npcs.forEach((e, i) => drawEmoji(ctx, e, 170 + i * 100, H - 102, 36));
  }

  // ── Level Select Screen ───────────────────────────────
  drawLevelSelect(ctx, save, currentPage, onLevelClick, onBack) {
    const W = this.W, H = this.H;

    // Background
    ctx.fillStyle = '#1A237E';
    ctx.fillRect(0, 0, W, H);
    fillRoundRect(ctx, 0, 0, W, 60, 0, 'rgba(0,0,0,0.4)');
    drawText(ctx, 'اختار المستوى', W / 2, 30, 26, '#FFD700', 'center');

    // Zone info (show zone name for page)
    const zone = currentPage; // 0-5
    const zoneName = ZONE_NAMES[zone] || '';
    const zoneColor = ZONE_COLORS[zone] || '#4CAF50';
    drawText(ctx, `المنطقة ${zone + 1}: ${zoneName}`, W / 2, 58, 18, zoneColor, 'center', false);

    // 5 level buttons per zone, 2 rows
    const startId = zone * 5 + 1;
    const positions = [
      { x: 60,  y: 90  }, { x: 220, y: 90  }, { x: 380, y: 90  },
      { x: 140, y: 220 }, { x: 300, y: 220 },
    ];

    for (let i = 0; i < 5; i++) {
      const levelId = startId + i;
      const pos = positions[i];
      const unlocked = save.isUnlocked(levelId);
      const hasStar  = save.hasStar(levelId);
      const color = unlocked ? zoneColor : '#424242';

      fillRoundRect(ctx, pos.x, pos.y, 140, 110, 16, color);
      strokeRoundRect(ctx, pos.x, pos.y, 140, 110, 16, 'rgba(255,255,255,0.3)', 3);

      if (unlocked) {
        drawText(ctx, `${levelId}`, pos.x + 70, pos.y + 38, 28, '#fff', 'center', false);
        // Short name below
        if (onLevelClick) {
          // Level name will be set by caller via LEVEL_DATA lookup
        }
        if (hasStar) drawStar(ctx, pos.x + 70, pos.y + 80, 14, '#FFD700');
        else { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; drawStar(ctx, pos.x + 70, pos.y + 80, 14, 'rgba(255,255,255,0.15)'); }
      } else {
        drawEmoji(ctx, '🔒', pos.x + 70, pos.y + 55, 32);
      }
    }

    // Zone nav arrows
    if (zone > 0) this._btn(ctx, 10, H / 2 - 25, 50, 50, '◀', '#333', '#fff', () => onLevelClick(-1));
    if (zone < 5) this._btn(ctx, W - 60, H / 2 - 25, 50, 50, '▶', '#333', '#fff', () => onLevelClick(6));

    // Pagination dots
    for (let z = 0; z < 6; z++) {
      ctx.fillStyle = z === zone ? '#FFD700' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(W / 2 - 75 + z * 30, H - 40, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Zone preview image (emoji row)
    const zoneEmojis = [
      ['🏘️','🌽','🎪','🥕','🏆'],
      ['🌳','🐒','🐸','🐝','🏠'],
      ['🤖','⚡','🔧','🔊','🔩'],
      ['🍔','🥣','👨‍🍳','🍦','🥄'],
      ['🏰','👻','🪑','🖼️','🟩'],
      ['😄','🎈','🌀','⚙️','👑'],
    ];
    (zoneEmojis[zone] || []).forEach((e, i) => drawEmoji(ctx, e, 530 + (i % 3) * 70, 120 + Math.floor(i / 3) * 80, 38));

    this._btn(ctx, W - 110, H - 55, 100, 44, '◀ رجوع', '#E91E63', '#fff', onBack);
  }

  // ── HUD (in-game) ─────────────────────────────────────
  drawHUD(ctx, levelName, objective, stars, totalStars, timeLeft, onPause) {
    const W = this.W;

    // Top bar
    fillRoundRect(ctx, 0, 0, W, 48, 0, 'rgba(0,0,0,0.55)');

    // Level name
    drawText(ctx, levelName, 10, 24, 15, '#FFD700', 'left', false);

    // Objective
    drawText(ctx, objective, W / 2, 24, 13, '#fff', 'center', false);

    // Stars
    drawText(ctx, `⭐ ${stars}/30`, W - 110, 24, 15, '#FFD700', 'left', false);

    // Timer
    if (timeLeft !== null && timeLeft !== undefined) {
      const col = timeLeft < 10 ? '#FF5252' : '#fff';
      drawText(ctx, `⏱ ${Math.ceil(timeLeft)}`, W - 55, 24, 15, col, 'right', false);
    }

    // Pause button
    fillRoundRect(ctx, W - 44, 6, 36, 36, 8, 'rgba(255,255,255,0.15)');
    drawText(ctx, '⏸', W - 26, 24, 18, '#fff', 'center', false);
  }

  // ── Win Panel ─────────────────────────────────────────
  drawWinPanel(ctx, levelId, onNext, onMenu) {
    const W = this.W, H = this.H;
    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    // Panel
    fillRoundRect(ctx, W / 2 - 200, H / 2 - 160, 400, 320, 24, '#1B5E20');
    strokeRoundRect(ctx, W / 2 - 200, H / 2 - 160, 400, 320, 24, '#FFD700', 4);

    drawText(ctx, '🎉 أحسنت! 🎉', W / 2, H / 2 - 110, 34, '#FFD700', 'center', false);
    drawText(ctx, 'نجمة جديدة!', W / 2, H / 2 - 65, 22, '#fff', 'center', false);
    drawStar(ctx, W / 2, H / 2 - 15, 38, '#FFD700');

    this._btn(ctx, W / 2 - 165, H / 2 + 50, 150, 52, '▶ التالي', '#E91E63', '#fff', onNext);
    this._btn(ctx, W / 2 + 15,  H / 2 + 50, 150, 52, '🏠 القائمة', '#1976D2', '#fff', onMenu);
  }

  // ── Fail Panel ────────────────────────────────────────
  drawFailPanel(ctx, onRetry, onMenu) {
    const W = this.W, H = this.H;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    fillRoundRect(ctx, W / 2 - 200, H / 2 - 130, 400, 260, 24, '#B71C1C');
    strokeRoundRect(ctx, W / 2 - 200, H / 2 - 130, 400, 260, 24, '#FF5252', 4);

    drawText(ctx, '😅 حاول مرة ثانية!', W / 2, H / 2 - 80, 30, '#fff', 'center', false);
    drawEmoji(ctx, '😂', W / 2, H / 2 - 20, 48);

    this._btn(ctx, W / 2 - 165, H / 2 + 50, 150, 52, '🔄 إعادة', '#FF6F00', '#fff', onRetry);
    this._btn(ctx, W / 2 + 15,  H / 2 + 50, 150, 52, '🏠 القائمة', '#616161', '#fff', onMenu);
  }

  // ── Pause Panel ───────────────────────────────────────
  drawPausePanel(ctx, onResume, onMenu) {
    const W = this.W, H = this.H;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);

    fillRoundRect(ctx, W / 2 - 160, H / 2 - 130, 320, 260, 24, '#263238');
    strokeRoundRect(ctx, W / 2 - 160, H / 2 - 130, 320, 260, 24, '#78909C', 3);

    drawText(ctx, '⏸ إيقاف مؤقت', W / 2, H / 2 - 80, 28, '#fff', 'center', false);

    this._btn(ctx, W / 2 - 120, H / 2 - 30, 240, 52, '▶ استمر', '#2E7D32', '#fff', onResume);
    this._btn(ctx, W / 2 - 120, H / 2 + 38, 240, 52, '🏠 القائمة الرئيسية', '#616161', '#fff', onMenu);
  }

  // ── Game Complete Screen ──────────────────────────────
  drawGameComplete(ctx, totalStars, onMenu) {
    const W = this.W, H = this.H;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#4A148C');
    grad.addColorStop(1, '#880E4F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawText(ctx, '🎊 انتهت اللعبة! 🎊', W / 2, 90, 36, '#FFD700', 'center');
    drawText(ctx, 'أنهيت جزيرة المقالب!', W / 2, 140, 22, '#fff', 'center', false);
    drawText(ctx, 'الملك فرفوش هُزم بالضحك!', W / 2, 175, 18, '#FFD700', 'center', false);

    // Star display
    drawText(ctx, `⭐ ${totalStars} / 30 نجمة`, W / 2, 230, 28, '#FFD700', 'center');

    // Stars row
    for (let i = 0; i < 30; i++) {
      const col = i < totalStars ? '#FFD700' : 'rgba(255,255,255,0.2)';
      drawStar(ctx, 80 + (i % 10) * 66, 290 + Math.floor(i / 10) * 50, 16, col);
    }

    drawEmoji(ctx, '👑', W / 2, 390, 52);

    this._btn(ctx, W / 2 - 120, H - 75, 240, 52, '🏠 القائمة الرئيسية', '#E91E63', '#fff', onMenu);
  }

  // ── Loading screen ────────────────────────────────────
  drawLoading(ctx) {
    const W = this.W, H = this.H;
    ctx.fillStyle = '#0D0020';
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, 'جاري التحميل...', W / 2, H / 2, 28, '#FFD700', 'center');
  }

  // ── Transition flash ──────────────────────────────────
  drawFlash(ctx, alpha) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  // ── Countdown overlay ─────────────────────────────────
  drawCountdown(ctx, n) {
    const W = this.W, H = this.H;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);
    drawText(ctx, String(n), W / 2, H / 2, 96, '#FFD700', 'center');
  }

  // ── Simple helper: draw a clickable button + track hover ──
  _btn(ctx, x, y, w, h, label, bg, fg, cb) {
    const mx = this.game.input ? this.game.input.mouseX : -1;
    const my = this.game.input ? this.game.input.mouseY : -1;
    const hover = mx >= x && mx <= x + w && my >= y && my <= y + h;
    drawButton(ctx, x, y, w, h, label, bg, fg, hover);
    // Register as clickable for click-consume logic
    this.game._uiButtons.push({ x, y, w, h, cb });
  }

  // ── Zone level name lookup (called from level select) ─────
  getLevelShortName(id) {
    const names = [
      '', 'الدجاجة السارقة','الأحذية الطايرة','وش المهرج','قفز الطين','عربة البطيخ',
      'القرد والنظارات','الضفدع المغني','النحلة الزعلانة','البيت المقلوب','شلال الفقاعات',
      'الروبوت الكسول','الزر الخاطئ','مصنع الصوت','المكنسة المجنونة','وش الروبوت',
      'البرجر الهارب','فوضى الشوربة','الطباخ الغاضب','سباق الآيس كريم','الملعقة الذهبية',
      'قاعة المرايا','الأشباح الخايفة','الكرسي المقلب','لوحات الملك','الأرضية المتحركة',
      'اختبار الضحك','صيد البالونات','جري الفخاخ','آلة الفوضى','الملك فرفوش',
    ];
    return names[id] || `المستوى ${id}`;
  }
}

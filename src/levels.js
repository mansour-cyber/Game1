// levels.js — All 30 level configurations (data-driven)
// Each level has a TYPE that maps to a mechanic in levelManager.js

// Zone themes: { bg, ground, platform, accent, sky }
export const THEMES = [
  { bg:'#87CEEB', sky:'#64B5F6', ground:'#5D4037', platform:'#43A047', accent:'#FFD54F', cloud:true  }, // Zone 1: Village
  { bg:'#2E7D32', sky:'#1B5E20', ground:'#1B5E20', platform:'#558B2F', accent:'#CCFF90', cloud:false }, // Zone 2: Forest
  { bg:'#37474F', sky:'#263238', ground:'#212121', platform:'#546E7A', accent:'#00E5FF', cloud:false }, // Zone 3: Robot City
  { bg:'#FFF8E1', sky:'#FFE082', ground:'#795548', platform:'#FF7043', accent:'#FFEB3B', cloud:true  }, // Zone 4: Food Festival
  { bg:'#4A148C', sky:'#311B92', ground:'#1A0030', platform:'#7B1FA2', accent:'#CE93D8', cloud:false }, // Zone 5: Castle
  { bg:'#0D0020', sky:'#0A0015', ground:'#0D0020', platform:'#6A1B9A', accent:'#FF6D00', cloud:false }, // Zone 6: Final
];

// Mechanic types
export const M = {
  PLATFORM_RUN:   'PLATFORM_RUN',
  COLLECTOR:      'COLLECTOR',
  CHASE:          'CHASE',
  PATTERN:        'PATTERN',
  CHOICE:         'CHOICE',
  AVOID_COLLECT:  'AVOID_COLLECT',
  BOSS:           'BOSS',
};

// Shared platform layout builders (return array of {x,y,w,h})
function groundPlat(W, H) {
  return [{ x: 0, y: H - 48, w: W, h: 48, solid: true }];
}

function stairPlatforms(W, H) {
  return [
    ...groundPlat(W, H),
    { x: 100, y: H - 130, w: 120, h: 18, solid: true },
    { x: 300, y: H - 200, w: 120, h: 18, solid: true },
    { x: 500, y: H - 270, w: 120, h: 18, solid: true },
    { x: 650, y: H - 190, w: 100, h: 18, solid: true },
  ];
}

function pitPlatforms(W, H) {
  // Ground with gaps (pits)
  return [
    { x: 0,   y: H - 48, w: 160, h: 48, solid: true },
    { x: 240, y: H - 48, w: 140, h: 48, solid: true },
    { x: 460, y: H - 48, w: 120, h: 48, solid: true },
    { x: 660, y: H - 48, w: 140, h: 48, solid: true },
  ];
}

function castlePlatforms(W, H) {
  return [
    ...groundPlat(W, H),
    { x: 80,  y: H - 140, w: 110, h: 18, solid: true },
    { x: 260, y: H - 200, w: 110, h: 18, solid: true },
    { x: 450, y: H - 150, w: 110, h: 18, solid: true },
    { x: 620, y: H - 240, w: 110, h: 18, solid: true },
    { x: 350, y: H - 300, w: 100, h: 18, solid: true },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
//  ALL 30 LEVEL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const LEVELS = [

  // ══════════════════════════════════════════════════════
  //  ZONE 1: قرية الفوضى — Village of Chaos
  // ══════════════════════════════════════════════════════

  {
    id: 1, zone: 1, theme: THEMES[0], type: M.CHASE,
    name: 'الدجاجة السارقة',
    nameEn: 'The Thief Chicken',
    objective: 'اصطد الدجاجة! تجنب البيض!',
    // Chase config
    targetEmoji: '🐔',
    targetSpeed: 140,
    targetZigzag: true,
    hazardEmoji: '🥚',
    hazardFreq: 1.8,   // seconds between falling eggs
    timeLimit: 45,
    platforms: (W, H) => groundPlat(W, H),
    spawnX: 80, spawnY: (H) => H - 90,
    targetStartX: 500, targetStartY: (H) => H - 90,
    successMsg: 'مسكتها! 🎉',
    failMsg: 'البيضة ضربتك! 😂',
  },

  {
    id: 2, zone: 1, theme: THEMES[0], type: M.COLLECTOR,
    name: 'الأحذية الطايرة',
    nameEn: 'Runaway Shoes',
    objective: 'اجمع 5 أحذية قبل انتهاء الوقت!',
    itemEmoji: '👟',
    itemCount: 5,
    itemBounce: true,
    timeLimit: 25,
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 120, y: H - 150, w: 100, h: 18, solid: true },
      { x: 380, y: H - 200, w: 100, h: 18, solid: true },
      { x: 620, y: H - 160, w: 100, h: 18, solid: true },
    ],
    spawnX: 80, spawnY: (H) => H - 90,
    successMsg: 'جمعت الأحذية! 👟🎉',
    failMsg: 'نفد الوقت! 😅',
  },

  {
    id: 3, zone: 1, theme: THEMES[0], type: M.COLLECTOR,
    name: 'وش المهرج',
    nameEn: 'Clown Face Fix',
    objective: 'اجمع قطع وش المهرج الأربعة!',
    itemEmoji: '🎭',
    items: [
      { emoji: '👃', label: 'أنف' },
      { emoji: '👁️', label: 'عين يمين' },
      { emoji: '👁️', label: 'عين يسار' },
      { emoji: '🎪', label: 'قبعة' },
    ],
    itemCount: 4,
    timeLimit: 40,
    platforms: (W, H) => stairPlatforms(W, H),
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'أصلحت وش المهرج! 🤡',
    failMsg: 'المهرج ضحك عليك! 😂',
  },

  {
    id: 4, zone: 1, theme: THEMES[0], type: M.PLATFORM_RUN,
    name: 'قفز الطين',
    nameEn: 'Mud Jump',
    objective: 'اقفز فوق البرك وصل للعلم!',
    platforms: (W, H) => pitPlatforms(W, H),
    hazards: 'pits',   // pits between platforms = fall = fail
    goalX: 740, goalY: (H) => H - 100,
    goalEmoji: '🚩',
    spawnX: 40, spawnY: (H) => H - 90,
    successMsg: 'عبرت الطين! 🎉',
    failMsg: 'وقعت في الطين! 🤣',
  },

  {
    id: 5, zone: 1, theme: THEMES[0], type: M.PLATFORM_RUN,
    name: 'عربة البطيخ',
    nameEn: 'Watermelon Cart',
    objective: 'ادفع العربة وصل للهدف!',
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 250, y: H - 48, w: 80, h: 48, solid: true },  // bump obstacle
    ],
    goalX: 720, goalY: (H) => H - 100,
    goalEmoji: '🏁',
    cartX: 200, cartY: (H) => H - 80,
    cartEmoji: '🍉',
    spawnX: 50, spawnY: (H) => H - 90,
    hasCart: true,
    successMsg: 'وصلت العربة! 🍉🎉',
    failMsg: 'العربة انقلبت! 😅',
  },

  // ══════════════════════════════════════════════════════
  //  ZONE 2: غابة المقالب — Prank Forest
  // ══════════════════════════════════════════════════════

  {
    id: 6, zone: 2, theme: THEMES[1], type: M.COLLECTOR,
    name: 'القرد والنظارات',
    nameEn: 'Monkey and Glasses',
    objective: 'خذ النظارات الثلاثة من القرد!',
    itemEmoji: '🕶️',
    itemCount: 3,
    itemBounce: true,
    monkeyEnemy: true,
    timeLimit: 35,
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 150, y: H - 160, w: 130, h: 18, solid: true },
      { x: 400, y: H - 220, w: 130, h: 18, solid: true },
      { x: 600, y: H - 150, w: 130, h: 18, solid: true },
    ],
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'استرجعت النظارات! 🕶️👏',
    failMsg: 'القرد هرب! 🐒😅',
  },

  {
    id: 7, zone: 2, theme: THEMES[1], type: M.PATTERN,
    name: 'الضفدع المغني',
    nameEn: 'Singing Frog',
    objective: 'كرر نمط الضفدع!',
    patternLength: 4,
    rounds: 3,
    colors: ['#F44336','#2196F3','#4CAF50','#FF9800'],
    colorNames: ['أحمر','أزرق','أخضر','برتقالي'],
    npcEmoji: '🐸',
    spawnX: 400, spawnY: 250,
    successMsg: 'أنت موسيقار! 🐸🎵',
    failMsg: 'الترتيب غلط! 🐸😅',
  },

  {
    id: 8, zone: 2, theme: THEMES[1], type: M.AVOID_COLLECT,
    name: 'النحلة الزعلانة',
    nameEn: 'Moody Bee',
    objective: 'تجنب النحلة واجمع الزهرة!',
    enemyEmoji: '🐝',
    enemySpeed: 120,
    targetEmoji: '🌸',
    targetCount: 1,
    calmOnCollect: true,
    timeLimit: 40,
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 200, y: H - 170, w: 110, h: 18, solid: true },
      { x: 500, y: H - 220, w: 110, h: 18, solid: true },
    ],
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'النحلة صارت هادية! 🌸😄',
    failMsg: 'النحلة لسعتك! 🐝😵',
  },

  {
    id: 9, zone: 2, theme: THEMES[1], type: M.PLATFORM_RUN,
    name: 'البيت المقلوب',
    nameEn: 'Upside-Down House',
    objective: 'العب في البيت المقلوب وصل للمفتاح!',
    platforms: (W, H) => [
      { x: 0, y: 0, w: 800, h: 28, solid: true },           // ceiling = floor (inverted)
      { x: 100, y: H - 130, w: 110, h: 18, solid: true },
      { x: 300, y: H - 200, w: 110, h: 18, solid: true },
      { x: 500, y: H - 150, w: 110, h: 18, solid: true },
      { x: 0, y: H - 48, w: 800, h: 48, solid: true },      // normal ground (death zone if fall from ceiling)
    ],
    invertedGravity: false,
    goalX: 680, goalY: (H) => H - 100,
    goalEmoji: '🗝️',
    spawnX: 60, spawnY: 35,
    successMsg: 'وجدت المفتاح! 🗝️🎉',
    failMsg: 'اتاهت في البيت! 😂',
  },

  {
    id: 10, zone: 2, theme: THEMES[1], type: M.AVOID_COLLECT,
    name: 'شلال الفقاعات',
    nameEn: 'Bubble Falls',
    objective: 'خذ الفقاعات الخضراء، تجنب الحمراء!',
    enemyEmoji: '🔴',
    targetEmoji: '🟢',
    targetCount: 6,
    itemBounce: true,
    timeLimit: 35,
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 80,  y: H - 140, w: 100, h: 18, solid: true },
      { x: 300, y: H - 200, w: 100, h: 18, solid: true },
      { x: 540, y: H - 160, w: 100, h: 18, solid: true },
      { x: 680, y: H - 240, w: 100, h: 18, solid: true },
    ],
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'جمعت الفقاعات! 🫧🎉',
    failMsg: 'الفقاعة الحمراء وقعتك! 😅',
  },

  // ══════════════════════════════════════════════════════
  //  ZONE 3: مدينة الروبوتات — Broken Robot City
  // ══════════════════════════════════════════════════════

  {
    id: 11, zone: 3, theme: THEMES[2], type: M.COLLECTOR,
    name: 'الروبوت الكسول',
    nameEn: 'Lazy Robot',
    objective: 'اجمع 4 بطاريات لتشغيل الروبوت!',
    itemEmoji: '🔋',
    itemCount: 4,
    npcEmoji: '🤖',
    timeLimit: 40,
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 130, y: H - 160, w: 110, h: 18, solid: true },
      { x: 380, y: H - 230, w: 110, h: 18, solid: true },
      { x: 580, y: H - 160, w: 110, h: 18, solid: true },
    ],
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'الروبوت صحي! 🤖⚡',
    failMsg: 'البطاريات ناقصة! 😅',
  },

  {
    id: 12, zone: 3, theme: THEMES[2], type: M.CHOICE,
    name: 'الزر الخاطئ',
    nameEn: 'Wrong Button',
    objective: 'اضغط الزر الصح!',
    rounds: 3,
    choiceCount: 4,
    hintLabel: '✔',
    npcEmoji: '🤖',
    npcMessage: 'اضغط الزر الصح!',
    spawnX: 400, spawnY: 250,
    successMsg: 'ضغطت الزر الصح! 🎯',
    failMsg: 'زر خاطئ! 💥😅',
  },

  {
    id: 13, zone: 3, theme: THEMES[2], type: M.PATTERN,
    name: 'مصنع الصوت',
    nameEn: 'Sound Factory',
    objective: 'رتب الأنابيب بالترتيب الصح!',
    patternLength: 3,
    rounds: 3,
    colors: ['#00BCD4','#FF5722','#8BC34A'],
    colorNames: ['أزرق','برتقالي','أخضر'],
    npcEmoji: '⚙️',
    isSequential: true,
    spawnX: 400, spawnY: 250,
    successMsg: 'المصنع شغال! ⚙️🎉',
    failMsg: 'الأنابيب مخربطة! 😅',
  },

  {
    id: 14, zone: 3, theme: THEMES[2], type: M.CHASE,
    name: 'المكنسة المجنونة',
    nameEn: 'Crazy Vacuum',
    objective: 'اهرب من المكنسة! وصل للمنطقة الآمنة!',
    targetEmoji: '🚀',  // player goal
    enemyEmoji: '🌀',   // vacuum chasing player
    chasePlayer: true,  // enemy chases player (reverse chase)
    enemySpeed: 110,
    safeZoneX: 680,
    safeZoneW: 100,
    timeLimit: 30,
    platforms: (W, H) => groundPlat(W, H),
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'وصلت المنطقة الآمنة! 🛡️',
    failMsg: 'المكنسة مسكتك! 😵',
  },

  {
    id: 15, zone: 3, theme: THEMES[2], type: M.COLLECTOR,
    name: 'وش الروبوت',
    nameEn: 'Fix the Robot Face',
    objective: 'اجمع أجزاء وش الروبوت!',
    items: [
      { emoji: '👁️', label: 'عين يمين' },
      { emoji: '👁️', label: 'عين يسار' },
      { emoji: '👄', label: 'فم' },
      { emoji: '📡', label: 'هوائي' },
    ],
    itemCount: 4,
    npcEmoji: '🤖',
    timeLimit: 45,
    platforms: (W, H) => stairPlatforms(W, H),
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'وش الروبوت اكتمل! 🤖✨',
    failMsg: 'الروبوت ما كمل! 😅',
  },

  // ══════════════════════════════════════════════════════
  //  ZONE 4: مهرجان الطعام — Crazy Food Festival
  // ══════════════════════════════════════════════════════

  {
    id: 16, zone: 4, theme: THEMES[3], type: M.COLLECTOR,
    name: 'البرجر الهارب',
    nameEn: 'Runaway Burger',
    objective: 'اجمع مكونات البرجر الخمسة!',
    items: [
      { emoji: '🥖', label: 'خبز فوق' },
      { emoji: '🥩', label: 'لحم' },
      { emoji: '🥬', label: 'خس' },
      { emoji: '🍅', label: 'طماطم' },
      { emoji: '🥖', label: 'خبز تحت' },
    ],
    itemCount: 5,
    itemBounce: true,
    timeLimit: 35,
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 80,  y: H - 150, w: 110, h: 18, solid: true },
      { x: 310, y: H - 210, w: 110, h: 18, solid: true },
      { x: 560, y: H - 170, w: 110, h: 18, solid: true },
      { x: 690, y: H - 260, w: 100, h: 18, solid: true },
    ],
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'البرجر كامل! 🍔🎉',
    failMsg: 'البرجر هرب! 😂',
  },

  {
    id: 17, zone: 4, theme: THEMES[3], type: M.CHOICE,
    name: 'فوضى الشوربة',
    nameEn: 'Soup Chaos',
    objective: 'اختار المكونات الصح للشوربة!',
    rounds: 3,
    multiSelect: true,
    selectCount: 3,  // pick 3 correct from 6 options
    options: [
      { emoji:'🥕', label:'جزر', correct: true  },
      { emoji:'🧅', label:'بصل', correct: true  },
      { emoji:'🍗', label:'دجاج',correct: true  },
      { emoji:'🍭', label:'حلوى',correct: false },
      { emoji:'🧃', label:'عصير',correct: false },
      { emoji:'🍦', label:'آيس كريم',correct: false },
    ],
    npcEmoji: '👨‍🍳',
    spawnX: 400, spawnY: 250,
    successMsg: 'الشوربة لذيذة! 🍲👏',
    failMsg: 'الشوربة كارثة! 😅',
  },

  {
    id: 18, zone: 4, theme: THEMES[3], type: M.CHOICE,
    name: 'الطباخ الغاضب',
    nameEn: 'Angry Chef',
    objective: 'قدم الأكلة الصح للطباخ!',
    rounds: 4,
    choiceCount: 4,
    npcEmoji: '👨‍🍳',
    npcMessage: 'أريد: ',
    foodOptions: [
      { emoji:'🍕', label:'بيتزا' },
      { emoji:'🍔', label:'برجر' },
      { emoji:'🍜', label:'نودلز' },
      { emoji:'🌮', label:'تاكو' },
    ],
    timePerRound: 5,
    spawnX: 400, spawnY: 250,
    successMsg: 'الطباخ راضي! 👨‍🍳😊',
    failMsg: 'الطباخ غضب أكثر! 😡😅',
  },

  {
    id: 19, zone: 4, theme: THEMES[3], type: M.PLATFORM_RUN,
    name: 'سباق الآيس كريم',
    nameEn: 'Ice Cream Run',
    objective: 'اوصل الآيس كريم قبل ما يذوب!',
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 100, y: H - 140, w: 120, h: 18, solid: true },
      { x: 290, y: H - 200, w: 100, h: 18, solid: true },
      { x: 470, y: H - 155, w: 120, h: 18, solid: true },
      { x: 650, y: H - 220, w: 110, h: 18, solid: true },
    ],
    goalX: 720, goalY: (H) => H - 280,
    goalEmoji: '🏆',
    spawnX: 50, spawnY: (H) => H - 90,
    timeLimit: 30,
    iceCreamMelt: true,
    successMsg: 'الآيس كريم وصل سليم! 🍦🎉',
    failMsg: 'الآيس كريم ذاب! 😅',
  },

  {
    id: 20, zone: 4, theme: THEMES[3], type: M.CHOICE,
    name: 'الملعقة الذهبية',
    nameEn: 'Golden Spoon',
    objective: 'ابحث عن الملعقة الحقيقية!',
    rounds: 4,
    choiceCount: 5,
    correctEmoji: '🥄',
    fakeEmoji: '🍴',
    npcEmoji: '👨‍🍳',
    npcMessage: 'أين الملعقة الذهبية؟',
    spawnX: 400, spawnY: 250,
    successMsg: 'وجدت الملعقة! 🥄✨',
    failMsg: 'غلطت! 😅',
  },

  // ══════════════════════════════════════════════════════
  //  ZONE 5: قلعة الضحك — Laugh Castle
  // ══════════════════════════════════════════════════════

  {
    id: 21, zone: 5, theme: THEMES[4], type: M.CHOICE,
    name: 'قاعة المرايا',
    nameEn: 'Mirror Hall',
    objective: 'اختار الباب الصح!',
    rounds: 5,
    choiceCount: 3,
    npcEmoji: '🪞',
    npcMessage: 'الباب الصح له إشارة صغيرة!',
    spawnX: 400, spawnY: 250,
    successMsg: 'وجدت الطريق الصح! 🚪✨',
    failMsg: 'الباب الغلط! 🪞😅',
  },

  {
    id: 22, zone: 5, theme: THEMES[4], type: M.PATTERN,
    name: 'الأشباح الخايفة',
    nameEn: 'Scared Ghosts',
    objective: 'وجّه الأشباح للأبواب الصحيحة!',
    patternLength: 3,
    rounds: 3,
    colors: ['#EF9A9A','#90CAF9','#A5D6A7'],
    colorNames: ['أحمر','أزرق','أخضر'],
    npcEmoji: '👻',
    spawnX: 400, spawnY: 250,
    successMsg: 'الأشباح في أماكنها! 👻🎉',
    failMsg: 'الأشباح اتاهوا! 😅',
  },

  {
    id: 23, zone: 5, theme: THEMES[4], type: M.CHOICE,
    name: 'الكرسي المقلب',
    nameEn: 'Prank Chair',
    objective: 'اختار الكرسي السليم 3 مرات!',
    rounds: 3,
    choiceCount: 3,
    correctEmoji: '🪑',
    fakeEmojis: ['💣','🌵'],
    npcEmoji: '👑',
    npcMessage: 'الكرسي السليم بدون شرر!',
    spawnX: 400, spawnY: 250,
    successMsg: 'جلست صح! 🪑😄',
    failMsg: 'كرسي مقلب! 💥😅',
  },

  {
    id: 24, zone: 5, theme: THEMES[4], type: M.PATTERN,
    name: 'لوحات الملك',
    nameEn: 'Portrait Puzzle',
    objective: 'رتب صور الملك بالترتيب الصح!',
    patternLength: 4,
    rounds: 2,
    colors: ['#F44336','#2196F3','#4CAF50','#FF9800'],
    colorNames: ['١','٢','٣','٤'],
    npcEmoji: '👑',
    shuffled: true,
    spawnX: 400, spawnY: 250,
    successMsg: 'الصور مرتبة! 🖼️👑',
    failMsg: 'الترتيب غلط! 😅',
  },

  {
    id: 25, zone: 5, theme: THEMES[4], type: M.PLATFORM_RUN,
    name: 'الأرضية المتحركة',
    nameEn: 'Moving Floor',
    objective: 'قف على البلاطات الخضراء فقط!',
    platforms: (W, H) => [
      { x: 0, y: H - 48, w: 800, h: 48, solid: true, invisible: true }, // death floor
    ],
    movingTiles: true,
    goalX: 730, goalY: (H) => H - 110,
    goalEmoji: '⭐',
    spawnX: 40, spawnY: (H) => H - 110,
    tileY: (H) => H - 85,
    successMsg: 'عبرت الأرضية! ⭐🎉',
    failMsg: 'وقعت على بلاطة حمراء! 😅',
  },

  // ══════════════════════════════════════════════════════
  //  ZONE 6: النهاية — Final Showdown
  // ══════════════════════════════════════════════════════

  {
    id: 26, zone: 6, theme: THEMES[5], type: M.CHOICE,
    name: 'اختبار الضحك',
    nameEn: 'Laugh Test',
    objective: 'أجب على أسئلة الملك المضحكة!',
    rounds: 4,
    questions: [
      { q: 'ماذا يقول الدجاج؟', options:['كاكاكا','ميومي','عوعو','بطبط'], correct: 0 },
      { q: 'كم ساق للروبوت؟', options:['صفر','اثنان','مئة','ألف'], correct: 1 },
      { q: 'ما لون البطيخ من الداخل؟', options:['أزرق','برتقالي','أحمر','أسود'], correct: 2 },
      { q: 'الملك فرفوش يحب ماذا؟', options:['الحرب','النوم','الضحك','البكاء'], correct: 2 },
    ],
    npcEmoji: '👑',
    spawnX: 400, spawnY: 250,
    successMsg: 'أجبت صح! 😄👑',
    failMsg: 'إجابة خاطئة! 😅',
  },

  {
    id: 27, zone: 6, theme: THEMES[5], type: M.AVOID_COLLECT,
    name: 'صيد البالونات',
    nameEn: 'Balloon Chase',
    objective: 'اصطد البالونات الذهبية وتجنب الحمراء!',
    targetEmoji: '🟡',
    enemyEmoji: '🔴',
    targetCount: 7,
    enemyCount: 5,
    timeLimit: 40,
    itemBounce: true,
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 100, y: H - 160, w: 120, h: 18, solid: true },
      { x: 350, y: H - 240, w: 120, h: 18, solid: true },
      { x: 580, y: H - 180, w: 120, h: 18, solid: true },
    ],
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'صدت البالونات الذهبية! 🎈🌟',
    failMsg: 'البالون الأحمر! 😅',
  },

  {
    id: 28, zone: 6, theme: THEMES[5], type: M.PLATFORM_RUN,
    name: 'جري الفخاخ',
    nameEn: 'Final Trap Run',
    objective: 'اعبر كل الفخاخ وصل للنهاية!',
    platforms: (W, H) => [
      ...pitPlatforms(W, H),
      { x: 160, y: H - 160, w: 70,  h: 18, solid: true },
      { x: 380, y: H - 220, w: 70,  h: 18, solid: true },
    ],
    hazards: 'mixed',
    goalX: 740, goalY: (H) => H - 100,
    goalEmoji: '🏆',
    spawnX: 40, spawnY: (H) => H - 90,
    enemyCount: 2,
    eggsDropping: true,
    timeLimit: 50,
    successMsg: 'نجحت في الاختبار النهائي! 🏆🎉',
    failMsg: 'الفخاخ كثيرة! 😅 حاول مرة ثانية!',
  },

  {
    id: 29, zone: 6, theme: THEMES[5], type: M.PATTERN,
    name: 'آلة الفوضى',
    nameEn: 'Chaos Machine',
    objective: 'أوقف آلة الفوضى! اضغط الأزرار بالترتيب!',
    patternLength: 5,
    rounds: 2,
    colors: ['#FF5722','#9C27B0','#03A9F4','#8BC34A','#FF9800'],
    colorNames: ['🔴','🟣','🔵','🟢','🟠'],
    npcEmoji: '⚙️',
    spawnX: 400, spawnY: 250,
    successMsg: 'آلة الفوضى متوقفة! ⚙️✅',
    failMsg: 'الآلة تسرعت! 😅',
  },

  {
    id: 30, zone: 6, theme: THEMES[5], type: M.BOSS,
    name: 'الملك فرفوش',
    nameEn: 'King Farfoosh',
    objective: 'اضحك على الملك فرفوش 3 مرات!',
    bossEmoji: '👑',
    bossHp: 3,
    bossSpeed: 90,
    phases: [
      { hp: 3, color: '#E53935', speed: 90,  attackFreq: 2.0 },
      { hp: 2, color: '#8E24AA', speed: 120, attackFreq: 1.5 },
      { hp: 1, color: '#FB8C00', speed: 150, attackFreq: 1.0 },
    ],
    projectileEmoji: '🌟',
    platforms: (W, H) => [
      ...groundPlat(W, H),
      { x: 150, y: H - 160, w: 150, h: 18, solid: true },
      { x: 500, y: H - 160, w: 150, h: 18, solid: true },
    ],
    spawnX: 60, spawnY: (H) => H - 90,
    successMsg: 'فرفوش استسلم من الضحك! 👑🎉',
    failMsg: 'فرفوش ضحك عليك! 😅',
  },
];

// ── Helper: get level by ID ───────────────────────────────────────────────────
export function getLevelById(id) {
  return LEVELS.find(l => l.id === id) || null;
}

// ── Helper: total levels ──────────────────────────────────────────────────────
export const TOTAL_LEVELS = LEVELS.length; // 30

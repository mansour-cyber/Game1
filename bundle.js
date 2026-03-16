// bundle.js — Inline bundler: merges all ES modules into a single HTML file
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Dependency-ordered list of JS files
const files = [
  'src/utils.js',
  'src/audio.js',
  'src/input.js',
  'src/save.js',
  'src/levels.js',
  'src/player.js',
  'src/levelManager.js',
  'src/stateManager.js',
  'src/ui.js',
  'src/game.js',
  'main.js',
];

function stripModuleSyntax(code) {
  // Remove import lines
  code = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '');
  // Remove "export default" → keep value
  code = code.replace(/^export\s+default\s+/gm, '');
  // Remove "export " before class/function/const/let/var/async
  code = code.replace(/^export\s+(class|function|async\s+function|const|let|var)/gm, '$1');
  // Remove standalone "export { ... };" lines
  code = code.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
  return code;
}

// Read and process JS files
const jsParts = files.map(f => {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const stripped = stripModuleSyntax(src);
  return `\n// ═══════ ${f} ═══════\n${stripped}`;
});
const jsBundle = jsParts.join('\n');

// Read CSS
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

// Read base HTML and replace links/scripts with inlined versions
const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>جزيرة المقالب – Prank Island</title>
  <style>
${css}
  </style>
</head>
<body>
  <div id="game-wrapper">
    <canvas id="game-canvas" width="800" height="500"></canvas>
    <div id="virtual-controls">
      <div id="vpad-left">
        <button class="vbtn" id="vbtn-left">◀</button>
        <button class="vbtn" id="vbtn-right">▶</button>
      </div>
      <div id="vpad-right">
        <button class="vbtn" id="vbtn-jump">▲</button>
        <button class="vbtn" id="vbtn-action">★</button>
      </div>
    </div>
  </div>
  <script>
${jsBundle}
  </script>
</body>
</html>`;

const outPath = path.join(ROOT, 'dist', 'index.html');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');

const size = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✅ Bundled → dist/index.html (${size} KB)`);

const fs = require('fs');
let content = fs.readFileSync('c:/DrDiary/bible/js/app.js', 'utf8');
const normalized = content.replace(/\r\n/g, '\n');

// Add bm-hint-bar right after the reading-subtitle line
const target = '    <div class="reading-subtitle">${ch}장</div>`;\n';
const replacement = '    <div class="reading-subtitle">${ch}장</div>\n    <div class="bm-hint-bar">책갈피 선택 후 아무 곳이나 탭하세요</div>`;\n';

if (!normalized.includes(target)) {
  console.error('Target not found');
  process.exit(1);
}

const result = normalized.replace(target, replacement);
fs.writeFileSync('c:/DrDiary/bible/js/app.js', result.replace(/\n/g, '\r\n'), 'utf8');
console.log('OK');

const fs = require('fs');
let content = fs.readFileSync('c:/DrDiary/bible/js/bible-data.js', 'utf8').replace(/\r\n/g, '\n');

const startMarker = '/* ── 성경 본문 텍스트 (비워둠 — 온라인 fetch 또는 전체 다운로드 사용) ── */\n';
const endMarker = '\n/* ── 책 번호 맵 (볼스라이프 API 호환) ──────────── */';

const start = content.indexOf(startMarker);
const end   = content.indexOf(endMarker);

if (start === -1 || end === -1) { console.error('markers not found', start, end); process.exit(1); }

const newSection = startMarker + 'const BIBLE_TEXT = {};\n';
const result = content.slice(0, start) + newSection + content.slice(end);
fs.writeFileSync('c:/DrDiary/bible/js/bible-data.js', result.replace(/\n/g, '\r\n'), 'utf8');
console.log('OK — removed', end - start - startMarker.length, 'chars of bundled text');

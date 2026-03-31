const fs = require('fs');
let content = fs.readFileSync('c:/DrDiary/bible/js/app.js', 'utf8');
const normalized = content.replace(/\r\n/g, '\n');

const start = normalized.indexOf('function renderReading() {');
let depth = 0, end = start;
for (let i = start; i < normalized.length; i++) {
  if (normalized[i] === '{') depth++;
  else if (normalized[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}

const newFunc = `function renderReading() {
  const book   = state.selectedBook;
  const ch     = state.selectedChapter;
  const target = state.selectedVerse;
  const total  = getVerseCount(book.id, ch);
  titleEl.textContent = \`\${book.id} \${ch}장\`;
  state.bmMode = false;

  const hasData = hasChapterData(book.id, ch);

  let html = \`<div class="reading-wrap" id="reading-wrap">
    <div class="reading-title">\${book.id}</div>
    <div class="reading-subtitle">\${ch}장</div>\`;

  if (hasData) {
    for (let v = 1; v <= total; v++) {
      const text = getVerseText(book.id, ch, v);
      if (!text) continue;
      const isT    = v === target;
      const marked = isBookmarked(book.id, ch, v);
      html += \`
        <div class="verse-row\${isT ? ' target-verse' : ''}\${marked ? ' bm-saved' : ''}" id="v-\${v}"
          data-book="\${escHtml(book.id)}" data-ch="\${ch}" data-v="\${v}" data-text="\${escHtml(text)}">
          <div class="verse-marker">
            <span class="verse-num">\${v}</span>
            <span class="bm-icon">
              <svg viewBox="0 0 24 24" fill="\${marked ? 'currentColor' : 'none'}">
                <path d="M5 3h14a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
                  stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          <span class="verse-text">\${escHtml(text)}</span>
        </div>\`;
    }
  } else {
    html += \`
      <div class="fetch-box" id="fetch-box">
        <div class="fetch-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="#ccc" stroke-width="1.5"/>
            <path d="M12 8v4l3 3" stroke="#ccc" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="fetch-msg">본문이 아직 저장되지 않았습니다</p>
        <button class="fetch-btn" id="fetch-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v13M7 12l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          이 장 불러오기
        </button>
        <p class="fetch-sub">인터넷 연결이 필요합니다 · 저장 후 오프라인 사용 가능</p>
      </div>\`;
  }
  html += '</div>';

  mainEl.innerHTML = html;
  mainEl.scrollTop = 0;

  if (target && hasData) {
    requestAnimationFrame(() => {
      const el = mainEl.querySelector(\`#v-\${target}\`);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  const fetchBtn = mainEl.querySelector('#fetch-btn');
  if (fetchBtn) fetchBtn.addEventListener('click', () => fetchAndShowChapter(book.id, ch, target));

  if (hasData) attachVerseHandlers();
}`;

const result = normalized.slice(0, start) + newFunc + '\n' + normalized.slice(end);
fs.writeFileSync('c:/DrDiary/bible/js/app.js', result.replace(/\n/g, '\r\n'), 'utf8');
console.log('OK', start, end, 'len:', result.length);

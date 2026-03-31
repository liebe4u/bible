/* =========================================================
   app.js  —  개역한글 성경 앱 메인 로직
   온라인: 리모트 서버에서 실시간 로딩
   오프라인: 설정에서 전체 다운로드 후 localStorage 사용
   ========================================================= */

/* ── 서버 설정 ────────────────────────────────────
   BIBLE_SERVER: 성경 데이터를 서비스하는 서버 URL (마지막 / 제외)
   - 비워두면 현재 앱과 같은 도메인의 /bible/ 경로 사용
   - 예: 'https://my-bible.vercel.app' 또는 'https://my-server.com'
   데이터 생성: node scripts/generate-bible-data.js 실행 후 bible/ 업로드
   ─────────────────────────────────────────────── */
const BIBLE_SERVER    = '';  // ← 별도 서버 사용 시 URL 입력
const APP_VERSION     = '20260330'; // 배포 시 날짜(YYYYMMDD)로 업데이트
const LS_SEARCH_IDX   = 'bible_search_idx'; // 검색 인덱스 localStorage 키
const TOTAL_CHAPS     = 1189; // 구약 929 + 신약 260

/* ── 상태 ────────────────────────────────────────── */
const state = {
  currentTab:      'ot',
  currentView:     'books',  // 'books'|'chapters'|'verses'|'reading'
  selectedBook:    null,
  selectedChapter: null,
  selectedVerse:   null,
  searchQuery:     '',
  searchDebounce:  null,
  downloading:     false,
  searchIndex:     null,      // 서버에서 로드한 검색 인덱스 (세션 메모리 캐시)
  bookFilter:      '',        // 책 목록 필터 텍스트
  bookFilterOpen:  false,     // 필터 입력창 열림 여부
  bmMode:             false,  // 책갈피 선택 모드
  bmIgnoreNextClick:  false   // 롱프레스 해제 click 오발 방지 플래그
};

/* ── DOM ─────────────────────────────────────────── */
const mainEl    = document.getElementById('main-content');
const titleEl   = document.getElementById('header-title');
const backBtn   = document.getElementById('back-btn');
const filterBtn = document.getElementById('filter-btn');
const navBtns   = document.querySelectorAll('.nav-btn');

/* ── 초기화 ──────────────────────────────────────── */
navBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
backBtn.addEventListener('click', goBack);
filterBtn.addEventListener('click', toggleBookFilter);

// 안드로이드 하드웨어 뒤로가기 버튼 처리
window.addEventListener('popstate', () => {
  const isDeep = state.currentTab !== 'search'
              && state.currentTab !== 'settings'
              && state.currentView !== 'books';
  if (isDeep) goBack();
});

switchTab('ot');

/* =========================================================
   탭 / 네비게이션
   ========================================================= */
function switchTab(tab) {
  state.currentTab    = tab;
  state.currentView   = (tab === 'search' || tab === 'settings') ? tab : 'books';
  state.selectedBook  = null;
  state.selectedChapter = null;
  state.selectedVerse = null;
  state.bookFilter    = '';
  state.bookFilterOpen = false;
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}

function goBack() {
  if (state.currentTab === 'search' || state.currentTab === 'settings') return;
  if (state.currentView === 'reading') {
    state.currentView = 'verses';
    state.selectedVerse = null;
  } else if (state.currentView === 'verses') {
    state.currentView = 'chapters';
    state.selectedChapter = null;
  } else if (state.currentView === 'chapters') {
    state.currentView = 'books';
    state.selectedBook = null;
  } else return;
  render();
}

/* =========================================================
   메인 렌더
   ========================================================= */
function render() {
  const isBooksView = state.currentView === 'books'
    && state.currentTab !== 'search' && state.currentTab !== 'settings';

  backBtn.classList.toggle('hidden',
    state.currentTab === 'search' || state.currentTab === 'settings' || state.currentView === 'books');

  // 필터 버튼: 책 목록에서만 표시
  filterBtn.classList.toggle('hidden', !isBooksView);
  document.getElementById('filter-icon-search').style.display = state.bookFilterOpen ? 'none' : '';
  document.getElementById('filter-icon-close').style.display  = state.bookFilterOpen ? ''     : 'none';

  if (state.currentTab === 'search')   { titleEl.textContent = '검색'; renderSearch();   return; }
  if (state.currentTab === 'settings') { titleEl.textContent = '설정'; renderSettings(); return; }
  switch (state.currentView) {
    case 'books':    renderBooks();    break;
    case 'chapters': renderChapters(); break;
    case 'verses':   renderVerses();   break;
    case 'reading':  renderReading();  break;
  }
}

/* =========================================================
   책 목록
   ========================================================= */
function toggleBookFilter() {
  state.bookFilterOpen = !state.bookFilterOpen;
  if (!state.bookFilterOpen) state.bookFilter = '';
  render();
  if (state.bookFilterOpen) {
    const inp = mainEl.querySelector('#book-filter-input');
    if (inp) inp.focus();
  }
}

function renderBooks() {
  const isOT = state.currentTab === 'ot';
  titleEl.textContent = isOT ? '구약성경' : '신약성경';

  // 필터 입력창 + 목록 컨테이너 (구조는 한 번만 만들고, 목록만 갱신)
  let html = '';
  if (state.bookFilterOpen) {
    html += `
      <div class="book-filter-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;color:#999">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
          <path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input id="book-filter-input" class="book-filter-input"
          type="text" placeholder="성경 이름 검색…" autocomplete="off">
      </div>`;
  }
  html += `<div id="book-list-body"></div>`;

  mainEl.innerHTML = html;
  mainEl.scrollTop = 0;

  // 필터 입력창 이벤트 — input 이벤트만 사용 (DOM 재생성 없으므로 IME 안전)
  const inp = mainEl.querySelector('#book-filter-input');
  if (inp) {
    inp.value = state.bookFilter;
    inp.focus();

    inp.addEventListener('input', e => {
      state.bookFilter = e.target.value;
      renderBookList();
    });
  }

  renderBookList();
}

// 목록만 업데이트 (입력창 DOM은 건드리지 않음)
function renderBookList() {
  const body = mainEl.querySelector('#book-list-body');
  if (!body) return;

  const isOT = state.currentTab === 'ot';
  const books = isOT ? BOOKS_OT : BOOKS_NT;
  const q = state.bookFilter.trim();
  const filtered = q ? books.filter(b => b.id.includes(q)) : books;

  let html = '';
  if (filtered.length === 0) {
    html = `<div class="no-result">「${escHtml(q)}」에 해당하는 성경이 없습니다</div>`;
  } else {
    filtered.forEach(book => {
      const name = q
        ? book.id.replace(q, `<mark>${escHtml(q)}</mark>`)
        : escHtml(book.id);
      html += `
        <div class="book-item" data-id="${escHtml(book.id)}">
          <span class="book-name">${name}</span>
          <span class="book-meta">${book.ch}장</span>
          <span class="book-arrow">›</span>
        </div>`;
    });
  }

  body.innerHTML = html;
  body.querySelectorAll('.book-item').forEach(el =>
    el.addEventListener('click', () => selectBook(el.dataset.id)));
}

function selectBook(bookId) {
  const all = [...BOOKS_OT, ...BOOKS_NT];
  state.selectedBook  = all.find(b => b.id === bookId);
  state.currentView   = 'chapters';
  state.selectedChapter = null;
  state.selectedVerse = null;
  history.pushState({ bibleNav: true }, '');
  render();
}

/* =========================================================
   장 선택
   ========================================================= */
function renderChapters() {
  const book = state.selectedBook;
  titleEl.textContent = book.id;

  let html = `<div class="section-label">${book.id} — 장 선택</div>
              <div class="grid-container">`;
  for (let c = 1; c <= book.ch; c++) {
    const cached = isChapterCached(book.id, c) ||
      (BIBLE_TEXT[book.id]?.[c] && Object.keys(BIBLE_TEXT[book.id][c]).length >= 5);
    html += `<button class="grid-item${cached ? ' cached' : ''}" data-ch="${c}">${c}</button>`;
  }
  html += '</div>';

  mainEl.innerHTML = html;
  mainEl.scrollTop = 0;

  mainEl.querySelectorAll('.grid-item').forEach(el =>
    el.addEventListener('click', () => selectChapter(parseInt(el.dataset.ch))));
}

function selectChapter(chapter) {
  state.selectedChapter = chapter;
  state.currentView = 'verses';
  state.selectedVerse = null;
  history.pushState({ bibleNav: true }, '');
  render();
}

/* =========================================================
   절 선택
   ========================================================= */
function renderVerses() {
  const book  = state.selectedBook;
  const ch    = state.selectedChapter;
  titleEl.textContent = `${book.id} ${ch}장`;

  const total = getVerseCount(book.id, ch);
  let html = `<div class="section-label">${book.id} ${ch}장 — 절 선택</div>
              <div class="grid-container">`;
  for (let v = 1; v <= total; v++) {
    html += `<button class="grid-item" data-v="${v}">${v}</button>`;
  }
  html += '</div>';

  mainEl.innerHTML = html;
  mainEl.scrollTop = 0;

  mainEl.querySelectorAll('.grid-item').forEach(el =>
    el.addEventListener('click', () => selectVerse(parseInt(el.dataset.v))));
}

function selectVerse(verse) {
  state.selectedVerse = verse;
  state.currentView   = 'reading';
  history.pushState({ bibleNav: true }, '');
  render();
}

/* =========================================================
   읽기 뷰
   ========================================================= */
function renderReading() {
  const book   = state.selectedBook;
  const ch     = state.selectedChapter;
  const target = state.selectedVerse;
  const total  = getVerseCount(book.id, ch);
  titleEl.textContent = `${book.id} ${ch}장`;
  state.bmMode = false;

  const hasData = hasChapterData(book.id, ch);

  let html = `<div class="reading-wrap" id="reading-wrap">
    <div class="reading-title">${book.id}</div>
    <div class="reading-subtitle">${ch}장</div>
    <div class="bm-hint-bar">책갈피 선택 후 아무 곳이나 탭하세요</div>`;

  if (hasData) {
    for (let v = 1; v <= total; v++) {
      const text = getVerseText(book.id, ch, v);
      if (!text) continue;
      const isT    = v === target;
      const marked = isBookmarked(book.id, ch, v);
      html += `
        <div class="verse-row${isT ? ' target-verse' : ''}${marked ? ' bm-saved' : ''}" id="v-${v}"
          data-book="${escHtml(book.id)}" data-ch="${ch}" data-v="${v}" data-text="${escHtml(text)}">
          <div class="verse-marker">
            <span class="verse-num">${v}</span>
            <span class="bm-icon">
              <svg viewBox="0 0 24 24" fill="${marked ? 'currentColor' : 'none'}">
                <path d="M5 3h14a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
                  stroke="currentColor" stroke-width="1.3"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>
          <span class="verse-text">${escHtml(text)}</span>
        </div>`;
    }
    html += '</div>';
    mainEl.innerHTML = html;
    mainEl.scrollTop = 0;
    if (target) {
      requestAnimationFrame(() => {
        const el = mainEl.querySelector(`#v-${target}`);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
    attachVerseHandlers();
  } else {
    // 데이터 없음 → 자동 온라인 fetch (저장 안 함)
    html += `
      <div class="auto-fetch-wrap" id="auto-fetch-wrap">
        <div class="spinner"></div>
        <p class="fetch-sub" style="margin-top:12px">불러오는 중…</p>
      </div>`;
    html += '</div>';
    mainEl.innerHTML = html;
    mainEl.scrollTop = 0;
    fetchAndShowChapter(book.id, ch, target);
  }
}

// fetch된 verses 객체로 읽기 뷰를 직접 렌더 (저장 없이)
function renderReadingFromData(book, ch, target, versesObj) {
  titleEl.textContent = `${book.id} ${ch}장`;
  state.bmMode = false;

  let html = `<div class="reading-wrap" id="reading-wrap">
    <div class="reading-title">${book.id}</div>
    <div class="reading-subtitle">${ch}장</div>
    <div class="bm-hint-bar">책갈피 선택 후 아무 곳이나 탭하세요</div>`;

  for (const [vStr, text] of Object.entries(versesObj)) {
    const v      = parseInt(vStr);
    const isT    = v === target;
    const marked = isBookmarked(book.id, ch, v);
    html += `
      <div class="verse-row${isT ? ' target-verse' : ''}${marked ? ' bm-saved' : ''}" id="v-${v}"
        data-book="${escHtml(book.id)}" data-ch="${ch}" data-v="${v}" data-text="${escHtml(text)}">
        <div class="verse-marker">
          <span class="verse-num">${v}</span>
          <span class="bm-icon">
            <svg viewBox="0 0 24 24" fill="${marked ? 'currentColor' : 'none'}">
              <path d="M5 3h14a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
                stroke="currentColor" stroke-width="1.3"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
        <span class="verse-text">${escHtml(text)}</span>
      </div>`;
  }
  html += '</div>';

  mainEl.innerHTML = html;
  mainEl.scrollTop = 0;
  if (target) {
    requestAnimationFrame(() => {
      const el = mainEl.querySelector(`#v-${target}`);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
  attachVerseHandlers();
}

/* =========================================================
   책갈피 선택 모드 — 롱프레스 UX
   ========================================================= */
function attachVerseHandlers() {
  const wrap = mainEl.querySelector('#reading-wrap');
  if (!wrap) return;

  let pressTimer = null;
  let pressStartY = 0;

  wrap.addEventListener('contextmenu', e => e.preventDefault());

  mainEl.querySelectorAll('.verse-row').forEach(row => {
    // 롱프레스 감지
    row.addEventListener('pointerdown', e => {
      pressStartY = e.clientY;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        if (!state.bmMode) {
          state.bmMode            = true;
          state.bmIgnoreNextClick = true; // 롱프레스 해제 시 발생하는 click 무시
          wrap.classList.add('bm-mode');
          if (navigator.vibrate) navigator.vibrate(30);
          showToast('원하는 구절 선택 후 아무 곳이나 선택하면 저장됩니다');
        }
      }, 500);
    });

    row.addEventListener('pointermove', e => {
      if (Math.abs(e.clientY - pressStartY) > 8) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });
    row.addEventListener('pointerup',     () => { clearTimeout(pressTimer); pressTimer = null; });
    row.addEventListener('pointercancel', () => { clearTimeout(pressTimer); pressTimer = null; });

    // 절 번호(마커) 탭 → 책갈피 토글
    const marker = row.querySelector('.verse-marker');
    marker.addEventListener('click', e => {
      if (!state.bmMode) return;
      e.stopPropagation();
      const { book, ch, v, text } = row.dataset;
      const saved = toggleBookmark(book, parseInt(ch), parseInt(v), text);
      row.classList.toggle('bm-saved', saved);
      const path = row.querySelector('.bm-icon svg path');
      if (path) path.setAttribute('fill', saved ? 'currentColor' : 'none');
    });

    // 구절 텍스트 탭 → 선택 모드 종료
    // (롱프레스 직후 발생하는 첫 click은 bmIgnoreNextClick 플래그로 무시)
    row.querySelector('.verse-text').addEventListener('click', () => {
      if (!state.bmMode) return;
      if (state.bmIgnoreNextClick) { state.bmIgnoreNextClick = false; return; }
      exitBmMode(wrap);
    });
  });
}

function exitBmMode(wrap) {
  state.bmMode = false;
  wrap.classList.remove('bm-mode');
}

/* =========================================================
   리모트 서버 → 단일 장 페치
   URL: {BIBLE_SERVER}/bible/{책번호}/{장번호}.json
   서버 응답 형식 (두 가지 모두 지원):
     A) {"1":"text","2":"text",...}          ← generate-bible-data.js 생성 형식
     B) { verses: [{verse, text}, ...] }     ← getbible.net 호환 형식
   ========================================================= */
// save=false: 온라인 읽기 (저장 안 함) / save=true: 전체 다운로드 시 저장
async function fetchChapterData(bookName, chapter, save = false) {
  const bookNum = BOOK_NUMBERS[bookName];
  if (!bookNum) return null;

  try {
    const base = BIBLE_SERVER || window.location.origin;
    const url  = `${base}/bible/${bookNum}/${chapter}.json`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();

    // 형식 A: {"1":"text",...}
    // 형식 B: {verses:[{verse,text},...]}
    let obj;
    if (Array.isArray(data.verses)) {
      obj = {};
      data.verses.forEach(v => { obj[v.verse] = (v.text || '').trim(); });
    } else {
      obj = data;
    }

    if (!obj || Object.keys(obj).length === 0) return null;
    if (save) saveChapterToLocal(bookName, chapter, obj);
    return obj;
  } catch (e) { return null; }
}

/* =========================================================
   검색 인덱스 로드 (메모리 → localStorage → 서버 순)
   ========================================================= */
async function loadSearchIndex() {
  // 1. 세션 메모리 캐시
  if (state.searchIndex) return state.searchIndex;

  // 2. localStorage 캐시
  try {
    const cached = localStorage.getItem(LS_SEARCH_IDX);
    if (cached) {
      state.searchIndex = JSON.parse(cached);
      return state.searchIndex;
    }
  } catch(e) {}

  // 3. 서버에서 로드
  try {
    const base = BIBLE_SERVER || window.location.origin;
    const url  = `${base}/bible/search.json`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error('[loadSearchIndex] HTTP ' + resp.status + ' – ' + url);
      return null;
    }
    const data = await resp.json();
    state.searchIndex = data;
    // 오프라인 검색을 위해 localStorage에도 저장
    try { localStorage.setItem(LS_SEARCH_IDX, JSON.stringify(data)); } catch(e) {}
    return data;
  } catch(e) {
    console.error('[loadSearchIndex] fetch 실패:', e.message);
    return null;
  }
}

async function fetchAndShowChapter(bookName, chapter, targetVerse) {
  const data = await fetchChapterData(bookName, chapter, false); // 온라인 읽기 = 저장 안 함

  // 컨텍스트 변경 확인 (탭 전환 등)
  if (state.currentView !== 'reading' ||
      state.selectedBook?.id !== bookName ||
      state.selectedChapter !== chapter) return;

  if (!data) {
    const wrap = mainEl.querySelector('#auto-fetch-wrap');
    if (wrap) {
      wrap.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M1 1l22 22M16.72 11.06A11 11 0 0 1 19 12.55M5 12.55a11 11 0 0 1 14.08-2.87M10.73 5.08A11 11 0 0 1 23 12.55M2 8.82a15 15 0 0 1 4.49-2.81M12 20h.01"
            stroke="#ccc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="fetch-msg" style="margin-top:12px">인터넷 연결을 확인해주세요</p>
        <p class="fetch-sub">오프라인 사용은 설정에서 전체 다운로드하세요</p>
        <button class="fetch-btn" id="fetch-retry" style="margin-top:16px">다시 시도</button>`;
      mainEl.querySelector('#fetch-retry')?.addEventListener('click', () => {
        wrap.innerHTML = `
          <div class="spinner"></div>
          <p class="fetch-sub" style="margin-top:12px">불러오는 중…</p>`;
        fetchAndShowChapter(bookName, chapter, targetVerse);
      });
    }
    return;
  }

  // 성공 → fetch 결과로 직접 렌더 (저장 없이 표시만)
  renderReadingFromData(state.selectedBook, chapter, targetVerse, data);
}

/* =========================================================
   전체 성경 다운로드
   ========================================================= */
async function startFullDownload() {
  if (state.downloading) return;
  state.downloading = true;

  const allBooks = [...BOOKS_OT, ...BOOKS_NT];
  const chapters = [];
  allBooks.forEach(b => {
    for (let c = 1; c <= b.ch; c++) {
      if (!isChapterCached(b.id, c) && !(BIBLE_TEXT[b.id]?.[c] && Object.keys(BIBLE_TEXT[b.id][c]).length >= 5)) {
        chapters.push({ book: b.id, ch: c });
      }
    }
  });

  if (chapters.length === 0) {
    alert('모든 장이 이미 저장되어 있습니다!');
    state.downloading = false;
    return;
  }

  // 진행률 오버레이 표시
  showDownloadOverlay(0, chapters.length);

  let done = 0;
  let failed = 0;

  for (const { book, ch } of chapters) {
    const data = await fetchChapterData(book, ch, true); // 전체 다운로드 = 저장
    if (data) done++; else failed++;
    updateDownloadOverlay(done + failed, chapters.length, done, failed);
    await sleep(120); // rate limit 방지
  }

  state.downloading = false;
  hideDownloadOverlay(done, failed);
  render();
}

/* =========================================================
   다운로드 오버레이 UI
   ========================================================= */
function showDownloadOverlay(done, total) {
  let ov = document.getElementById('dl-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'dl-overlay';
    ov.className = 'dl-overlay';
    document.getElementById('app').appendChild(ov);
  }
  ov.innerHTML = downloadOverlayHTML(done, total, 0, 0);
}

function updateDownloadOverlay(done, total, ok, fail) {
  const ov = document.getElementById('dl-overlay');
  if (ov) ov.innerHTML = downloadOverlayHTML(done, total, ok, fail);
}

function hideDownloadOverlay(ok, fail) {
  const ov = document.getElementById('dl-overlay');
  if (!ov) return;
  ov.innerHTML = `
    <div class="dl-ov-inner">
      <div class="dl-ov-done">✓</div>
      <p style="font-weight:700;font-size:17px">다운로드 완료</p>
      <p style="color:#888;font-size:13px;margin-top:4px">${ok}장 저장 완료 · 오류 ${fail}장</p>
      <button class="fetch-btn" style="margin-top:20px" id="dl-close">닫기</button>
    </div>`;
  ov.querySelector('#dl-close').addEventListener('click', () => ov.remove());
}

function downloadOverlayHTML(done, total, ok, fail) {
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  return `
    <div class="dl-ov-inner">
      <p style="font-weight:700;font-size:16px;margin-bottom:16px">성경 전체 다운로드 중</p>
      <div class="dl-bar-bg"><div class="dl-bar-fill" style="width:${pct}%"></div></div>
      <p class="dl-pct">${pct}% &nbsp;·&nbsp; ${done}/${total}장</p>
      ${fail > 0 ? `<p style="font-size:12px;color:#e55;margin-top:4px">오류 ${fail}장</p>` : ''}
      <p style="font-size:12px;color:#bbb;margin-top:8px">앱을 종료하지 마세요</p>
    </div>`;
}

/* =========================================================
   검색
   ========================================================= */
function renderSearch() {
  mainEl.innerHTML = `
    <div class="search-top">
      <div class="search-input-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7.5" stroke="currentColor" stroke-width="2"/>
          <path d="m21 21-4.5-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input id="search-input" type="search" placeholder="검색어 2자 이상 입력"
          autocomplete="off" autocorrect="off" spellcheck="false"
          value="${escHtml(state.searchQuery)}">
      </div>
    </div>
    <div id="search-body"></div>`;

  const input = mainEl.querySelector('#search-input');
  input.selectionStart = input.selectionEnd = input.value.length;

  // input 이벤트만 사용 — e.target.value는 조합 중인 글자도 포함해 실시간 반영
  input.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    clearTimeout(state.searchDebounce);
    state.searchDebounce = setTimeout(updateSearchResults, 300);
  });
  updateSearchResults();
}

async function updateSearchResults() {
  const body = mainEl.querySelector('#search-body');
  if (!body) return;
  const q = state.searchQuery.trim();

  if (q.length < 2) {
    renderBookmarkList(body);
    return;
  }

  body.innerHTML = `<div class="search-hint"><div class="spinner" style="margin:0 auto"></div><p style="color:#999;font-size:13px;margin-top:10px">검색 인덱스 불러오는 중…</p></div>`;

  // 검색 인덱스 로드 (아직 없으면 서버에서 가져옴)
  if (!state.searchIndex) {
    const idx = await loadSearchIndex();
    if (!mainEl.querySelector('#search-body')) return; // 탭 전환됨
    if (!idx) {
      const base = BIBLE_SERVER || window.location.origin;
      const tried = `${base}/bible/search.json`;
      body.innerHTML = `
        <div class="no-result">
          검색 인덱스를 불러오지 못했습니다<br>
          <small style="color:#bbb;word-break:break-all">${escHtml(tried)}</small><br>
          <small style="color:#ddd">브라우저 콘솔(F12)에서 오류를 확인하세요</small>
        </div>`;
      return;
    }
  }

  // 검색 실행 (다음 프레임, UI 블로킹 방지)
  requestAnimationFrame(() => {
    if (!mainEl.querySelector('#search-body')) return;
    const results = searchBible(q, state.searchIndex);

    if (results.length === 0) {
      body.innerHTML = `<div class="no-result">「${escHtml(q)}」 검색 결과 없음</div>`;
      return;
    }

    let html = `<div class="search-count">${results.length}개의 구절</div>`;
    results.forEach(r => {
      html += `
        <div class="search-result-item"
          data-book="${escHtml(r.book)}" data-ch="${r.chapter}" data-v="${r.verse}">
          <div class="result-ref">${r.book} ${r.chapter}:${r.verse}</div>
          <div class="result-text">${highlightText(r.text, q)}</div>
        </div>`;
    });
    body.innerHTML = html;

    body.querySelectorAll('.search-result-item').forEach(el =>
      el.addEventListener('click', () =>
        navigateToVerse(el.dataset.book, parseInt(el.dataset.ch), parseInt(el.dataset.v))));
  });
}

function navigateToVerse(bookId, chapter, verse) {
  const all  = [...BOOKS_OT, ...BOOKS_NT];
  const book = all.find(b => b.id === bookId);
  if (!book) return;
  const isOT = BOOKS_OT.some(b => b.id === bookId);
  state.currentTab      = isOT ? 'ot' : 'nt';
  state.selectedBook    = book;
  state.selectedChapter = chapter;
  state.selectedVerse   = verse;
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === state.currentTab));
  // 중간 단계 스택 push: 책→장→절→읽기 순으로 쌓아야 뒤로가기가 단계별로 동작
  state.currentView = 'chapters'; history.pushState({ bibleNav: true }, '');
  state.currentView = 'verses';   history.pushState({ bibleNav: true }, '');
  state.currentView = 'reading';  history.pushState({ bibleNav: true }, '');
  render();
}

/* =========================================================
   유틸
   ========================================================= */
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlightText(text, query) {
  const escaped = escHtml(text);
  const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(pattern, 'gi'), m => `<mark>${m}</mark>`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* =========================================================
   책갈피 목록 렌더 (검색탭 — 쿼리 없을 때)
   ========================================================= */
function formatSavedAt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

function renderBookmarkList(body) {
  const list = loadBookmarks();

  if (list.length === 0) {
    body.innerHTML = `
      <div class="bm-empty">
        <svg viewBox="0 0 24 24" fill="none" width="36" height="36">
          <path d="M5 3h14a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
            stroke="currentColor" stroke-width="1.3"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>저장된 책갈피가 없습니다</p>
        <span>구절을 길게 누르면 책갈피를 저장할 수 있습니다</span>
      </div>
`;
    return;
  }

  // 책 순서 기준으로 정렬 (책 → 장 → 절)
  const ALL_BOOKS = [...BOOKS_OT, ...BOOKS_NT].map(b => b.id);
  const sorted = [...list].sort((a, b) => {
    const bi = ALL_BOOKS.indexOf(a.book) - ALL_BOOKS.indexOf(b.book);
    if (bi !== 0) return bi;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  // 책 단위로 그룹화
  const groups = [];
  sorted.forEach(item => {
    const last = groups[groups.length - 1];
    if (last && last.book === item.book) {
      last.items.push(item);
    } else {
      groups.push({ book: item.book, items: [item] });
    }
  });

  let html = `<div class="bm-list-header">
    <span class="search-count" style="padding:0">책갈피 ${list.length}개</span>
    <button class="bm-clear-btn" id="bm-clear-all">전체 삭제</button>
  </div>`;

  groups.forEach(group => {
    html += `<div class="bm-group-header">${escHtml(group.book)}</div>`;
    group.items.forEach(b => {
      html += `
        <div class="bm-item"
          data-book="${escHtml(b.book)}" data-ch="${b.chapter}" data-v="${b.verse}">
          <div class="bm-item-ref">${b.chapter}장 ${b.verse}절<span class="bm-item-date">(${formatSavedAt(b.savedAt)})</span></div>
          <div class="bm-item-text">${escHtml(b.text)}</div>
          <button class="bm-delete-btn" aria-label="삭제">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M18 6 6 18M6 6l12 12"
                stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`;
    });
  });

  body.innerHTML = html;

  // 항목 클릭 → 구절 이동
  body.querySelectorAll('.bm-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.bm-delete-btn')) return;
      navigateToVerse(el.dataset.book, parseInt(el.dataset.ch), parseInt(el.dataset.v));
    });
  });

  // 개별 삭제
  body.querySelectorAll('.bm-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const item = btn.closest('.bm-item');
      removeBookmark(item.dataset.book, parseInt(item.dataset.ch), parseInt(item.dataset.v));
      renderBookmarkList(body);
    });
  });

  // 전체 삭제
  body.querySelector('#bm-clear-all')?.addEventListener('click', () => {
    if (confirm(`책갈피 ${list.length}개를 모두 삭제할까요?`)) {
      saveBookmarks([]);
      renderBookmarkList(body);
    }
  });
}

/* =========================================================
   설정 탭 렌더
   ========================================================= */
function renderSettings() {
  mainEl.innerHTML = `<div class="settings-page">${buildSettingsHTML()}</div>`;
  mainEl.scrollTop = 0;

  mainEl.querySelector('#delete-cache-btn')
    ?.addEventListener('click', confirmDeleteCache);
  mainEl.querySelector('#download-all-btn')
    ?.addEventListener('click', startFullDownload);
  mainEl.querySelector('#reload-btn')
    ?.addEventListener('click', () => location.reload());
}

/* ── 설정 HTML 빌드 ──────────────────────────── */
function buildSettingsHTML() {
  const allBooks     = [...BOOKS_OT, ...BOOKS_NT];
  const totalChaps   = allBooks.reduce((s, b) => s + b.ch, 0);   // 1189
  const cachedChaps  = getCachedStats();
  const pct          = Math.round(cachedChaps / totalChaps * 100);

  // 용량 추산 (장당 평균 ~2.5 KB)
  const approxKB     = Math.round(cachedChaps * 2.5);
  const approxStr    = approxKB >= 1024
    ? `약 ${(approxKB / 1024).toFixed(1)} MB`
    : `약 ${approxKB} KB`;

  const transSlug = `<span style="color:#555">Korean (getbible.net)</span>`;

  const barW = Math.max(pct, 2);

  return `

    <!-- ① 저장 위치 -->
    <div class="settings-section">
      <div class="settings-section-label">저장 위치</div>
      <div class="path-box">
        <div class="path-row">
          <span class="path-os android">Android</span>
          <span class="path-text">Chrome: /data/data/com.android.chrome/app_chrome/Default/Local Storage/leveldb/<br>Samsung: /data/data/com.sec.android.app.sbrowser/app_sbrowser/Default/Local Storage/</span>
        </div>
        <div class="path-row">
          <span class="path-os ios">iOS</span>
          <span class="path-text">Safari: 앱 샌드박스 내 WebKit/WebsiteData/LocalStorage/</span>
        </div>
        <p class="path-note">
          ⚠️ 브라우저 앱의 내부(비공개) 영역입니다.<br>
          파일 관리자·파인더에서는 보이지 않으며,<br>
          루트 권한 없이는 직접 접근할 수 없습니다.<br>
          삭제는 아래 버튼 또는 브라우저 설정에서 가능합니다.
        </p>
      </div>
    </div>

    <!-- ② 저장 현황 -->
    <div class="settings-section">
      <div class="settings-section-label">저장 현황</div>
      <div class="storage-stat">
        <div class="stat-row">
          <span class="stat-label">저장된 장</span>
          <span class="stat-value">${cachedChaps} / ${totalChaps}장</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">추정 용량</span>
          <span class="stat-value">${approxStr}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">번역본</span>
          <span class="stat-value" style="font-size:12px">${transSlug}</span>
        </div>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width:${barW}%"></div>
        </div>
        <p style="font-size:11px;color:#bbb;margin-top:6px;text-align:right">${pct}% 저장 완료</p>
      </div>
    </div>

    <!-- ③ 오프라인 모드 -->
    <div class="settings-section">
      <div class="settings-section-label">오프라인 저장</div>
      <div class="mode-card">
        <div class="mode-row">
          <span class="mode-badge offline">오프라인</span>
          <span class="mode-desc">전체 다운로드 후 인터넷 없이 사용할 수 있습니다.<br>저장 공간 약 3 MB가 필요합니다.</span>
        </div>
      </div>
    </div>

    <!-- ④ 버튼 -->
    <div class="settings-btn-group">
      <button class="settings-action-btn primary" id="download-all-btn">
        전체 다운로드 (오프라인 저장)
      </button>
      <button class="settings-action-btn danger" id="delete-cache-btn">
        저장 데이터 삭제
      </button>
    </div>
    <div class="settings-btn-group settings-btn-group--separated">
      <button class="settings-action-btn normal" id="reload-btn">
        데이터 새로고침
      </button>
    </div>`;
}

/* ── 삭제 확인 다이얼로그 ─────────────────────── */
function confirmDeleteCache() {
  const cached = getCachedStats();
  if (cached === 0) {
    showToast('삭제할 데이터가 없습니다');
    return;
  }

  const ov = document.createElement('div');
  ov.className = 'confirm-overlay';
  ov.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-body">
        <strong>저장 데이터 삭제</strong>
        <p>다운로드한 성경 본문 ${cached}장이 모두 삭제됩니다.<br>
        다시 읽으려면 인터넷 연결이 필요합니다.</p>
      </div>
      <div class="confirm-buttons">
        <div class="confirm-btn cancel" id="confirm-cancel">취소</div>
        <div class="confirm-btn ok"     id="confirm-ok">삭제</div>
      </div>
    </div>`;

  document.getElementById('app').appendChild(ov);
  ov.querySelector('#confirm-cancel').addEventListener('click', () => ov.remove());
  ov.querySelector('#confirm-ok').addEventListener('click', () => {
    deleteCachedData();
    ov.remove();
    render(); // 설정 탭 새로고침 (저장 현황 업데이트)
    showToast('저장 데이터를 모두 삭제했습니다');
  });
}

function deleteCachedData() {
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LS_PREFIX)) keysToDelete.push(key);
  }
  keysToDelete.forEach(k => localStorage.removeItem(k));
  // 검색 인덱스 캐시도 삭제
  localStorage.removeItem(LS_SEARCH_IDX);
  state.searchIndex = null;
}

/* ── 토스트 메시지 ───────────────────────────── */
function showToast(msg) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.id = 'toast';
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:76px; left:50%; transform:translateX(-50%);
    background:#222; color:#fff; font-size:13px; line-height:1.5;
    padding:10px 18px; border-radius:10px; z-index:400;
    white-space:pre-line; text-align:center;
    box-shadow:0 2px 12px rgba(0,0,0,0.2);
    animation: fadeInUp 0.2s ease;`;
  document.getElementById('app').appendChild(t);

  setTimeout(() => t.remove(), 2800);
}

/* toast 애니메이션 */
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes fadeInUp {
    from { opacity:0; transform:translateX(-50%) translateY(8px); }
    to   { opacity:1; transform:translateX(-50%) translateY(0); }
  }`;
document.head.appendChild(toastStyle);

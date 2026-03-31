/* =========================================================
   bible-data.js  —  개역한글 성경 구조 데이터 + 샘플 본문
   본문 데이터가 없는 책은 "[본문 데이터 미포함]" 으로 표시됩니다.
   추가 본문은 BIBLE_TEXT 객체에 동일한 형식으로 추가하세요.
   ========================================================= */

/* ── 구약 39권 ─────────────────────────────────── */
const BOOKS_OT = [
  { id:'창세기',   ch:50 }, { id:'출애굽기',     ch:40 }, { id:'레위기',       ch:27 },
  { id:'민수기',   ch:36 }, { id:'신명기',       ch:34 }, { id:'여호수아',     ch:24 },
  { id:'사사기',   ch:21 }, { id:'룻기',         ch:4  }, { id:'사무엘상',     ch:31 },
  { id:'사무엘하', ch:24 }, { id:'열왕기상',     ch:22 }, { id:'열왕기하',     ch:25 },
  { id:'역대상',   ch:29 }, { id:'역대하',       ch:36 }, { id:'에스라',       ch:10 },
  { id:'느헤미야', ch:13 }, { id:'에스더',       ch:10 }, { id:'욥기',         ch:42 },
  { id:'시편',     ch:150}, { id:'잠언',         ch:31 }, { id:'전도서',       ch:12 },
  { id:'아가',     ch:8  }, { id:'이사야',       ch:66 }, { id:'예레미야',     ch:52 },
  { id:'예레미야애가', ch:5},{ id:'에스겔',      ch:48 }, { id:'다니엘',       ch:12 },
  { id:'호세아',   ch:14 }, { id:'요엘',         ch:3  }, { id:'아모스',       ch:9  },
  { id:'오바댜',   ch:1  }, { id:'요나',         ch:4  }, { id:'미가',         ch:7  },
  { id:'나훔',     ch:3  }, { id:'하박국',       ch:3  }, { id:'스바냐',       ch:3  },
  { id:'학개',     ch:2  }, { id:'스가랴',       ch:14 }, { id:'말라기',       ch:4  }
];

/* ── 신약 27권 ─────────────────────────────────── */
const BOOKS_NT = [
  { id:'마태복음',   ch:28 }, { id:'마가복음',   ch:16 }, { id:'누가복음',     ch:24 },
  { id:'요한복음',   ch:21 }, { id:'사도행전',   ch:28 }, { id:'로마서',       ch:16 },
  { id:'고린도전서', ch:16 }, { id:'고린도후서', ch:13 }, { id:'갈라디아서',   ch:6  },
  { id:'에베소서',   ch:6  }, { id:'빌립보서',   ch:4  }, { id:'골로새서',     ch:4  },
  { id:'데살로니가전서', ch:5},{ id:'데살로니가후서',ch:3},{ id:'디모데전서',  ch:6  },
  { id:'디모데후서', ch:4  }, { id:'디도서',     ch:3  }, { id:'빌레몬서',     ch:1  },
  { id:'히브리서',   ch:13 }, { id:'야고보서',   ch:5  }, { id:'베드로전서',   ch:5  },
  { id:'베드로후서', ch:3  }, { id:'요한일서',   ch:5  }, { id:'요한이서',     ch:1  },
  { id:'요한삼서',   ch:1  }, { id:'유다서',     ch:1  }, { id:'요한계시록',   ch:22 }
];

/* ── 장별 절 수 ────────────────────────────────── */
const VERSE_COUNTS = {
  '창세기':   [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  '출애굽기': [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  '레위기':   [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,24,16,15,18,21,16,27,33,13],
  '민수기':   [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,39,17,54,42,56,29,34,13],
  '신명기':   [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  '여호수아': [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  '사사기':   [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  '룻기':     [22,23,18,22],
  '사무엘상': [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
  '사무엘하': [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  '열왕기상': [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  '열왕기하': [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  '역대상':   [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  '역대하':   [17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  '에스라':   [11,70,13,24,17,22,28,36,15,44],
  '느헤미야': [11,20,32,23,19,19,73,18,38,39,36,47,31],
  '에스더':   [22,23,15,17,14,14,10,17,32,3],
  '욥기':     [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
  '시편':     [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,20,28,22,35,22,46,18,9,11,40,16,5,14,8,13,40,6,14,40,28,22,35,26,5,31,23,16,11,11,12,10,13,15,10,14,27,18,12,10,15,21,23,21,11,7,9,24,14,12,12,18,14,9,13,12,11,14,20,8,36,37,6,24,20,28,23,11,13,21,72,13,20,17,8,19,13,14,17,7,19,53,17,16,16,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,14,10,8,12,15,21,10,20,14,9,6],
  '잠언':     [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,62,32,40],
  '전도서':   [18,26,22,16,20,12,29,17,18,20,10,14],
  '아가':     [17,17,11,16,16,13,13,14],
  '이사야':   [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,21,29,2,26,16,26,41,52,35,12,17,14,13,14,27,15,10,50,2,17,14,14,23,15,6,17,17,13,11,11,20,12,21],
  '예레미야': [19,37,25,31,31,30,34,23,25,10,22,19,14,26,34,25,36,8,26,36,12,42,30,28,46,18,56,27,36,37,18,26,19,42,31,27,25,28,43,22,30,41,13,11,24,30,17,18,38,34,32,23],
  '예레미야애가':[22,22,66,22,22],
  '에스겔':   [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,44,37,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  '다니엘':   [21,49,30,37,31,28,28,27,27,21,45,13],
  '호세아':   [11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  '요엘':     [20,32,21],
  '아모스':   [15,16,15,13,27,14,17,14,15],
  '오바댜':   [21],
  '요나':     [17,10,10,11],
  '미가':     [16,13,12,13,15,16,20],
  '나훔':     [15,13,19],
  '하박국':   [17,20,19],
  '스바냐':   [18,15,20],
  '학개':     [15,23],
  '스가랴':   [21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  '말라기':   [14,17,18,6],
  '마태복음': [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  '마가복음': [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  '누가복음': [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  '요한복음': [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  '사도행전': [26,47,26,37,20,28,15,38,24,22,21,34,19,37,25,20,28,18,26,17,19,41,30,22,23,16,21,22],
  '로마서':   [32,29,31,25,21,23,25,39,33,21,36,21,14,26,33,24],
  '고린도전서':[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  '고린도후서':[24,17,18,18,21,18,16,24,15,18,33,21,14],
  '갈라디아서':[24,21,29,31,26,18],
  '에베소서': [23,22,21,32,33,24],
  '빌립보서': [30,30,21,23],
  '골로새서': [29,23,25,18],
  '데살로니가전서':[10,20,13,18,28],
  '데살로니가후서':[12,17,18],
  '디모데전서':[20,15,16,16,25,21],
  '디모데후서':[18,26,17,22],
  '디도서':   [16,15,15],
  '빌레몬서': [25],
  '히브리서': [14,18,19,16,14,20,28,13,28,39,40,29,25],
  '야고보서': [27,26,18,17,20],
  '베드로전서':[25,25,22,19,14],
  '베드로후서':[21,22,18],
  '요한일서': [10,29,24,21,21],
  '요한이서': [13],
  '요한삼서': [14],
  '유다서':   [25],
  '요한계시록':[20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]
};

/* ── 성경 본문 텍스트 (비워둠 — 온라인 fetch 또는 전체 다운로드 사용) ── */
const BIBLE_TEXT = {};

/* ── 책 번호 맵 (볼스라이프 API 호환) ──────────── */
const BOOK_NUMBERS = {
  '창세기':1,'출애굽기':2,'레위기':3,'민수기':4,'신명기':5,
  '여호수아':6,'사사기':7,'룻기':8,'사무엘상':9,'사무엘하':10,
  '열왕기상':11,'열왕기하':12,'역대상':13,'역대하':14,'에스라':15,
  '느헤미야':16,'에스더':17,'욥기':18,'시편':19,'잠언':20,
  '전도서':21,'아가':22,'이사야':23,'예레미야':24,'예레미야애가':25,
  '에스겔':26,'다니엘':27,'호세아':28,'요엘':29,'아모스':30,
  '오바댜':31,'요나':32,'미가':33,'나훔':34,'하박국':35,
  '스바냐':36,'학개':37,'스가랴':38,'말라기':39,
  '마태복음':40,'마가복음':41,'누가복음':42,'요한복음':43,'사도행전':44,
  '로마서':45,'고린도전서':46,'고린도후서':47,'갈라디아서':48,'에베소서':49,
  '빌립보서':50,'골로새서':51,'데살로니가전서':52,'데살로니가후서':53,
  '디모데전서':54,'디모데후서':55,'디도서':56,'빌레몬서':57,'히브리서':58,
  '야고보서':59,'베드로전서':60,'베드로후서':61,'요한일서':62,'요한이서':63,
  '요한삼서':64,'유다서':65,'요한계시록':66
};

/* ── localStorage 캐시 유틸 ─────────────────────── */
const LS_PREFIX    = 'bk_';
const LS_BOOKMARKS = 'bible_bookmarks';

/* ── 책갈피 유틸 ────────────────────────────────── */
function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]');
  } catch (e) { return []; }
}

function saveBookmarks(list) {
  try {
    localStorage.setItem(LS_BOOKMARKS, JSON.stringify(list));
  } catch (e) { console.warn('책갈피 저장 실패', e); }
}

function isBookmarked(bookName, chapter, verse) {
  return loadBookmarks().some(
    b => b.book === bookName && b.chapter === chapter && b.verse === verse
  );
}

function addBookmark(bookName, chapter, verse, text) {
  const list = loadBookmarks().filter(
    b => !(b.book === bookName && b.chapter === chapter && b.verse === verse)
  );
  list.unshift({ book: bookName, chapter, verse, text, savedAt: Date.now() });
  saveBookmarks(list);
}

function removeBookmark(bookName, chapter, verse) {
  saveBookmarks(loadBookmarks().filter(
    b => !(b.book === bookName && b.chapter === chapter && b.verse === verse)
  ));
}

function toggleBookmark(bookName, chapter, verse, text) {
  if (isBookmarked(bookName, chapter, verse)) {
    removeBookmark(bookName, chapter, verse);
    return false; // 해제
  } else {
    addBookmark(bookName, chapter, verse, text);
    return true;  // 저장
  }
}

function saveChapterToLocal(bookName, chapter, versesObj) {
  try {
    localStorage.setItem(`${LS_PREFIX}${bookName}_${chapter}`, JSON.stringify(versesObj));
  } catch (e) { console.warn('저장 실패 (저장공간 부족)', e); }
}

function loadChapterFromLocal(bookName, chapter) {
  try {
    const d = localStorage.getItem(`${LS_PREFIX}${bookName}_${chapter}`);
    return d ? JSON.parse(d) : null;
  } catch (e) { return null; }
}

function isChapterCached(bookName, chapter) {
  return localStorage.getItem(`${LS_PREFIX}${bookName}_${chapter}`) !== null;
}

function getCachedStats() {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).startsWith(LS_PREFIX)) count++;
  }
  return count;
}

/* ── 내부 유틸 ──────────────────────────────────── */
function getVerseCount(bookName, chapterNum) {
  const counts = VERSE_COUNTS[bookName];
  if (!counts) return 30;
  return counts[chapterNum - 1] || 30;
}

function getVerseText(bookName, chapterNum, verseNum) {
  // 1순위: 번들 데이터
  try {
    const t = BIBLE_TEXT[bookName]?.[chapterNum]?.[verseNum];
    if (t) return t;
  } catch (e) {}
  // 2순위: localStorage 캐시
  const cached = loadChapterFromLocal(bookName, chapterNum);
  return cached ? (cached[verseNum] || null) : null;
}

function hasChapterData(bookName, chapterNum) {
  try {
    const bd = BIBLE_TEXT[bookName]?.[chapterNum];
    if (bd && Object.keys(bd).length >= 5) return true;
  } catch (e) {}
  return isChapterCached(bookName, chapterNum);
}

function searchBible(query) {
  const results = [];
  const q = query.trim().toLowerCase();
  if (q.length < 2) return results;

  const allBooks = [...BOOKS_OT, ...BOOKS_NT];

  // 번들 데이터 검색
  for (const book of allBooks) {
    const bookData = BIBLE_TEXT[book.id];
    if (!bookData) continue;
    for (const [chNum, chData] of Object.entries(bookData)) {
      for (const [vNum, text] of Object.entries(chData)) {
        if (text.toLowerCase().includes(q)) {
          results.push({ book: book.id, chapter: parseInt(chNum), verse: parseInt(vNum), text });
        }
      }
    }
  }

  // localStorage 캐시 검색
  const searched = new Set(results.map(r => `${r.book}_${r.chapter}`));
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(LS_PREFIX)) continue;
    // key 형식: bk_창세기_1
    const rest = key.slice(LS_PREFIX.length); // "창세기_1"
    const lastUnd = rest.lastIndexOf('_');
    const bookName = rest.slice(0, lastUnd);
    const chNum = parseInt(rest.slice(lastUnd + 1));
    if (searched.has(`${bookName}_${chNum}`)) continue;
    try {
      const chData = JSON.parse(localStorage.getItem(key));
      for (const [vNum, text] of Object.entries(chData)) {
        if (text.toLowerCase().includes(q)) {
          results.push({ book: bookName, chapter: chNum, verse: parseInt(vNum), text });
        }
      }
    } catch (e) {}
  }

  // 성경 순서로 정렬
  const orderMap = {};
  [...BOOKS_OT, ...BOOKS_NT].forEach((b, i) => { orderMap[b.id] = i; });
  results.sort((a, b) => {
    const od = (orderMap[a.book] ?? 99) - (orderMap[b.book] ?? 99);
    if (od !== 0) return od;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  return results;
}

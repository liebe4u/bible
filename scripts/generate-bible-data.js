#!/usr/bin/env node
/**
 * generate-bible-data.js
 *
 * getbible.net/v2/korean 에서 전체 성경 데이터를 내려받아
 * 프로젝트 루트의 bible/ 디렉터리에 저장합니다.
 *
 * 생성 파일 구조:
 *   bible/{책번호}/{장번호}.json   ← 장별 본문 {"1":"text","2":"text",...}
 *   bible/search.json              ← 전체 검색 인덱스 {"창세기":{"1":{"1":"text",...},...},...}
 *
 * 사용법:
 *   node scripts/generate-bible-data.js
 *
 * 생성 후 bible/ 디렉터리 전체를 서버에 업로드하거나
 * Vercel 프로젝트에 커밋하면 앱이 /bible/ 경로에서 데이터를 읽습니다.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_DIR    = path.join(__dirname, '..', 'bible');
const SOURCE_API = 'https://api.getbible.net/v2/korean';
const DELAY_MS   = 200; // 요청 간 딜레이 (rate-limit 방지)

/* ── 성경 구조 ───────────────────────────────────────── */
const BOOKS = [
  // 구약
  { id:'창세기',       num:1,  ch:50  }, { id:'출애굽기',       num:2,  ch:40  },
  { id:'레위기',       num:3,  ch:27  }, { id:'민수기',         num:4,  ch:36  },
  { id:'신명기',       num:5,  ch:34  }, { id:'여호수아',       num:6,  ch:24  },
  { id:'사사기',       num:7,  ch:21  }, { id:'룻기',           num:8,  ch:4   },
  { id:'사무엘상',     num:9,  ch:31  }, { id:'사무엘하',       num:10, ch:24  },
  { id:'열왕기상',     num:11, ch:22  }, { id:'열왕기하',       num:12, ch:25  },
  { id:'역대상',       num:13, ch:29  }, { id:'역대하',         num:14, ch:36  },
  { id:'에스라',       num:15, ch:10  }, { id:'느헤미야',       num:16, ch:13  },
  { id:'에스더',       num:17, ch:10  }, { id:'욥기',           num:18, ch:42  },
  { id:'시편',         num:19, ch:150 }, { id:'잠언',           num:20, ch:31  },
  { id:'전도서',       num:21, ch:12  }, { id:'아가',           num:22, ch:8   },
  { id:'이사야',       num:23, ch:66  }, { id:'예레미야',       num:24, ch:52  },
  { id:'예레미야애가', num:25, ch:5   }, { id:'에스겔',         num:26, ch:48  },
  { id:'다니엘',       num:27, ch:12  }, { id:'호세아',         num:28, ch:14  },
  { id:'요엘',         num:29, ch:3   }, { id:'아모스',         num:30, ch:9   },
  { id:'오바댜',       num:31, ch:1   }, { id:'요나',           num:32, ch:4   },
  { id:'미가',         num:33, ch:7   }, { id:'나훔',           num:34, ch:3   },
  { id:'하박국',       num:35, ch:3   }, { id:'스바냐',         num:36, ch:3   },
  { id:'학개',         num:37, ch:2   }, { id:'스가랴',         num:38, ch:14  },
  { id:'말라기',       num:39, ch:4   },
  // 신약
  { id:'마태복음',     num:40, ch:28  }, { id:'마가복음',       num:41, ch:16  },
  { id:'누가복음',     num:42, ch:24  }, { id:'요한복음',       num:43, ch:21  },
  { id:'사도행전',     num:44, ch:28  }, { id:'로마서',         num:45, ch:16  },
  { id:'고린도전서',   num:46, ch:16  }, { id:'고린도후서',     num:47, ch:13  },
  { id:'갈라디아서',   num:48, ch:6   }, { id:'에베소서',       num:49, ch:6   },
  { id:'빌립보서',     num:50, ch:4   }, { id:'골로새서',       num:51, ch:4   },
  { id:'데살로니가전서',num:52,ch:5   }, { id:'데살로니가후서', num:53, ch:3   },
  { id:'디모데전서',   num:54, ch:6   }, { id:'디모데후서',     num:55, ch:4   },
  { id:'디도서',       num:56, ch:3   }, { id:'빌레몬서',       num:57, ch:1   },
  { id:'히브리서',     num:58, ch:13  }, { id:'야고보서',       num:59, ch:5   },
  { id:'베드로전서',   num:60, ch:5   }, { id:'베드로후서',     num:61, ch:3   },
  { id:'요한일서',     num:62, ch:5   }, { id:'요한이서',       num:63, ch:1   },
  { id:'요한삼서',     num:64, ch:1   }, { id:'유다서',         num:65, ch:1   },
  { id:'요한계시록',   num:66, ch:22  },
];

/* ── 유틸 ───────────────────────────────────────────── */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error(`JSON 파싱 오류: ${url}`)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ── 메인 ───────────────────────────────────────────── */
async function main() {
  console.log('성경 데이터 생성 시작...\n');
  ensureDir(OUT_DIR);

  const searchIndex = {};  // 전체 검색 인덱스
  let totalChaps = 0;
  let done = 0;
  let failed = 0;

  // 전체 장 수 계산
  BOOKS.forEach(b => totalChaps += b.ch);
  console.log(`총 ${BOOKS.length}권 ${totalChaps}장 처리 예정\n`);

  for (const book of BOOKS) {
    searchIndex[book.id] = {};
    const bookDir = path.join(OUT_DIR, String(book.num));
    ensureDir(bookDir);

    for (let ch = 1; ch <= book.ch; ch++) {
      const filePath = path.join(bookDir, `${ch}.json`);

      // 이미 파일이 있으면 스킵 (재실행 시 이어받기)
      if (fs.existsSync(filePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          searchIndex[book.id][ch] = existing;
          done++;
          process.stdout.write(`\r진행: ${done + failed}/${totalChaps} (성공 ${done} / 실패 ${failed})`);
          continue;
        } catch(e) {}
      }

      try {
        const url = `${SOURCE_API}/${book.num}/${ch}.json`;
        const data = await fetchJson(url);

        if (!Array.isArray(data.verses) || data.verses.length === 0) {
          throw new Error('verses 없음');
        }

        // {"1":"text","2":"text",...} 형식으로 변환
        const chObj = {};
        data.verses.forEach(v => { chObj[v.verse] = (v.text || '').trim(); });

        fs.writeFileSync(filePath, JSON.stringify(chObj), 'utf8');
        searchIndex[book.id][ch] = chObj;
        done++;
      } catch(e) {
        console.error(`\n오류 - ${book.id} ${ch}장: ${e.message}`);
        failed++;
      }

      process.stdout.write(`\r진행: ${done + failed}/${totalChaps} (성공 ${done} / 실패 ${failed})`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n\n검색 인덱스(search.json) 저장 중...');
  const searchPath = path.join(OUT_DIR, 'search.json');
  fs.writeFileSync(searchPath, JSON.stringify(searchIndex), 'utf8');

  const sizeMB = (fs.statSync(searchPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n완료! 성공: ${done} / 실패: ${failed}`);
  console.log(`search.json 크기: ${sizeMB} MB`);
  console.log(`\nbible/ 디렉터리를 서버에 업로드하거나`);
  console.log(`Vercel 프로젝트에 커밋하여 배포하세요.`);
}

main().catch(e => { console.error('\n오류:', e.message); process.exit(1); });

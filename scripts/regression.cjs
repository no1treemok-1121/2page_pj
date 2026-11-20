// 회귀 테스트: 예전에 만든 기능이 사라지지 않았는지 자동으로 확인 (FEATURES.md 기준)
// 사용법: npm run build 후 `npx vite preview --port 4173 --host 127.0.0.1` 을 띄우고
//        node scripts/regression.cjs [주소]
// 배포(main 반영) 전에 반드시 실행. 실제 서버(Supabase)를 쓰므로 이름은 [테스트]로 시작함.
// (이 스크립트는 데이터를 새로 저장하지 않음: 액션·감정·썰매는 실시간 전송만 사용)
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4173';
const results = [];
const check = (name, ok, detail = '') => { results.push([ok ? 'PASS' : 'FAIL', name, detail]); };

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  const mk = async (n) => {
    const c = await b.newContext({ viewport: { width: 900, height: 600 } });
    await c.addInitScript(n => localStorage.setItem('3d_pj.chatNick', n), n);
    const p = await c.newPage(); p.on('pageerror', e => errs.push(n + ': ' + e.message));
    await p.goto(BASE);
    check(`${n} 입장 코드 화면`, !!(await p.$('.gate input')));
    await p.fill('.gate input', '1225'); await p.press('.gate input', 'Enter'); await p.waitForTimeout(400);
    check(`${n} 캐릭터 고르기 화면`, !!(await p.$('.setup-card')));
    await p.click('text=이 캐릭터로 입장'); await p.waitForSelector('.name-tag'); await p.waitForTimeout(2500);
    return p;
  };
  const A = await mk('[테스트]A'); const B = await mk('[테스트]B');
  await A.waitForTimeout(1500);
  const tag = async (p, n, mine) => p.$$eval('.name-tag', (x, [n, mine]) => {
    const e = x.find(el => el.textContent.includes(n) && el.textContent.includes('(나)') === mine);
    if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height)];
  }, [n, mine]);
  const bubbles = async (p) => p.$$eval('.say-bubble, .emote-bubble', x => x.map(e => e.textContent));
  // 3D 화면이 느린 환경을 위해 최대 3초 동안 다시 확인
  const seen = async (p, word, ms = 3000) => {
    for (const end = Date.now() + ms; Date.now() < end; await p.waitForTimeout(200))
      if ((await bubbles(p)).some(s => s.includes(word))) return true;
    return false;
  };

  // 화면 기본 요소 (FEATURES 1·8)
  for (const [label, sel] of [['왼쪽 👊', '[aria-label="장난치기"]'], ['왼쪽 ⛄', '[aria-label="눈사람 만들기"]'], ['왼쪽 🔮', '[aria-label="오늘의 운세"]'], ['왼쪽 😊', '[aria-label="감정 표현"]'], ['☰ 메뉴', '.menu-btn'], ['내 캐릭터 버튼', '.me-btn'], ['💬 광장 버튼', '.chat-btn']])
    check(`버튼 있음: ${label}`, !!(await A.$(sel)));
  check('다른 사람 이름표 보임', !!(await tag(A, '[테스트]B', false)));

  // 캐릭터를 눌러 액션 메뉴 (FEATURES 8 장난치기)
  const t = await tag(A, '[테스트]B', false);
  if (t) { await A.mouse.click(t[0], t[1] + 40); await A.waitForTimeout(500); }
  const menu = await A.$$eval('.act-btn', x => x.map(e => e.innerText.replace(/\n/g, '')));
  check('캐릭터 누르면 액션 메뉴', menu.length === 3, menu.join(','));
  if (!menu.length) { await A.keyboard.press('Escape'); await A.click('[aria-label="장난치기"]'); await A.click('.people-list button:has-text("[테스트]B")'); }
  // 들이받기 → 밀려남
  const before = await tag(B, '[테스트]B', true);
  await A.click('.act-btn:has-text("들이받기")'); await A.waitForTimeout(2600);
  const after = await tag(B, '[테스트]B', true);
  check('들이받기: 상대가 밀려남', !!(before && after && Math.abs(after[0] - before[0]) + Math.abs(after[1] - before[1]) > 20), `${before} → ${after}`);
  check('들이받기: 아야 말풍선', await seen(B, '아야'));
  // 👊 버튼 → 사람 목록 → 눈덩이
  await A.waitForTimeout(3000);
  await A.click('[aria-label="장난치기"]'); await A.waitForTimeout(300);
  check('👊 버튼: 사람 목록', (await A.$$('.people-list li')).length > 0);
  await A.click('.people-list button:has-text("[테스트]B")'); await A.click('.act-btn:has-text("눈덩이")'); await A.waitForTimeout(1500);
  check('눈덩이: 차가워 말풍선', await seen(B, '차가워'));
  // 감정 표현
  await A.waitForTimeout(3000);
  await A.click('[aria-label="감정 표현"]'); await A.click('.emote-picker button[title="하트"]'); await A.waitForTimeout(800);
  check('감정 표현이 상대에게 보임', await seen(B, '❤️'));
  // 운세
  await A.click('[aria-label="오늘의 운세"]'); await A.waitForTimeout(300);
  check('운세 창 열림', !!(await A.$('.fortune-grid, .fortune-result')));
  await A.keyboard.press('Escape');
  // 소원함
  await A.click('.link-btn'); await A.waitForTimeout(300);
  check('소원함 열림', (await A.textContent('.card h2').catch(() => '')).includes('소원함'));
  await A.keyboard.press('Escape');
  // ☰ 메뉴 항목
  await A.click('.menu-btn'); await A.waitForTimeout(300);
  const items = await A.$$eval('.menu .intro-card strong', x => x.map(e => e.textContent));
  for (const need of ['소원 걸기', '소원함', '랜덤 편지', '마을 광장', '오늘의 운세', '썰매 타기', '빙판 썰매', '분식집', '붕어빵 노점', '코코아 노점', '낚시 도감', '포토존', '연못 낚시', '모닥불 쬐기', '눈사람 만들기', '내 캐릭터'])
    check(`☰ 메뉴: ${need}`, items.some(i => i.includes(need)));
  // 썰매 (메뉴로)
  await A.click('.menu >> text=썰매 타기'); await A.waitForTimeout(1500);
  const sa = await bubbles(A), sb = await bubbles(B);
  check('썰매: 내 화면 슝', await seen(A, '슝'), sa.join(','));
  check('썰매: 상대 화면 슝', await seen(B, '슝'), sb.join(','));

  // 빙판 썰매 (메뉴로)
  await A.waitForTimeout(6500); // 언덕 썰매(5초)가 확실히 끝난 뒤
  await A.click('.menu-btn'); await A.click('.menu >> text=빙판 썰매'); await A.waitForTimeout(1200);
  const ia = await bubbles(A), ib = await bubbles(B);
  check('빙판 썰매: 내 화면 씽씽', await seen(A, '씽씽'), ia.join(','));
  check('빙판 썰매: 상대 화면 씽씽', await seen(B, '씽씽'), ib.join(','));
  check('빙판 표지 보임', (await A.$$eval('.spot-tag', x => x.map(e => e.textContent))).some(t => t.includes('빙판')));
  // NPC (다람이·루루·햄찌): 보이고, 누르면 장난칠 수 있고, 들이받으면 아야
  const npcTags = await A.$$eval('.npc-tag', x => x.map(e => e.textContent));
  check('NPC 4마리 보임 (낚시꾼 포함)', npcTags.length === 4, npcTags.join(','));
  await A.click('[aria-label="장난치기"]'); await A.waitForTimeout(300);
  const plist = await A.$$eval('.people-list li', x => x.map(e => e.innerText));
  check('👊 목록에 NPC 포함', plist.filter(t => t.includes('NPC')).length === 4);
  await A.click('.people-list button:has-text("햄찌")'); await A.click('.act-btn:has-text("들이받기")'); await A.waitForTimeout(3000);
  check('NPC 들이받기: 아야', await seen(A, '아야'));
  for (let i = 0; i < 4 && !(await A.$('.act-btn')); i++) { // NPC가 걷는 중이면 빗나갈 수 있어 몇 번 시도
    const nt = await A.$$eval('.npc-tag', x => { const e = x.find(el => el.textContent.includes('루루')); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height + 40]; });
    if (nt) { await A.mouse.click(nt[0], nt[1]); await A.waitForTimeout(500); }
    if (!(await A.$('.act-btn'))) { await A.keyboard.press('Escape'); await A.waitForTimeout(1500); }
  }
  check('NPC 캐릭터 누르면 액션 메뉴', (await A.$$('.act-btn')).length === 3);
  await A.keyboard.press('Escape');
  // 분식집: 메뉴에서 어묵 → 상대 화면에 호로록
  await A.waitForTimeout(4000);
  await A.click('.menu-btn'); await A.click('.menu >> text=분식집'); await A.waitForTimeout(300);
  check('분식집 메뉴 6가지', (await A.$$('.snack-grid .act-btn')).length === 6);
  await A.click('.snack-grid .act-btn:has-text("어묵")'); await A.waitForTimeout(1500);
  const fa = await bubbles(A), fb = await bubbles(B);
  check('분식: 내 화면 호로록', await seen(A, '호로록'), fa.join(','));
  check('분식: 상대 화면 호로록', await seen(B, '호로록'), fb.join(','));
  check('분식집 표지 보임', (await A.$$eval('.spot-tag', x => x.map(e => e.textContent))).some(t => t.includes('분식집')));
  // 낚시·모닥불
  await A.waitForTimeout(6000);
  await A.click('.menu-btn'); await A.click('.menu >> text=연못 낚시');
  check('낚시: 던졌다 말풍선', await seen(A, '던졌다', 9000));
  check('연못 표지 보임', (await A.$$eval('.spot-tag', x => x.map(e => e.textContent))).some(t => t.includes('연못')));
  check('낚시꾼 너구리 할배 말풍선', await seen(A, '', 100) && (await A.$$eval('.npc-tag', x => x.map(e => e.textContent))).some(t => t.includes('너구리')));
  await A.waitForTimeout(4000);
  await A.click('.menu-btn'); await A.click('.menu >> text=모닥불 쬐기');
  check('모닥불: 따뜻해 말풍선', await seen(B, '따뜻해', 12000));
  // 마시멜로 굽기 (통나무에 앉은 뒤 버튼)
  for (let i = 0; i < 20 && !(await A.$('.mallow-btn')); i++) await A.waitForTimeout(500);
  check('마시멜로 굽기 버튼', !!(await A.$('.mallow-btn')));
  if (await A.$('.mallow-btn')) { await A.click('.mallow-btn'); check('마시멜로: 상대 화면 말풍선', await seen(B, '마시멜로')); }
  // 노점 3곳
  const stalls = await A.$$eval('.spot-tag', x => x.map(e => e.textContent));
  check('노점 3곳 표지', ['분식집', '붕어빵', '코코아'].every(n => stalls.some(t => t.includes(n))), stalls.join(','));
  await A.click('.menu-btn'); await A.click('.menu >> text=붕어빵 노점'); await A.waitForTimeout(300);
  const bm = await A.$$eval('.snack-grid .act-btn', x => x.map(e => e.innerText.replace(/\n/g, '')));
  check('붕어빵 노점 메뉴 5가지(우유 포함)', bm.length === 5 && bm.some(t => t.includes('우유')) && bm.some(t => t.includes('슈크림')), bm.join(','));
  await A.keyboard.press('Escape');
  await A.click('.menu-btn'); await A.click('.menu >> text=코코아 노점'); await A.waitForTimeout(300);
  check('코코아 노점 메뉴', (await A.$$('.snack-grid .act-btn')).length === 4);
  await A.keyboard.press('Escape');
  // 낚시 도감 · 포토존
  await A.click('.menu-btn'); await A.click('.menu >> text=낚시 도감'); await A.waitForTimeout(300);
  check('낚시 도감 8칸', (await A.$$('.dex-item')).length === 8);
  await A.keyboard.press('Escape');
  await A.click('.menu-btn'); await A.click('.menu >> text=포토존'); await A.waitForTimeout(1500);
  check('포토존: 사진 미리보기', !!(await A.$('.photo-preview')));
  await A.keyboard.press('Escape');
  // 장식 9가지(없음 포함) + 동물 6가지
  await A.click('.me-btn'); await A.waitForTimeout(300);
  const picks = await A.$$eval('.picks', x => x.map(p => p.children.length));
  check('캐릭터 편집: 동물 6 · 장식 9', picks[0] === 6 && picks[2] === 9, picks.join(','));
  await A.keyboard.press('Escape');
  {
    const c = await b.newContext({ viewport: { width: 900, height: 600 } });
    await c.addInitScript(() => { const real = Date.now.bind(Date); const off = ((41 - (real() / 1000) % 120) + 120) % 120 * 1000; Date.now = () => real() + off; });
    const p = await c.newPage(); p.on('pageerror', e => errs.push('E: ' + e.message));
    await p.goto(BASE); await p.fill('.gate input', '1225'); await p.press('.gate input', 'Enter'); await p.waitForTimeout(400);
    await p.click('text=이 캐릭터로 입장'); await p.waitForTimeout(1500);
    check('별똥별 이벤트 배너', (await p.textContent('.event-banner').catch(() => '')).includes('별똥별'));
    await c.close();
  }
  check('화면 오류 없음', errs.length === 0, errs.join(' | '));
  await b.close();
  for (const [r, n, d] of results) console.log(`${r}  ${n}${d ? '  (' + d + ')' : ''}`);
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(`\n${results.length - fails}/${results.length} 통과`);
  process.exit(fails ? 1 : 0);
})();

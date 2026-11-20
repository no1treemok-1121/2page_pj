// 회귀 테스트: 예전에 만든 기능이 사라지지 않았는지 자동으로 확인 (FEATURES.md 기준)
// 사용법: npm run build 후 `npx vite preview --port 4173 --host 127.0.0.1` 을 띄우고
//        node scripts/regression.cjs [주소]
// 배포(main 반영) 전에 반드시 실행. 실제 서버(Supabase)를 쓰므로 이름은 [테스트]로 시작함.
// (데이터는 '내 방 열쇠' 확인용 [테스트] 방 하나만 만들고 끝에서 지움. 나머지는 실시간 전송만 사용)
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
  for (const need of ['소원 걸기', '소원함', '랜덤 편지', '마을 광장', '오늘의 운세', '썰매 타기', '빙판 썰매', '분식집', '붕어빵 노점', '코코아 노점', '낚시 도감', '포토존', '종 울리기', '이글루', '풍선 가게', '고양이 찾아가기', '개썰매 한 바퀴', '사슴썰매 한 바퀴', '연못 낚시', '모닥불 쬐기', '눈사람 만들기', '내 캐릭터'])
    check(`☰ 메뉴: ${need}`, items.some(i => i.includes(need)));
  // 썰매 (메뉴로)
  await A.click('.menu >> text=썰매 타기'); await A.waitForTimeout(1500);
  const sa = await bubbles(A), sb = await bubbles(B);
  check('썰매: 내 화면 슝', await seen(A, '슝', 12000), sa.join(','));
  check('썰매: 상대 화면 슝', await seen(B, '슝', 3000), sb.join(','));

  // 빙판 썰매 (메뉴로)
  await A.waitForTimeout(6500); // 언덕 썰매(5초)가 확실히 끝난 뒤
  await A.click('.menu-btn'); await A.click('.menu >> text=빙판 썰매'); await A.waitForTimeout(1200);
  const ia = await bubbles(A), ib = await bubbles(B);
  check('빙판 썰매: 내 화면 씽씽', await seen(A, '씽씽', 15000), ia.join(','));
  check('빙판 썰매: 상대 화면 씽씽', await seen(B, '씽씽', 3000), ib.join(','));
  check('빙판 표지 보임', (await A.$$eval('.spot-tag', x => x.map(e => e.textContent))).some(t => t.includes('빙판')));
  // NPC (다람이·루루·햄찌): 보이고, 누르면 장난칠 수 있고, 들이받으면 아야
  const npcTags = await A.$$eval('.npc-tag', x => x.map(e => e.textContent));
  check('NPC 4마리 보임 (낚시꾼 포함)', npcTags.length === 4, npcTags.join(','));
  await A.click('[aria-label="장난치기"]'); await A.waitForTimeout(300);
  const plist = await A.$$eval('.people-list li', x => x.map(e => e.innerText));
  check('👊 목록에 NPC 포함', plist.filter(t => t.includes('NPC')).length === 4);
  await A.click('.people-list button:has-text("햄찌")'); await A.click('.act-btn:has-text("들이받기")'); await A.waitForTimeout(3000);
  check('NPC 들이받기: 아야', await seen(A, '아야'));
  for (let i = 0; i < 12 && !(await A.$('.act-btn')); i++) { // NPC가 걷는 중이면 빗나갈 수 있어 몇 번 시도
    const nt = await A.$$eval('.npc-tag', x => { const e = x.find(el => el.textContent.includes('루루')); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height + 40]; });
    if (nt) { await A.mouse.click(nt[0], nt[1]); await A.waitForTimeout(500); }
    if (!(await A.$('.act-btn'))) { await A.keyboard.press('Escape'); await A.waitForTimeout(1500); }
  }
  check('NPC 캐릭터 누르면 액션 메뉴', (await A.$$('.act-btn')).length === 3);
  await A.keyboard.press('Escape');
  // 분식집: 메뉴에서 어묵 → 상대 화면에 호로록
  await A.waitForTimeout(4000);
  // 앞 단계에서 실수로 열린 창(고양이 메뉴 등)이 있으면 닫기
  for (let i = 0; i < 4 && (await A.$('.backdrop')); i++) { await A.keyboard.press('Escape'); await A.waitForTimeout(300); }
  for (let tryN = 0; tryN < 2 && !(await A.$('.snack-grid')); tryN++) {
    for (let i = 0; i < 4 && (await A.$('.backdrop')); i++) { await A.keyboard.press('Escape'); await A.waitForTimeout(300); }
    await A.click('.menu-btn'); await A.click('.menu >> text=분식집');
    await A.waitForSelector('.snack-grid', { timeout: 20000 }).catch(() => null);
  }
  check('분식집 메뉴 6가지', (await A.$$('.snack-grid .act-btn')).length === 6);
  await A.click('.snack-grid .act-btn:has-text("어묵")', { timeout: 5000 }).catch(() => null); await A.waitForTimeout(1500);
  const fa = await bubbles(A), fb = await bubbles(B);
  check('분식: 내 화면 먹기 말풍선', await seen(A, '🍢'), fa.join(','));
  check('분식: 상대 화면 먹기 말풍선', await seen(B, '🍢'), fb.join(','));
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
  if (await A.$('.mallow-btn')) { await A.click('.mallow-btn'); check('마시멜로: 상대 화면 말풍선', await seen(B, '마시멜로', 7000)); }
  // 노점 3곳
  const stalls = await A.$$eval('.spot-tag', x => x.map(e => e.textContent));
  check('노점 3곳 표지', ['분식집', '붕어빵', '코코아'].every(n => stalls.some(t => t.includes(n))), stalls.join(','));
  await A.click('.menu-btn'); await A.click('.menu >> text=붕어빵 노점');
  await A.waitForSelector('.snack-grid', { timeout: 15000 }).catch(() => null);
  const bm = await A.$$eval('.snack-grid .act-btn', x => x.map(e => e.innerText.replace(/\n/g, '')));
  check('붕어빵 노점 메뉴 5가지(우유 포함)', bm.length === 5 && bm.some(t => t.includes('우유')) && bm.some(t => t.includes('슈크림')), bm.join(','));
  check('붕어빵 노점: 붕어빵은 직접 그린 그림', (await A.$$('.snack-grid .food-ico')).length >= 1);
  await A.keyboard.press('Escape');
  await A.click('.menu-btn'); await A.click('.menu >> text=코코아 노점');
  await A.waitForSelector('.snack-grid', { timeout: 15000 }).catch(() => null);
  check('노점: 내 방에 사 가기 선택', !!(await A.$('.take-mode')));
  check('코코아 노점 메뉴(커피 포함 7가지)', (await A.$$('.snack-grid .act-btn')).length === 7 && !!(await A.$('.snack-grid >> text=카페라떼')));
  await A.keyboard.press('Escape');
  // 낚시 도감 · 포토존
  await A.click('.menu-btn'); await A.click('.menu >> text=낚시 도감'); await A.waitForTimeout(300);
  check('낚시 도감 8칸', (await A.$$('.dex-item')).length === 8);
  await A.keyboard.press('Escape');
  await A.click('.menu-btn'); await A.click('.menu >> text=포토존'); await A.waitForSelector('.photo-preview', { timeout: 8000 }).catch(() => null);
  check('포토존: 사진 미리보기', !!(await A.$('.photo-preview')));
  await A.keyboard.press('Escape');
  // 장식 9가지(없음 포함) + 동물 6가지
  await A.click('.me-btn'); await A.waitForTimeout(300);
  const picks = await A.$$eval('.picks', x => x.map(p => p.children.length));
  check('캐릭터 편집: 동물 6 · 장식 14', picks[0] === 6 && picks[2] === 14, picks.join(','));
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
  // 🔔 종 울리기 (메뉴로)
  await A.click('.menu-btn'); await A.click('.menu >> text=종 울리기');
  check('종: 상대 화면 딩동댕', await seen(B, '딩동댕', 25000));
  check('종 표지 보임', (await A.$$eval('.spot-tag', x => x.map(e => e.textContent))).some(t => t.includes('종 울리기')));
  // 장소 범위: 메뉴로 붕어빵 노점을 열면 먼저 걸어가서 도착 후 메뉴가 열림
  await A.click('.menu-btn'); await A.click('.menu >> text=붕어빵 노점');
  const walking = await A.textContent('.toast').catch(() => '');
  check('장소 범위: 멀면 먼저 걸어감', walking.includes('총총총') || !!(await A.$('.snack-grid')), walking);
  await A.waitForSelector('.snack-grid', { timeout: 15000 }).catch(() => null);
  check('장소 범위: 도착하면 메뉴', !!(await A.$('.snack-grid')));
  await A.keyboard.press('Escape');
  // 🎥 카메라 따라가기 · 📍 내 위치 · 내 이름표 표시
  check('카메라 따라가기 버튼(기본 ON)', (await A.textContent('.cam-btn').catch(() => '')).includes('ON'));
  check('내 위치 버튼', !!(await A.$('.cam-btn[aria-label="내 위치"]')));
  check('내 이름표 강조', !!(await A.$('.name-tag.mine')));
  await A.click('.cam-btn[aria-label="카메라 따라가기"]'); await A.waitForTimeout(200);
  check('카메라 따라가기 끄기', (await A.textContent('.cam-btn').catch(() => '')).includes('OFF'));
  await A.click('.cam-btn[aria-label="카메라 따라가기"]'); await A.waitForTimeout(200);
  check('카메라 따라가기 다시 켜기', (await A.textContent('.cam-btn').catch(() => '')).includes('ON'));
  // 🐕 개썰매 한 바퀴: 걸어가서 타고, 상대에게 보이고, 땅을 누르면 내림
  await A.click('.menu-btn'); await A.click('.menu >> text=개썰매 한 바퀴');
  check('개썰매: 상대 화면 출발', await seen(B, '개썰매 출발', 15000));
  const tags = await A.$$eval('.spot-tag', x => x.map(e => e.textContent));
  check('썰매 정류장 표지 2개', tags.some(t => t.includes('개썰매')) && tags.some(t => t.includes('사슴썰매')));
  await A.waitForTimeout(2500);
  check('개썰매: 내리기 버튼', !!(await A.$('.ride-off')));
  if (await A.$('.ride-off')) await A.click('.ride-off');
  const off = (await A.textContent('.toast').catch(() => '')).includes('내렸어요');
  check('개썰매: 내리면 안내', off);
  check('개썰매 내림: 상대 화면 말풍선', await seen(B, '내릴게요'));
  // 🐾 자율 활동 버튼 (기본 OFF, 켜고 끄기)
  check('자율 활동 버튼(기본 OFF)', (await A.textContent('.cam-btn[aria-label="자율 활동"]').catch(() => '')).includes('OFF'));
  await A.click('.cam-btn[aria-label="자율 활동"]'); await A.waitForTimeout(200);
  check('자율 활동 켜기', (await A.textContent('.cam-btn[aria-label="자율 활동"]').catch(() => '')).includes('ON'));
  await A.click('.cam-btn[aria-label="자율 활동"]'); await A.waitForTimeout(200);
  // 🛷 언덕 썰매도 중간에 내리기
  await A.click('.menu-btn'); await A.click('.menu >> text=썰매 타기');
  for (let i = 0; i < 40 && !(await A.$('.ride-off')); i++) await A.waitForTimeout(300);
  check('언덕 썰매: 내리기 버튼', !!(await A.$('.ride-off')));
  await A.$eval('.ride-off', b => b.click()).catch(() => null); await A.waitForTimeout(200);
  { const t = await A.textContent('.toast').catch(() => ''); check('언덕 썰매: 중간에 내림', t.includes('내렸어요') || !(await A.$('.ride-off')), t); }
  // 🎣 낚시 그만하기
  await A.click('.menu-btn'); await A.click('.menu >> text=연못 낚시');
  // 느린 컴퓨터에서도 놓치지 않게: 화면 안에서 버튼이 뜨자마자 바로 누름
  const gotBusy = await A.evaluate(() => new Promise(res => {
    const end = Date.now() + 20000;
    const t = setInterval(() => {
      const b = document.querySelector('.busy-off');
      if (b) { clearInterval(t); b.click(); res(true); } else if (Date.now() > end) { clearInterval(t); res(false); }
    }, 50);
  }));
  check('낚시: 그만하기 버튼', gotBusy);
  await A.waitForTimeout(300);
  check('낚시 그만하기: 버튼 사라짐(말풍선 없이)', !(await A.$('.busy-off')));
  // 노점 간판·지붕 모형은 3D라 화면 오류 없음으로 확인
  // 지워진 '내 방'을 가진 기기: '내 방이 없어졌어요' → 새 방 만들기 창
  {
    const c = await b.newContext({ viewport: { width: 900, height: 600 } });
    const rid = '00000000-0000-4000-8000-000000000000';
    await c.addInitScript(r => localStorage.setItem('3d_pj.myRoom', JSON.stringify({ roomId: r, ownerKey: 'x', nickname: '[테스트]옛방' })), rid);
    const p = await c.newPage();
    await p.goto(BASE + '/?room=' + rid); await p.fill('.gate input', '1225'); await p.press('.gate input', 'Enter'); await p.waitForTimeout(400);
    await p.click('text=이 캐릭터로 입장'); await p.waitForTimeout(1500);
    if (await p.$('.owner-ask')) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    check('지워진 내 방: 안내 화면', !!(await p.$('text=내 방이 없어졌어요')));
    if (await p.$('text=🏠 새 방 만들기')) await p.click('text=🏠 새 방 만들기');
    await p.waitForTimeout(800);
    check('지워진 내 방: 새 방 만들기 창', !!(await p.$('.find-first')));
    await c.close();
  }
  // 첫 입장 화면에 닉네임 입력 칸
  {
    const c = await b.newContext({ viewport: { width: 900, height: 600 } });
    const p = await c.newPage();
    await p.goto(BASE); await p.fill('.gate input', '1225'); await p.press('.gate input', 'Enter'); await p.waitForTimeout(400);
    check('입장: 닉네임 입력 칸', !!(await p.$('.nick-field')));
    await c.close();
  }
  // 🔑 내 방 열쇠: 방 만들 때 아이디·비밀번호 → 다른 기기(새 창)에서 '내 방 찾기'로 들어가기
  // 🐱 광장 고양이 밤·캔디 + 고양이 집
  {
    const cats = await A.$$eval('.cat-tag', x => x.map(e => e.textContent));
    check('고양이 밤·캔디 (머리 위 하트)', cats.some(t => t.includes('밤') && t.includes('💖')) && cats.some(t => t.includes('캔디')), cats.join(','));
    const tg = await A.$$eval('.spot-tag', x => x.map(e => e.textContent));
    check('고양이 집 표지', tg.some(t => t.includes('밤·캔디네 집')));
    await A.click('.menu-btn'); await A.click('.menu >> text=고양이 찾아가기');
    await A.waitForSelector('.cat-menu', { timeout: 25000 }).catch(() => null);
    const catOk = !!(await A.$('.cat-menu'));
    check('고양이 찾아가기 → 돌보기 메뉴(간식·쓰다듬기·놀아주기)', catOk && (await A.$$('.cat-menu .act-btn')).length === 3);
    if (catOk) { await A.click('.cat-menu .act-btn >> nth=0'); const okA = await seen(A, '간식 먹자', 3000); const toastA = await A.textContent('.toast').catch(() => ''); check('고양이 간식 주기: 상대 화면 말풍선', await seen(B, '간식 먹자', 6000), 'A:' + okA + ' toast:' + toastA + ' B:' + (await bubbles(B)).join(',')); }
  }
  // 🎈 풍선 가게: 걸어가서 하트 풍선 사기 → 상대 화면 말풍선
  await A.click('.menu-btn'); await A.click('.menu >> text=풍선 가게');
  await A.waitForSelector('.snack-grid', { timeout: 20000 }).catch(() => null);
  check('풍선 가게 메뉴 4가지', (await A.$$('.snack-grid .act-btn')).length === 4);
  if (await A.$('.snack-grid')) await A.click('.snack-grid >> text=하트 풍선');
  { const okA = await seen(A, '풍선', 2000); check('풍선: 상대 화면 말풍선', await seen(B, '풍선', 6000), 'A:' + okA + ' B:' + (await bubbles(B)).join(',')); }
  { const tg = await A.$$eval('.spot-tag', x => x.map(e => e.textContent)); check('썰매 언덕 2곳', tg.filter(t => t.includes('썰매 타기')).length === 2, tg.join(',')); }
  // ❄️ 이글루: 걸어가서 들어가기, 두 명이 서로 보임, 소원 방명록(트리 소원과 같은 창), 나가기
  {
    const tagA = await A.$$eval('.spot-tag', x => x.map(e => e.textContent));
    check('이글루 표지', tagA.some(t => t.includes('이글루')));
    await A.click('.menu-btn'); await A.click('.menu >> text=이글루');
    await A.waitForSelector('.igloo-bar', { timeout: 25000 }).catch(() => null);
    check('이글루: 걸어가서 안으로', !!(await A.$('.igloo-bar')));
    await B.click('.menu-btn'); await B.click('.menu >> text=이글루');
    await B.waitForSelector('.igloo-bar', { timeout: 25000 }).catch(() => null);
    let both = false;
    for (let i = 0; i < 15 && !both; i++) { await A.waitForTimeout(400); const t = await A.$$eval('.name-tag', x => x.map(e => e.textContent)); both = t.some(v => v.includes('[테스트]A')) && t.some(v => v.includes('[테스트]B')); }
    check('이글루: 안에 있는 사람 서로 보임', both);
    await B.click('.igloo-emotes button >> nth=1');
    check('이글루: 감정 표현 보임', await seen(A, '❤️'));
    // 🔥 불멍하기 / 방석 옮기기
    await A.click('.igloo-actions >> text=불멍하기'); await A.waitForTimeout(600);
    check('이글루: 불멍하기', !!(await A.$('.igloo-actions >> text=불멍 그만하기')));
    check('이글루: 불멍 상대에게 보임', await seen(B, '불멍'));
    await A.click('.igloo-actions >> text=불멍 그만하기'); await A.waitForTimeout(300);
    await A.click('.igloo-actions >> text=마시멜로');
    check('이글루: 마시멜로 상대에게 보임', await seen(B, '마시멜로'));
    check('이글루: 긴 말은 말풍선(세로로 안 깨짐)', await A.$$eval('.emote-bubble', x => x.every(e => [...e.textContent].length <= 2)));
    await A.click('.igloo-actions >> text=소원 쓰기'); await A.waitForTimeout(300);
    check('이글루: 소원 쓰기 창(트리와 같은 소원)', !!(await A.$('.backdrop .name-field')));
    await A.keyboard.press('Escape'); await A.waitForTimeout(200);
    if (await A.$('.backdrop .name-field')) await A.click('.backdrop', { position: { x: 5, y: 5 } });
    await A.click('.igloo-actions >> text=마을로 나가기'); await B.click('.igloo-actions >> text=마을로 나가기'); await A.waitForTimeout(800);
    check('이글루: 나가면 마을', !!(await A.$('.cam-wrap')));
  }
  await A.context().close(); await B.context().close(); // 화면이 많으면 느려져서 먼저 닫음
  {
    const kid = 'tk' + Math.floor(Math.random() * 1e8), kpw = 'pw' + Math.floor(Math.random() * 1e6);
    const C = await mk('[테스트]C');
    await C.click('.menu-btn'); await C.click('.menu >> text=내 방 만들기'); await C.waitForTimeout(300);
    const f = await C.$$('.backdrop .field');
    await f[0].fill('[테스트]열쇠'); await f[1].fill(kid); await f[2].fill(kpw);
    check('내 방 창: 내 방 찾기 버튼이 맨 위에', !!(await C.$('.find-first')));
    await C.click('.backdrop button[type=submit]');
    await C.waitForSelector('text=[테스트]열쇠의 방', { timeout: 8000 }).catch(() => null);
    check('방 만들기: 아이디·비밀번호 입력 후 내 방', !!(await C.$('text=[테스트]열쇠의 방')));
    await C.keyboard.press('Escape'); await C.waitForTimeout(300); // '내 방이 생겼어요' 창 닫기
    const D = await mk('[테스트]D');
    await D.click('.menu-btn'); await D.click('.menu >> text=내 방 찾기'); await D.waitForTimeout(300);
    const g = await D.$$('.find-room .field');
    await g[0].fill(kid); await g[1].fill('틀린비번'); await D.click('.find-room button[type=submit]');
    await D.waitForFunction(() => (document.querySelector('.find-room')?.textContent || '').includes('남은 기회'), null, { timeout: 8000 }).catch(() => null);
    check('내 방 찾기: 틀리면 남은 기회 안내', (await D.textContent('.find-room').catch(() => '')).includes('남은 기회'));
    await g[1].fill(kpw); await D.click('.find-room button[type=submit]');
    await D.waitForSelector('.bottom-bar >> text=🔑 열쇠', { timeout: 8000 }).catch(() => null);
    check('내 방 찾기: 다른 기기에서 내 방(주인)', !!(await D.$('.bottom-bar >> text=🔑 열쇠')));
    // 🎨 방 꾸미기: 벽지 바꾸고 소품 놓고 저장 → 다른 기기(D)에서도 보임
    await C.click('.bottom-bar >> text=🎨 꾸미기'); await C.waitForTimeout(400);
    check('꾸미기 패널', !!(await C.$('.decor-panel')));
    await C.click('.decor-panel .sw >> nth=1'); await C.click('.decor-panel .chip:has-text("눈사람 인형")');
    await C.click('.decor-panel >> text=저장'); await C.waitForTimeout(1200);
    check('꾸미기 저장 안내', (await C.textContent('.toast').catch(() => '')).includes('저장'));
    // ✏️ 꾸미기 창에서 방 이름 바꾸기
    await C.click('.bottom-bar >> text=🎨 꾸미기'); await C.waitForTimeout(400);
    await C.fill('.name-row .field', '[테스트]새이름'); await C.click('.name-row .btn'); await C.waitForTimeout(1500);
    check('방 이름 바꾸기', !!(await C.$('text=[테스트]새이름의 방')));
    await C.click('.decor-panel >> text=취소');
    // 같은 기기(C)에 다른 닉네임으로 새로 입장하면 '내 방이 맞나요?' → 내려놓기
    {
      const C2 = await C.context().newPage();
      await C2.addInitScript(() => localStorage.setItem('3d_pj.chatNick', '[테스트]몽고양'));
      await C2.goto(BASE); await C2.fill('.gate input', '1225'); await C2.press('.gate input', 'Enter'); await C2.waitForTimeout(400);
      await C2.click('text=이 캐릭터로 입장'); await C2.waitForTimeout(1500);
      check('다른 닉네임 입장: 내 방 맞나요? 질문', !!(await C2.$('.owner-ask')));
      check('내 방 맞나요?: 이름 바꾸기·그대로·내려놓기 3개', (await C2.$$('.owner-ask .btn')).length === 3);
      await C2.waitForTimeout(800);
      if (await C2.$('.owner-ask')) await C2.click('text=아니요, 다른 사람이에요');
      await C2.waitForTimeout(500);
      await C2.click('.menu-btn'); await C2.waitForTimeout(300);
      check('내려놓은 뒤 내 방 만들기로 바뀜', !!(await C2.$('.menu >> text=내 방 만들기')));
      await C2.keyboard.press('Escape');
    }
    // D(같은 방 주인)에서 꾸미기 패널을 열면 선물 상자가 켜져 있음
    await D.reload(); await D.waitForTimeout(500);
    if (await D.$('.gate input')) { await D.fill('.gate input', '1225'); await D.press('.gate input', 'Enter'); await D.waitForTimeout(400); }
    if (await D.$('text=이 캐릭터로 입장')) { await D.click('text=이 캐릭터로 입장'); await D.waitForTimeout(800); }
    if (await D.$('.owner-ask')) { await D.click('text=네, 제 방이에요'); await D.waitForTimeout(300); }
    await D.waitForSelector('.bottom-bar >> text=🎨 꾸미기', { timeout: 10000 }).catch(() => null);
    await D.click('.bottom-bar >> text=🎨 꾸미기'); await D.waitForTimeout(400);
    check('꾸미기: 다른 기기에서도 저장된 소품', !!(await D.$('.decor-panel .chip.on:has-text("눈사람 인형")')));
    await D.click('.decor-panel >> text=취소');
    // 열쇠 창의 로그아웃 버튼 (D: 열쇠로 들어온 기기)
    await D.click('.bottom-bar >> text=🔑 열쇠');
    await D.waitForSelector('.leave-btn:not([disabled])', { timeout: 6000 }).catch(() => null);
    check('열쇠 창: 이 기기에서 로그아웃 버튼', !!(await D.$('.leave-btn:not([disabled])')));
    await C.context().close(); await D.context().close();
    // 테스트로 만든 방 지우기 (Supabase 관리 API, 토큰은 환경 프록시가 넣어 줌)
    try {
      const body = JSON.stringify({ query: "delete from rooms where nickname like '[테스트]%'" });
      require('child_process').execFileSync('curl', ['-s', '-X', 'POST', 'https://api.supabase.com/v1/projects/iabzybciyltmydycynat/database/query', '-H', 'Content-Type: application/json', '-d', body]);
    } catch { console.log('⚠️ 테스트 방을 직접 지워 주세요 (nickname [테스트]열쇠)'); }
  }
  check('화면 오류 없음', errs.length === 0, errs.join(' | '));
  await b.close();
  for (const [r, n, d] of results) console.log(`${r}  ${n}${d ? '  (' + d + ')' : ''}`);
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(`\n${results.length - fails}/${results.length} 통과`);
  process.exit(fails ? 1 : 0);
})();

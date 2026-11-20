# CLAUDE.md

이 저장소를 관리하는 Claude를 위한 안내. 사용자는 한국어로 소통하며 개발 용어에 익숙하지 않으므로 쉬운 말로 설명할 것.

## 프로젝트
- **눈 내리는 마을**: 트리에 소원을 거는 3D 웹사이트. 목표는 neouijari.netlify.app ("트리에 소원을 걸고, 편지를 나누고, 서로의 방에 놀러 가요") 같은 사이트를 만드는 것. 그 사이트의 이름·디자인을 그대로 베끼지 말고 우리만의 사이트로 만들 것.
- 기술: Vite + React + TypeScript + Three.js (@react-three/fiber, drei). 저장소 루트가 곧 이 사이트.
- 이전에 있던 2Page 앱(Lovable로 만든 SNS)은 사용자 요청으로 삭제함. 필요하면 git 기록에서 복구 가능 (커밋 2c1819c 이전).

## ⚠️ 기능 목록 먼저 확인
- **배포 전 회귀 테스트 필수:** `npm run build` → `npx vite preview --port 4173 --host 127.0.0.1` 띄우고 `node scripts/regression.cjs` → 전부 PASS여야 `main`에 반영. 새 기능을 만들면 스크립트에 확인 항목도 추가. (테스터가 '캐릭터 눌러 장난치기·들이받기 밀림이 사라졌다'고 함 — 실제로는 예전 Netlify 버전·작은 터치 영역 문제였지만, 이런 일을 막으려고 만듦)
- **`FEATURES.md`에 지금까지 만든 모든 기능이 있음.** 무엇을 고치든 먼저 읽고, 고친 뒤 기존 기능이 그대로인지 확인하고, 같은 커밋에서 `FEATURES.md`도 갱신할 것. (사용자가 기능 누락을 걱정함)

## 명령
- `npm install`, `npm run dev`, `npm run build` (npm만 사용)

## 구성
- 화면 전환: 주소 `?room=<id>` 이면 방, 없으면 마을 (`src/App.tsx`의 readRoute/go). 라우터 라이브러리 없음.
- `src/Village.tsx` 마을 배경(집·가로등·소나무·달·별·트리 전구), `src/RoomView.tsx`·`src/RoomScene.tsx` 방 화면·편지, `src/rooms.ts` 방·편지 API와 '내 방' 정보(localStorage `3d_pj.myRoom`)
- `src/Scene.tsx` 트리·눈·장식, `src/App.tsx` 화면·상태, `src/WishDialog.tsx` 소원 입력, `src/wishes.ts` 저장(Supabase 또는 localStorage), `src/EntryGate.tsx` 입장 코드
- 입장 코드: 환경 변수 `ENTRY_CODE` (기본 1225). 빌드 시 SHA-256 해시만 번들에 들어감 (`vite.config.ts`). 클라이언트 검증이라 가벼운 접근 제한일 뿐임.

## Supabase
- 사용자 소유 프로젝트 **`2page_pj` (ref `iabzybciyltmydycynat`, 서울 리전)**. 연결 정보는 `.env` (공개용 publishable 키라 저장소에 포함).
- `wishes` 테이블: SQL은 `supabase/wishes.sql`. 읽기·추가만 허용(RLS). DB 구조를 바꾸면 SQL 파일을 저장소에 남길 것.
- DB에는 `wishes` 테이블만 있음 (2Page용 테이블·함수·트리거는 2026-11-20 삭제). `rls_auto_enable` 함수는 Supabase가 만든 것(새 테이블 RLS 자동 켜기)이니 지우지 말 것.
- 방·편지: `supabase/rooms.sql`. 로그인 없는 '방 링크' 방식 — 방 만들 때 주인 열쇠(owner_key)를 발급하고 DB엔 SHA-256 해시만 저장. `rooms`·`letters` 테이블은 RLS 정책 없음(직접 접근 불가), `create_room`·`get_room`·`send_letter`(방당 1분 10통 제한)·`get_letters`·`delete_letter` 함수(security definer)로만 접근. 주인 링크 = `?room=<id>#key=<열쇠>` (# 뒤는 서버로 안 감, 열면 이 기기에 저장 후 주소에서 지움).
- 마을 광장 채팅: `supabase/chat.sql` (`chat_messages`, Realtime publication 등록). 최근 10분만 읽기 가능(RLS), 새 메시지 insert 때 트리거가 10분 지난 것 삭제, 화면에서도 15초마다 정리 (사용자 요청으로 24시간→10분, `KEEP_MINUTES`). 도배 방지·금칙어는 사용자 결정으로 넣지 않음(300자 제한만). 프론트 `src/Chat.tsx`(supabase-js Realtime: postgres_changes + presence로 접속자 수), `src/supabase.ts`.
- 캐릭터: `supabase/avatar.sql` — wishes·chat_messages·rooms에 `avatar` 문자열("동물:#색:장식", 정규식 검사). `get_room`이 avatar 반환, `set_room_avatar`(주인 열쇠)로 변경. 프론트: `src/avatar.ts`(목록·저장, localStorage `3d_pj.avatar`), `src/Avatar.tsx`(2D 배지·편집기, 왼쪽 위 버튼), `src/Character3D.tsx`(방의 3D 캐릭터).
- 랜덤 편지·답장: `supabase/random_letters.sql` — 브라우저마다 visitor key(localStorage `3d_pj.visitor`, 서버엔 해시) 사용. 편지는 마을에 들어온 다른 사람 최대 10명에게 전달(`receive_random_letters`가 입장 때 최대 3통씩 배달), 받은 사람은 한 번 답장(`reply_random_letter`), 쓴 사람은 `my_random_letters`로 답장 확인. 테이블 직접 접근 불가. 프론트 `src/randomLetters.ts`, `src/RandomLetters.tsx`(마을 하단 ✉️ 편지 버튼, ☰ 메뉴).
- 걸어 다니는 캐릭터(C): `src/Walk.tsx` — Realtime 채널 `village-walk`. presence에는 캐릭터·이름·처음 위치만 track(자주 바꾸면 Supabase가 끊어 버림, 실제로 확인함), 걷는 위치는 broadcast `pos` 이벤트로 0.2초에 한 번. 새 사람이 join하면 각자 위치를 한 번 보냄. 이동: 땅 클릭(`Village` onGround) 또는 방향키/WASD, 반경 2.5~7.2로 제한. 이름표는 drei `Html`. 감정 표현 8가지(`EMOTES`, 왼쪽 아래 😊 버튼): broadcast `emote` 이벤트, 머리 위 말풍선 3초 + 깡충 뛰기 (참고 사이트의 '감정 표현' 벤치마킹).
- 소원→방: `wishes.room_id`(방 있는 사람이 소원 걸 때 연결). 소원함·소원 카드에 '🏠 방 놀러 가기'. 방문자가 편지함을 누르면 '편지 쓰기 / 내가 보낸 편지' 메뉴 — 보낸 편지 기록은 이 기기 localStorage `3d_pj.sentLetters`. 주인 방은 안 읽은 편지(`3d_pj.seenLetters.<roomId>`보다 많으면) 편지함 위 깜박이는 화살표(`RoomScene` Arrow).
- 오늘의 운세: `src/Fortune.tsx` — 서버 없음. 카드 12장(문구는 직접 작성, 참고 사이트 복사 아님), 하루 한 장(localStorage `3d_pj.fortune`, 기기 날짜 기준), 날마다 배치 섞임. 마을 왼쪽 아래 🔮, ☰ 메뉴.
- 트리 누르면 '소원 쓰기 / 소원함 보기' 선택. 내가 건 소원은 이 기기에서만 크게 반짝이고 '✨ 내 소원' 표시(localStorage `3d_pj.myWishes`).
- 닉네임: 왼쪽 위 캐릭터 편집기에서도 변경(채팅과 같은 localStorage `3d_pj.chatNick`, 걸어 다니는 캐릭터 이름표에도 사용).
- 실제 방문자가 쓰고 있음 — 테스트 데이터는 '[테스트]'로 시작하게 넣고 반드시 지울 것.
- 마을 이벤트(`src/events.ts`): 2분 주기, 기기 시계 기준. 0~15초 트리 반짝임(`TreeLights`·`TreeStar` 무지개 물결), 60~75초 불꽃놀이(`src/Fireworks.tsx`) — 1분 간격이라 겹치지 않음. 화면 위 안내 배너.
- 운세 공유: 뽑은 카드를 `village-walk` presence에 `fortune`으로 실어 보냄 → 이름표 옆 아이콘, 운세 창에 '광장 친구들의 오늘 카드'(지금 마을에 있는 사람만).
- 채팅 말풍선: 광장 채팅을 보내면 broadcast `say` → 캐릭터 머리 위 4초.
- 친구 액션: 다른 캐릭터를 누르면 메뉴(💥 들이받기 / ❄️ 눈덩이 / 🤗 안아주기), broadcast `act`. 들이받기 맞은 사람은 자기 화면에서 빙글 돌며 2.4만큼 밀려나고 위치를 공유.
- 벤치(`src/benches.ts`): 4개, 트리 가까이(휴대폰 세로 화면에서도 보이게), 모두 화면 쪽을 바라봄. 앉으면 presence/pos에 `sit` 전달.
- 👊 장난치기 버튼: 광장 사람 목록 → 액션 메뉴. 이벤트는 각 30초.
- 마을 크기: 걷는 반경 13(`MAX_R`), 집 15~17, 소나무 20~29, 가로등 7.5, 땅 42, 안개 20~58, 카메라 최대 거리 26(세로 30). 썰매(`src/sled.ts`): 언덕 (11,-7), 세워 둔 썰매 SLED_PARK (9.3,-3.1), 빙판 RINK (-10,-2) r3.6 — 탈것은 `RideKind` hill/ice, broadcast `sled`에 kind 포함 — 벤치 앞에 두면 벤치가 대신 눌림(실제로 겪음). broadcast `sled`. 눈사람(`supabase/snowmen.sql`, `src/Snowmen.tsx`): 24시간, broadcast `snowman`으로 다른 사람이 즉시 다시 불러옴.
- 관리 방법: 환경에 저장된 Supabase 개인 접근 토큰(api.supabase.com, 프록시가 자동 주입)으로 Management API 사용. SQL 실행은 `POST https://api.supabase.com/v1/projects/{ref}/database/query` 에 `{"query": "..."}`. 토큰 권한은 좁음(프로젝트 목록 조회 불가, ref 직접 지정), 2026-11-20 발급·7일 만료 — 만료되면 새 토큰 발급을 안내.

## 배포
- **Cloudflare Workers(정적 자산): https://2page-pj.no1treemok.workers.dev** — GitHub `main`에 반영되면 자동 빌드·배포(Workers Builds). 설정 `wrangler.jsonc`. 빌드 명령 `npm run build`, 배포 명령 `npx wrangler deploy`.
- 입장 코드: 빌드 변수 `ENTRY_CODE`를 넣지 않아 기본값 1225 (사용자 동의). 바꾸려면 Cloudflare 프로젝트 Settings → Build의 변수에 `ENTRY_CODE` 추가 후 재빌드.
- 빌드 서버에서 `@swc/core` 네이티브 부품이 안 불러와져 실패한 적 있음 → `@vitejs/plugin-react`(SWC 아님) 사용. 다시 SWC로 바꾸지 말 것.
- **이전: Netlify(2page-pj.netlify.app)** — 무료 크레딧 소진(하루 20번 넘게 배포)으로 배포가 멈춰 이전함. 사이트는 남아 있지만 갱신 안 됨. `netlify.toml`은 남아 있으나 쓰지 않음.
- **배포 횟수 아끼기:** 고친 내용은 여러 개 모아서 한 번에 `main`에 반영할 것.

## 남은 일
- [x] 배포: Cloudflare (https://2page-pj.no1treemok.workers.dev), Netlify에서 이전
- [x] 마을 꾸미기, 휴대폰 화면, 링크 미리보기 (og:image는 배포 주소가 정해지면 전체 주소로 바꿀 것)
- [x] 방·편지 (방 링크 방식, 로그인 없음)
- [ ] (선택) 카카오/구글 로그인으로 전환
- [x] 마을 광장 실시간 채팅
- 입장 흐름: 입장 코드(방문=탭마다, sessionStorage `3d_pj.entry`) → 캐릭터 고르기(`CharacterSetup`, sessionStorage `3d_pj.setupDone`) → 마을 또는 방. 마을 소개는 오른쪽 위 ☰ 메뉴(`Menu`)로 이동, 메뉴에서 소원 걸기·소원함·내 방·광장·캐릭터 바로가기.
- [x] 소개(☰ 메뉴), 소원 이름(선택, `wishes.name`), 소원함(목록), 익명 편지(`send_letter`가 빈 이름을 '익명의 누군가'로)
- [x] 랜덤 편지 + 답장
- [ ] 참고 사이트 대비 누락: 소원 공개여부·삭제, 랜덤 편지 신고, 친구 맺기(로그인 필요), 편지지 꾸미기, 개인정보 처리방침
- [x] 캐릭터 A(2D 프로필)·B(방 3D 캐릭터)
- [x] 캐릭터 C: 마을을 걸어 다니는 실시간 캐릭터
- [ ] 관리자 기능

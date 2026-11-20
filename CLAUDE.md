# CLAUDE.md

이 저장소를 관리하는 Claude를 위한 안내. 사용자는 한국어로 소통하며 개발 용어에 익숙하지 않으므로 쉬운 말로 설명할 것.

## 프로젝트
- **눈 내리는 마을**: 트리에 소원을 거는 3D 웹사이트. 목표는 neouijari.netlify.app ("트리에 소원을 걸고, 편지를 나누고, 서로의 방에 놀러 가요") 같은 사이트를 만드는 것. 그 사이트의 이름·디자인을 그대로 베끼지 말고 우리만의 사이트로 만들 것.
- 기술: Vite + React + TypeScript + Three.js (@react-three/fiber, drei). 저장소 루트가 곧 이 사이트.
- 이전에 있던 2Page 앱(Lovable로 만든 SNS)은 사용자 요청으로 삭제함. 필요하면 git 기록에서 복구 가능 (커밋 2c1819c 이전).

## 명령
- `npm install`, `npm run dev`, `npm run build` (npm만 사용)

## 구성
- `src/Scene.tsx` 트리·눈·장식, `src/App.tsx` 화면·상태, `src/WishDialog.tsx` 소원 입력, `src/wishes.ts` 저장(Supabase 또는 localStorage), `src/EntryGate.tsx` 입장 코드
- 입장 코드: 환경 변수 `ENTRY_CODE` (기본 1225). 빌드 시 SHA-256 해시만 번들에 들어감 (`vite.config.ts`). 클라이언트 검증이라 가벼운 접근 제한일 뿐임.

## Supabase
- 사용자 소유 프로젝트 **`2page_pj` (ref `iabzybciyltmydycynat`, 서울 리전)**. 연결 정보는 `.env` (공개용 publishable 키라 저장소에 포함).
- `wishes` 테이블: SQL은 `supabase/wishes.sql`. 읽기·추가만 허용(RLS). DB 구조를 바꾸면 SQL 파일을 저장소에 남길 것.
- DB에는 `wishes` 테이블만 있음 (2Page용 테이블·함수·트리거는 2026-11-20 삭제). `rls_auto_enable` 함수는 Supabase가 만든 것(새 테이블 RLS 자동 켜기)이니 지우지 말 것.
- 관리 방법: 환경에 저장된 Supabase 개인 접근 토큰(api.supabase.com, 프록시가 자동 주입)으로 Management API 사용. SQL 실행은 `POST https://api.supabase.com/v1/projects/{ref}/database/query` 에 `{"query": "..."}`. 토큰 권한은 좁음(프로젝트 목록 조회 불가, ref 직접 지정), 2026-11-20 발급·7일 만료 — 만료되면 새 토큰 발급을 안내.

## 배포
- Netlify 예정. `netlify.toml` 준비됨 (Base directory 비움).

## 남은 일
- [ ] Netlify 배포
- [ ] 마을 꾸미기, 휴대폰 화면 다듬기, 링크 미리보기
- [ ] 편지·방 기능 정의 → 로그인(카카오/구글) → 구현
- [ ] 관리자 기능, 도배 방지

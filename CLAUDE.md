# CLAUDE.md

이 저장소를 관리하는 Claude를 위한 안내. 사용자는 한국어로 소통하며 개발 용어에 익숙하지 않으므로 쉬운 말로 설명할 것.

## 구성
- 루트: **2Page** 앱 (Vite + React + TS + Tailwind + shadcn/ui, react-router). 원래 Lovable로 만들었으나 이제 Lovable은 쓰지 않음 — Lovable 전용 코드·안내를 다시 넣지 말 것.
- `3d_pj/`: **눈 내리는 마을** 3D 사이트 (Vite + React + @react-three/fiber). 루트와 package.json·빌드가 완전히 분리됨. 루트 postcss(Tailwind) 설정이 섞이지 않도록 `3d_pj/postcss.config.js` 가 비어 있는 설정으로 존재함.
- 나중에 `3d_pj` 를 별도 저장소로 옮길 수 있으므로 `3d_pj/` 는 그 폴더만으로 독립 실행 가능해야 함.

## 명령
- 루트: `npm install`, `npm run dev`, `npm run build`, `npm test`, `npm run lint` (lint 오류 일부는 Lovable 시절부터 있던 것)
- 3D: `cd 3d_pj && npm install && npm run build`
- 패키지 관리는 npm만 사용 (bun 잠금 파일은 제거함)

## Supabase
- 두 프로젝트 모두 사용자 소유의 Supabase 프로젝트 **`2page_pj` (ref `iabzybciyltmydycynat`, 서울 리전)** 를 사용. 연결 정보는 각 폴더의 `.env` (공개용 publishable 키라 저장소에 포함). Lovable 시절 데이터는 버리고 새로 시작함(사용자 결정).
- 루트 앱 테이블 구조: `supabase/schema.sql` (여러 번 실행해도 안전). 가입 시 프로필·초대코드 자동 생성, 좋아요/댓글 수 자동 집계, 보호 컬럼 트리거 포함.
- 타입: `src/integrations/supabase/types.ts` 는 Management API(`GET /v1/projects/{ref}/types/typescript`)로 생성.
- 관리 방법: 환경에 저장된 Supabase 개인 접근 토큰(api.supabase.com, 프록시가 자동 주입)으로 Management API 사용. SQL 실행은 `POST https://api.supabase.com/v1/projects/{ref}/database/query` 에 `{"query": "..."}`. 토큰 권한은 좁음(프로젝트 목록 조회 불가, ref를 직접 지정해야 함), 만료 7일 — 만료되면 사용자에게 새 토큰 발급을 안내.
- 3D 사이트 테이블: `wishes` — SQL은 `3d_pj/supabase/wishes.sql`. 읽기·추가만 허용(RLS).
- DB 구조를 바꾸면 SQL 파일을 저장소에 남길 것.

## 3D 사이트 입장 코드
- 환경 변수 `ENTRY_CODE` (기본 1225). 빌드 시 SHA-256 해시만 번들에 들어감 (`3d_pj/vite.config.ts`). 클라이언트 검증이라 가벼운 접근 제한일 뿐임.

## 배포
- Netlify 예정. 루트 `netlify.toml`(SPA 리다이렉트 포함), `3d_pj/netlify.toml`.

## 진행 중인 이전 작업 (Lovable → 직접 관리)
- [x] Lovable 전용 코드 제거, npm으로 통일, README 정리
- [x] 새 Supabase 프로젝트 생성, 2Page 테이블 + `wishes` 테이블 적용, 두 앱 연결 전환 (실제 소원 걸기 테스트 완료)
- [ ] 카카오·구글 로그인 설정 (각 개발자 콘솔에서 앱 등록 → Supabase Auth에 키 입력, 현재 둘 다 꺼져 있음)
- [ ] 예전 "2페이지 프로젝트"(일시 중지된 것) 삭제 — 사용자가 직접
- [ ] Netlify에 두 사이트 배포
- [ ] 다 옮긴 뒤 Lovable과 GitHub 연결 해제

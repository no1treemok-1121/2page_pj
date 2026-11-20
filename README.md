# 눈 내리는 마을

트리에 소원을 거는 3D 웹사이트입니다.

- 기술: Vite + React + TypeScript + Three.js (@react-three/fiber, drei)

## 실행

```bash
npm install
npm run dev
```

## 배포 (Netlify)

저장소를 연결해 새 사이트를 만들면 `netlify.toml` 설정(빌드 `npm run build`, 배포 폴더 `dist`)이 자동으로 적용됩니다. Base directory 는 비워 둡니다.

## 입장 코드

처음 들어오면 입장 코드를 물어봅니다. 한 번 맞히면 그 브라우저에서는 다시 묻지 않습니다.

- 기본 코드: `1225`
- 바꾸는 법: 환경 변수 `ENTRY_CODE` 를 설정한 뒤 다시 빌드
  - 로컬: `.env.local` 파일에 `ENTRY_CODE=원하는코드`
  - Netlify: Site configuration → Environment variables 에 `ENTRY_CODE` 추가 후 재배포
- 코드를 바꾸면 기존에 입장했던 사람도 새 코드를 다시 입력해야 합니다.
- 코드 원문은 사이트 파일에 들어가지 않고 해시값만 들어가지만, 서버 검증이 아니므로 가벼운 접근 제한 용도입니다.

## 소원 함께 보기 (Supabase)

`.env` 의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 가 있으면 소원이 Supabase에 저장되어 모든 방문자에게 보입니다. (Supabase 프로젝트 `2page_pj`)

처음 한 번, Supabase 대시보드 → **SQL Editor** 에서 `supabase/wishes.sql` 내용을 실행해 `wishes` 테이블을 만들어야 합니다.

- 열려 있는 화면은 15초마다, 그리고 탭으로 돌아올 때 새 소원을 불러옵니다.
- 소원은 누구나 볼 수 있고 새로 걸 수만 있습니다(수정·삭제 불가).
- 두 환경 변수를 지우면 예전처럼 각자 브라우저에만 저장됩니다.

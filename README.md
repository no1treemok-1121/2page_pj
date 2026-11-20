# 2page_pj

이 저장소에는 두 개의 웹 프로젝트가 들어 있습니다.

| 폴더 | 프로젝트 | 설명 |
|---|---|---|
| `/` (루트) | **2Page** | 24시간만 볼 수 있는 익명 기반 감성 SNS |
| `3d_pj/` | **눈 내리는 마을** | 트리에 소원을 거는 3D 사이트 ([3d_pj/README.md](3d_pj/README.md)) |

두 프로젝트는 패키지와 빌드가 서로 분리되어 있습니다.

## 2Page 실행

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # dist/ 에 결과물
npm test
```

- 기술: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- 데이터: Supabase (`src/integrations/supabase/`, 연결 정보는 `.env`)
- 패키지 관리: npm (`package-lock.json`)

## 배포 (Netlify)

- 2Page: Base directory 비움(루트) → `netlify.toml` 사용
- 3D 사이트: Base directory `3d_pj` → `3d_pj/netlify.toml` 사용

배포 후 실제 주소가 정해지면 `index.html` 의 `og:image` 를 전체 주소(예: `https://도메인/og-image.png`)로 바꾸면 링크 미리보기가 더 안정적으로 보입니다.

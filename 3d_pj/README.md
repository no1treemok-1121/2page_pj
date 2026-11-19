# 3d_pj

`2page_pj` 저장소 안에서 따로 관리하는 3D 웹 프로젝트입니다. 상위 폴더의 기존 프로젝트와는 의존성과 빌드가 완전히 분리되어 있습니다.

- 기술: Vite + React + TypeScript + Three.js (@react-three/fiber, drei)

## 실행

```bash
cd 3d_pj
npm install
npm run dev
```

## 배포 (Netlify)

새 사이트를 만들고 **Base directory** 를 `3d_pj` 로 지정하면 `netlify.toml` 설정(빌드 `npm run build`, 배포 폴더 `dist`)이 적용됩니다.

나중에 별도 `3d_pj` 저장소로 옮길 때는 이 폴더 내용만 그대로 복사하면 됩니다.

## 입장 코드

처음 들어오면 입장 코드를 물어봅니다. 한 번 맞히면 그 브라우저에서는 다시 묻지 않습니다.

- 기본 코드: `1225`
- 바꾸는 법: 환경 변수 `ENTRY_CODE` 를 설정한 뒤 다시 빌드
  - 로컬: `3d_pj/.env.local` 파일에 `ENTRY_CODE=원하는코드`
  - Netlify: Site configuration → Environment variables 에 `ENTRY_CODE` 추가 후 재배포
- 코드를 바꾸면 기존에 입장했던 사람도 새 코드를 다시 입력해야 합니다.
- 코드 원문은 사이트 파일에 들어가지 않고 해시값만 들어가지만, 서버 검증이 아니므로 가벼운 접근 제한 용도입니다.

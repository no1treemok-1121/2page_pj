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

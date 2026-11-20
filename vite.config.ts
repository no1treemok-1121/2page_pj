import { createHash } from "node:crypto";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 입장 코드는 빌드할 때 해시로만 바꿔 넣어서, 사이트 파일에 코드 원문이 남지 않게 함.
// 코드 변경: 환경 변수 ENTRY_CODE (로컬은 .env.local, Netlify는 Environment variables)
const DEFAULT_CODE = "1225";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const code = (env.ENTRY_CODE || DEFAULT_CODE).trim();
  const hash = createHash("sha256").update(code).digest("hex");

  return {
    plugins: [react()],
    define: {
      __ENTRY_CODE_HASH__: JSON.stringify(hash),
    },
  };
});

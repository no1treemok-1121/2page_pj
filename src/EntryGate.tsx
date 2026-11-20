import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "3d_pj.entry";

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readPassed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === __ENTRY_CODE_HASH__;
  } catch {
    return false;
  }
}

export default function EntryGate({ children }: { children: ReactNode }) {
  const [passed, setPassed] = useState(readPassed);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!passed) inputRef.current?.focus();
  }, [passed]);

  if (passed) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || checking) return;
    setChecking(true);
    const ok = (await sha256(code.trim())) === __ENTRY_CODE_HASH__;
    setChecking(false);
    if (ok) {
      try {
        sessionStorage.setItem(STORAGE_KEY, __ENTRY_CODE_HASH__); // 새로 방문할 때마다 다시 물어봄
      } catch {
        // 저장 못 해도 이번 방문은 입장
      }
      setPassed(true);
    } else {
      setError(true);
      setCode("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="gate">
      <form className={`card gate-card${error ? " shake" : ""}`} onSubmit={submit}
        onAnimationEnd={() => setError(false)}>
        <div className="gate-star">✦</div>
        <h2>눈 내리는 마을</h2>
        <p className="gate-desc">입장 코드를 입력해 주세요</p>
        <input
          ref={inputRef}
          type="password"
          inputMode="text"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="입장 코드"
          aria-label="입장 코드"
        />
        <p className="gate-error" aria-live="polite">{error ? "코드가 맞지 않아요" : " "}</p>
        <button type="submit" className="btn" disabled={!code.trim() || checking}>들어가기</button>
      </form>
    </div>
  );
}

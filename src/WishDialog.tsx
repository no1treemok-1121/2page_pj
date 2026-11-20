import { FormEvent, useEffect, useRef, useState } from "react";

const MAX = 100;

type Props = { onSubmit: (text: string, name: string) => void; onClose: () => void };

const NAME_KEY = "3d_pj.wishName";

export default function WishDialog({ onSubmit, onClose }: Props) {
  const [text, setText] = useState("");
  const [name, setName] = useState(() => { try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; } });
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* 무시 */ }
    onSubmit(trimmed, name.trim());
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>올해의 소원</h2>
        <textarea
          ref={ref}
          value={text}
          maxLength={MAX}
          rows={4}
          placeholder="트리에 걸 소원을 적어 주세요"
          onChange={(e) => setText(e.target.value)}
        />
        <input className="field name-field" value={name} maxLength={12} placeholder="이름이나 별명 (선택, 비우면 익명)"
          onChange={(e) => setName(e.target.value)} />
        <div className="row">
          <span className="len">{text.length} / {MAX}</span>
          <div className="actions">
            <button type="button" className="btn ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn" disabled={!text.trim()}>소원 걸기</button>
          </div>
        </div>
      </form>
    </div>
  );
}

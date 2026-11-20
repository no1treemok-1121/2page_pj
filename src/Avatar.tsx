import { useState } from "react";
import { ACCESSORIES, ALL_ANIMALS, ANIMALS, Avatar, COLORS, DEFAULT_AVATAR, parseAvatar } from "./avatar";
import { Modal } from "./RoomView";

// 동그란 2D 캐릭터 배지 (채팅·소원함·버튼에 사용)
export function AvatarBadge({ value, size = 32 }: { value?: Avatar | string | null; size?: number }) {
  const a = typeof value === "string" || value == null ? parseAvatar(value as string | null) : value;
  if (!a) return <span className="avatar empty" style={{ width: size, height: size, fontSize: size * 0.5 }}>👤</span>;
  const animal = ALL_ANIMALS.find((x) => x.id === a.animal)!;
  const acc = ACCESSORIES.find((x) => x.id === a.acc);
  return (
    <span className="avatar" style={{ width: size, height: size, background: a.color, fontSize: size * 0.6 }}>
      {animal.emoji}
      {acc?.emoji && <span className="avatar-acc" style={{ fontSize: size * 0.42 }}>{acc.emoji}</span>}
    </span>
  );
}

function Picker({ a, setA }: { a: Avatar; setA: (a: Avatar) => void }) {
  return (
    <>
      <div className="avatar-preview"><AvatarBadge value={a} size={96} /></div>
      <p className="pick-label">동물</p>
      <div className="picks">
        {ANIMALS.map((x) => (
          <button key={x.id} className={`pick${a.animal === x.id ? " on" : ""}`} onClick={() => setA({ ...a, animal: x.id })} title={x.name}>{x.emoji}</button>
        ))}
      </div>
      <p className="pick-label">색</p>
      <div className="picks">
        {COLORS.map((c) => (
          <button key={c} className={`pick color${a.color === c ? " on" : ""}`} style={{ background: c }} onClick={() => setA({ ...a, color: c })} aria-label={c} />
        ))}
      </div>
      <p className="pick-label">장식</p>
      <div className="picks">
        {ACCESSORIES.map((x) => (
          <button key={x.id} className={`pick${a.acc === x.id ? " on" : ""}`} onClick={() => setA({ ...a, acc: x.id })} title={x.name}>{x.emoji || "✕"}</button>
        ))}
      </div>
    </>
  );
}

// 닉네임: 채팅·걸어 다니는 캐릭터 이름표에 함께 쓰임
const NICK_KEY = "3d_pj.chatNick";
export const loadNickname = () => { try { return localStorage.getItem(NICK_KEY) || ""; } catch { return ""; } };
export const saveNickname = (n: string) => { try { localStorage.setItem(NICK_KEY, n); } catch { /* 무시 */ } };

export function AvatarEditor({ initial, onSave, onClose }: { initial: Avatar | null; onSave: (a: Avatar, nickChanged?: string) => void; onClose: () => void }) {
  const [a, setA] = useState<Avatar>(initial ?? DEFAULT_AVATAR);
  const [nick, setNick] = useState(loadNickname);
  return (
    <Modal onClose={onClose}>
      <h2>내 캐릭터</h2>
      <p className="pick-label">닉네임</p>
      <input className="field" value={nick} maxLength={12} placeholder="닉네임 (채팅·이름표에 보여요)" onChange={(e) => setNick(e.target.value)} />
      <Picker a={a} setA={setA} />
      <p className="hint">채팅·소원·내 방·마을에서 이 캐릭터와 닉네임이 보여요.</p>
      <div className="actions center">
        <button className="btn ghost" onClick={onClose}>취소</button>
        <button className="btn" onClick={() => {
          const n = nick.trim(), changed = !!n && n !== loadNickname();
          if (n) saveNickname(n);
          onSave(a, changed ? n : undefined);
        }}>저장</button>
      </div>
    </Modal>
  );
}

// 입장 코드 다음 단계: 캐릭터를 고르고 마을(또는 방)로 들어감
export function CharacterSetup({ initial, onDone }: { initial: Avatar | null; onDone: (a: Avatar) => void }) {
  const [a, setA] = useState<Avatar>(initial ?? DEFAULT_AVATAR);
  const [nick, setNick] = useState(loadNickname);
  const enter = () => {
    // 닉네임을 비우면 귀여운 이름을 대신 붙여 줌 (나중에 왼쪽 위 캐릭터에서 바꿀 수 있음)
    saveNickname(nick.trim() || `눈송이${Math.floor(100 + Math.random() * 900)}`);
    onDone(a);
  };
  return (
    <div className="intro">
      <div className="intro-inner">
        <div className="card setup-card">
          <h2>{initial ? "오늘은 이 캐릭터로 갈까요?" : "마을에서 쓸 캐릭터를 골라 주세요"}</h2>
          <p className="pick-label">닉네임</p>
          <input className="field nick-field" value={nick} maxLength={12} placeholder="닉네임 (이름표·채팅에 보여요)" onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enter(); }} />
          <Picker a={a} setA={setA} />
          <button className="btn wide" onClick={enter}>이 캐릭터로 입장 →</button>
        </div>
      </div>
    </div>
  );
}

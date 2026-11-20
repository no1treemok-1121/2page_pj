import { useState } from "react";
import { ACCESSORIES, ANIMALS, Avatar, COLORS, DEFAULT_AVATAR, parseAvatar } from "./avatar";
import { Modal } from "./RoomView";

// 동그란 2D 캐릭터 배지 (채팅·소원함·버튼에 사용)
export function AvatarBadge({ value, size = 32 }: { value?: Avatar | string | null; size?: number }) {
  const a = typeof value === "string" || value == null ? parseAvatar(value as string | null) : value;
  if (!a) return <span className="avatar empty" style={{ width: size, height: size, fontSize: size * 0.5 }}>👤</span>;
  const animal = ANIMALS.find((x) => x.id === a.animal)!;
  const acc = ACCESSORIES.find((x) => x.id === a.acc);
  return (
    <span className="avatar" style={{ width: size, height: size, background: a.color, fontSize: size * 0.6 }}>
      {animal.emoji}
      {acc?.emoji && <span className="avatar-acc" style={{ fontSize: size * 0.42 }}>{acc.emoji}</span>}
    </span>
  );
}

export function AvatarEditor({ initial, onSave, onClose }: { initial: Avatar | null; onSave: (a: Avatar) => void; onClose: () => void }) {
  const [a, setA] = useState<Avatar>(initial ?? DEFAULT_AVATAR);
  return (
    <Modal onClose={onClose}>
      <h2>내 캐릭터</h2>
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
      <p className="hint">채팅·소원·내 방에서 이 캐릭터가 보여요.</p>
      <div className="actions center">
        <button className="btn ghost" onClick={onClose}>취소</button>
        <button className="btn" onClick={() => onSave(a)}>저장</button>
      </div>
    </Modal>
  );
}

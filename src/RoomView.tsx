import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RoomScene from "./RoomScene";
import {
  Letter, MyRoom, RoomInfo, copyText, deleteLetter, getLetters, getRoom, ownerLink, roomLink, sendLetter,
} from "./rooms";

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function WriteLetter({ to, onSend, onClose }: { to: string; onSend: (from: string, body: string) => Promise<void>; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const ok = from.trim() && body.trim() && !sending;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    setSending(true);
    try { await onSend(from.trim(), body.trim()); } finally { setSending(false); }
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit}>
        <h2>{to}에게 편지 쓰기</h2>
        <input className="field" value={from} maxLength={12} placeholder="보내는 사람 (이름이나 별명)"
          onChange={(e) => setFrom(e.target.value)} autoFocus />
        <textarea value={body} maxLength={500} rows={6} placeholder="전하고 싶은 마음을 적어 주세요"
          onChange={(e) => setBody(e.target.value)} />
        <p className="hint">편지는 방 주인만 읽을 수 있어요.</p>
        <div className="row">
          <span className="len">{body.length} / 500</span>
          <div className="actions">
            <button type="button" className="btn ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn" disabled={!ok}>{sending ? "보내는 중…" : "보내기"}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function LetterBox({ letters, onDelete, onClose }: { letters: Letter[] | null; onDelete: (id: string) => void; onClose: () => void }) {
  const [open, setOpen] = useState<Letter | null>(null);
  if (open) {
    return (
      <Modal onClose={() => setOpen(null)}>
        <p className="letter-from">From. {open.fromName}</p>
        <p className="letter-body">{open.body}</p>
        <p className="date">{new Date(open.createdAt).toLocaleString("ko-KR")}</p>
        <div className="actions center">
          <button className="btn ghost" onClick={() => { if (confirm("이 편지를 지울까요?")) { onDelete(open.id); setOpen(null); } }}>지우기</button>
          <button className="btn" onClick={() => setOpen(null)}>목록으로</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal onClose={onClose}>
      <h2>편지함</h2>
      {letters === null ? <p className="hint">불러오는 중…</p>
        : letters.length === 0 ? <p className="hint">아직 받은 편지가 없어요.<br />방 링크를 친구에게 보내 보세요!</p>
        : (
          <ul className="letters">
            {letters.map((l) => (
              <li key={l.id}>
                <button onClick={() => setOpen(l)}>
                  <strong>{l.fromName}</strong>
                  <span>{l.body.slice(0, 30)}{l.body.length > 30 ? "…" : ""}</span>
                  <small>{new Date(l.createdAt).toLocaleDateString("ko-KR")}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      <button className="btn wide" onClick={onClose}>닫기</button>
    </Modal>
  );
}

type Props = {
  roomId: string;
  myRoom: MyRoom | null;
  onGoVillage: () => void;
  onGoMyRoom: () => void;
  notify: (msg: string) => void;
  onNickname: (nickname: string) => void;
};

export default function RoomView({ roomId, myRoom, onGoVillage, onGoMyRoom, notify, onNickname }: Props) {
  const isOwner = myRoom?.roomId === roomId;
  const [info, setInfo] = useState<RoomInfo | null | undefined>(undefined);
  const [dialog, setDialog] = useState<"write" | "box" | "share" | null>(null);
  const [letters, setLetters] = useState<Letter[] | null>(null);

  const refresh = useCallback(() => {
    getRoom(roomId).then((r) => { setInfo(r); if (r) onNickname(r.nickname); }).catch((e) => { setInfo(null); notify((e as Error).message); });
  }, [roomId, notify, onNickname]);
  useEffect(refresh, [refresh]);

  const openBox = async () => {
    if (!myRoom) return;
    setDialog("box");
    setLetters(null);
    try { setLetters(await getLetters(roomId, myRoom.ownerKey)); }
    catch (e) { notify((e as Error).message); setDialog(null); }
  };

  const onMailbox = () => (isOwner ? openBox() : setDialog("write"));

  const copy = async (text: string, label: string) => {
    notify((await copyText(text)) ? `${label}를 복사했어요` : "복사하지 못했어요. 주소를 직접 길게 눌러 복사해 주세요.");
  };

  if (info === null) {
    return (
      <div className="gate">
        <div className="card">
          <h2>방을 찾을 수 없어요</h2>
          <p className="hint">링크가 맞는지 확인해 주세요.</p>
          <button className="btn wide" onClick={onGoVillage}>마을로 가기</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Canvas camera={{ position: [3.2, 3, 4.6], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={["#2a1e1a"]} />
        <RoomScene letterCount={info?.letterCount ?? 0} onMailbox={onMailbox} />
        <OrbitControls enablePan={false} target={[0, 1, -0.5]} minDistance={3} maxDistance={8}
          minAzimuthAngle={-0.2} maxAzimuthAngle={1.3} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>

      <div className="title">
        <h1>{info ? `${info.nickname}의 방` : "…"}</h1>
        <p>{isOwner
          ? `받은 편지 ${info?.letterCount ?? 0}통 · 빨간 편지함을 눌러 읽어 보세요`
          : "빨간 편지함을 눌러 편지를 남겨 보세요"}</p>
      </div>

      <div className="bottom-bar">
        <button className="btn ghost light" onClick={onGoVillage}>← 마을</button>
        {isOwner ? (
          <>
            <button className="btn" onClick={openBox}>편지함 ({info?.letterCount ?? 0})</button>
            <button className="btn" onClick={() => setDialog("share")}>내 방 공유</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => setDialog("write")}>편지 쓰기</button>
            <button className="btn" onClick={onGoMyRoom}>{myRoom ? "내 방으로" : "나도 방 만들기"}</button>
          </>
        )}
      </div>

      {dialog === "write" && info && (
        <WriteLetter to={info.nickname} onClose={() => setDialog(null)}
          onSend={async (from, body) => {
            try { await sendLetter(roomId, from, body); notify("편지를 보냈어요 ✉️"); setDialog(null); refresh(); }
            catch (e) { notify((e as Error).message); }
          }} />
      )}
      {dialog === "box" && (
        <LetterBox letters={letters} onClose={() => setDialog(null)}
          onDelete={async (id) => {
            try { await deleteLetter(roomId, myRoom!.ownerKey, id); setLetters((p) => p?.filter((l) => l.id !== id) ?? null); refresh(); }
            catch (e) { notify((e as Error).message); }
          }} />
      )}
      {dialog === "share" && myRoom && <ShareDialog room={myRoom} onCopy={copy} onClose={() => setDialog(null)} />}
    </>
  );
}

export function ShareDialog({ room, onCopy, onClose, first }: {
  room: MyRoom; onCopy: (text: string, label: string) => void; onClose: () => void; first?: boolean;
}) {
  return (
    <Modal onClose={onClose}>
      <h2>{first ? "내 방이 생겼어요! 🏠" : "내 방 공유"}</h2>
      <p className="hint">아래 <b>방 링크</b>를 친구에게 보내면 내 방에 놀러 와서 편지를 남길 수 있어요.</p>
      <button className="btn wide" onClick={() => onCopy(roomLink(room.roomId), "방 링크")}>방 링크 복사 (친구에게)</button>
      <p className="hint warn">
        <b>주인 링크</b>는 다른 기기에서 내 방 주인으로 들어갈 때 필요해요. 나만 볼 수 있는 곳(메모 앱 등)에 저장하고, 다른 사람에게는 보내지 마세요.
      </p>
      <button className="btn ghost wide" onClick={() => onCopy(ownerLink(room), "주인 링크")}>주인 링크 복사 (나만 보관)</button>
      <button className="btn wide" onClick={onClose}>확인</button>
    </Modal>
  );
}

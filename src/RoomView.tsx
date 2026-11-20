import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RoomScene from "./RoomScene";
import { Avatar, DEFAULT_AVATAR, parseAvatar } from "./avatar";
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
  const ok = body.trim() && !sending;
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
        <input className="field" value={from} maxLength={12} placeholder="보내는 사람 (선택, 비우면 익명)"
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
  myAvatar: Avatar | null;
};

export default function RoomView({ roomId, myRoom, onGoVillage, onGoMyRoom, notify, onNickname, myAvatar }: Props) {
  const isOwner = myRoom?.roomId === roomId;
  const [info, setInfo] = useState<RoomInfo | null | undefined>(undefined);
  const [dialog, setDialog] = useState<"write" | "box" | "share" | "visitor" | "sent" | null>(null);
  // 주인: 마지막으로 편지함을 열었을 때의 편지 수보다 많으면 '새 편지'
  const [seenCount, setSeenCount] = useState(() => loadSeenCount(roomId));
  const hasNew = isOwner && (info?.letterCount ?? 0) > seenCount;
  const [letters, setLetters] = useState<Letter[] | null>(null);

  const refresh = useCallback(() => {
    getRoom(roomId).then((r) => { setInfo(r); if (r) onNickname(r.nickname); }).catch((e) => { setInfo(null); notify((e as Error).message); });
  }, [roomId, notify, onNickname]);
  useEffect(refresh, [refresh]);

  const openBox = async () => {
    if (!myRoom) return;
    saveSeenCount(roomId, info?.letterCount ?? 0);
    setSeenCount(info?.letterCount ?? 0);
    setDialog("box");
    setLetters(null);
    try { setLetters(await getLetters(roomId, myRoom.ownerKey)); }
    catch (e) { notify((e as Error).message); setDialog(null); }
  };

  const onMailbox = () => (isOwner ? openBox() : setDialog("visitor"));

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
        <RoomScene letterCount={info?.letterCount ?? 0} onMailbox={onMailbox} alert={hasNew}
          avatar={(isOwner && myAvatar) || parseAvatar(info?.avatar) || DEFAULT_AVATAR} />
        <OrbitControls enablePan={false} target={[0, 1, -0.5]} minDistance={3} maxDistance={8}
          minAzimuthAngle={-0.2} maxAzimuthAngle={1.3} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>

      <div className="title">
        <h1>{info ? `${info.nickname}의 방` : "…"}</h1>
        <p>{isOwner
          ? (hasNew ? `✨ 새 편지가 왔어요! 반짝이는 편지함을 눌러 보세요` : `받은 편지 ${info?.letterCount ?? 0}통 · 빨간 편지함을 눌러 읽어 보세요`)
          : "빨간 편지함을 눌러 편지를 남기거나, 보낸 편지를 볼 수 있어요"}</p>
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
            <button className="btn" onClick={() => setDialog("visitor")}>✉️ 편지</button>
            <button className="btn" onClick={onGoMyRoom}>{myRoom ? "내 방으로" : "나도 방 만들기"}</button>
          </>
        )}
      </div>

      {dialog === "write" && info && (
        <WriteLetter to={info.nickname} onClose={() => setDialog(null)}
          onSend={async (from, body) => {
            try {
              await sendLetter(roomId, from, body);
              recordSent({ roomId, to: info.nickname, from: from || "익명", body, at: Date.now() });
              notify("편지를 보냈어요 ✉️ 보낸 편지는 '내가 보낸 편지'에서 볼 수 있어요"); setDialog(null); refresh();
            }
            catch (e) { notify((e as Error).message); }
          }} />
      )}
      {dialog === "visitor" && info && (
        <Modal onClose={() => setDialog(null)}>
          <h2>{info.nickname}의 편지함</h2>
          <button className="btn wide" onClick={() => setDialog("write")}>✏️ 편지 쓰기</button>
          <button className="btn ghost wide" onClick={() => setDialog("sent")}>📮 내가 보낸 편지 ({loadSent(roomId).length})</button>
        </Modal>
      )}
      {dialog === "sent" && info && (
        <Modal onClose={() => setDialog(null)}>
          <h2>{info.nickname}에게 보낸 편지</h2>
          {loadSent(roomId).length === 0 ? <p className="hint">아직 이 방에 보낸 편지가 없어요.<br />(이 기기에서 보낸 편지만 기록돼요)</p> : (
            <ul className="sent-list">
              {loadSent(roomId).map((l, i) => (
                <li key={i}><p>{l.body}</p><small>{new Date(l.at).toLocaleString("ko-KR")} · 보낸 이름: {l.from}</small></li>
              ))}
            </ul>
          )}
          <button className="btn wide" onClick={() => setDialog("write")}>✏️ 한 통 더 쓰기</button>
          <button className="btn ghost wide" onClick={() => setDialog(null)}>닫기</button>
        </Modal>
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

// ---- 이 기기에 남기는 기록 ----
type SentLetter = { roomId: string; to: string; from: string; body: string; at: number };
const SENT_KEY = "3d_pj.sentLetters";
function loadAllSent(): SentLetter[] {
  try { return JSON.parse(localStorage.getItem(SENT_KEY) || "[]"); } catch { return []; }
}
function loadSent(roomId: string) {
  return loadAllSent().filter((l) => l.roomId === roomId).reverse();
}
function recordSent(l: SentLetter) {
  try { localStorage.setItem(SENT_KEY, JSON.stringify([...loadAllSent(), l].slice(-200))); } catch { /* 무시 */ }
}
const seenKey = (roomId: string) => `3d_pj.seenLetters.${roomId}`;
function loadSeenCount(roomId: string) {
  try { return Number(localStorage.getItem(seenKey(roomId)) || 0); } catch { return 0; }
}
function saveSeenCount(roomId: string, n: number) {
  try { localStorage.setItem(seenKey(roomId), String(n)); } catch { /* 무시 */ }
}

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RoomScene from "./RoomScene";
import { IconText } from "./FoodIcon";
import { DEFAULT_DECOR, Decor, FLOORS, MAX_FOOD, PROPS, RUGS, WALLS, foodById, normDecor, setRoomDecor } from "./decor";
import { Avatar, DEFAULT_AVATAR, parseAvatar } from "./avatar";
import {
  LOGIN_RE, Letter, MyRoom, RoomInfo, copyText, setRoomName, deleteLetter, getLetters, getRoom, getRoomLogin, ownerLink, roomLink, sendLetter, setRoomLogin,
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
  onLeaveRoom?: () => void;
  onRoomGone?: (create: boolean) => void;
  onNickname: (nickname: string) => void;
  myAvatar: Avatar | null;
};

export default function RoomView({ roomId, myRoom, onGoVillage, onGoMyRoom, notify, onNickname, myAvatar, onLeaveRoom, onRoomGone }: Props) {
  const isOwner = myRoom?.roomId === roomId;
  const [info, setInfo] = useState<RoomInfo | null | undefined>(undefined);
  const [dialog, setDialog] = useState<"write" | "box" | "share" | "visitor" | "sent" | "key" | "decor" | null>(null);
  const [preview, setPreview] = useState<Decor | null>(null); // 꾸미는 중 미리 보기
  // 열쇠(아이디·비밀번호)가 없는 주인에게 한 번 알려 주기
  useEffect(() => {
    if (myRoom?.roomId !== roomId) return;
    getRoomLogin(myRoom).then((l) => { if (!l) notify("🔑 아직 내 방 열쇠가 없어요! 아래 '🔑 열쇠'에서 아이디·비밀번호를 만들어 두세요"); }).catch(() => undefined);
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps
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
    // 이 기기에 '내 방'으로 저장돼 있던 방이 지워졌으면: 기억을 지우고 새로 만들 수 있게
    if (myRoom?.roomId === roomId) {
      return (
        <div className="gate">
          <div className="card">
            <h2>내 방이 없어졌어요</h2>
            <p className="hint">이 방은 정리되어 사라졌어요. 새 방을 만들어 주세요! (방 꾸미기·🔑 열쇠 기능이 생겼어요)</p>
            <button className="btn wide" onClick={() => onRoomGone?.(true)}>🏠 새 방 만들기</button>
            <button className="btn ghost wide" onClick={() => onRoomGone?.(false)}>마을로 가기</button>
          </div>
        </div>
      );
    }
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
        <RoomScene letterCount={info?.letterCount ?? 0} onMailbox={onMailbox} alert={hasNew} decor={preview ?? normDecor(info?.decor)}
          avatar={(isOwner && myAvatar) || parseAvatar(info?.avatar) || DEFAULT_AVATAR} />
        {/* 360도 돌려 보기 (카메라 쪽 벽은 자동으로 숨겨짐) */}
        <OrbitControls enablePan={false} target={[0, 1, 0]} minDistance={3} maxDistance={9} maxPolarAngle={Math.PI / 2.15} />
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
            <button className="btn" onClick={() => setDialog("key")}>🔑 열쇠</button>
            <button className="btn" onClick={() => { setPreview(normDecor(info?.decor)); setDialog("decor"); }}>🎨 꾸미기</button>
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
      {dialog === "decor" && myRoom && preview && (
        <DecorPanel decor={preview} onChange={setPreview} roomName={info?.nickname ?? myRoom.nickname}
          onRename={async (name) => {
            try {
              const updated = await setRoomName(myRoom, name);
              setInfo((i) => (i ? { ...i, nickname: updated.nickname } : i));
              onNickname(updated.nickname);
              notify(`✏️ 방 이름을 '${updated.nickname}의 방'으로 바꿨어요`);
            } catch (e) { notify((e as Error).message); }
          }}
          onCancel={() => { setPreview(null); setDialog(null); }}
          onSave={async () => {
            try {
              await setRoomDecor(myRoom, preview);
              setInfo((i) => (i ? { ...i, decor: preview } : i));
              notify("🎨 방 꾸미기를 저장했어요");
              setPreview(null); setDialog(null);
            } catch (e) { notify((e as Error).message); }
          }} />
      )}
      {dialog === "key" && myRoom && <KeyDialog room={myRoom} onCopy={copy} onClose={() => setDialog(null)} onLeave={onLeaveRoom} />}
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
      <KeySection room={room} onCopy={onCopy} />
      <button className="btn wide" onClick={onClose}>확인</button>
    </Modal>
  );
}

// 🎨 방 꾸미기 패널: 아래쪽에 떠서 방이 바뀌는 걸 보면서 고름 (저장 전까지는 나에게만 보임)
function DecorPanel({ decor, onChange, onSave, onCancel, roomName, onRename }: { decor: Decor; onChange: (d: Decor) => void; onSave: () => void; onCancel: () => void; roomName: string; onRename: (name: string) => void }) {
  const set = (p: Partial<Decor>) => onChange({ ...decor, ...p });
  const [name, setName] = useState(roomName);
  const swatches = (list: string[], cur: string, key: "wall" | "floor" | "rug") => (
    <div className="swatches">{list.map((c) => <button key={c} className={c === cur ? "sw on" : "sw"} style={{ background: c }} onClick={() => set({ [key]: c } as Partial<Decor>)} aria-label={c} />)}</div>
  );
  return (
    <div className="decor-panel">
      <h3>🎨 방 꾸미기 <small>바꾸면 바로 방에 보여요</small></h3>
      <div className="decor-body">
        <p className="pick-label">✏️ 방 이름</p>
        <div className="name-row">
          <input className="field" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} placeholder="방 이름 (1~12자)" />
          <span>의 방</span>
          <button className="btn" disabled={!name.trim() || name.trim() === roomName} onClick={() => onRename(name)}>바꾸기</button>
        </div>
        <p className="pick-label">벽지</p>{swatches(WALLS, decor.wall, "wall")}
        <p className="pick-label">바닥</p>{swatches(FLOORS, decor.floor, "floor")}
        <p className="pick-label">러그</p>{swatches(RUGS, decor.rug, "rug")}
        <p className="pick-label">소품 (눌러서 놓기·치우기)</p>
        <div className="chips">
          {PROPS.map((p) => <button key={p.key} className={decor[p.key] ? "chip on" : "chip"} onClick={() => set({ [p.key]: !decor[p.key] } as Partial<Decor>)}>{p.emoji} {p.name}</button>)}
        </div>
        <p className="pick-label">💡 꼬마전구</p>
        <div className="chips">
          {([["none", "끄기"], ["warm", "🟡 따뜻한 빛"], ["rainbow", "🌈 알록달록"]] as const).map(([k, n]) => (
            <button key={k} className={decor.lights === k ? "chip on" : "chip"} onClick={() => set({ lights: k })}>{n}</button>
          ))}
        </div>
        <p className="pick-label">🍽️ 테이블 위 음식 ({decor.food.length}/{MAX_FOOD})</p>
        {decor.food.length ? (
          <div className="chips">
            {decor.food.map((id, i) => { const f = foodById(id); return f && (
              <button key={i} className="chip on" onClick={() => set({ food: decor.food.filter((_, j) => j !== i) })}><IconText text={f.emoji} /> {f.name} ✕</button>
            ); })}
          </div>
        ) : <p className="hint small">비어 있어요. 마을 노점에서 <b>🏠 내 방에 사 가기</b>를 고르면 테이블에 놓여요.</p>}
      </div>
      <div className="actions center">
        <button className="btn ghost" onClick={() => onChange({ ...DEFAULT_DECOR })}>↺ 초기화</button>
        <button className="btn ghost" onClick={onCancel}>취소</button>
        <button className="btn" onClick={onSave}>저장</button>
      </div>
    </div>
  );
}

export function KeyDialog({ room, onCopy, onClose, onLeave }: { room: MyRoom; onCopy: (text: string, label: string) => void; onClose: () => void; onLeave?: () => void }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  useEffect(() => { getRoomLogin(room).then((l) => setHasKey(!!l)).catch(() => setHasKey(false)); }, [room]);
  return (
    <Modal onClose={onClose}>
      <h2>🔑 내 방 열쇠</h2>
      <KeySection room={room} onCopy={onCopy} onSaved={() => setHasKey(true)} />
      {onLeave && (
        <>
          <button className="btn ghost wide leave-btn" disabled={!hasKey} onClick={onLeave}>🚪 이 기기에서 로그아웃 (다른 사람이 쓸 때)</button>
          {hasKey === false && <p className="hint small">열쇠를 먼저 만들어야 로그아웃할 수 있어요 (다시 찾을 때 필요해요).</p>}
        </>
      )}
      <button className="btn ghost wide" onClick={onClose}>닫기</button>
    </Modal>
  );
}

// 🔑 아이디·비밀번호: 다른 휴대폰·컴퓨터에서 ☰ 메뉴 → '내 방 찾기'로 다시 들어올 때 씀
function KeySection({ room, onCopy, onSaved }: { room: MyRoom; onCopy: (text: string, label: string) => void; onSaved?: () => void }) {
  const [login, setLogin] = useState<string | null | undefined>(undefined); // undefined = 불러오는 중
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { getRoomLogin(room).then(setLogin).catch(() => setLogin(null)); }, [room]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!LOGIN_RE.test(id.trim())) { setError("아이디는 한글·영어·숫자로 3~16자로 해 주세요. (띄어쓰기·기호 안 돼요)"); return; }
    if (pw.length < 4) { setError("비밀번호는 4자 이상으로 해 주세요."); return; }
    setBusy(true); setError("");
    try { setLogin(await setRoomLogin(room, id, pw)); setEditing(false); setPw(""); onSaved?.(); }
    catch (err) { setError((err as Error).message); }
    setBusy(false);
  };
  if (login === undefined) return <p className="hint">🔑 열쇠 확인 중…</p>;
  return (
    <div className="key-box">
      {login && !editing ? (
        <>
          <p className="hint"><b>🔑 내 방 아이디: {login}</b><br />다른 휴대폰·컴퓨터에서는 <b>☰ 메뉴 → 🔑 내 방 찾기</b>에 이 아이디와 비밀번호를 넣으면 내 방에 들어올 수 있어요.</p>
          <button className="btn ghost wide" onClick={() => { setEditing(true); setId(login); }}>아이디·비밀번호 바꾸기</button>
        </>
      ) : (
        <form onSubmit={save}>
          <p className="hint warn"><b>🔑 내 방 열쇠 만들기</b><br />아이디와 비밀번호를 정해 두면, 다른 휴대폰·컴퓨터에서도 <b>☰ 메뉴 → 🔑 내 방 찾기</b>로 내 방에 다시 들어올 수 있어요. 꼭 기억해 두세요!</p>
          <input className="field" value={id} maxLength={16} placeholder="아이디 (한글·영어·숫자 3~16자)" onChange={(e) => setId(e.target.value)} autoComplete="username" />
          <input className="field" type="password" value={pw} maxLength={30} placeholder="비밀번호 (4자 이상)" onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          {error && <p className="gate-error">{error}</p>}
          <button type="submit" className="btn wide" disabled={busy}>{busy ? "저장 중…" : "🔑 열쇠 저장"}</button>
        </form>
      )}
      <button className="link-btn small" onClick={() => onCopy(ownerLink(room), "주인 링크")}>예전 방식: 주인 링크 복사 (나만 보관)</button>
    </div>
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

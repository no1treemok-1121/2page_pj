import { useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Scene from "./Scene";
import WishDialog from "./WishDialog";
import { Wish, addWish, fetchWishes, isShared, newWishDraft } from "./wishes";
import RoomView, { Modal, ShareDialog } from "./RoomView";
import { MyRoom, copyText, createRoom, loadMyRoom, saveMyRoom } from "./rooms";
import ChatPanel, { useVillageChat } from "./Chat";
import { AvatarBadge, AvatarEditor, CharacterSetup } from "./Avatar";
import RandomLetters, { useRandomInbox } from "./RandomLetters";
import { MyWalker, OtherWalkers, useWalkers } from "./Walk";
import { Avatar, loadMyAvatar, saveMyAvatar, toStr } from "./avatar";
import { setRoomAvatar } from "./rooms";

const REFRESH_MS = 15000;

// 세로로 긴 휴대폰 화면에서는 조금 더 멀리서, 넓게 보여 줌
const isPortrait = typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8;
const CAMERA = isPortrait
  ? { position: [0, 3.5, 14] as [number, number, number], fov: 62 }
  : { position: [0, 3, 10] as [number, number, number], fov: 50 };

function VillageView({ onMyRoom, myRoom, notice, setNotice, action, myAvatar }: {
  myAvatar: Avatar | null;
  action: VillageAction;
  onMyRoom: () => void;
  myRoom: MyRoom | null;
  notice: string | null;
  setNotice: (m: string | null) => void;
}) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [writing, setWriting] = useState(false);
  const [viewing, setViewing] = useState<Wish | null>(null);
  const chat = useVillageChat();
  const [chatOpen, setChatOpen] = useState(action?.type === "chat");
  const [boxOpen, setBoxOpen] = useState(action?.type === "box");
  const letters = useRandomInbox();
  // 걸어 다니는 캐릭터: 이름은 채팅 닉네임 → 방 닉네임 → 익명 순
  const walkNick = (() => { try { return localStorage.getItem("3d_pj.chatNick") || myRoom?.nickname || "익명"; } catch { return myRoom?.nickname || "익명"; } })();
  const walk = useWalkers(myAvatar, walkNick);
  const [walkTarget, setWalkTarget] = useState<[number, number] | null>(null);
  const [lettersOpen, setLettersOpen] = useState(action?.type === "letters");
  // 메뉴에서 고른 동작 실행
  useEffect(() => {
    if (!action) return;
    if (action.type === "wish") setWriting(true);
    if (action.type === "chat") setChatOpen(true);
    if (action.type === "box") setBoxOpen(true);
    if (action.type === "letters") setLettersOpen(true);
  }, [action?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    try {
      const list = await fetchWishes();
      setWishes((prev) => {
        // 방금 건 소원이 아직 목록에 안 잡혔으면 유지
        const ids = new Set(list.map((w) => w.id));
        return [...list, ...prev.filter((w) => w.id.startsWith("pending-") && !ids.has(w.id))];
      });
    } catch (e) {
      setNotice((e as Error).message);
    }
  }, []);

  // 처음 열 때 + 주기적으로 + 다시 이 탭으로 돌아올 때 다른 사람 소원 불러오기
  useEffect(() => {
    refresh();
    if (!isShared) return;
    const timer = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const hangWish = async (text: string, name: string) => {
    setWriting(false);
    const draft = newWishDraft(text, name, myAvatar ? toStr(myAvatar) : null);
    const tempId = `pending-${Date.now()}`;
    // 바로 트리에 보이게 먼저 걸고, 저장되면 실제 값으로 교체
    setWishes((prev) => [...prev, { ...draft, id: tempId, createdAt: Date.now() }]);
    try {
      const saved = await addWish(draft);
      setWishes((prev) => prev.map((w) => (w.id === tempId ? saved : w)));
    } catch (e) {
      setWishes((prev) => prev.filter((w) => w.id !== tempId));
      setNotice((e as Error).message + " 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <>
      <Canvas camera={CAMERA} dpr={[1, 2]}>
        <color attach="background" args={["#0b1733"]} />
        <fog attach="fog" args={["#0b1733", 14, 38]} />
        <Scene wishes={wishes} onTreeClick={() => setWriting(true)} onWishClick={setViewing}
          onGround={(x, z) => setWalkTarget([x, z])} />
        <MyWalker walk={walk} target={walkTarget} avatar={myAvatar} />
        <OtherWalkers others={walk.others} />
        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={isPortrait ? 20 : 16}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 2, 0]}
        />
      </Canvas>

      <div className="title">
        <h1>눈 내리는 마을</h1>
        <p>트리를 눌러 소원을 걸어 보세요<span className="sep"> · </span><br className="br-mobile" />땅을 누르면 내 캐릭터가 걸어가요</p>
        {wishes.length > 0 && (
          <p className="count">
            {isShared ? "함께 건 소원" : "지금까지 걸린 소원"} {wishes.length}개
            <button className="link-btn" onClick={() => setBoxOpen(true)}>📜 소원함 보기</button>
          </p>
        )}
      </div>

      <div className="bottom-bar">
        <button className="btn" onClick={onMyRoom}>{myRoom ? `🏠 ${myRoom.nickname}의 방` : "🏠 내 방 만들기"}</button>
        <button className="btn chat-btn" onClick={() => setLettersOpen(true)}>
          ✉️ 편지
          {letters.unseen > 0 && <span className="badge">{letters.unseen}</span>}
        </button>
        <button className="btn chat-btn" onClick={() => setChatOpen(true)}>
          💬 광장 {chat.online > 1 ? `(${chat.online}명)` : ""}
          {chat.unread > 0 && <span className="badge">{chat.unread > 99 ? "99+" : chat.unread}</span>}
        </button>
      </div>

      {chatOpen && <ChatPanel chat={chat} avatar={myAvatar ? toStr(myAvatar) : null} defaultNick={myRoom?.nickname ?? ""} onClose={() => setChatOpen(false)} />}

      {lettersOpen && <RandomLetters box={letters} myAvatar={myAvatar ? toStr(myAvatar) : null} notify={setNotice} onClose={() => setLettersOpen(false)} />}

      {boxOpen && (
        <Modal onClose={() => setBoxOpen(false)}>
          <h2>📜 소원함</h2>
          <p className="hint">트리에 걸린 소원 {wishes.length}개</p>
          {wishes.length === 0 ? <p className="hint">아직 걸린 소원이 없어요.</p> : (
            <ul className="wish-list">
              {[...wishes].reverse().map((w) => (
                <li key={w.id}>
                  <AvatarBadge value={w.avatar} size={30} />
                  <div>
                    <p>{w.text}</p>
                    <small>{w.name || "익명"} · {new Date(w.createdAt).toLocaleDateString("ko-KR")}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button className="btn wide" onClick={() => setBoxOpen(false)}>닫기</button>
        </Modal>
      )}

      {writing && <WishDialog onSubmit={hangWish} onClose={() => setWriting(false)} />}

      {viewing && (
        <div className="backdrop" onClick={() => setViewing(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <span className="dot" style={{ background: viewing.color }} />
            <p className="wish-text">{viewing.text}</p>
            <p className="wish-name">— {viewing.name || "익명"}</p>
            <p className="date">{new Date(viewing.createdAt).toLocaleDateString("ko-KR")}</p>
            <button className="btn" onClick={() => setViewing(null)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}

function CreateRoom({ onCreated, onClose }: { onCreated: (room: MyRoom) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try { onCreated(await createRoom(name.trim())); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit}>
        <h2>내 방 만들기</h2>
        <p className="hint">친구들이 놀러 와서 편지를 남길 수 있는 나만의 방이에요.</p>
        <input className="field" value={name} maxLength={12} placeholder="닉네임 (최대 12자)" autoFocus
          onChange={(e) => setName(e.target.value)} />
        {error && <p className="gate-error">{error}</p>}
        <div className="actions center">
          <button type="button" className="btn ghost" onClick={onClose}>취소</button>
          <button type="submit" className="btn" disabled={!name.trim() || busy}>{busy ? "만드는 중…" : "만들기"}</button>
        </div>
      </form>
    </Modal>
  );
}

type VillageAction = { type: "wish" | "chat" | "box" | "letters"; n: number } | null;
const SETUP_KEY = "3d_pj.setupDone";

// 오른쪽 위 ☰ 메뉴: 마을 소개와 바로가기
function Menu({ myRoom, onAction, onMyRoom, onCharacter, onClose }: {
  myRoom: MyRoom | null; onAction: (t: "wish" | "chat" | "box" | "letters") => void; onMyRoom: () => void; onCharacter: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="menu-backdrop" onClick={onClose}>
      <aside className="menu" onClick={(e) => e.stopPropagation()}>
        <button className="icon menu-close" onClick={onClose} aria-label="닫기">✕</button>
        <div className="intro-star">✦</div>
        <h2>눈 내리는 마을</h2>
        <p className="intro-lead">눈 내리는 마을에서 소원을 걸고,<br />소중한 사람과 편지를 나누고, 함께 이야기해요.</p>
        <div className="intro-cards">
          <button className="intro-card" onClick={() => onAction("wish")}>
            <span>🎄</span><strong>소원 걸기</strong><small>트리에 올해의 소원을 걸어요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("box")}>
            <span>📜</span><strong>소원함</strong><small>마을 사람들이 건 소원을 읽어요</small>
          </button>
          <button className="intro-card" onClick={onMyRoom}>
            <span>🏠</span><strong>{myRoom ? "내 방 가기" : "내 방 만들기"}</strong><small>링크를 받은 친구가 편지를 남겨요. 편지는 나만 읽어요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("letters")}>
            <span>✉️</span><strong>랜덤 편지</strong><small>모르는 누군가에게 편지를 띄우고, 답장을 받아요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("chat")}>
            <span>💬</span><strong>마을 광장</strong><small>지금 마을에 있는 사람들과 이야기해요</small>
          </button>
          <button className="intro-card" onClick={onCharacter}>
            <span>🐾</span><strong>내 캐릭터</strong><small>동물·색·장식을 바꿔요</small>
          </button>
        </div>
      </aside>
    </div>
  );
}

// 주소의 ?room=… 으로 마을/방 화면을 전환. #key=… 이 있으면 이 기기를 방 주인으로 등록
function readRoute() {
  const roomId = new URLSearchParams(location.search).get("room");
  const key = new URLSearchParams(location.hash.slice(1)).get("key");
  return { roomId, key };
}

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(() => readRoute().roomId);
  const [myRoom, setMyRoom] = useState<MyRoom | null>(() => {
    const { roomId: rid, key } = readRoute();
    if (rid && key) {
      const mine = { roomId: rid, ownerKey: key, nickname: loadMyRoom()?.nickname || "내" };
      saveMyRoom(mine);
      history.replaceState(null, "", `/?room=${rid}`); // 주소창에서 열쇠 숨기기
      return mine;
    }
    return loadMyRoom();
  });
  const [creating, setCreating] = useState(false);
  const [myAvatar, setMyAvatar] = useState<Avatar | null>(() => loadMyAvatar());
  const [editingAvatar, setEditingAvatar] = useState(false);
  const saveAvatar = async (a: Avatar) => {
    saveMyAvatar(a);
    setMyAvatar(a);
    setEditingAvatar(false);
    notify("캐릭터를 저장했어요");
    if (myRoom) setRoomAvatar(myRoom, toStr(a)).catch(() => notify("내 방 캐릭터를 바꾸지 못했어요"));
  };
  // 입장 코드 다음에 캐릭터 고르기 (방문마다 한 번)
  const [setupDone, setSetupDone] = useState<boolean>(() => { try { return !!sessionStorage.getItem(SETUP_KEY); } catch { return false; } });
  const finishSetup = (a: Avatar) => {
    try { sessionStorage.setItem(SETUP_KEY, "1"); } catch { /* 무시 */ }
    const changed = !myAvatar || toStr(a) !== toStr(myAvatar);
    saveMyAvatar(a);
    setMyAvatar(a);
    if (changed && myRoom) setRoomAvatar(myRoom, toStr(a)).catch(() => undefined);
    setSetupDone(true);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [villageAction, setVillageAction] = useState<VillageAction>(null);
  const runAction = (type: "wish" | "chat" | "box" | "letters") => {
    setMenuOpen(false);
    setVillageAction({ type, n: Date.now() });
    if (roomId) go(null);
  };
  const [justCreated, setJustCreated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const onPop = () => setRoomId(readRoute().roomId);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const go = (id: string | null) => {
    history.pushState(null, "", id ? `/?room=${id}` : "/");
    setRoomId(id);
  };
  const goMyRoom = () => { setMenuOpen(false); if (myRoom) go(myRoom.roomId); else setCreating(true); };
  const notify = useCallback((m: string) => setNotice(m), []);

  return (
    <>
      {!setupDone ? (
        <CharacterSetup initial={myAvatar} onDone={finishSetup} />
      ) : roomId ? (
        <RoomView key={roomId} roomId={roomId} myRoom={myRoom} onGoVillage={() => go(null)} onGoMyRoom={goMyRoom}
          notify={notify} myAvatar={myAvatar} onNickname={(nickname) => {
            if (myRoom?.roomId === roomId && myRoom.nickname !== nickname) {
              const updated = { ...myRoom, nickname };
              saveMyRoom(updated);
              setMyRoom(updated);
            }
          }} />
      ) : (
        <VillageView onMyRoom={goMyRoom} myRoom={myRoom} notice={notice} setNotice={setNotice} action={villageAction} myAvatar={myAvatar} />
      )}

      {setupDone && (
        <>
          <button className="me-btn" onClick={() => setEditingAvatar(true)} aria-label="내 캐릭터">
            <AvatarBadge value={myAvatar} size={40} />
          </button>
          <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="메뉴">☰</button>
        </>
      )}
      {menuOpen && (
        <Menu myRoom={myRoom} onAction={runAction} onMyRoom={goMyRoom} onClose={() => setMenuOpen(false)}
          onCharacter={() => { setMenuOpen(false); setEditingAvatar(true); }} />
      )}
      {editingAvatar && <AvatarEditor initial={myAvatar} onSave={saveAvatar} onClose={() => setEditingAvatar(false)} />}

      {notice && <div className="toast" role="status">{notice}</div>}

      {creating && (
        <CreateRoom onClose={() => setCreating(false)} onCreated={(room) => {
          if (myAvatar) setRoomAvatar(room, toStr(myAvatar)).catch(() => undefined);
          setMyRoom(room);
          setCreating(false);
          setJustCreated(true);
          go(room.roomId);
        }} />
      )}
      {justCreated && myRoom && (
        <ShareDialog first room={myRoom} onClose={() => setJustCreated(false)}
          onCopy={async (text, label) => notify((await copyText(text)) ? `${label}를 복사했어요` : "복사하지 못했어요")} />
      )}
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Scene from "./Scene";
import WishDialog from "./WishDialog";
import { Wish, addWish, fetchWishes, isShared, newWishDraft } from "./wishes";
import RoomView, { Modal, ShareDialog } from "./RoomView";
import { MyRoom, copyText, createRoom, loadMyRoom, saveMyRoom } from "./rooms";
import ChatPanel, { useVillageChat } from "./Chat";

const REFRESH_MS = 15000;

// 세로로 긴 휴대폰 화면에서는 조금 더 멀리서, 넓게 보여 줌
const isPortrait = typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8;
const CAMERA = isPortrait
  ? { position: [0, 3.5, 14] as [number, number, number], fov: 62 }
  : { position: [0, 3, 10] as [number, number, number], fov: 50 };

function VillageView({ onMyRoom, myRoom, notice, setNotice }: {
  onMyRoom: () => void;
  myRoom: MyRoom | null;
  notice: string | null;
  setNotice: (m: string | null) => void;
}) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [writing, setWriting] = useState(false);
  const [viewing, setViewing] = useState<Wish | null>(null);
  const chat = useVillageChat();
  const [chatOpen, setChatOpen] = useState(false);

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

  const hangWish = async (text: string) => {
    setWriting(false);
    const draft = newWishDraft(text);
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
        <Scene wishes={wishes} onTreeClick={() => setWriting(true)} onWishClick={setViewing} />
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
        <p>트리를 눌러 소원을 걸어 보세요<span className="sep"> · </span><br className="br-mobile" />걸린 장식을 누르면 소원이 보여요</p>
        {wishes.length > 0 && (
          <p className="count">
            {isShared ? "함께 건 소원" : "지금까지 걸린 소원"} {wishes.length}개
          </p>
        )}
      </div>

      <div className="bottom-bar">
        <button className="btn" onClick={onMyRoom}>{myRoom ? `🏠 ${myRoom.nickname}의 방` : "🏠 내 방 만들기"}</button>
        <button className="btn chat-btn" onClick={() => setChatOpen(true)}>
          💬 광장 {chat.online > 1 ? `(${chat.online}명)` : ""}
          {chat.unread > 0 && <span className="badge">{chat.unread > 99 ? "99+" : chat.unread}</span>}
        </button>
      </div>

      {chatOpen && <ChatPanel chat={chat} defaultNick={myRoom?.nickname ?? ""} onClose={() => setChatOpen(false)} />}

      {writing && <WishDialog onSubmit={hangWish} onClose={() => setWriting(false)} />}

      {viewing && (
        <div className="backdrop" onClick={() => setViewing(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <span className="dot" style={{ background: viewing.color }} />
            <p className="wish-text">{viewing.text}</p>
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
  const goMyRoom = () => (myRoom ? go(myRoom.roomId) : setCreating(true));
  const notify = useCallback((m: string) => setNotice(m), []);

  return (
    <>
      {roomId ? (
        <RoomView key={roomId} roomId={roomId} myRoom={myRoom} onGoVillage={() => go(null)} onGoMyRoom={goMyRoom}
          notify={notify} onNickname={(nickname) => {
            if (myRoom?.roomId === roomId && myRoom.nickname !== nickname) {
              const updated = { ...myRoom, nickname };
              saveMyRoom(updated);
              setMyRoom(updated);
            }
          }} />
      ) : (
        <VillageView onMyRoom={goMyRoom} myRoom={myRoom} notice={notice} setNotice={setNotice} />
      )}

      {notice && <div className="toast" role="status">{notice}</div>}

      {creating && (
        <CreateRoom onClose={() => setCreating(false)} onCreated={(room) => {
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

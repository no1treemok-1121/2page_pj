import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Scene from "./Scene";
import WishDialog from "./WishDialog";
import { Wish, addWish, fetchWishes, isShared, loadMyWishIds, newWishDraft, rememberMyWish } from "./wishes";
import RoomView, { Modal, ShareDialog } from "./RoomView";
import { MyRoom, copyText, createRoom, loadMyRoom, rpc, saveMyRoom } from "./rooms";
import ChatPanel, { useVillageChat } from "./Chat";
import { AvatarBadge, AvatarEditor, CharacterSetup } from "./Avatar";
import RandomLetters, { useRandomInbox } from "./RandomLetters";
import Fortune from "./Fortune";
import { STALLS, SnackMenu } from "./Snack";
import { CATCHES, loadDex, randomCatch } from "./Pond";
import { BENCHES, POND } from "./benches";
import { VillageEvent, currentEvent } from "./events";
import { ACTIONS, EMOTES, MyWalker, NPCS, Npcs, OtherWalkers, Snowballs, clampSpot, useWalkers } from "./Walk";
import { toStr as avatarStr } from "./avatar";
import { Snowman, Snowmen, useSnowmen } from "./Snowmen";
import { Avatar, loadMyAvatar, saveMyAvatar, toStr } from "./avatar";
import { setRoomAvatar } from "./rooms";

const REFRESH_MS = 15000;

// 세로로 긴 휴대폰 화면에서는 조금 더 멀리서, 넓게 보여 줌
const isPortrait = typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8;
const CAMERA = isPortrait
  ? { position: [0, 3.5, 14] as [number, number, number], fov: 62 }
  : { position: [0, 3, 10] as [number, number, number], fov: 50 };

function VillageView({ onMyRoom, onVisitRoom, myRoom, notice, setNotice, action, myAvatar }: {
  onVisitRoom: (roomId: string) => void;
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
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [treeMenu, setTreeMenu] = useState(false);
  const [snackOpen, setSnackOpen] = useState<string | null>(action?.type === "snack" ? "bunsik" : null);
  const [dexOpen, setDexOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  // 분식 먹기: 들고(머리 위 음식) 소리 말풍선 3번 — 감정·말풍선 실시간 전송을 그대로 사용
  // 낚시: 연못가로 걸어가서 던지고, 3초 뒤 결과
  const goFish = () => {
    const me = walk.me.current;
    const dx = me.x - POND.x, dz = me.z - POND.z, d = Math.hypot(dx, dz) || 1;
    const spot = clampSpot(POND.x + (dx / d) * (POND.r + 0.5), POND.z + (dz / d) * (POND.r * 0.8 + 0.5));
    walk.standUp();
    walk.goal.current = spot;
    const walkMs = Math.min(5000, (Math.hypot(spot[0] - me.x, spot[1] - me.z) / 2.6) * 1000 + 150);
    setTimeout(() => {
      walk.emote("🎣");
      walk.say("🎣 낚싯대를 휙~ 던졌다");
      setTimeout(() => walk.say(randomCatch()), 3200);
    }, walkMs);
  };
  // 포토존: 지금 화면을 사진으로
  const takePhoto = () => {
    const c = document.querySelector("canvas");
    try { if (c) setPhoto(c.toDataURL("image/png")); } catch { setNotice("사진을 만들지 못했어요"); }
  };
  // 마시멜로 굽기 (통나무에 앉아 있을 때)
  const roastMallow = () => {
    walk.emote("🍡");
    walk.say("🍡 마시멜로를 불에 살살~");
    const results = ["노릇노릇 완벽해! 😋", "앗, 새까맣게 탔다! 🔥😂", "말랑말랑 반쯤 익었어 ☁️", "겉바속촉 대성공! ✨"];
    setTimeout(() => walk.say(`🍡 ${results[Math.floor(Math.random() * results.length)]}`), 2600);
  };
  // 모닥불: 그 불 옆 통나무 중 하나에 앉기 (앉으면 '따뜻해~')
  const warmUp = (fire: number) => {
    const logs = BENCHES.map((b, i) => ({ b, i })).filter(({ b }) => b.kind === "log");
    const pick = logs[fire * 2 + Math.floor(Math.random() * 2)] ?? logs[0];
    walk.sitAt(pick.i);
  };
  const eatSnack = (s: { emoji: string; sounds: string[] }) => {
    setSnackOpen(null);
    walk.emote(s.emoji);
    s.sounds.forEach((t, i) => setTimeout(() => walk.say(`${s.emoji} ${t}`), 600 + i * 2200));
  };
  const [actTarget, setActTarget] = useState<string | null>(null);
  const snowmen = useSnowmen();
  walk.onSnowmanRef.current = snowmen.load;
  walk.onSmashRef.current = (id) => snowmen.smash(id, false);
  // 눈사람 부수기: 달려가서 쿵 → 와장창
  const smashSnowman = (s: Snowman) => {
    setSnowmanInfo(null);
    const me = walk.me.current;
    const dx = s.x - me.x, dz = s.z - me.z, d = Math.hypot(dx, dz) || 1;
    walk.goal.current = clampSpot(s.x - (dx / d) * 0.7, s.z - (dz / d) * 0.7);
    setTimeout(() => {
      walk.showEmote(walk.myKey, "💥");
      walk.showSay(walk.myKey, "와장창!");
      snowmen.smash(s.id, true);
      walk.announceSmash(s.id);
    }, Math.min(2000, (Math.max(0, d - 0.7) / 2.6) * 1000 + 100));
  };
  const [snowmanInfo, setSnowmanInfo] = useState<Snowman | null>(null);
  // (buildSnowmanRef는 아래에서 채움: 메뉴에서 눈사람 만들기를 눌렀을 때 사용)
  const [building, setBuilding] = useState(false);
  // 눈사람 만들기: 내 캐릭터 바로 앞에 1.5초 동안 굴려서 완성
  const buildSnowmanRef = useRef(() => {});
  const buildSnowman = () => {
    if (building) return;
    const me = walk.me.current;
    const [x, z] = clampSpot(me.x + Math.sin(me.ry) * 0.9, me.z + Math.cos(me.ry) * 0.9);
    setBuilding(true);
    walk.showSay(walk.myKey, "⛄ 눈 굴리는 중…");
    setTimeout(async () => {
      try {
        await snowmen.build(x, z, me.ry + Math.PI, walkNick);
        walk.announceSnowman();
        walk.showEmote(walk.myKey, "⛄");
        setNotice("눈사람을 만들었어요! 24시간 동안 마을에 남아요 ⛄");
      } catch (e) { setNotice((e as Error).message); }
      finally { setBuilding(false); }
    }, 1500);
  };
  buildSnowmanRef.current = buildSnowman;
  const [peopleOpen, setPeopleOpen] = useState(false);
  const othersCount = Object.keys(walk.others).length;
  // 장난칠 수 있는 대상 = 다른 사람 + NPC
  const targets: Record<string, { nick: string; avatar: string; npc?: boolean }> = { ...walk.others };
  for (const n of NPCS) targets[n.id] = { nick: n.nick, avatar: avatarStr(n.avatar), npc: true };
  // 다른 사람이 처음 보이면 한 번만 장난치기 안내
  useEffect(() => {
    if (othersCount === 0) return;
    try {
      if (sessionStorage.getItem("3d_pj.actTip")) return;
      sessionStorage.setItem("3d_pj.actTip", "1");
    } catch { /* 무시 */ }
    setNotice("👊 친구 캐릭터를 누르거나 왼쪽 👊 버튼으로 장난칠 수 있어요");
  }, [othersCount > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const [event, setEvent] = useState<VillageEvent>(() => currentEvent());
  useEffect(() => {
    const id = setInterval(() => setEvent(currentEvent()), 1000);
    return () => clearInterval(id);
  }, []);
  const [myWishIds, setMyWishIds] = useState<Set<string>>(() => loadMyWishIds());
  // 방을 나중에 만든 경우: 이 기기에서 건 소원 중 방 연결이 없는 것을 내 방에 연결
  useEffect(() => {
    if (!myRoom || wishes.length === 0) return;
    const ids = wishes.filter((w) => !w.roomId && myWishIds.has(w.id)).map((w) => w.id);
    if (ids.length === 0) return;
    rpc<number>("link_my_wishes", { p_room: myRoom.roomId, p_key: myRoom.ownerKey, p_ids: ids })
      .then(() => setWishes((prev) => prev.map((w) => (ids.includes(w.id) ? { ...w, roomId: myRoom.roomId } : w))))
      .catch(() => undefined);
  }, [myRoom?.roomId, wishes.length, myWishIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fortuneOpen, setFortuneOpen] = useState(action?.type === "fortune");
  const [lettersOpen, setLettersOpen] = useState(action?.type === "letters");
  // 메뉴에서 고른 동작 실행
  useEffect(() => {
    if (!action) return;
    if (action.type === "wish") setWriting(true);
    if (action.type === "chat") setChatOpen(true);
    if (action.type === "box") setBoxOpen(true);
    if (action.type === "letters") setLettersOpen(true);
    if (action.type === "fortune") setFortuneOpen(true);
    if (action.type === "sled") setTimeout(() => walk.rideSled("hill"), 300);
    if (action.type === "ice") setTimeout(() => walk.rideSled("ice"), 300);
    if (action.type === "snack") setSnackOpen("bunsik");
    if (action.type === "bungeo") setSnackOpen("bungeo");
    if (action.type === "cocoa") setSnackOpen("cocoa");
    if (action.type === "dex") setDexOpen(true);
    if (action.type === "photo") setTimeout(takePhoto, 400);
    if (action.type === "fish") setTimeout(goFish, 300);
    if (action.type === "fire") setTimeout(() => warmUp(0), 300);
    if (action.type === "snowman") setTimeout(() => buildSnowmanRef.current(), 300);
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
    const draft = newWishDraft(text, name, myAvatar ? toStr(myAvatar) : null, myRoom?.roomId);
    const tempId = `pending-${Date.now()}`;
    // 바로 트리에 보이게 먼저 걸고, 저장되면 실제 값으로 교체
    setWishes((prev) => [...prev, { ...draft, id: tempId, createdAt: Date.now() }]);
    try {
      const saved = await addWish(draft);
      rememberMyWish(saved.id);
      setMyWishIds(loadMyWishIds());
      setWishes((prev) => prev.map((w) => (w.id === tempId ? saved : w)));
    } catch (e) {
      setWishes((prev) => prev.filter((w) => w.id !== tempId));
      setNotice((e as Error).message + " 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <>
      <Canvas camera={CAMERA} dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={["#0b1733"]} />
        <fog attach="fog" args={["#0b1733", 20, 58]} />
        <Scene wishes={wishes} mineIds={myWishIds} onTreeClick={() => setTreeMenu(true)} onWishClick={setViewing}
          onGround={(x, z) => setWalkTarget([x, z])}
          onSled={() => walk.rideSled("hill")}
          onIce={() => walk.rideSled("ice")}
          onSnack={(id) => setSnackOpen(id)}
          onFish={goFish}
          onWarm={warmUp}
          onBench={(i) => { walk.sitAt(i); setNotice("벤치로 가서 앉아요 🪑 움직이면 일어나요"); }} />
        <MyWalker walk={walk} target={walkTarget} avatar={myAvatar} />
        <Npcs walk={walk} onSelect={setActTarget} />
        <OtherWalkers others={walk.others} emotes={walk.emotes} says={walk.says} sleds={walk.sleds} onSelect={setActTarget} />
        <Snowballs shots={walk.shots} />
        <Snowmen list={snowmen.list} smashed={snowmen.smashed} onClick={setSnowmanInfo} />
        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={isPortrait ? 30 : 26}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 2, 0]}
        />
      </Canvas>

      {event && (
        <div className="event-banner" key={event}>
          {event === "sparkle" ? "✨ 트리에 소원을 빌어요!" : event === "shooting" ? "🌠 별똥별이다! 소원을 빌어요" : "🎆 불꽃놀이가 시작됐어요!"}
        </div>
      )}

      <div className="title">
        <h1>눈 내리는 마을</h1>
        <p>트리를 눌러 소원을 쓰거나 읽어 보세요<span className="sep"> · </span><br className="br-mobile" />땅을 누르면 걸어가고, 벤치를 누르면 앉아요</p>
        {wishes.length > 0 && (
          <p className="count">
            {isShared ? "함께 건 소원" : "지금까지 걸린 소원"} {wishes.length}개
            <button className="link-btn" onClick={() => setBoxOpen(true)}>📜 소원함 보기</button>
          </p>
        )}
      </div>

      <div className="emote-wrap">
        {emoteOpen && (
          <div className="emote-picker">
            {EMOTES.map((x) => (
              <button key={x.e} title={x.label} onClick={() => { walk.emote(x.e); setEmoteOpen(false); }}>{x.e}</button>
            ))}
          </div>
        )}
        <button className="emote-btn" onClick={() => setEmoteOpen((v) => !v)} aria-label="감정 표현">😊</button>
        <button className="emote-btn" onClick={() => setFortuneOpen(true)} aria-label="오늘의 운세">🔮</button>
        <button className="emote-btn" onClick={buildSnowman} aria-label="눈사람 만들기" disabled={building}>⛄</button>
        <button className="emote-btn chat-btn" onClick={() => setPeopleOpen(true)} aria-label="장난치기">
          👊{othersCount > 0 && <span className="badge">{othersCount}</span>}
        </button>
      </div>
      {fortuneOpen && (
        <Fortune onClose={() => setFortuneOpen(false)} onPicked={walk.setFortune}
          peers={Object.values(walk.others).filter((w) => w.fortune != null).map((w) => ({ nick: w.nick, avatar: w.avatar, card: w.fortune as number }))} />
      )}
      {snowmanInfo && (
        <Modal onClose={() => setSnowmanInfo(null)}>
          <div style={{ fontSize: 46 }}>⛄</div>
          <h2>{snowmanInfo.name}의 눈사람</h2>
          <p className="hint">{new Date(snowmanInfo.created_at).toLocaleString("ko-KR")}에 만들었어요.<br />만든 지 24시간이 지나면 녹아 없어져요.</p>
          <button className="btn wide" onClick={() => smashSnowman(snowmanInfo)}>💥 부수기</button>
          <button className="btn ghost wide" onClick={() => setSnowmanInfo(null)}>닫기</button>
        </Modal>
      )}
      {peopleOpen && (
        <Modal onClose={() => setPeopleOpen(false)}>
          <h2>👊 누구에게 장난칠까요?</h2>
          {(
            <ul className="people-list">
              {Object.entries(targets).map(([k, w]) => (
                <li key={k}>
                  <button onClick={() => { setPeopleOpen(false); setActTarget(k); }}>
                    <AvatarBadge value={w.avatar} size={34} /><span>{w.npc ? "🤖 " : ""}{w.nick}</span><small>{w.npc ? "NPC · " : ""}장난치기 ›</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="hint">마을에서 친구 캐릭터를 직접 눌러도 돼요.</p>
          <button className="btn ghost wide" onClick={() => setPeopleOpen(false)}>닫기</button>
        </Modal>
      )}
      {actTarget && targets[actTarget] && (
        <Modal onClose={() => setActTarget(null)}>
          <div className="act-head"><AvatarBadge value={targets[actTarget].avatar} size={44} /><h2>{targets[actTarget].npc ? "🤖 " : ""}{targets[actTarget].nick}</h2></div>
          <p className="hint">어떤 장난을 쳐 볼까요?</p>
          <div className="act-grid">
            {ACTIONS.map((a) => (
              <button key={a.type} className="act-btn" onClick={() => { walk.act(a.type, actTarget); setActTarget(null); }}>
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {snackOpen && <SnackMenu stall={STALLS.find((s) => s.id === snackOpen) ?? STALLS[0]} onPick={eatSnack} onClose={() => setSnackOpen(null)} />}
      {dexOpen && (
        <Modal onClose={() => setDexOpen(false)}>
          <h2>📖 낚시 도감</h2>
          <p className="hint">이 기기에서 낚은 것들이에요. ({CATCHES.filter((c) => c.id !== "miss" && loadDex()[c.id]).length}/{CATCHES.length - 1})</p>
          <div className="dex-grid">
            {CATCHES.filter((c) => c.id !== "miss").map((c) => {
              const n = loadDex()[c.id] || 0;
              return <div key={c.id} className={`dex-item${n ? "" : " locked"}`}><span>{n ? c.emoji : "❔"}</span><b>{n ? c.name : "???"}</b><small>{n ? `${n}번` : "아직"}</small></div>;
            })}
          </div>
          <button className="btn wide" onClick={() => setDexOpen(false)}>닫기</button>
        </Modal>
      )}
      {photo && (
        <Modal onClose={() => setPhoto(null)}>
          <h2>📸 찰칵!</h2>
          <img src={photo} alt="눈 내리는 마을 사진" className="photo-preview" />
          <a className="btn wide" href={photo} download={`눈내리는마을-${Date.now()}.png`}>사진 저장하기</a>
          <p className="hint">휴대폰에서는 사진을 길게 눌러 저장할 수도 있어요.</p>
          <button className="btn ghost wide" onClick={() => setPhoto(null)}>닫기</button>
        </Modal>
      )}
      {walk.sitting && walk.me.current.z < -7 && (
        <button className="mallow-btn" onClick={roastMallow}>🍡 마시멜로 굽기</button>
      )}
      {treeMenu && (
        <Modal onClose={() => setTreeMenu(false)}>
          <h2>🎄 소원 트리</h2>
          <p className="hint">트리에 걸린 소원 {wishes.length}개</p>
          <button className="btn wide" onClick={() => { setTreeMenu(false); setWriting(true); }}>✏️ 소원 쓰기</button>
          <button className="btn ghost wide" onClick={() => { setTreeMenu(false); setBoxOpen(true); }}>📜 소원함 보기</button>
        </Modal>
      )}

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

      {chatOpen && <ChatPanel chat={chat} onSent={walk.say} avatar={myAvatar ? toStr(myAvatar) : null} defaultNick={myRoom?.nickname ?? ""} onClose={() => setChatOpen(false)} />}

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
                    {w.roomId && (
                      <button className="visit-btn" onClick={() => onVisitRoom(w.roomId!)}>
                        {w.roomId === myRoom?.roomId ? "🏠 내 방 가기" : "🏠 방 놀러 가기"}
                      </button>
                    )}
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
            <div className="actions center">
              {viewing.roomId && (
                <button className="btn" onClick={() => onVisitRoom(viewing.roomId!)}>
                  {viewing.roomId === myRoom?.roomId ? "🏠 내 방 가기" : "🏠 방 놀러 가기"}
                </button>
              )}
              <button className="btn ghost" onClick={() => setViewing(null)}>닫기</button>
            </div>
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

type VillageAction = { type: "wish" | "chat" | "box" | "letters" | "fortune" | "sled" | "ice" | "snowman" | "snack" | "fish" | "fire" | "bungeo" | "cocoa" | "dex" | "photo"; n: number } | null;
const SETUP_KEY = "3d_pj.setupDone";

// 오른쪽 위 ☰ 메뉴: 마을 소개와 바로가기
function Menu({ myRoom, onAction, onMyRoom, onCharacter, onClose }: {
  myRoom: MyRoom | null; onAction: (t: "wish" | "chat" | "box" | "letters" | "fortune" | "sled" | "ice" | "snowman" | "snack" | "fish" | "fire" | "bungeo" | "cocoa" | "dex" | "photo") => void; onMyRoom: () => void; onCharacter: () => void; onClose: () => void;
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
          <button className="intro-card" onClick={() => onAction("fortune")}>
            <span>🔮</span><strong>오늘의 운세</strong><small>하루 한 장, 카드를 뽑아 오늘의 운세를 봐요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("sled")}>
            <span>🛷</span><strong>썰매 타기</strong><small>언덕 꼭대기에서 광장까지 슝 미끄러져요 (오른쪽 언덕을 눌러도 돼요)</small>
          </button>
          <button className="intro-card" onClick={() => onAction("fish")}>
            <span>🎣</span><strong>연못 낚시</strong><small>트리 뒤 연못에서 낚시해요. 너구리 할배도 낚시 중이에요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("fire")}>
            <span>🔥</span><strong>모닥불 쬐기</strong><small>연못가 통나무에 앉아 몸을 녹여요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("bungeo")}>
            <span>🐟</span><strong>붕어빵 노점</strong><small>슈크림·피자·팥많이 붕어빵, 호빵, 우유</small>
          </button>
          <button className="intro-card" onClick={() => onAction("cocoa")}>
            <span>☕</span><strong>코코아 노점</strong><small>핫코코아·마시멜로 코코아·유자차·따뜻한 우유</small>
          </button>
          <button className="intro-card" onClick={() => onAction("dex")}>
            <span>📖</span><strong>낚시 도감</strong><small>연못에서 낚은 것들을 모아 봐요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("photo")}>
            <span>📸</span><strong>포토존 (사진 찍기)</strong><small>지금 화면을 사진으로 저장해요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("snack")}>
            <span>🍢</span><strong>분식집</strong><small>떡볶이·만두·어묵·순대·튀김을 먹어요 (오른쪽 뒤 가게를 눌러도 돼요)</small>
          </button>
          <button className="intro-card" onClick={() => onAction("ice")}>
            <span>⛸️</span><strong>빙판 썰매</strong><small>왼쪽 얼음 빙판을 씽씽 돌아요 (빙판을 눌러도 돼요)</small>
          </button>
          <button className="intro-card" onClick={() => onAction("snowman")}>
            <span>⛄</span><strong>눈사람 만들기</strong><small>내 앞에 눈사람을 만들어요. 24시간 동안 마을에 남아요</small>
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
  const runAction = (type: "wish" | "chat" | "box" | "letters" | "fortune" | "sled" | "ice" | "snowman" | "snack" | "fish" | "fire" | "bungeo" | "cocoa" | "dex" | "photo") => {
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
        <VillageView onMyRoom={goMyRoom} onVisitRoom={(id) => go(id)} myRoom={myRoom} notice={notice} setNotice={setNotice} action={villageAction} myAvatar={myAvatar} />
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

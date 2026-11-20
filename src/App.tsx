import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Scene from "./Scene";
import WishDialog from "./WishDialog";
import { Wish, addWish, fetchWishes, isShared, loadMyWishIds, newWishDraft, rememberMyWish } from "./wishes";
import RoomView, { Modal, ShareDialog } from "./RoomView";
import { LOGIN_RE, MyRoom, copyText, createRoom, forgetMyRoom, getRoom, getRoomLogin, loadMyRoom, loginRoom, rpc, saveMyRoom, setRoomLogin, setRoomName } from "./rooms";
import { MAX_FOOD, normDecor, setRoomDecor } from "./decor";
import { BUNGEO_SRC, IconText } from "./FoodIcon";
import Cats, { CAT_CARE, CAT_NAMES, CatReact, catPos } from "./Cats";
import { IGLOO_DOOR, IglooCamera, IglooScene, VillageIgloo, useIgloo } from "./Igloo";
import ChatPanel, { useVillageChat } from "./Chat";
import { AvatarBadge, AvatarEditor, CharacterSetup, loadNickname } from "./Avatar";
import RandomLetters, { useRandomInbox } from "./RandomLetters";
import Fortune from "./Fortune";
import { STALLS, SnackMenu } from "./Snack";
import { CATCHES, loadDex, randomCatch } from "./Pond";
import { BELL_SPOT, playChime } from "./Bell";
import { HILLS, RINK, TOUR_STATION } from "./sled";
import { TourStation } from "./Tour";
import { BENCHES, POND } from "./benches";
import { VillageEvent, currentEvent } from "./events";
import { ACTIONS, EMOTES, MyWalker, NPCS, Npcs, OtherWalkers, Snowballs, clampSpot, useWalkers, myWorldPos, myMoved } from "./Walk";
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

// 🎥 카메라가 내 캐릭터를 따라감: 보는 각도·거리는 그대로 두고 함께 평행 이동
const CAM_KEY = "3d_pj.camFollow";
const _want = new THREE.Vector3();
const _delta = new THREE.Vector3();
function CameraFollow({ follow, snapAt }: { follow: boolean; snapAt: number }) {
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useFrame(({ camera }, dt) => {
    if (!controls) return;
    const snapping = Date.now() - snapAt < 1200; // 📍 내 위치 버튼: 잠깐 동안 나에게로
    if (!snapping && !(follow && myMoved.current)) return;
    _want.set(myWorldPos.x, 1.2, myWorldPos.z);
    _delta.copy(_want).sub(controls.target).multiplyScalar(Math.min(1, dt * (snapping ? 6 : 3.5)));
    if (_delta.lengthSq() < 1e-8) return;
    controls.target.add(_delta);
    camera.position.add(_delta);
    // 트리가 나를 가리면 카메라를 바깥쪽으로 천천히 돌려서 나를 보이게 함
    const tx = controls.target.x, tz = controls.target.z;
    const ox = camera.position.x - tx, oz = camera.position.z - tz;
    const len2 = ox * ox + oz * oz;
    if (len2 > 0.01) {
      const k = Math.max(0, Math.min(1, -(tx * ox + tz * oz) / len2)); // 나→카메라 선분에서 트리(원점)에 가장 가까운 점
      if (Math.hypot(tx + ox * k, tz + oz * k) < 2.6 && Math.hypot(tx, tz) > 2.6) {
        const cur = Math.atan2(ox, oz), want = Math.atan2(tx, tz);
        let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
        const a = cur + Math.sign(d) * Math.min(Math.abs(d), dt * 1.6), r = Math.sqrt(len2);
        camera.position.x = tx + Math.sin(a) * r; camera.position.z = tz + Math.cos(a) * r;
      }
    }
    controls.update();
  });
  return null;
}

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
  // ❄️ 이글루: 안에 들어가면 화면이 이글루 안으로 바뀜 (마을 채널은 그대로)
  const [inIgloo, setInIgloo] = useState(false);
  const igloo = useIgloo(inIgloo, walk.myKey, walkNick, myAvatar ? toStr(myAvatar) : null);
  const [walkTarget, setWalkTarget] = useState<[number, number] | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [treeMenu, setTreeMenu] = useState(false);
  const [snackOpen, setSnackOpen] = useState<string | null>(null);
  const [camFollow, setCamFollow] = useState(() => { try { return localStorage.getItem(CAM_KEY) !== "off"; } catch { return true; } });
  const [snapAt, setSnapAt] = useState(0);
  // 🐾 자율 활동: 켜 두면 가만히 있을 때(10초) 내 캐릭터가 알아서 산책·감정 표현·벤치에 앉기·혼잣말·낚시
  const [autoOn, setAutoOn] = useState(() => { try { return localStorage.getItem("3d_pj.autoPlay") === "on"; } catch { return false; } });
  const toggleAuto = () => {
    const v = !autoOn; setAutoOn(v);
    try { localStorage.setItem("3d_pj.autoPlay", v ? "on" : "off"); } catch { /* 무시 */ }
    setNotice(v ? "🐾 자율 활동 ON: 가만히 두면 내 캐릭터가 알아서 놀아요" : "🐾 자율 활동을 껐어요");
  };
  const lastInput = useRef(Date.now());
  const lastAuto = useRef(0);
  const autoTick = useRef<() => void>(() => {});
  useEffect(() => {
    const touch = () => { lastInput.current = Date.now(); };
    window.addEventListener("pointerdown", touch); window.addEventListener("keydown", touch);
    const id = window.setInterval(() => autoTick.current(), 1000);
    return () => { window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); clearInterval(id); };
  }, []);
  const toggleFollow = () => {
    const v = !camFollow; setCamFollow(v);
    try { localStorage.setItem(CAM_KEY, v ? "on" : "off"); } catch { /* 무시 */ }
    if (v) { myMoved.current = true; setNotice("🎥 카메라가 내 캐릭터를 따라가요"); }
    else setNotice("🎥 카메라 따라가기를 껐어요 (📍 버튼으로 내 위치 찾기)");
  };
  // 장소 범위 규칙: 장소 기능은 그 장소에 가까이 있어야 함 → 멀면 먼저 걸어가고, 도착하면 실행
  const pending = useRef<number | null>(null);
  const goThen = (x: number, z: number, near: number, fn: () => void) => {
    walk.stopRide();
    if (pending.current) clearInterval(pending.current);
    const me = walk.me.current;
    const d = Math.hypot(me.x - x, me.z - z);
    if (d <= near + 0.6) { fn(); return; }
    walk.standUp();
    const [tx, tz] = clampSpot(x + ((me.x - x) / d) * near, z + ((me.z - z) / d) * near);
    walk.goal.current = [tx, tz];
    setNotice("걸어가는 중, 총총총 🐾");
    const until = Date.now() + 15000;
    pending.current = window.setInterval(() => {
      const m = walk.me.current;
      const arrived = Math.hypot(m.x - tx, m.z - tz) < 0.35;
      const cancelled = walk.goal.current === null && !arrived; // 다른 곳을 누르면 취소
      if (arrived || cancelled || Date.now() > until) {
        clearInterval(pending.current!); pending.current = null;
        if (arrived) fn();
      }
    }, 200);
  };
  // 하는 중인 활동(낚시·먹기·마시멜로): 타이머를 모아 두고, 땅을 누르거나 '그만하기'로 중단
  const timers = useRef<number[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((x) => x !== id);
      fn();
      if (!timers.current.length) setBusy(null);
    }, ms);
    timers.current.push(id);
  };
  const cancelBusy = () => {
    const had = timers.current.length > 0;
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setBusy(null);
    if (had) walk.say("✋ 그만할래요");
    return had;
  };
  autoTick.current = () => {
    const now = Date.now();
    if (inIgloo || !autoOn || now - lastInput.current < 10000 || now - lastAuto.current < 7000) return;
    if (walk.sledding || walk.goal.current || timers.current.length || pending.current || document.querySelector(".backdrop, .menu")) return;
    lastAuto.current = now;
    const r = Math.random();
    if (r < 0.4) { // 산책
      const a = Math.random() * Math.PI * 2, d = 3.5 + Math.random() * 7;
      walk.standUp(); walk.goal.current = clampSpot(Math.cos(a) * d, Math.sin(a) * d);
    } else if (r < 0.6) walk.emote(EMOTES[Math.floor(Math.random() * EMOTES.length)].e);
    else if (r < 0.75) { if (!walk.sitting) walk.sitAt(Math.floor(Math.random() * BENCHES.length)); else walk.emote("🎵"); }
    else if (r < 0.9) {
      const lines = ["눈이 참 예쁘다 ❄️", "흥얼흥얼~ 🎵", "오늘은 무슨 소원 빌까?", "으~ 춥다 🥶", "트리 반짝반짝 ✨", "붕어빵 먹고 싶다…", "심심한데 놀 사람~?"];
      walk.say(lines[Math.floor(Math.random() * lines.length)]);
    } else goFish();
  };
  const isNear = (x: number, z: number, near: number) => Math.hypot(walk.me.current.x - x, walk.me.current.z - z) <= near + 1;
  const stallOf = (id: string) => STALLS.find((s) => s.id === id) ?? STALLS[0];
  const openStall = (id: string) => { const st = stallOf(id).spot; goThen(st.x, st.z, 1.8, () => setSnackOpen(id)); };
  // 썰매 언덕 2개: 누른 언덕(메뉴에서는 가까운 언덕)으로 걸어가서 탐
  const rideHill = (i?: number) => {
    const me = walk.me.current;
    const k = typeof i === "number" ? i : HILLS.reduce((b, h, j) => (Math.hypot(h.park.x - me.x, h.park.z - me.z) < Math.hypot(HILLS[b].park.x - me.x, HILLS[b].park.z - me.z) ? j : b), 0);
    const h = HILLS[k];
    goThen(h.park.x, h.park.z, 1.2, () => walk.rideSled(k ? "hill2" : "hill"));
  };
  const rideTour = (kind: "dog" | "deer") => goThen(TOUR_STATION.x, TOUR_STATION.z, 1.6, () => {
    walk.rideSled(kind);
    setNotice("마을 한 바퀴 출발! 아무 곳이나 누르면 내려요 🛷");
  });
  // 🐱 고양이 돌보기: 누르면 고양이한테 걸어가서 메뉴 (간식·쓰다듬기·놀아주기), 모두에게 보임
  const [catMenu, setCatMenu] = useState<number | null>(null);
  const [catReacts, setCatReacts] = useState<Record<number, CatReact>>({});
  walk.onCatRef.current = (id, kind) => setCatReacts((r) => ({ ...r, [id]: { kind, t: Date.now() } }));
  const tapCat = (id: number) => goThen(catPos[id].x, catPos[id].z, 0.9, () => setCatMenu(id));
  const careCat = (id: number, kind: string) => {
    setCatMenu(null);
    const c = CAT_CARE.find((x) => x.kind === kind);
    if (!c) return;
    if (Math.hypot(walk.me.current.x - catPos[id].x, walk.me.current.z - catPos[id].z) > 2.2) { setNotice("고양이 가까이 가야 해요 🐾"); return; }
    setCatReacts((r) => ({ ...r, [id]: { kind, t: Date.now() } }));
    walk.announceCat(id, kind);
    walk.emote(c.icon);
    walk.say(c.say(CAT_NAMES[id]));
  };
  // 🔥 불멍: 방석에 앉아(빈자리로) 불을 바라봄, 가끔 혼잣말
  const toggleGaze = () => {
    if (igloo.mine.gaze) { igloo.setGaze(false); return; }
    if (igloo.mine.seat === null) {
      let free = 0; while (free < 10 && igloo.seatTaken(free)) free++;
      if (free >= 10 || !igloo.sit(free)) { setNotice("빈 방석이 없어요"); return; }
    }
    setTimeout(() => igloo.setGaze(true), 50);
    igloo.emote("🔥 불멍…");
  };
  useEffect(() => {
    if (!inIgloo || !igloo.mine.gaze) return;
    const lines = ["타닥타닥… 🔥", "따뜻하다…", "멍…", "불꽃 예쁘다 ✨", "마음이 편안해져요 ☺️"];
    let k = 0;
    const id = window.setInterval(() => igloo.emote(lines[k++ % lines.length]), 4500);
    return () => clearInterval(id);
  }, [inIgloo, igloo.mine.gaze]); // eslint-disable-line react-hooks/exhaustive-deps
  // 🍡 이글루 화로에 마시멜로 굽기 (안에 있는 사람들에게 보임)
  const iglooMallow = () => {
    if (igloo.mine.seat === null) { let f = 0; while (f < 10 && igloo.seatTaken(f)) f++; if (f < 10) igloo.sit(f); }
    igloo.emote("🍡 마시멜로를 불에 살살~");
    const results = ["노릇노릇 완벽해! 😋", "앗, 새까맣게 탔다! 🔥😂", "말랑말랑 반쯤 익었어 ☁️", "겉바속촉 대성공! ✨"];
    window.setTimeout(() => igloo.emote(`🍡 ${results[Math.floor(Math.random() * results.length)]}`), 2600);
  };
  const enterIgloo = () => goThen(IGLOO_DOOR.x, IGLOO_DOOR.z, 0.6, () => {
    setInIgloo(true);
    walk.say("❄️ 이글루에 들어갔어요");
  });
  const rideIce = () => goThen(RINK.x, RINK.z, RINK.r + 0.6, () => walk.rideSled("ice"));
  const [dexOpen, setDexOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  // 분식 먹기: 들고(머리 위 음식) 소리 말풍선 3번 — 감정·말풍선 실시간 전송을 그대로 사용
  // 낚시: 연못가로 걸어가서 던지고, 3초 뒤 결과
  const goFish = () => {
    const me = walk.me.current;
    const dx = me.x - POND.x, dz = me.z - POND.z, d = Math.hypot(dx, dz) || 1;
    const spot = clampSpot(POND.x + (dx / d) * (POND.r + 0.5), POND.z + (dz / d) * (POND.r * 0.8 + 0.5));
    goThen(spot[0], spot[1], 0.2, () => {
      cancelBusy();
      setBusy("🎣 낚시하는 중");
      walk.emote("🎣");
      walk.say("🎣 낚싯대를 휙~ 던졌다");
      later(2600, () => walk.say("🎣 찌가 움찔움찔… 조금만 더!"));
      later(5200, () => walk.say(randomCatch()));
    });
  };
  // 🔔 종 울리기: 종이 흔들리고 딩동댕 (모두에게)
  const [bellAt, setBellAt] = useState(0);
  walk.onBellRef.current = () => { setBellAt(Date.now()); playChime(); };
  const ringBell = () => goThen(BELL_SPOT.x, BELL_SPOT.z + 0.2, 1.0, ringBellNow);
  const ringBellNow = () => {
    if (Date.now() - bellAt < 2400) return; // 흔들리는 중에는 한 번만
    setBellAt(Date.now());
    playChime();
    walk.announceBell();
    walk.say("🔔 딩동댕~ 종을 울렸어요");
  };
  // 포토존: 지금 화면을 사진으로
  const takePhoto = () => {
    const c = document.querySelector("canvas");
    try { if (c) setPhoto(c.toDataURL("image/png")); } catch { setNotice("사진을 만들지 못했어요"); }
  };
  // 마시멜로 굽기 (통나무에 앉아 있을 때)
  const roastMallow = () => {
    cancelBusy();
    setBusy("🍡 마시멜로 굽는 중");
    walk.emote("🍡");
    walk.say("🍡 마시멜로를 불에 살살~");
    const results = ["노릇노릇 완벽해! 😋", "앗, 새까맣게 탔다! 🔥😂", "말랑말랑 반쯤 익었어 ☁️", "겉바속촉 대성공! ✨"];
    later(2600, () => walk.say(`🍡 ${results[Math.floor(Math.random() * results.length)]}`));
  };
  // 모닥불: 그 불 옆 통나무 중 하나에 앉기 (앉으면 '따뜻해~')
  const warmUp = (fire: number) => {
    const logs = BENCHES.map((b, i) => ({ b, i })).filter(({ b }) => b.kind === "log");
    const pick = logs[fire * 2 + Math.floor(Math.random() * 2)] ?? logs[0];
    walk.sitAt(pick.i);
  };
  // 🏠 내 방에 사 가기: 내 방 테이블에 음식 올려놓기 (최대 6개, 넘치면 오래된 것부터 치움)
  const takeoutSnack = async (s: { id: string; emoji: string; name: string }) => {
    const st = stallOf(snackOpen ?? "bunsik").spot;
    setSnackOpen(null);
    if (!myRoom) return;
    if (!isNear(st.x, st.z, 1.8)) { setNotice("가게 가까이 가야 살 수 있어요 🏪"); return; }
    try {
      const d = normDecor((await getRoom(myRoom.roomId))?.decor);
      d.table = true;
      d.food = [...d.food, s.id].slice(-MAX_FOOD);
      await setRoomDecor(myRoom, d);
      walk.say(`🛍️ ${s.emoji} ${s.name} 포장해 갈게요!`);
      setNotice(`🏠 내 방 테이블에 ${s.emoji} ${s.name}을(를) 놓았어요`);
    } catch (e) { setNotice((e as Error).message); }
  };
  // 🎈 풍선 사기
  const buyBalloon = (s: { id: string }) => {
    const st = stallOf("balloon").spot;
    setSnackOpen(null);
    if (!isNear(st.x, st.z, 1.8)) { setNotice("가게 가까이 가야 살 수 있어요 🏪"); return; }
    const shapes = ["star", "heart", "moon"] as const;
    const shape = s.id === "b_star" ? "star" : s.id === "b_heart" ? "heart" : s.id === "b_moon" ? "moon" : shapes[Math.floor(Math.random() * 3)];
    const b = walk.buyBalloon(shape);
    walk.say(b.rare ? "🌈 레어 무지개 풍선이다!!" : `🎈 ${shape === "star" ? "별" : shape === "heart" ? "하트" : "달"} 풍선 샀다!`);
    setNotice(b.rare ? "🌈 와! 무지개빛 레어 풍선이에요! (1분 뒤 하늘로 날아가요)" : "🎈 풍선이 1분 동안 머리 위에 떠 있다가 하늘로 날아가요");
  };
  const eatSnack = (s: { emoji: string; sounds: string[] }) => {
    const st = stallOf(snackOpen ?? "bunsik").spot;
    setSnackOpen(null);
    if (!isNear(st.x, st.z, 1.8)) { setNotice("가게 가까이 가야 주문할 수 있어요 🏪"); return; }
    cancelBusy();
    setBusy(`${s.emoji} 먹는 중`);
    walk.emote(s.emoji);
    s.sounds.forEach((t, i) => later(600 + i * 2200, () => walk.say(`${s.emoji} ${t}`)));
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
    if (action.type === "sled") setTimeout(() => rideHill(), 300);
    if (action.type === "ice") setTimeout(rideIce, 300);
    if (action.type === "snack") setTimeout(() => openStall("bunsik"), 300);
    if (action.type === "bungeo") setTimeout(() => openStall("bungeo"), 300);
    if (action.type === "cocoa") setTimeout(() => openStall("cocoa"), 300);
    if (action.type === "balloon") setTimeout(() => openStall("balloon"), 300);
    if (action.type === "dex") setDexOpen(true);
    if (action.type === "photo") setTimeout(takePhoto, 400);
    if (action.type === "bell") setTimeout(ringBell, 300);
    if (action.type === "igloo") setTimeout(enterIgloo, 300);
    if (action.type === "dog" || action.type === "deer") { const k = action.type; setTimeout(() => rideTour(k), 300); }
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
      {inIgloo ? (
        <Canvas camera={{ position: [0, isPortrait ? 5.2 : 4.2, isPortrait ? 7.2 : 6.2], fov: isPortrait ? 62 : 52 }} dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
          <IglooScene people={igloo.people} myKey={walk.myKey} emotes={igloo.emotes} wishCount={wishes.length} onBoard={() => setTreeMenu(true)}
            onSeat={(i) => { if (!igloo.sit(i)) setNotice("다른 사람이 앉아 있는 자리예요 🙂"); }}
            onFloor={(x, z) => igloo.walkTo(x, z)} />
          <IglooCamera portrait={isPortrait} gaze={igloo.mine.gaze} seat={igloo.mine.seat} />
          <OrbitControls makeDefault enablePan={false} target={[0, 1, -0.6]} minDistance={3} maxDistance={isPortrait ? 9.5 : 8} maxPolarAngle={Math.PI / 2.1} />
        </Canvas>
      ) : (
      <Canvas camera={CAMERA} dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <color attach="background" args={["#0b1733"]} />
        <fog attach="fog" args={["#0b1733", 20, 58]} />
        <Scene wishes={wishes} mineIds={myWishIds} onTreeClick={() => setTreeMenu(true)} onWishClick={setViewing}
          onGround={(x, z) => { if (walk.stopRide()) { setNotice("🛷 썰매에서 내렸어요"); return; } cancelBusy(); setWalkTarget([x, z]); }}
          onSled={rideHill}
          onIce={rideIce}
          onSnack={openStall}
          onFish={goFish}
          onBell={ringBell}
          bellAt={bellAt}
          onWarm={warmUp}
          onBench={(i) => { walk.stopRide(); walk.sitAt(i); setNotice("벤치로 가서 앉아요 🪑 움직이면 일어나요"); }} />
        <TourStation onRide={rideTour} />
        <VillageIgloo count={igloo.count} onEnter={enterIgloo} />
        <Cats me={() => walk.me.current} onTap={tapCat} reacts={catReacts} />
        <MyWalker walk={walk} target={walkTarget} avatar={myAvatar} />
        <Npcs walk={walk} onSelect={setActTarget} />
        <OtherWalkers others={walk.others} emotes={walk.emotes} says={walk.says} sleds={walk.sleds} balloons={walk.balloons} onSelect={setActTarget} />
        <Snowballs shots={walk.shots} />
        <Snowmen list={snowmen.list} smashed={snowmen.smashed} onClick={setSnowmanInfo} />
        <CameraFollow follow={camFollow} snapAt={snapAt} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={6}
          maxDistance={isPortrait ? 30 : 26}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 2, 0]}
        />
      </Canvas>
      )}

      {!inIgloo && <>
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

      {walk.sledding ? (
        <button className="btn ride-off" onClick={() => { if (walk.stopRide()) setNotice("🛷 썰매에서 내렸어요"); }}>🛷 여기서 내리기</button>
      ) : busy && (
        <button className="btn ride-off busy-off" onClick={cancelBusy}><IconText text={busy} /> · ✋ 그만하기</button>
      )}
      <div className="cam-wrap">
        <button className={camFollow ? "cam-btn on" : "cam-btn"} onClick={toggleFollow} aria-label="카메라 따라가기" aria-pressed={camFollow}>🎥<small>{camFollow ? "ON" : "OFF"}</small></button>
        <button className="cam-btn" onClick={() => setSnapAt(Date.now())} aria-label="내 위치">📍<small>나</small></button>
        <button className={autoOn ? "cam-btn on" : "cam-btn"} onClick={toggleAuto} aria-label="자율 활동" aria-pressed={autoOn}>🐾<small>{autoOn ? "ON" : "OFF"}</small></button>
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
      </>}
      {inIgloo && <>
        <div className="title igloo-title">
          <h1>❄️ 이글루</h1>
          <p>지금 {igloo.people.length}명 · 방석을 누르면 앉고, 바닥을 누르면 걸어가요 · 📖 방명록에 소원을 남겨요</p>
        </div>
        <div className="igloo-bar">
          <div className="igloo-emotes">
            {EMOTES.map((x) => <button key={x.e} title={x.label} onClick={() => igloo.emote(x.e)}>{x.e}</button>)}
          </div>
          <div className="igloo-actions">
            <button className={igloo.mine.gaze ? "btn gaze-on" : "btn"} onClick={toggleGaze}>{igloo.mine.gaze ? "🔥 불멍 그만하기" : "🔥 불멍하기"}</button>
            <button className="btn" onClick={iglooMallow}>🍡 마시멜로</button>
            <button className="btn ghost light" onClick={() => setInIgloo(false)}>← 마을로 나가기</button>
            <button className="btn" onClick={() => setWriting(true)}>✏️ 소원 쓰기</button>
            <button className="btn" onClick={() => setBoxOpen(true)}>📜 방명록</button>
          </div>
        </div>
      </>}
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
      {catMenu !== null && (
        <Modal onClose={() => setCatMenu(null)}>
          <div className="cat-menu">
            <h2>🐱 {CAT_NAMES[catMenu]}</h2>
            <p className="hint">{catMenu === 0 ? "삼색 아가씨 밤이에요. 뭘 해 줄까요?" : "고등어 태비 캔디예요. 뭘 해 줄까요?"}</p>
            <div className="snack-grid">
              {CAT_CARE.map((c) => <button key={c.kind} className="act-btn" onClick={() => careCat(catMenu, c.kind)}><span>{c.icon}</span>{c.label}</button>)}
            </div>
            <button className="btn ghost wide" onClick={() => setCatMenu(null)}>닫기</button>
          </div>
        </Modal>
      )}
      {snackOpen && <SnackMenu stall={STALLS.find((s) => s.id === snackOpen) ?? STALLS[0]} onPick={snackOpen === "balloon" ? buyBalloon : eatSnack} onClose={() => setSnackOpen(null)}
        onTakeout={myRoom && snackOpen !== "balloon" ? takeoutSnack : undefined} />}
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

function CreateRoom({ onCreated, onClose, onFind }: { onCreated: (room: MyRoom) => void; onClose: () => void; onFind: () => void }) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const made = useRef<MyRoom | null>(null); // 아이디가 겹쳐서 다시 시도할 때 방을 또 만들지 않게
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    if (!LOGIN_RE.test(id.trim())) { setError("아이디는 한글·영어·숫자로 3~16자로 해 주세요. (띄어쓰기·기호 안 돼요)"); return; }
    if (pw.length < 4) { setError("비밀번호는 4자 이상으로 해 주세요."); return; }
    setBusy(true);
    setError("");
    try {
      made.current = made.current ?? (await createRoom(name.trim()));
      await setRoomLogin(made.current, id, pw);
      onCreated(made.current);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit}>
        <h2>내 방</h2>
        <button type="button" className="btn wide find-first" onClick={onFind}>🔑 이미 내 방이 있어요 → 내 방 찾기</button>
        <p className="hint small">예전에 만든 방은 아이디·비밀번호로 다시 찾을 수 있어요.</p>
        <div className="or-line"><span>처음이라면 새로 만들기</span></div>
        <p className="hint">친구들이 놀러 와서 편지를 남길 수 있는 나만의 방이에요.</p>
        <p className="pick-label">방 이름에 쓸 닉네임</p>
        <input className="field" value={name} maxLength={12} placeholder="닉네임 (최대 12자)" autoFocus
          onChange={(e) => setName(e.target.value)} />
        <p className="pick-label">🔑 내 방 열쇠 (아이디·비밀번호)</p>
        <p className="hint small">다른 휴대폰·컴퓨터에서 <b>☰ 메뉴 → 🔑 내 방 찾기</b>로 내 방에 다시 들어올 때 써요. 꼭 기억해 두세요!</p>
        <input className="field" value={id} maxLength={16} placeholder="아이디 (한글·영어·숫자 3~16자)" onChange={(e) => setId(e.target.value)} autoComplete="username" />
        <input className="field" type="password" value={pw} maxLength={30} placeholder="비밀번호 (4자 이상)" onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        {error && <p className="gate-error">{error}</p>}
        <div className="actions center">
          <button type="button" className="btn ghost" onClick={onClose}>취소</button>
          <button type="submit" className="btn" disabled={!name.trim() || busy}>{busy ? "만드는 중…" : "🏠 새로 만들기"}</button>
        </div>
      </form>
    </Modal>
  );
}

// 같은 기기를 여러 사람이 쓸 때: "이 기기에 저장된 ○○의 방, 내 방이 맞나요?"
function OwnerAsk({ room, nick, onKeep, onLeave, onRename }: { room: MyRoom; nick: string; onKeep: () => void; onLeave: () => void; onRename: () => void }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  useEffect(() => { getRoomLogin(room).then((l) => setHasKey(!!l)).catch(() => setHasKey(false)); }, [room]);
  return (
    <Modal onClose={onKeep}>
      <div className="owner-ask">
        <h2>🏠 '{room.nickname}의 방'이 이 기기에 있어요</h2>
        <p className="hint">지금 닉네임은 <b>{nick}</b>이에요. {room.nickname} 님의 방이 맞나요?</p>
        <button className="btn wide" onClick={onRename}>네, 제 방이에요 → '{nick.slice(0, 12)}의 방'으로 이름 바꾸기</button>
        <button className="btn ghost wide" onClick={onKeep}>네, 이름은 '{room.nickname}의 방' 그대로 둘게요</button>
        <button className="btn ghost wide" disabled={hasKey === false} onClick={onLeave}>아니요, 다른 사람이에요 (이 기기에서 내려놓기)</button>
        {hasKey === false && (
          <p className="hint warn small">이 방은 아직 <b>🔑 열쇠(아이디·비밀번호)</b>가 없어서 내려놓으면 다시 찾을 수 없어요. {room.nickname} 님이 먼저 내 방의 🔑 열쇠 버튼으로 열쇠를 만들어 주세요.</p>
        )}
        {hasKey && <p className="hint small">내려놓아도 방은 그대로예요. {room.nickname} 님은 ☰ 메뉴 → 🔑 내 방 찾기로 언제든 다시 들어올 수 있어요.</p>}
      </div>
    </Modal>
  );
}

// 🔑 내 방 찾기: 아이디·비밀번호로 이 기기를 내 방 주인으로 등록
function FindRoom({ onFound, onClose }: { onFound: (room: MyRoom) => void; onClose: () => void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !pw || busy) return;
    setBusy(true); setError("");
    try { onFound(await loginRoom(id, pw)); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="find-room">
        <h2>🔑 내 방 찾기</h2>
        <p className="hint">방을 만들 때 정한 <b>아이디</b>와 <b>비밀번호</b>를 넣으면, 이 기기에서도 내 방에 들어갈 수 있어요.</p>
        <input className="field" value={id} maxLength={16} placeholder="아이디" autoFocus onChange={(e) => setId(e.target.value)} autoComplete="username" />
        <input className="field" type="password" value={pw} maxLength={30} placeholder="비밀번호" onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        {error && <p className="gate-error">{error}</p>}
        <div className="actions center">
          <button type="button" className="btn ghost" onClick={onClose}>취소</button>
          <button type="submit" className="btn" disabled={!id.trim() || !pw || busy}>{busy ? "찾는 중…" : "내 방 들어가기"}</button>
        </div>
        <p className="hint small">열쇠를 아직 안 만들었다면, 처음 방을 만든 기기에서 내 방의 <b>🔑 열쇠</b> 버튼으로 만들 수 있어요.</p>
      </form>
    </Modal>
  );
}

type VillageAction = { type: "wish" | "chat" | "box" | "letters" | "fortune" | "sled" | "ice" | "snowman" | "snack" | "fish" | "fire" | "bungeo" | "cocoa" | "dex" | "photo" | "bell" | "dog" | "deer" | "igloo" | "balloon"; n: number } | null;
const SETUP_KEY = "3d_pj.setupDone";

// 오른쪽 위 ☰ 메뉴: 마을 소개와 바로가기
function Menu({ myRoom, onAction, onMyRoom, onCharacter, onClose, onFindRoom }: {
  onFindRoom: () => void;
  myRoom: MyRoom | null; onAction: (t: "wish" | "chat" | "box" | "letters" | "fortune" | "sled" | "ice" | "snowman" | "snack" | "fish" | "fire" | "bungeo" | "cocoa" | "dex" | "photo" | "bell" | "dog" | "deer" | "igloo" | "balloon") => void; onMyRoom: () => void; onCharacter: () => void; onClose: () => void;
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
          <button className="intro-card" onClick={onFindRoom}>
            <span>🔑</span><strong>내 방 찾기</strong><small>다른 휴대폰·컴퓨터에서 아이디·비밀번호로 내 방에 들어가요</small>
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
            <span><img className="food-ico big" src={BUNGEO_SRC} alt="" /></span><strong>붕어빵 노점</strong><small>슈크림·피자·팥많이 붕어빵, 호빵, 우유</small>
          </button>
          <button className="intro-card" onClick={() => onAction("cocoa")}>
            <span>☕</span><strong>코코아 노점</strong><small>핫코코아·마시멜로 코코아·유자차·따뜻한 우유</small>
          </button>
          <button className="intro-card" onClick={() => onAction("dex")}>
            <span>📖</span><strong>낚시 도감</strong><small>연못에서 낚은 것들을 모아 봐요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("balloon")}>
            <span>🎈</span><strong>풍선 가게</strong><small>별·하트·달 풍선을 머리 위에 동동! 가끔 무지개 레어 풍선</small>
          </button>
          <button className="intro-card" onClick={() => onAction("igloo")}>
            <span>❄️</span><strong>이글루</strong><small>누구나 들어가는 반짝반짝 이글루! 둘러앉아 소원 방명록을 써요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("dog")}>
            <span>🐕</span><strong>개썰매 한 바퀴</strong><small>산타 모자 쓴 리트리버·허스키가 마을을 크게 한 바퀴! 아무 곳이나 누르면 내려요</small>
          </button>
          <button className="intro-card" onClick={() => onAction("deer")}>
            <span>🦌</span><strong>사슴썰매 한 바퀴</strong><small>산타 모자 쓴 숫사슴이 딸랑딸랑 마을 한 바퀴</small>
          </button>
          <button className="intro-card" onClick={() => onAction("bell")}>
            <span>🔔</span><strong>종 울리기</strong><small>트리 앞 금빛 종을 딩동댕~ 마을 모두에게 들려요</small>
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
  const [finding, setFinding] = useState(false);
  const [myAvatar, setMyAvatar] = useState<Avatar | null>(() => loadMyAvatar());
  const [editingAvatar, setEditingAvatar] = useState(false);
  const saveAvatar = async (a: Avatar, newNick?: string) => {
    saveMyAvatar(a);
    setMyAvatar(a);
    setEditingAvatar(false);
    notify("캐릭터를 저장했어요");
    if (myRoom) setRoomAvatar(myRoom, toStr(a)).catch(() => notify("내 방 캐릭터를 바꾸지 못했어요"));
    // 닉네임을 바꾸면 내 방 이름도 같이 (방 이름 = 주인 닉네임)
    if (myRoom && newNick && newNick !== myRoom.nickname) renameRoom(newNick.slice(0, 12));
  };
  const [roomVer, setRoomVer] = useState(0); // 방 이름이 바뀌면 방 화면을 다시 불러옴
  const renameRoom = async (name: string, room = myRoom) => {
    if (!room) return;
    try {
      const updated = await setRoomName(room, name);
      setMyRoom(updated);
      setRoomVer((v) => v + 1);
      try { localStorage.setItem("3d_pj.ownerNickOk", ""); } catch { /* 무시 */ }
      notify(`✏️ 방 이름을 '${updated.nickname}의 방'으로 바꿨어요`);
    } catch (e) { notify((e as Error).message); }
  };
  // 입장 코드 다음에 캐릭터 고르기 (방문마다 한 번)
  const [setupDone, setSetupDone] = useState<boolean>(() => { try { return !!sessionStorage.getItem(SETUP_KEY); } catch { return false; } });
  const finishSetup = (a: Avatar) => {
    try { sessionStorage.setItem(SETUP_KEY, "1"); } catch { /* 무시 */ }
    const changed = !myAvatar || toStr(a) !== toStr(myAvatar);
    saveMyAvatar(a);
    setMyAvatar(a);
    // 이 기기에 저장된 방의 주인 이름과 지금 닉네임이 다르면: 같은 사람인지 물어봄 (방 캐릭터도 그때까지 안 바꿈)
    const nick = loadNickname();
    let okNick = "";
    try { okNick = localStorage.getItem("3d_pj.ownerNickOk") || ""; } catch { /* 무시 */ }
    if (myRoom && nick && nick !== myRoom.nickname && nick !== okNick) setAskOwner(myRoom);
    else if (changed && myRoom) setRoomAvatar(myRoom, toStr(a)).catch(() => undefined);
    setSetupDone(true);
  };
  const [askOwner, setAskOwner] = useState<MyRoom | null>(null);
  const leaveMyRoom = () => {
    forgetMyRoom();
    setMyRoom(null);
    setAskOwner(null);
    notify("🚪 이 기기에서 그 방을 내려놓았어요. 내 방을 새로 만들거나 🔑 내 방 찾기로 들어가세요");
    if (roomId) go(null);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [villageAction, setVillageAction] = useState<VillageAction>(null);
  const runAction = (type: "wish" | "chat" | "box" | "letters" | "fortune" | "sled" | "ice" | "snowman" | "snack" | "fish" | "fire" | "bungeo" | "cocoa" | "dex" | "photo" | "bell" | "dog" | "deer" | "igloo" | "balloon") => {
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
        <RoomView key={`${roomId}:${roomVer}`} roomId={roomId} myRoom={myRoom} onLeaveRoom={leaveMyRoom}
          onRoomGone={(create) => { forgetMyRoom(); setMyRoom(null); go(null); if (create) setCreating(true); }} onGoVillage={() => go(null)} onGoMyRoom={goMyRoom}
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
        <Menu myRoom={myRoom} onAction={runAction} onMyRoom={goMyRoom} onFindRoom={() => { setMenuOpen(false); setFinding(true); }} onClose={() => setMenuOpen(false)}
          onCharacter={() => { setMenuOpen(false); setEditingAvatar(true); }} />
      )}
      {editingAvatar && <AvatarEditor initial={myAvatar} onSave={saveAvatar} onClose={() => setEditingAvatar(false)} />}

      {notice && <div className="toast" role="status"><IconText text={notice} /></div>}

      {creating && (
        <CreateRoom onClose={() => setCreating(false)} onFind={() => { setCreating(false); setFinding(true); }} onCreated={(room) => {
          if (myAvatar) setRoomAvatar(room, toStr(myAvatar)).catch(() => undefined);
          setMyRoom(room);
          setCreating(false);
          setJustCreated(true);
          go(room.roomId);
        }} />
      )}
      {askOwner && (
        <OwnerAsk room={askOwner} nick={loadNickname()} onLeave={leaveMyRoom}
          onRename={() => {
            if (myAvatar) setRoomAvatar(askOwner, toStr(myAvatar)).catch(() => undefined);
            renameRoom(loadNickname().slice(0, 12), askOwner);
            setAskOwner(null);
          }}
          onKeep={() => {
          try { localStorage.setItem("3d_pj.ownerNickOk", loadNickname()); } catch { /* 무시 */ } // 이 닉네임으로는 다시 묻지 않음
          if (myAvatar) setRoomAvatar(askOwner, toStr(myAvatar)).catch(() => undefined);
          setAskOwner(null);
        }} />
      )}
      {finding && (
        <FindRoom onClose={() => setFinding(false)} onFound={(room) => {
          setMyRoom(room);
          setFinding(false);
          notify("🔑 내 방을 찾았어요! 이 기기에서도 이제 내 방이에요");
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

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Character3D from "./Character3D";
import { Avatar, DEFAULT_AVATAR, parseAvatar, toStr } from "./avatar";
import { supabase } from "./supabase";
import { BENCHES, LOG_Y, POND, SIT_Y } from "./benches";
import { RideKind, rideAt, rideEnd, rideMs, rideSay } from "./sled";
import { SledMesh } from "./Village";
import { CARDS, loadToday } from "./Fortune";

// 마을을 걸어 다니는 캐릭터 + 다른 사람 캐릭터 실시간 표시 (Supabase Realtime presence)
export type Walker = { avatar: string; nick: string; x: number; z: number; ry: number; fortune?: number | null; sit?: boolean };
export type Emote = { e: string; t: number };
export type Act = { type: "bump" | "snow" | "hug"; from: string; to: string; dir: [number, number] };
type Shot = { id: number; from: [number, number]; to: [number, number]; t: number };
const SHOT_MS = 600;
export const ACTIONS = [
  { type: "bump" as const, icon: "💥", label: "들이받기" },
  { type: "snow" as const, icon: "❄️", label: "눈덩이 던지기" },
  { type: "hug" as const, icon: "🤗", label: "안아주기" },
];

// 감정 표현 8가지 (머리 위에 3초 동안 떠오름)
export const EMOTES = [
  { e: "👋", label: "인사" }, { e: "❤️", label: "하트" }, { e: "😆", label: "웃음" }, { e: "😢", label: "슬픔" },
  { e: "🎉", label: "축하" }, { e: "👍", label: "최고" }, { e: "😮", label: "놀람" }, { e: "🎵", label: "노래" },
];
const EMOTE_MS = 3000;

const SPEED = 2.6;
const MAX_R = 13; // 마을이 넓어짐: 집(반경 15~17) 앞까지 걸어갈 수 있음
const TREE_R = 2.5; // 트리 안으로 못 들어가게

export function clampSpot(x: number, z: number): [number, number] {
  let r = Math.hypot(x, z);
  if (r < 0.001) { x = 0; z = TREE_R; r = TREE_R; }
  const nr = Math.min(MAX_R, Math.max(TREE_R, r));
  return [(x / r) * nr, (z / r) * nr];
}

// ---------------- NPC (다람이·루루·햄찌) ----------------
// 시계를 기준으로 위치·행동을 계산 → 접속한 모든 사람에게 같은 모습. NPC는 사람에게 장난치지 않음.
export const NPCS = [
  { id: "npc:0", nick: "다람이", avatar: { animal: "squirrel", color: "#c47a3d", acc: "none" } },
  { id: "npc:1", nick: "루루", avatar: { animal: "deer", color: "#b98a5e", acc: "scarf" } },
  { id: "npc:2", nick: "햄찌", avatar: { animal: "hamster", color: "#f2c48d", acc: "ribbon" } },
  // 연못가에서 계속 낚시하는 너구리 할배 (돌아다니지 않음)
  { id: "npc:3", nick: "너구리 할배", avatar: { animal: "raccoon", color: "#8d8d95", acc: "santa" }, fisher: true },
];
const FISHER = { x: POND.x + 0.6, z: POND.z + POND.r * 0.8 + 0.5 }; // 연못 앞쪽 가장자리
const NPC_STEP = 7000; // 7초마다 새 자리로 (4.5초 걷고 쉼)
const hash = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
function npcSpot(i: number, slot: number): [number, number] {
  const ang = hash(i, slot) * Math.PI * 2, r = 3.4 + hash(i + 7, slot) * 6;
  return [Math.cos(ang) * r, Math.sin(ang) * r];
}
const npcKnock: { current: Record<string, { t: number; dir: [number, number] }> } = { current: {} };
export function npcPos(id: string, now = Date.now()) {
  const i = Number(id.split(":")[1]);
  if (i === 3) { // 낚시꾼: 제자리에서 연못을 바라봄 (들이받기 맞으면 잠깐 밀렸다 돌아옴)
    const kn = npcKnock.current[id]; let x = FISHER.x, z = FISHER.z, spin = false;
    if (kn) { const age = (now - kn.t) / 1000; const amt = age < 0.6 ? 2 * (age / 0.6) : Math.max(0, 2 * (1 - (age - 0.6) / 3)); x += kn.dir[0] * amt; z += kn.dir[1] * amt; spin = age < 0.9; }
    return { x, z, ry: Math.atan2(POND.x - FISHER.x, POND.z - FISHER.z), walking: false, spin };
  }
  const t = now + i * 2300; // NPC마다 엇갈려 움직이게
  const slot = Math.floor(t / NPC_STEP), phase = (t % NPC_STEP) / 4500;
  const [ax, az] = npcSpot(i, slot - 1), [bx, bz] = npcSpot(i, slot);
  const k = Math.min(1, phase), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  let x = ax + (bx - ax) * e, z = az + (bz - az) * e;
  // 들이받기 맞으면 0.6초 동안 날아갔다가 3초에 걸쳐 제자리로 돌아옴
  const kn = npcKnock.current[id];
  let spin = false;
  if (kn) {
    const age = (now - kn.t) / 1000;
    const amt = age < 0.6 ? 2.4 * (age / 0.6) : Math.max(0, 2.4 * (1 - (age - 0.6) / 3));
    x += kn.dir[0] * amt; z += kn.dir[1] * amt; spin = age < 0.9;
  }
  [x, z] = clampSpot(x, z);
  return { x, z, ry: Math.atan2(bx - ax, bz - az), walking: k < 1, spin };
}

export function useWalkers(myAvatar: Avatar | null, nick: string) {
  // presence: 누가 있는지(캐릭터·이름·처음 위치)만. 걷는 위치는 broadcast로 자주 보냄 (presence를 자주 바꾸면 끊김)
  const [people, setPeople] = useState<Record<string, Walker>>({});
  const [emotes, setEmotes] = useState<Record<string, Emote>>({});
  const [myEmote, setMyEmote] = useState<Emote | null>(null);
  // 채팅 말풍선: 광장 채팅을 보내면 머리 위에 잠깐 표시
  const [says, setSays] = useState<Record<string, Emote>>({});
  const [mySay, setMySay] = useState<Emote | null>(null);
  // 친구에게 하는 액션 (들이받기·눈덩이·안아주기)
  const goal = useRef<[number, number] | null>(null);
  const benchTo = useRef<number | null>(null); // 이 벤치로 걸어가서 앉을 예정
  const [sitting, setSitting] = useState(false);
  // 썰매: 탄 시각 (나 / 다른 사람)
  const mySled = useRef<number | null>(null);
  const mySledKind = useRef<RideKind>("hill");
  const onSnowmanRef = useRef<(() => void) | null>(null); // 다른 사람이 눈사람을 만들면 다시 불러오기
  const [sledding, setSledding] = useState(false);
  const [sleds, setSleds] = useState<Record<string, { t: number; kind: RideKind }>>({});
  const knock = useRef(0); // 이 시각까지 튕겨 나가는 중 (빠르게 + 빙글빙글)
  const [shots, setShots] = useState<Shot[]>([]);
  const othersRef = useRef<Record<string, Walker>>({});
  const [pos, setPos] = useState<Record<string, { x: number; z: number; ry: number; sit?: boolean }>>({});
  const chRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const keyRef = useRef(crypto.randomUUID());
  const meRef = useRef<Walker>({ avatar: toStr(myAvatar ?? DEFAULT_AVATAR), nick, x: (Math.random() - 0.5) * 6, z: 4.5, ry: 0, fortune: loadToday() }); // 처음엔 화면 쪽을 바라봄, 오늘 뽑은 운세 카드도 함께 알림
  const lastSent = useRef(0);
  const pending = useRef<number | null>(null);

  const sendPos = () => {
    lastSent.current = Date.now(); pending.current = null;
    const { x, z, ry, sit } = meRef.current;
    chRef.current?.send({ type: "broadcast", event: "pos", payload: { key: keyRef.current, x, z, ry, sit: !!sit } });
  };

  useEffect(() => {
    if (!supabase) return;
    const key = keyRef.current;
    const ch = supabase.channel("village-walk", { config: { presence: { key }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Walker>();
      const next: Record<string, Walker> = {};
      for (const [k, metas] of Object.entries(state)) if (k !== key && metas[0]) next[k] = metas[metas.length - 1];
      setPeople(next);
    })
      .on("presence", { event: "join" }, ({ key: k }) => { if (k !== key) sendPos(); }) // 새로 온 사람에게 내 위치 알려 주기
      .on("broadcast", { event: "act" }, ({ payload }) => handleActRef.current(payload as Act))
      .on("broadcast", { event: "snowman" }, () => onSnowmanRef.current?.())
      .on("broadcast", { event: "smash" }, ({ payload }) => onSmashRef.current?.((payload as { id: string }).id))
      .on("broadcast", { event: "sled" }, ({ payload }) => {
        const p = payload as { key: string; kind?: RideKind };
        const kind = p.kind === "ice" ? "ice" : "hill";
        setSleds((prev) => ({ ...prev, [p.key]: { t: Date.now(), kind } }));
        setSays((prev) => ({ ...prev, [p.key]: { e: rideSay(kind), t: Date.now() } }));
      })
      .on("broadcast", { event: "say" }, ({ payload }) => {
        const p = payload as { key: string; text: string };
        setSays((prev) => ({ ...prev, [p.key]: { e: p.text, t: Date.now() } }));
      })
      .on("broadcast", { event: "emote" }, ({ payload }) => {
        const p = payload as { key: string; e: string };
        setEmotes((prev) => ({ ...prev, [p.key]: { e: p.e, t: Date.now() } }));
      })
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const p = payload as { key: string; x: number; z: number; ry: number; sit?: boolean };
        setPos((prev) => ({ ...prev, [p.key]: { x: p.x, z: p.z, ry: p.ry, sit: p.sit } }));
      })
      .subscribe((status) => { if (status === "SUBSCRIBED") ch.track(meRef.current); });
    chRef.current = ch;
    return () => { if (pending.current) clearTimeout(pending.current); supabase?.removeChannel(ch); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    meRef.current = { ...meRef.current, avatar: toStr(myAvatar ?? DEFAULT_AVATAR), nick };
    chRef.current?.track(meRef.current);
  }, [myAvatar, nick]);

  // 내 위치 알리기 (0.2초에 한 번, 멈춘 뒤 마지막 위치도 꼭 보냄)
  const share = (w: Partial<Walker>) => {
    meRef.current = { ...meRef.current, ...w };
    if (Date.now() - lastSent.current > 200) sendPos();
    else if (pending.current === null) pending.current = window.setTimeout(sendPos, 200);
  };

  const others: Record<string, Walker> = {};
  for (const [k, w] of Object.entries(people)) others[k] = { ...w, ...(pos[k] ?? {}) };
  const emote = (e: string) => {
    setMyEmote({ e, t: Date.now() });
    chRef.current?.send({ type: "broadcast", event: "emote", payload: { key: keyRef.current, e } });
  };
  // 오늘의 운세 카드를 뽑으면 광장 사람들에게 알림 (presence는 바뀔 때만 track)
  const setFortune = (card: number) => {
    meRef.current = { ...meRef.current, fortune: card };
    chRef.current?.track(meRef.current);
  };
  // ----- 액션 -----
  const posOf = (k: string): [number, number] | null => {
    if (k === keyRef.current) return [meRef.current.x, meRef.current.z];
    if (k.startsWith("npc:")) { const p = npcPos(k); return [p.x, p.z]; }
    const w = othersRef.current[k];
    return w ? [w.x, w.z] : null;
  };
  const showEmote = (k: string, e: string) => {
    if (k === keyRef.current) setMyEmote({ e, t: Date.now() });
    else setEmotes((prev) => ({ ...prev, [k]: { e, t: Date.now() } }));
  };
  const showSay = (k: string, text: string) => {
    if (k === keyRef.current) setMySay({ e: text, t: Date.now() });
    else setSays((prev) => ({ ...prev, [k]: { e: text, t: Date.now() } }));
  };
  const handleAct = (a: Act) => {
    const me = keyRef.current;
    if (a.type === "snow") {
      const from = posOf(a.from), to = posOf(a.to);
      if (from && to) setShots((prev) => [...prev.filter((s) => Date.now() - s.t < 2000), { id: Math.random(), from, to, t: Date.now() }]);
      setTimeout(() => showSay(a.to, "❄️ 앗 차가워!"), SHOT_MS);
    } else if (a.type === "bump") {
      showEmote(a.from, "💥");
      showSay(a.to, "💫 아야!");
      if (a.to.startsWith("npc:")) npcKnock.current[a.to] = { t: Date.now(), dir: a.dir };
      if (a.to === me) {
        knock.current = Date.now() + 650;
        const m = meRef.current;
        goal.current = clampSpot(m.x + a.dir[0] * 2.4, m.z + a.dir[1] * 2.4);
      }
    } else if (a.type === "hug") {
      showEmote(a.from, "❤️");
      showEmote(a.to, "❤️");
    }
  };
  const handleActRef = useRef(handleAct);
  handleActRef.current = handleAct;

  const act = (type: Act["type"], to: string) => {
    const from = keyRef.current;
    const tp = posOf(to);
    if (!tp) return;
    const m = meRef.current;
    const dx = tp[0] - m.x, dz = tp[1] - m.z, d = Math.hypot(dx, dz) || 1;
    const dir: [number, number] = [dx / d, dz / d];
    const fire = () => {
      const a: Act = { type, from, to, dir };
      chRef.current?.send({ type: "broadcast", event: "act", payload: a });
      handleAct(a);
    };
    if (type === "snow") { meRef.current = { ...m, ry: Math.atan2(dx, dz) }; fire(); return; }
    // 들이받기·안아주기: 상대 바로 앞까지 달려간 뒤 실행
    goal.current = clampSpot(tp[0] - dir[0] * 0.55, tp[1] - dir[1] * 0.55);
    setTimeout(fire, Math.min(1800, (Math.max(0, d - 0.55) / SPEED) * 1000 + 80));
  };

  const say = (text: string) => {
    const short = text.replace(/\s+/g, " ").trim().slice(0, 24) + (text.length > 24 ? "…" : "");
    setMySay({ e: short, t: Date.now() });
    chRef.current?.send({ type: "broadcast", event: "say", payload: { key: keyRef.current, text: short } });
  };
  // 벤치에 앉기: 벤치 앞까지 걸어가서 트리를 바라보고 앉음
  const sitAt = (i: number) => {
    const b = BENCHES[i];
    if (!b) return;
    benchTo.current = i;
    goal.current = [b.x, b.z];
    if (meRef.current.sit) { meRef.current = { ...meRef.current, sit: false }; setSitting(false); }
  };
  const standUp = () => {
    benchTo.current = null;
    if (!meRef.current.sit) return;
    meRef.current = { ...meRef.current, sit: false };
    setSitting(false);
    sendPos();
  };
  const sitDown = () => {
    const b = BENCHES[benchTo.current ?? -1];
    benchTo.current = null;
    if (!b) return;
    meRef.current = { ...meRef.current, x: b.x, z: b.z, ry: b.ry, sit: true };
    setSitting(true);
    sendPos();
    if (b.kind === "log") say("🔥 따뜻해~ 몸이 사르르 녹는다");
  };
  const announceSnowman = () => chRef.current?.send({ type: "broadcast", event: "snowman", payload: {} });
  const onSmashRef = useRef<((id: string) => void) | null>(null);
  const announceSmash = (id: string) => chRef.current?.send({ type: "broadcast", event: "smash", payload: { id } });
  const rideSled = (kind: RideKind = "hill") => {
    if (mySled.current && Date.now() - mySled.current < rideMs(mySledKind.current)) return;
    mySledKind.current = kind;
    benchTo.current = null;
    goal.current = null;
    meRef.current = { ...meRef.current, sit: false };
    setSitting(false);
    mySled.current = Date.now();
    setSledding(true);
    setMySay({ e: rideSay(kind), t: Date.now() });
    chRef.current?.send({ type: "broadcast", event: "sled", payload: { key: keyRef.current, kind } });
  };
  const endSled = () => {
    mySled.current = null;
    setSledding(false);
    const end = rideEnd(mySledKind.current);
    meRef.current = { ...meRef.current, x: end.x, z: end.z };
    sendPos();
  };
  othersRef.current = others;
  // NPC끼리 장난: 모든 화면이 같은 시각에 같은 장난을 계산하므로 서버로 보내지 않고 각자 실행
  const localAct = (a: Act) => handleActRef.current(a);
  return { localAct, mySledKind, onSmashRef, announceSmash, onSnowmanRef, announceSnowman, showSay, showEmote, rideSled, endSled, mySled, sledding, sleds, sitAt, standUp, sitDown, benchTo, sitting, others, me: meRef, share, emotes, myEmote, emote, setFortune, says, mySay, say, act, goal, knock, shots, myKey: keyRef.current };
}

// 감정 표현: 3초 동안 머리 위에 띄우고, 그동안 캐릭터가 깡충 뜀
function useEmoteHop(emote: Emote | null | undefined, g: React.RefObject<THREE.Group | null>) {
  const [show, setShow] = useState<Emote | null>(null);
  useEffect(() => {
    if (!emote || Date.now() - emote.t > EMOTE_MS) return;
    setShow(emote);
    const id = setTimeout(() => setShow(null), EMOTE_MS - (Date.now() - emote.t));
    return () => clearTimeout(id);
  }, [emote?.t]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    if (!g.current) return;
    const age = show ? (Date.now() - show.t) / 1000 : 9;
    g.current.position.y = age < 0.9 ? Math.abs(Math.sin(age * Math.PI * 3.3)) * 0.45 * (1 - age / 0.9) : 0;
  });
  return show;
}

const SAY_MS = 4000;
function useTimed(v: Emote | null | undefined, ms: number) {
  const [show, setShow] = useState<Emote | null>(null);
  useEffect(() => {
    if (!v || Date.now() - v.t > ms) return;
    setShow(v);
    const id = setTimeout(() => setShow(null), ms - (Date.now() - v.t));
    return () => clearTimeout(id);
  }, [v?.t]); // eslint-disable-line react-hooks/exhaustive-deps
  return show;
}

function SayBubble({ text, high }: { text: string; high?: boolean }) {
  return <Html pointerEvents="none" position={[0, high ? 2.95 : 2.3, 0]} center distanceFactor={9} zIndexRange={[7, 0]}><div className="say-bubble" key={text}>{text}</div></Html>;
}

function EmoteBubble({ e }: { e: string }) {
  return <Html pointerEvents="none" position={[0, 2.35, 0]} center distanceFactor={9} zIndexRange={[6, 0]}><div className="emote-bubble" key={e}>{e}</div></Html>;
}

const fortuneIcon = (c?: number | null) => (c != null && CARDS[c] ? ` ${CARDS[c].icon}` : "");

function NameTag({ text }: { text: string }) {
  return <Html pointerEvents="none" position={[0, 1.75, 0]} center distanceFactor={9} zIndexRange={[5, 0]}><div className="name-tag">{text}</div></Html>;
}

export function MyWalker({ walk, target, avatar }: {
  walk: ReturnType<typeof useWalkers>; target: [number, number] | null; avatar: Avatar | null;
}) {
  const g = useRef<THREE.Group>(null);
  const goal = walk.goal;
  const keys = useRef<Record<string, boolean>>({});
  const [moving, setMoving] = useState(false);
  const hop = useRef<THREE.Group>(null);
  const myShow = useEmoteHop(walk.myEmote, hop);
  const mySay = useTimed(walk.mySay, SAY_MS);

  useEffect(() => { if (target) { walk.standUp(); goal.current = clampSpot(target[0], target[1]); } }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, dt) => {
    const me = walk.me.current;
    // 썰매 타는 중: 정해진 길로 미끄러져 내려옴
    if (walk.mySled.current !== null) {
      const kind = walk.mySledKind.current;
      const s = (Date.now() - walk.mySled.current) / rideMs(kind);
      if (s >= 1) { const end = rideEnd(kind); walk.endSled(); if (g.current) g.current.position.set(end.x, 0, end.z); return; }
      const p = rideAt(kind, s);
      if (g.current) { g.current.position.set(p.x, p.y, p.z); g.current.rotation.y = p.ry; }
      return;
    }
    const k = keys.current;
    let dx = (k["arrowright"] || k["d"] ? 1 : 0) - (k["arrowleft"] || k["a"] ? 1 : 0);
    let dz = (k["arrowdown"] || k["s"] ? 1 : 0) - (k["arrowup"] || k["w"] ? 1 : 0);
    if (dx || dz) {
      goal.current = null;
      if (me.sit || walk.benchTo.current !== null) walk.standUp();
    } else if (goal.current) {
      dx = goal.current[0] - me.x; dz = goal.current[1] - me.z;
      if (Math.hypot(dx, dz) < 0.05) {
        goal.current = null; dx = 0; dz = 0;
        if (walk.benchTo.current !== null) {
          walk.sitDown();
          const m = walk.me.current;
          if (g.current) { g.current.position.set(m.x, 0, m.z); g.current.rotation.y = m.ry; }
        }
      } else if (me.sit) {
        walk.standUp();
      }
    }
    const len = Math.hypot(dx, dz);
    const isMoving = len > 0;
    if (isMoving !== moving) setMoving(isMoving);
    if (!isMoving) return;
    const knocked = Date.now() < walk.knock.current;
    const speed = knocked ? SPEED * 4 : SPEED;
    const step = Math.min(speed * dt, goal.current ? len : speed * dt);
    const [x, z] = clampSpot(me.x + (dx / len) * step, me.z + (dz / len) * step);
    const ry = knocked ? (g.current?.rotation.y ?? 0) + dt * 22 : Math.atan2(dx, dz);
    if (g.current) { g.current.position.set(x, 0, z); g.current.rotation.y = ry; }
    walk.share({ x, z, ry });
  });

  const me = walk.me.current;
  return (
    <group ref={g} position={[me.x, 0, me.z]} rotation={[0, me.ry, 0]}>
      {walk.sledding && <SledMesh />}
      <group position={[0, walk.sitting ? (walk.me.current.z < -7 ? LOG_Y : SIT_Y) : walk.sledding ? 0.12 : 0, 0]}>
        <group ref={hop}><Character3D avatar={avatar ?? DEFAULT_AVATAR} walking={moving} /></group>
      </group>
      <NameTag text={`${me.nick} (나)${fortuneIcon(me.fortune)}`} />
      {myShow && <EmoteBubble e={myShow.e} />}
      {mySay && <SayBubble text={mySay.e} high={!!myShow} />}
    </group>
  );
}

function OtherWalker({ w, emote, said, onSelect, sled }: { w: Walker; emote?: Emote; said?: Emote; onSelect?: () => void; sled?: { t: number; kind: RideKind } }) {
  const riding = sled !== undefined && Date.now() - sled.t < rideMs(sled.kind);
  const [, force] = useState(0);
  const g = useRef<THREE.Group>(null);
  const hop = useRef<THREE.Group>(null);
  const show = useEmoteHop(emote, hop);
  const sayShow = useTimed(said, SAY_MS);
  const [moving, setMoving] = useState(false);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    if (sled !== undefined && Date.now() - sled.t < rideMs(sled.kind)) {
      const p = rideAt(sled.kind, (Date.now() - sled.t) / rideMs(sled.kind));
      o.position.set(p.x, p.y, p.z); o.rotation.y = p.ry;
      return;
    }
    if (riding && sled) { const end = rideEnd(sled.kind); o.position.set(end.x, 0, end.z); force((n) => n + 1); }
    if (o.position.y !== 0) o.position.y = 0;
    const dx = w.x - o.position.x, dz = w.z - o.position.z;
    const d = Math.hypot(dx, dz);
    const isMoving = d > 0.05;
    if (isMoving !== moving) setMoving(isMoving);
    if (!isMoving && w.sit) o.rotation.y = w.ry;
    if (isMoving) {
      const hit = said && said.e.startsWith("💫") && Date.now() - said.t < 900;
      const step = Math.min(d, SPEED * (hit ? 4.5 : 1.2) * dt);
      o.position.x += (dx / d) * step; o.position.z += (dz / d) * step;
      o.rotation.y = hit ? o.rotation.y + dt * 22 : Math.atan2(dx, dz);
    }
  });
  return (
    <group ref={g} position={[w.x, 0, w.z]} rotation={[0, w.ry, 0]}>
      {riding && <SledMesh />}
      <group position={[0, w.sit ? (w.z < -7 ? LOG_Y : SIT_Y) : riding ? 0.12 : 0, 0]}>
      <group ref={hop}
        onClick={(e) => { if (onSelect && e.delta < 6) { e.stopPropagation(); onSelect(); } }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}>
        <Character3D avatar={parseAvatar(w.avatar) ?? DEFAULT_AVATAR} walking={moving} />
        {/* 휴대폰에서도 누르기 쉽게: 캐릭터 둘레의 보이지 않는 넓은 터치 영역 (지우지 말 것 — FEATURES.md 8) */}
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 1.7, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      </group>
      <NameTag text={`${w.nick}${fortuneIcon(w.fortune)}`} />
      {show && <EmoteBubble e={show.e} />}
      {sayShow && <SayBubble text={sayShow.e} high={!!show} />}
    </group>
  );
}

export function OtherWalkers({ others, emotes, says, onSelect, sleds = {} }: {
  others: Record<string, Walker>; emotes: Record<string, Emote>; says: Record<string, Emote>; onSelect?: (key: string) => void; sleds?: Record<string, { t: number; kind: RideKind }>;
}) {
  return <>{Object.entries(others).map(([k, w]) => <OtherWalker key={k} w={w} emote={emotes[k]} said={says[k]} sled={sleds[k]} onSelect={onSelect && (() => onSelect(k))} />)}</>;
}

// 날아가는 눈덩이 (포물선)
function Snowball({ s }: { s: Shot }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = Math.min(1, (Date.now() - s.t) / SHOT_MS);
    if (!ref.current) return;
    ref.current.visible = p < 1;
    ref.current.position.set(s.from[0] + (s.to[0] - s.from[0]) * p, 1.1 + Math.sin(p * Math.PI) * 1.2, s.from[1] + (s.to[1] - s.from[1]) * p);
  });
  return (
    <mesh ref={ref} raycast={() => null}>
      <sphereGeometry args={[0.13, 12, 12]} />
      <meshStandardMaterial color="#ffffff" emissive="#dfefff" emissiveIntensity={0.4} />
    </mesh>
  );
}

// 낚싯대 + 줄 + 찌 (찌가 둥실둥실)
function FishingRod() {
  const bob = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (bob.current) bob.current.position.y = 0.05 + Math.abs(Math.sin(clock.elapsedTime * 2)) * 0.06; });
  return (
    <group position={[0.25, 0.75, 0.15]}>
      <mesh rotation={[0.9, 0, 0]} position={[0, 0.35, 0.45]}><cylinderGeometry args={[0.015, 0.025, 1.3, 6]} /><meshStandardMaterial color="#6b4a2b" /></mesh>
      <mesh position={[0, 0.2, 1.05]}><cylinderGeometry args={[0.004, 0.004, 1.2, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh ref={bob} position={[0, -0.7, 1.05]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#e0322d" /></mesh>
    </group>
  );
}

function NpcWalker({ npc, emote, said, onSelect }: { npc: typeof NPCS[number]; emote?: Emote; said?: Emote; onSelect?: () => void }) {
  const g = useRef<THREE.Group>(null);
  const hop = useRef<THREE.Group>(null);
  const show = useEmoteHop(emote, hop);
  const sayShow = useTimed(said, SAY_MS);
  const [walking, setWalking] = useState(false);
  useFrame((_, dt) => {
    const p = npcPos(npc.id);
    if (!g.current) return;
    g.current.position.set(p.x, 0, p.z);
    g.current.rotation.y = p.spin ? g.current.rotation.y + dt * 22 : (p.walking || "fisher" in npc) ? p.ry : g.current.rotation.y;
    if (p.walking !== walking) setWalking(p.walking);
  });
  return (
    <group ref={g}>
      <group ref={hop}
        onClick={(e) => { if (onSelect && e.delta < 6) { e.stopPropagation(); onSelect(); } }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}>
        <Character3D avatar={npc.avatar} walking={walking} />
        {"fisher" in npc && <FishingRod />}
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 1.7, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <Html pointerEvents="none" position={[0, 1.75, 0]} center distanceFactor={9} zIndexRange={[5, 0]}><div className="name-tag npc-tag">🤖 {npc.nick}</div></Html>
      {show && <EmoteBubble e={show.e} />}
      {sayShow && <SayBubble text={sayShow.e} high={!!show} />}
    </group>
  );
}

// NPC 3마리: 돌아다니고, 12초마다 자기들끼리 장난(들이받기·눈덩이·안아주기·감정 표현)
export function Npcs({ walk, onSelect }: { walk: ReturnType<typeof useWalkers>; onSelect?: (id: string) => void }) {
  const last = useRef(-1);
  const lastFish = useRef(-1);
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      // 낚시꾼 너구리 할배: 9초마다 한마디 (가끔 '어이쿠 손이 미끄러졌네!')
      const fs = Math.floor(now / 9000);
      if (fs !== lastFish.current) {
        lastFish.current = fs;
        const lines = ["어이쿠 손이 미끄러졌네!", "🐟 오늘은 입질이 좋구먼", "어이쿠 손이 미끄러졌네!", "허허, 월척이야!", "…zzZ 깜빡 졸았네", "🎣 조용히 좀 해 주게~"];
        walk.showSay("npc:3", lines[Math.floor(hash(fs, 9) * lines.length)]);
      }
      const slot = Math.floor(now / 12000);
      if (slot === last.current || now % 12000 < 5200) return; // 걷기가 끝난 뒤(5.2초~)에 한 번
      last.current = slot;
      const a = Math.floor(hash(slot, 1) * 3), b = (a + 1 + Math.floor(hash(slot, 2) * 2)) % 3;
      const from = NPCS[a].id, to = NPCS[b].id;
      const kind = Math.floor(hash(slot, 3) * 4);
      const pa = npcPos(from, now), pb = npcPos(to, now);
      const dx = pb.x - pa.x, dz = pb.z - pa.z, d = Math.hypot(dx, dz) || 1;
      if (kind === 3) { walk.showEmote(from, EMOTES[Math.floor(hash(slot, 4) * EMOTES.length)].e); return; }
      walk.localAct({ type: (["bump", "snow", "hug"] as const)[kind], from, to, dir: [dx / d, dz / d] });
    }, 400);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{NPCS.map((n) => <NpcWalker key={n.id} npc={n} emote={walk.emotes[n.id]} said={walk.says[n.id]} onSelect={onSelect && (() => onSelect(n.id))} />)}</>;
}

export function Snowballs({ shots }: { shots: Shot[] }) {
  return <>{shots.filter((s) => Date.now() - s.t < SHOT_MS + 50).map((s) => <Snowball key={s.id} s={s} />)}</>;
}

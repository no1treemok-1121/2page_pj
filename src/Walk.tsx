import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Character3D from "./Character3D";
import { Avatar, DEFAULT_AVATAR, parseAvatar, toStr } from "./avatar";
import { supabase } from "./supabase";
import { CARDS, loadToday } from "./Fortune";

// 마을을 걸어 다니는 캐릭터 + 다른 사람 캐릭터 실시간 표시 (Supabase Realtime presence)
export type Walker = { avatar: string; nick: string; x: number; z: number; ry: number; fortune?: number | null };
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
const MAX_R = 7.2; // 마을 광장 밖(집 쪽)으로 못 나가게
const TREE_R = 2.5; // 트리 안으로 못 들어가게

export function clampSpot(x: number, z: number): [number, number] {
  let r = Math.hypot(x, z);
  if (r < 0.001) { x = 0; z = TREE_R; r = TREE_R; }
  const nr = Math.min(MAX_R, Math.max(TREE_R, r));
  return [(x / r) * nr, (z / r) * nr];
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
  const knock = useRef(0); // 이 시각까지 튕겨 나가는 중 (빠르게 + 빙글빙글)
  const [shots, setShots] = useState<Shot[]>([]);
  const othersRef = useRef<Record<string, Walker>>({});
  const [pos, setPos] = useState<Record<string, { x: number; z: number; ry: number }>>({});
  const chRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const keyRef = useRef(crypto.randomUUID());
  const meRef = useRef<Walker>({ avatar: toStr(myAvatar ?? DEFAULT_AVATAR), nick, x: (Math.random() - 0.5) * 6, z: 4.5, ry: 0, fortune: loadToday() }); // 처음엔 화면 쪽을 바라봄, 오늘 뽑은 운세 카드도 함께 알림
  const lastSent = useRef(0);
  const pending = useRef<number | null>(null);

  const sendPos = () => {
    lastSent.current = Date.now(); pending.current = null;
    const { x, z, ry } = meRef.current;
    chRef.current?.send({ type: "broadcast", event: "pos", payload: { key: keyRef.current, x, z, ry } });
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
      .on("broadcast", { event: "say" }, ({ payload }) => {
        const p = payload as { key: string; text: string };
        setSays((prev) => ({ ...prev, [p.key]: { e: p.text, t: Date.now() } }));
      })
      .on("broadcast", { event: "emote" }, ({ payload }) => {
        const p = payload as { key: string; e: string };
        setEmotes((prev) => ({ ...prev, [p.key]: { e: p.e, t: Date.now() } }));
      })
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const p = payload as { key: string; x: number; z: number; ry: number };
        setPos((prev) => ({ ...prev, [p.key]: { x: p.x, z: p.z, ry: p.ry } }));
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
  othersRef.current = others;
  return { others, me: meRef, share, emotes, myEmote, emote, setFortune, says, mySay, say, act, goal, knock, shots, myKey: keyRef.current };
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
  return <Html position={[0, high ? 2.95 : 2.3, 0]} center distanceFactor={9} zIndexRange={[7, 0]}><div className="say-bubble" key={text}>{text}</div></Html>;
}

function EmoteBubble({ e }: { e: string }) {
  return <Html position={[0, 2.35, 0]} center distanceFactor={9} zIndexRange={[6, 0]}><div className="emote-bubble" key={e}>{e}</div></Html>;
}

const fortuneIcon = (c?: number | null) => (c != null && CARDS[c] ? ` ${CARDS[c].icon}` : "");

function NameTag({ text }: { text: string }) {
  return <Html position={[0, 1.75, 0]} center distanceFactor={9} zIndexRange={[5, 0]}><div className="name-tag">{text}</div></Html>;
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

  useEffect(() => { if (target) goal.current = clampSpot(target[0], target[1]); }, [target]);
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
    const k = keys.current;
    let dx = (k["arrowright"] || k["d"] ? 1 : 0) - (k["arrowleft"] || k["a"] ? 1 : 0);
    let dz = (k["arrowdown"] || k["s"] ? 1 : 0) - (k["arrowup"] || k["w"] ? 1 : 0);
    if (dx || dz) {
      goal.current = null;
    } else if (goal.current) {
      dx = goal.current[0] - me.x; dz = goal.current[1] - me.z;
      if (Math.hypot(dx, dz) < 0.05) { goal.current = null; dx = 0; dz = 0; }
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
      <group ref={hop}><Character3D avatar={avatar ?? DEFAULT_AVATAR} walking={moving} /></group>
      <NameTag text={`${me.nick} (나)${fortuneIcon(me.fortune)}`} />
      {myShow && <EmoteBubble e={myShow.e} />}
      {mySay && <SayBubble text={mySay.e} high={!!myShow} />}
    </group>
  );
}

function OtherWalker({ w, emote, said, onSelect }: { w: Walker; emote?: Emote; said?: Emote; onSelect?: () => void }) {
  const g = useRef<THREE.Group>(null);
  const hop = useRef<THREE.Group>(null);
  const show = useEmoteHop(emote, hop);
  const sayShow = useTimed(said, SAY_MS);
  const [moving, setMoving] = useState(false);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    const dx = w.x - o.position.x, dz = w.z - o.position.z;
    const d = Math.hypot(dx, dz);
    const isMoving = d > 0.05;
    if (isMoving !== moving) setMoving(isMoving);
    if (isMoving) {
      const hit = said && said.e.startsWith("💫") && Date.now() - said.t < 900;
      const step = Math.min(d, SPEED * (hit ? 4.5 : 1.2) * dt);
      o.position.x += (dx / d) * step; o.position.z += (dz / d) * step;
      o.rotation.y = hit ? o.rotation.y + dt * 22 : Math.atan2(dx, dz);
    }
  });
  return (
    <group ref={g} position={[w.x, 0, w.z]} rotation={[0, w.ry, 0]}>
      <group ref={hop}
        onClick={(e) => { if (onSelect && e.delta < 6) { e.stopPropagation(); onSelect(); } }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}>
        <Character3D avatar={parseAvatar(w.avatar) ?? DEFAULT_AVATAR} walking={moving} />
      </group>
      <NameTag text={`${w.nick}${fortuneIcon(w.fortune)}`} />
      {show && <EmoteBubble e={show.e} />}
      {sayShow && <SayBubble text={sayShow.e} high={!!show} />}
    </group>
  );
}

export function OtherWalkers({ others, emotes, says, onSelect }: {
  others: Record<string, Walker>; emotes: Record<string, Emote>; says: Record<string, Emote>; onSelect?: (key: string) => void;
}) {
  return <>{Object.entries(others).map(([k, w]) => <OtherWalker key={k} w={w} emote={emotes[k]} said={says[k]} onSelect={onSelect && (() => onSelect(k))} />)}</>;
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

export function Snowballs({ shots }: { shots: Shot[] }) {
  return <>{shots.filter((s) => Date.now() - s.t < SHOT_MS + 50).map((s) => <Snowball key={s.id} s={s} />)}</>;
}

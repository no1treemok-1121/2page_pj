import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Character3D from "./Character3D";
import { Avatar, DEFAULT_AVATAR, parseAvatar, toStr } from "./avatar";
import { supabase } from "./supabase";

// 마을을 걸어 다니는 캐릭터 + 다른 사람 캐릭터 실시간 표시 (Supabase Realtime presence)
export type Walker = { avatar: string; nick: string; x: number; z: number; ry: number };
export type Emote = { e: string; t: number };

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
  const [pos, setPos] = useState<Record<string, { x: number; z: number; ry: number }>>({});
  const chRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const keyRef = useRef(crypto.randomUUID());
  const meRef = useRef<Walker>({ avatar: toStr(myAvatar ?? DEFAULT_AVATAR), nick, x: (Math.random() - 0.5) * 6, z: 4.5, ry: 0 }); // 처음엔 화면 쪽을 바라봄
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
  return { others, me: meRef, share, emotes, myEmote, emote };
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

function EmoteBubble({ e }: { e: string }) {
  return <Html position={[0, 2.35, 0]} center distanceFactor={9} zIndexRange={[6, 0]}><div className="emote-bubble" key={e}>{e}</div></Html>;
}

function NameTag({ text }: { text: string }) {
  return <Html position={[0, 1.75, 0]} center distanceFactor={9} zIndexRange={[5, 0]}><div className="name-tag">{text}</div></Html>;
}

export function MyWalker({ walk, target, avatar }: {
  walk: ReturnType<typeof useWalkers>; target: [number, number] | null; avatar: Avatar | null;
}) {
  const g = useRef<THREE.Group>(null);
  const goal = useRef<[number, number] | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const [moving, setMoving] = useState(false);
  const hop = useRef<THREE.Group>(null);
  const myShow = useEmoteHop(walk.myEmote, hop);

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
    const step = Math.min(SPEED * dt, goal.current ? len : SPEED * dt);
    const [x, z] = clampSpot(me.x + (dx / len) * step, me.z + (dz / len) * step);
    const ry = Math.atan2(dx, dz);
    if (g.current) { g.current.position.set(x, 0, z); g.current.rotation.y = ry; }
    walk.share({ x, z, ry });
  });

  const me = walk.me.current;
  return (
    <group ref={g} position={[me.x, 0, me.z]} rotation={[0, me.ry, 0]}>
      <group ref={hop}><Character3D avatar={avatar ?? DEFAULT_AVATAR} walking={moving} /></group>
      <NameTag text={`${me.nick} (나)`} />
      {myShow && <EmoteBubble e={myShow.e} />}
    </group>
  );
}

function OtherWalker({ w, emote }: { w: Walker; emote?: Emote }) {
  const g = useRef<THREE.Group>(null);
  const hop = useRef<THREE.Group>(null);
  const show = useEmoteHop(emote, hop);
  const [moving, setMoving] = useState(false);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    const dx = w.x - o.position.x, dz = w.z - o.position.z;
    const d = Math.hypot(dx, dz);
    const isMoving = d > 0.05;
    if (isMoving !== moving) setMoving(isMoving);
    if (isMoving) {
      const step = Math.min(d, SPEED * 1.2 * dt);
      o.position.x += (dx / d) * step; o.position.z += (dz / d) * step;
      o.rotation.y = Math.atan2(dx, dz);
    }
  });
  return (
    <group ref={g} position={[w.x, 0, w.z]} rotation={[0, w.ry, 0]}>
      <group ref={hop}><Character3D avatar={parseAvatar(w.avatar) ?? DEFAULT_AVATAR} walking={moving} /></group>
      <NameTag text={w.nick} />
      {show && <EmoteBubble e={show.e} />}
    </group>
  );
}

export function OtherWalkers({ others, emotes }: { others: Record<string, Walker>; emotes: Record<string, Emote> }) {
  return <>{Object.entries(others).map(([k, w]) => <OtherWalker key={k} w={w} emote={emotes[k]} />)}</>;
}

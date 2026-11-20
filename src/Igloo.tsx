import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { supabase } from "./supabase";
import Character3D from "./Character3D";
import { DEFAULT_AVATAR, parseAvatar } from "./avatar";
import { IconText } from "./FoodIcon";

// ❄️ 마을 이글루: 누구나 들어갈 수 있는 공용 공간 (사용자 요청)
// - 마을에 큰 이글루, 문 앞까지 걸어가면 안으로 들어감
// - 안에 있는 사람은 Realtime 채널 'igloo-room' presence로 서로 보임 (방석에 둘러앉음)
// - 안의 '소원 방명록'은 트리 소원함과 같은 wishes 데이터 (쓰면 트리에도 걸림)

export const IGLOO = { x: 3.8, z: -10.2, r: 2.3 };
const toCenter = (() => { const d = Math.hypot(IGLOO.x, IGLOO.z); return { x: -IGLOO.x / d, z: -IGLOO.z / d }; })();
export const IGLOO_DOOR = { x: IGLOO.x + toCenter.x * (IGLOO.r + 0.9), z: IGLOO.z + toCenter.z * (IGLOO.r + 0.9) };

export type IglooPerson = { key: string; nick: string; avatar: string | null; seat: number | null; x: number; z: number; gaze: boolean };
type MyState = { seat: number | null; x: number; z: number; gaze: boolean };

export const SEAT_R = 2.5;
export const SEATS = 10;
export const seatPos = (i: number) => { const a = Math.PI / 2 + (i / SEATS) * Math.PI * 2 + 0.3; return { x: Math.cos(a) * SEAT_R, z: Math.sin(a) * SEAT_R }; };

// 이글루 안 사람들 (밖에 있을 때도 몇 명 있는지 알 수 있게 채널은 늘 듣고, 안에 있을 때만 나를 알림)
export function useIgloo(inside: boolean, myKey: string, nick: string, avatar: string | null) {
  const [people, setPeople] = useState<IglooPerson[]>([]);
  const [emotes, setEmotes] = useState<Record<string, { e: string; t: number }>>({});
  const [mine, setMine] = useState<MyState>({ seat: null, x: 0, z: 3.6, gaze: false });
  const ch = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const ready = useRef(false);
  const insideRef = useRef(inside);
  const payload = () => ({ nick, avatar, ...mineRef.current });
  const mineRef = useRef(mine);
  mineRef.current = mine;
  const payRef = useRef(payload);
  payRef.current = payload;
  insideRef.current = inside;

  useEffect(() => {
    if (!supabase) return;
    const c = supabase.channel("igloo-room", { config: { presence: { key: myKey }, broadcast: { self: false } } });
    c.on("presence", { event: "sync" }, () => {
      const st = c.presenceState() as Record<string, Partial<IglooPerson>[]>;
      setPeople(Object.entries(st).map(([key, arr]) => {
        const v = arr[0] ?? {};
        return { key, nick: v.nick ?? "누군가", avatar: v.avatar ?? null, seat: typeof v.seat === "number" ? v.seat : null, x: v.x ?? 0, z: v.z ?? 3.6, gaze: !!v.gaze };
      }));
    })
      .on("broadcast", { event: "emote" }, ({ payload: pl }) => {
        const p = pl as { key: string; e: string };
        setEmotes((prev) => ({ ...prev, [p.key]: { e: p.e, t: Date.now() } }));
      })
      .subscribe((st) => {
        if (st !== "SUBSCRIBED") return;
        ready.current = true;
        if (insideRef.current) c.track(payRef.current());
      });
    ch.current = c;
    return () => { ready.current = false; supabase?.removeChannel(c); };
  }, [myKey]);

  // 들어오면 빈 방석에 자동으로 앉음
  useEffect(() => {
    if (!inside) { setMine({ seat: null, x: 0, z: 3.6, gaze: false }); return; }
    const taken = new Set(people.filter((p) => p.key !== myKey && p.seat !== null).map((p) => p.seat));
    let free = 0; while (taken.has(free) && free < SEATS) free++;
    const sp = seatPos(free < SEATS ? free : 0);
    setMine({ seat: free < SEATS ? free : null, x: sp.x, z: sp.z, gaze: false });
  }, [inside]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = ch.current;
    if (!c || !ready.current) return;
    if (inside) c.track(payRef.current()); else c.untrack();
  }, [inside, nick, avatar, mine]);

  const emote = (e: string) => {
    setEmotes((prev) => ({ ...prev, [myKey]: { e, t: Date.now() } }));
    ch.current?.send({ type: "broadcast", event: "emote", payload: { key: myKey, e } });
  };
  const seatTaken = (i: number) => people.some((p) => p.key !== myKey && p.seat === i);
  const sit = (i: number) => { if (seatTaken(i)) return false; const sp = seatPos(i); setMine({ seat: i, x: sp.x, z: sp.z, gaze: false }); return true; };
  const walkTo = (x: number, z: number) => {
    const d = Math.hypot(x, z), r = Math.min(3.9, Math.max(1.0, d)) / (d || 1);
    setMine({ seat: null, x: x * r, z: z * r, gaze: false });
  };
  const setGaze = (g: boolean) => setMine((m) => ({ ...m, gaze: g }));
  // 안에 있는데 아직 목록에 내가 안 보이면(연결 중) 나를 먼저 보여 줌, 내 자리는 내 화면 기준
  const me: IglooPerson = { key: myKey, nick, avatar, ...mine };
  const list = inside ? [me, ...people.filter((p) => p.key !== myKey)] : people;
  return { people: list, count: people.length, emotes, emote, mine, sit, walkTo, setGaze, seatTaken };
}

// ---------------- 마을에 있는 큰 이글루 ----------------
export function VillageIgloo({ count, onEnter }: { count: number; onEnter?: () => void }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (glow.current) glow.current.emissiveIntensity = 1.1 + Math.sin(clock.elapsedTime * 2) * 0.35; });
  const ry = Math.atan2(toCenter.x, toCenter.z);
  const R = IGLOO.r;
  return (
    <group position={[IGLOO.x, 0, IGLOO.z]} rotation={[0, ry, 0]}
      onClick={(e) => { if (onEnter && e.delta < 6) { e.stopPropagation(); onEnter(); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      <mesh><sphereGeometry args={[R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#eef5ff" roughness={0.85} /></mesh>
      {[0.5, 1.0, 1.5, 1.95].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[Math.sqrt(R * R - y * y), 0.025, 4, 40]} /><meshStandardMaterial color="#c9dcf0" /></mesh>)}
      {/* 입구 터널 + 따뜻한 불빛 */}
      <mesh position={[0, 0, R - 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.85, 0.85, 1.2, 20, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#e3eefb" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.38, R + 0.5]}><circleGeometry args={[0.62, 20, 0, Math.PI]} /><meshStandardMaterial ref={glow} color="#ffcf70" emissive="#ffb347" emissiveIntensity={1.2} /></mesh>
      <pointLight position={[0, 0.8, R + 1.2]} color="#ffb347" intensity={3} distance={5} />
      {/* 입구 위 꼬마전구 */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * (i / 8);
        return <mesh key={i} position={[Math.cos(a) * 0.95, 0.12 + Math.sin(a) * 0.95, R + 0.62]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color={["#ffd84d", "#ff5a5a", "#7fe0ff"][i % 3]} emissive={["#ffd84d", "#ff5a5a", "#7fe0ff"][i % 3]} emissiveIntensity={1.6} /></mesh>;
      })}
      <Html pointerEvents="none" position={[0, R + 0.7, 0]} center distanceFactor={11} zIndexRange={[4, 0]}>
        <div className="spot-tag igloo">❄️ 이글루{count > 0 ? ` · ${count}명 있어요` : " · 들어가 보기"}</div>
      </Html>
    </group>
  );
}

// ---------------- 이글루 안 ----------------
const DOME = 5;

function Brazier() {
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = 9 + Math.sin(t * 8) * 1.5 + Math.sin(t * 13) * 1;
    flames.current?.children.forEach((c, i) => { c.scale.y = 1 + Math.sin(t * (7 + i * 2) + i) * 0.22; c.rotation.y = t * (1 + i * 0.4); });
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.55, 0.4, 0.5, 20]} /><meshStandardMaterial color="#5a4a45" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.5, 0.5, 0.04, 20]} /><meshStandardMaterial color="#ff6a1a" emissive="#ff4a00" emissiveIntensity={1.8} /></mesh>
      <group ref={flames} position={[0, 0.55, 0]}>
        <mesh position={[0, 0.3, 0]}><coneGeometry args={[0.3, 0.7, 8]} /><meshStandardMaterial color="#ff7a1a" emissive="#ff5a00" emissiveIntensity={2.2} transparent opacity={0.9} /></mesh>
        <mesh position={[0.06, 0.24, 0.04]}><coneGeometry args={[0.17, 0.5, 7]} /><meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={2.6} /></mesh>
      </group>
      <pointLight ref={light} position={[0, 1.4, 0]} color="#ff9a4a" distance={12} />
    </group>
  );
}

// 둥근 천장을 따라 내려오는 꼬마전구 줄
function DomeLights() {
  const g = useRef<THREE.Group>(null);
  const bulbs = useMemo(() => {
    const out: { p: [number, number, number]; c: string }[] = [];
    const colors = ["#ffd84d", "#ff8fa3", "#7fe0ff", "#b7ff8a", "#ffffff"];
    for (let m = 0; m < 8; m++) {
      const az = (m / 8) * Math.PI * 2;
      for (let k = 1; k <= 7; k++) {
        const el = Math.PI / 2 - (k / 8) * (Math.PI / 2.3); // 꼭대기 → 아래
        const r = DOME - 0.12;
        const z = Math.sin(az) * Math.cos(el) * r;
        if (z > 0.5) continue; // 카메라 쪽 앞면은 시야를 가려서 뺌
        out.push({ p: [Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, z], c: colors[(m + k) % colors.length] });
      }
    }
    return out;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.children.forEach((c, i) => { ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + Math.sin(t * 2.5 + i * 0.7) * 0.9; });
  });
  return <group ref={g}>{bulbs.map((b, i) => <mesh key={i} position={b.p}><sphereGeometry args={[0.07, 8, 6]} /><meshStandardMaterial color={b.c} emissive={b.c} emissiveIntensity={1} /></mesh>)}</group>;
}

// 떠다니는 반짝이
function Glitter() {
  const pts = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 90, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = Math.random() * 4, t = Math.random() * Math.PI * 2; a[i * 3] = Math.cos(t) * r; a[i * 3 + 1] = 0.3 + Math.random() * 3.6; a[i * 3 + 2] = Math.sin(t) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g;
  }, []);
  useFrame(({ clock }) => { if (pts.current) { pts.current.rotation.y = clock.elapsedTime * 0.05; (pts.current.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.3; } });
  return <points ref={pts} geometry={geo}><pointsMaterial color="#fff6c8" size={0.07} transparent opacity={0.8} depthWrite={false} /></points>;
}

// 📖 소원 방명록: 얼음 판에 소원 별이 걸려 있음 (누르면 쓰기·보기)
function WishBoard({ count, onClick }: { count: number; onClick: () => void }) {
  const stars = Math.min(count, 24);
  return (
    <group position={[0, 0, -3.7]}
      onClick={(e) => { if (e.delta < 6) { e.stopPropagation(); onClick(); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[2.8, 0.9, 0.6]} /><meshStandardMaterial color="#d6ecff" transparent opacity={0.92} roughness={0.2} /></mesh>
      <mesh position={[0, 1.95, -0.05]}><boxGeometry args={[2.8, 1.9, 0.12]} /><meshStandardMaterial color="#bfe0ff" emissive="#7fb8ff" emissiveIntensity={0.35} transparent opacity={0.85} /></mesh>
      <mesh position={[0, 1.95, 0.02]}><planeGeometry args={[2.55, 1.65]} /><meshStandardMaterial color="#20345e" emissive="#1b2f66" emissiveIntensity={0.6} /></mesh>
      {Array.from({ length: stars }, (_, i) => {
        const col = i % 8, row = Math.floor(i / 8);
        return (
          <mesh key={i} position={[-1.05 + col * 0.3, 2.5 - row * 0.45 - (col % 2) * 0.12, 0.08]} rotation={[0, 0, i]}>
            <octahedronGeometry args={[0.08]} /><meshStandardMaterial color="#ffd84d" emissive="#ffb300" emissiveIntensity={1.8} />
          </mesh>
        );
      })}
      <pointLight position={[0, 2, 0.8]} color="#bcd9ff" intensity={2} distance={4} />
      <Html pointerEvents="none" position={[0, 3.15, 0.1]} center distanceFactor={7} zIndexRange={[4, 0]}>
        <div className="spot-tag igloo">📖 소원 방명록 · {count}개</div>
      </Html>
    </group>
  );
}

// 들어올 때 카메라를 정면(문 쪽)에서 방명록·모닥불이 다 보이게 맞춤
export function IglooCamera({ portrait, gaze, seat }: { portrait: boolean; gaze?: boolean; seat?: number | null }) {
  const camera = useThree((st) => st.camera);
  const controls = useThree((st) => st.controls) as unknown as { target: THREE.Vector3; update: () => void; enabled: boolean } | null;
  useEffect(() => {
    camera.position.set(0, portrait ? 5.2 : 4.2, portrait ? 7.2 : 6.2);
    if (controls) { controls.target.set(0, 1, -0.6); controls.update(); } else camera.lookAt(0, 1, -0.6);
  }, [camera, controls, portrait]);
  const want = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 0.9, 0), []);
  useFrame((_, dt) => {
    if (!gaze || seat === null || seat === undefined || !controls) return;
    // 내 자리 옆·위에서 불을 내려다봄 (내 머리가 불을 가리지 않게)
    const ang = Math.PI / 2 + (seat / SEATS) * Math.PI * 2 + 0.3 + 0.55;
    want.set(Math.cos(ang) * 4.2, 2.5, Math.sin(ang) * 4.2);
    camera.position.lerp(want, Math.min(1, dt * 1.5));
    controls.target.lerp(look, Math.min(1, dt * 2));
    controls.update();
  });
  return null;
}

// 불꽃에서 올라가는 불티
function Embers() {
  const pts = useRef<THREE.Points>(null);
  const n = 40;
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); return g; }, []);
  const seeds = useMemo(() => Array.from({ length: n }, () => [Math.random(), Math.random() * Math.PI * 2, 0.4 + Math.random() * 0.6]), []);
  useFrame(({ clock }) => {
    const a = geo.attributes.position as THREE.BufferAttribute, t = clock.elapsedTime;
    seeds.forEach(([o, ang, sp], i) => {
      const k = (t * sp * 0.35 + o) % 1;
      a.setXYZ(i, Math.cos(ang + t) * 0.25 * (1 - k) + Math.sin(t * 3 + i) * 0.05, 0.7 + k * 2.6, Math.sin(ang + t) * 0.25 * (1 - k));
    });
    a.needsUpdate = true;
    if (pts.current) (pts.current.material as THREE.PointsMaterial).opacity = 0.75 + Math.sin(t * 6) * 0.2;
  });
  return <points ref={pts} geometry={geo}><pointsMaterial color="#ffb347" size={0.06} transparent opacity={0.8} depthWrite={false} /></points>;
}

// 이글루 안 사람: 목표 자리로 부드럽게 걸어가서 앉거나 섬
function IglooPersonView({ p, mine, emote }: { p: IglooPerson; mine: boolean; emote: string | null }) {
  const g = useRef<THREE.Group>(null);
  const [walking, setWalking] = useState(false);
  const target = p.seat !== null ? seatPos(p.seat) : { x: p.x, z: p.z };
  useFrame((_, dt) => {
    const o = g.current; if (!o) return;
    const dx = target.x - o.position.x, dz = target.z - o.position.z, d = Math.hypot(dx, dz);
    const mv = d > 0.03;
    if (mv !== walking) setWalking(mv);
    if (mv) {
      const step = Math.min(d, 2.2 * dt);
      o.position.x += (dx / d) * step; o.position.z += (dz / d) * step;
      o.rotation.y = Math.atan2(dx, dz);
      o.position.y = 0;
    } else {
      o.rotation.y = Math.atan2(-o.position.x, -o.position.z); // 불 쪽을 바라봄
      o.position.y = p.seat !== null ? 0.16 : 0;
    }
  });
  return (
    <group ref={g} position={[target.x, 0, target.z]}>
      <Character3D avatar={parseAvatar(p.avatar) ?? DEFAULT_AVATAR} walking={walking} />
      <Html pointerEvents="none" position={[0, 1.8, 0]} center distanceFactor={7} zIndexRange={[5, 0]}>
        <div className={mine ? "name-tag mine" : "name-tag"}>{p.nick}{mine ? " (나)" : ""}{p.gaze ? " 🔥" : ""}</div>
      </Html>
      {emote && <Html pointerEvents="none" position={[0, 2.35, 0]} center distanceFactor={7} zIndexRange={[6, 0]}><div className="emote-bubble"><IconText text={emote} /></div></Html>}
    </group>
  );
}

export function IglooScene({ people, myKey, emotes, wishCount, onBoard, onSeat, onFloor }: {
  people: IglooPerson[]; myKey: string; emotes: Record<string, { e: string; t: number }>; wishCount: number; onBoard: () => void;
  onSeat?: (i: number) => void; onFloor?: (x: number, z: number) => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  return (
    <>
      <color attach="background" args={["#0d1630"]} />
      <ambientLight intensity={0.35} color="#ffe6c7" />
      <hemisphereLight args={["#cfe6ff", "#ffb380", 0.35]} />
      {/* 둥근 얼음 벽 (안쪽에서 보이게) + 얼음 블록 줄 */}
      <mesh><sphereGeometry args={[DOME, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#dcecff" emissive="#7fb2e6" emissiveIntensity={0.18} side={THREE.BackSide} roughness={0.6} /></mesh>
      {[0.9, 1.8, 2.7, 3.5, 4.2].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[Math.sqrt(DOME * DOME - y * y) - 0.03, 0.03, 4, 60, Math.PI]} /><meshStandardMaterial color="#a9c8ea" /></mesh>)}
      {/* 바닥: 눈 + 둥근 털 러그 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { if (onFloor && e.delta < 6) { e.stopPropagation(); onFloor(e.point.x, e.point.z); } }}><circleGeometry args={[DOME, 48]} /><meshStandardMaterial color="#f2f7ff" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} onClick={(e) => { if (onFloor && e.delta < 6) { e.stopPropagation(); onFloor(e.point.x, e.point.z); } }}><circleGeometry args={[3.2, 48]} /><meshStandardMaterial color="#e8cfa6" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[2.85, 3.0, 48]} /><meshStandardMaterial color="#c0392b" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[1.2, 1.3, 40]} /><meshStandardMaterial color="#c0392b" /></mesh>
      <Brazier />
      <Embers />
      <DomeLights />
      <Glitter />
      {/* 벽 아래 얼음 등불 */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return (
          <group key={i} position={[Math.cos(a) * 4.3, 0, Math.sin(a) * 4.3]}>
            <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.35, 0.6, 0.35]} /><meshStandardMaterial color="#cfe8ff" transparent opacity={0.7} /></mesh>
            <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#ffe9a8" emissive="#ffcf70" emissiveIntensity={2} /></mesh>
          </group>
        );
      })}
      <WishBoard count={wishCount} onClick={onBoard} />
      {/* 방석 (누르면 거기 가서 앉음) */}
      {Array.from({ length: SEATS }, (_, i) => {
        const sp = seatPos(i);
        return (
          <group key={i} position={[sp.x, 0, sp.z]}
            onClick={(e) => { if (onSeat && e.delta < 6) { e.stopPropagation(); onSeat(i); } }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { document.body.style.cursor = "auto"; }}>
            <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.42, 0.45, 0.16, 18]} /><meshStandardMaterial color={["#d64545", "#3d6fb6", "#f2c14e", "#2f7a4b", "#8a5cc2"][i % 5]} /></mesh>
            <mesh position={[0, 0.17, 0]}><torusGeometry args={[0.3, 0.025, 6, 20]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.5} /></mesh>
          </group>
        );
      })}
      {/* 안에 있는 사람들 */}
      {people.slice(0, 24).map((p) => (
        <IglooPersonView key={p.key} p={p} mine={p.key === myKey}
          emote={emotes[p.key] && Date.now() - emotes[p.key].t < 3500 ? emotes[p.key].e : null} />
      ))}
    </>
  );
}

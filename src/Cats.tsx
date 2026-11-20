import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { BENCHES, SIT_Y } from "./benches";
import { STALLS } from "./Snack";
import { clampSpot } from "./Walk";
import { IconText } from "./FoodIcon";

// 🐱 광장 고양이 두 마리 (사용자 집 고양이 사진을 보고 무늬를 만듦)
// - 밤: 삼색 암컷 (흰 바탕, 등에 주황·검정 큰 얼룩, 머리 위 주황·검정, 꼬리 주황+검정 띠)
// - 캔디: 고등어 태비(갈색 줄무늬)에 주황이 살짝, 흰 코·가슴·발
// 하는 일은 시계로 정해서(12초마다 바뀜) 모든 사람에게 거의 같게 보임. '사람에게 다가오기'만 내 화면에서 나에게 옴.

export const CAT_HOUSE = { x: 4.4, z: 5.2 };
const SLOT = 12000;
const SPEED = 1.3;

type Act = "wander" | "roll" | "snack" | "sleep" | "bench" | "roof" | "visit";
const ACTS: [Act, number][] = [["wander", 22], ["roll", 13], ["snack", 12], ["sleep", 11], ["bench", 13], ["roof", 10], ["visit", 19]];
const hash = (a: number, b: number) => { const x = Math.sin(a * 91.7 + b * 47.3) * 43758.5453; return x - Math.floor(x); };
function pickAct(cat: number, slot: number): Act {
  let r = hash(cat + 3, slot) * ACTS.reduce((s, [, w]) => s + w, 0);
  for (const [a, w] of ACTS) { if ((r -= w) < 0) return a; }
  return "wander";
}

type Plan = { act: Act; x: number; z: number; y: number; say?: string };
function plan(cat: number, slot: number): Plan {
  const act = pickAct(cat, slot);
  const h = hash(cat + 11, slot), h2 = hash(cat + 23, slot);
  if (act === "snack") {
    const st = STALLS[Math.floor(h * STALLS.length)];
    const d = Math.hypot(st.spot.x, st.spot.z);
    const [x, z] = clampSpot(st.spot.x - (st.spot.x / d) * 1.5 + (cat ? 0.4 : -0.4), st.spot.z - (st.spot.z / d) * 1.5);
    return { act, x, z, y: 0, say: st.id === "bungeo" ? "냠냠 [붕어빵]" : st.id === "cocoa" ? "할짝할짝 🥛" : "냠냠 🍢" };
  }
  if (act === "sleep") return { act, x: CAT_HOUSE.x + (cat ? 0.25 : -0.25), z: CAT_HOUSE.z + 0.15, y: 0, say: "zzZ…" };
  if (act === "bench") {
    const benches = BENCHES.filter((b) => b.kind === "bench");
    const b = benches[Math.floor(h * benches.length)];
    return { act, x: b.x + (cat ? 0.35 : -0.35), z: b.z, y: SIT_Y + 0.05, say: "골골골… 😽" };
  }
  if (act === "roof") {
    // 노점 지붕 또는 고양이 집 지붕 위로 폴짝
    if (h < 0.35) return { act, x: CAT_HOUSE.x, z: CAT_HOUSE.z, y: 1.25, say: "여기가 제일 좋아냥 😼" };
    const st = STALLS[Math.floor(h2 * STALLS.length)];
    return { act, x: st.spot.x, z: st.spot.z, y: 2.3, say: "높은 데 최고! 😼" };
  }
  const a = h * Math.PI * 2, r = 3 + h2 * 8;
  const [x, z] = clampSpot(Math.cos(a) * r, Math.sin(a) * r);
  return { act, x, z, y: 0, say: act === "roll" ? "뒹굴뒹굴~ 🐾" : act === "visit" ? "애옹~ 💕" : undefined };
}

// ---------------- 고양이 모양 ----------------
// 무늬는 공 표면의 점마다 색을 정해서 칠함 → 몸 밖으로 튀어나오지 않고 매끈함
// (x,y,z)는 -1~1 사이 공 위의 위치: x 오른쪽, y 위, z 앞(얼굴 쪽)
type Painter = (x: number, y: number, z: number) => string;
type Look = { eye: string; bodyPaint: Painter; headPaint: Painter; tail: string[]; ear: [string, string]; muzzle: string };
const near = (x: number, y: number, z: number, cx: number, cy: number, cz: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 < r * r;
const WHITE = "#fbf8f2", ORANGE = "#d27a32", BLACK = "#231d1d";
const TABBY = "#8b7357", TABBY_DARK = "#2e2620", TABBY_ORANGE = "#b8742f", TABBY_WHITE = "#f6f2ec";

function paintedSphere(paint: Painter) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.set(paint(pos.getX(i), pos.getY(i), pos.getZ(i)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

export const LOOKS: Look[] = [
  { // 밤: 삼색 — 흰 바탕, 등에 주황·검정 큰 얼룩, 머리는 왼쪽 주황·오른쪽 검정
    eye: "#9cc77a", muzzle: WHITE,
    bodyPaint: (x, y, z) =>
      near(x, y, z, 0.55, 0.45, -0.75, 0.55) ? BLACK
        : near(x, y, z, 0.15, 0.85, -0.25, 0.62) ? ORANGE
          : near(x, y, z, -0.35, 0.7, 0.45, 0.32) ? ORANGE
            : near(x, y, z, 0.9, 0.1, 0.05, 0.38) ? BLACK : WHITE,
    headPaint: (x, y, z) =>
      (z > 0.45 && y < 0.2) || (Math.abs(x) < 0.2 && z > 0.5) ? WHITE // 얼굴 아래·가운데 흰 줄
        : x < -0.05 && y > 0.15 ? ORANGE // 왼쪽 눈·귀 쪽 주황
          : x > 0.15 && y > 0.3 ? BLACK // 오른쪽 귀 쪽 검정
            : y > 0.55 && z < 0.2 ? ORANGE : WHITE,
    tail: [ORANGE, BLACK, ORANGE, BLACK], ear: [ORANGE, BLACK],
  },
  { // 캔디: 고등어 태비 + 주황 살짝, 배·가슴·발·코·입은 하얗게
    eye: "#a6c46a", muzzle: TABBY_WHITE,
    bodyPaint: (x, y, z) => {
      if (y < -0.25 || (z > 0.55 && y < 0.25)) return TABBY_WHITE; // 배·가슴
      const stripe = Math.sin(z * 13 + x * x * 2.5) > 0.45 && y > -0.1;
      if (stripe) return TABBY_DARK;
      if (near(x, y, z, -0.35, 0.55, -0.55, 0.42)) return TABBY_ORANGE;
      return TABBY;
    },
    headPaint: (x, y, z) => {
      if (z > 0.5 && y < -0.25) return TABBY_WHITE; // 턱·입 주변
      if (z > 0.65 && Math.abs(x) < 0.2 && y < 0.45) return TABBY_WHITE; // 코줄기 흰 줄
      if (y > 0.5 && z > 0.15 && Math.sin(x * 20) > 0.55) return TABBY_DARK; // 이마 M자 줄
      if (Math.abs(x) > 0.75 && Math.sin(y * 10) > 0.6) return TABBY_DARK; // 볼 줄
      if (near(x, y, z, -0.55, 0.35, 0.45, 0.3)) return TABBY_ORANGE;
      return TABBY;
    },
    tail: [TABBY, TABBY_DARK, TABBY, TABBY_DARK], ear: ["#6f5a44", "#6f5a44"],
  },
];

export function CatBody({ look, pose, t }: { look: Look; pose: string; t: number }) {
  const paint = useMemo(() => ({ body: paintedSphere(look.bodyPaint), head: paintedSphere(look.headPaint) }), [look]);
  const walk = pose === "walk";
  const legSwing = walk ? Math.sin(t * 12) * 0.5 : 0;
  const sitting = pose === "sit";
  const lying = pose === "sleep" || pose === "roll";
  return (
    <group>
      {/* 몸 */}
      <group position={[0, lying ? 0.13 : 0.24, 0]} rotation={[sitting ? -0.45 : 0, 0, 0]}>
        <mesh scale={[0.21, 0.19, 0.31]} geometry={paint.body}><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
        {/* 꼬리 (띠 무늬) */}
        <group position={[0, 0.05, -0.3]} rotation={[sitting ? 1.3 : walk ? -0.5 + Math.sin(t * 4) * 0.2 : 0.9, Math.sin(t * 2) * 0.3, 0]}>
          {look.tail.map((c, i) => <mesh key={i} position={[0, 0, -0.07 - i * 0.08]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035 - i * 0.003, 0.038 - i * 0.003, 0.085, 10]} /><meshStandardMaterial color={c} roughness={0.9} /></mesh>)}
          <mesh position={[0, 0, -0.07 - look.tail.length * 0.08 + 0.02]}><sphereGeometry args={[0.024, 10, 8]} /><meshStandardMaterial color={look.tail[look.tail.length - 1]} /></mesh>
        </group>
      </group>
      {/* 다리 */}
      {!lying && [[-0.1, 0.17], [0.1, 0.17], [-0.1, -0.17], [0.1, -0.17]].map(([x, z], i) => (
        <group key={i} position={[x, 0.16, sitting && z < 0 ? -0.05 : z]} rotation={[sitting && z < 0 ? 0 : (i % 2 ? legSwing : -legSwing), 0, 0]}>
          <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.035, 0.035, sitting && z < 0 ? 0.08 : 0.17, 8]} /><meshStandardMaterial color={look.ear[1] === BLACK ? WHITE : TABBY} /></mesh>
          <mesh position={[0, -0.16, 0.01]}><sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </group>
      ))}
      {/* 머리: 귀여운 캐릭터풍 (동그란 얼굴, 초록 눈, 볼터치, 뾰족 귀) */}
      <group position={[0, lying ? 0.2 : sitting ? 0.56 : 0.46, lying ? 0.32 : sitting ? 0.2 : 0.34]} rotation={[0, 0, pose === "sit" ? Math.sin(t * 0.8) * 0.12 : 0]}>
        <mesh scale={[0.2, 0.175, 0.18]} geometry={paint.head}><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
        {/* 귀: 뾰족한 삼각형 */}
        {[-1, 1].map((sd, i) => (
          <group key={sd} position={[sd * 0.115, 0.165, 0]} rotation={[0, 0, -sd * 0.34]}>
            <mesh rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.45]}><coneGeometry args={[0.085, 0.17, 4]} /><meshStandardMaterial color={look.ear[i]} flatShading /></mesh>
            <mesh position={[0, -0.012, 0.022]} rotation={[0, Math.PI / 4, 0]} scale={[0.6, 0.7, 0.2]}><coneGeometry args={[0.08, 0.15, 4]} /><meshStandardMaterial color="#f7b6c2" flatShading /></mesh>
          </group>
        ))}
        {/* 주둥이: 하얀 ω 볼 + 분홍 코 + 입 */}
        {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.032, -0.055, 0.15]} scale={[0.04, 0.032, 0.03]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={look.muzzle} roughness={0.9} /></mesh>)}
        <mesh position={[0, -0.025, 0.175]} rotation={[Math.PI, 0, 0]} scale={[1.25, 0.9, 0.7]}><coneGeometry args={[0.017, 0.022, 3]} /><meshStandardMaterial color="#f08a98" /></mesh>
        {/* 볼터치 */}
        {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.105, -0.035, 0.135]} rotation={[0, sd * 0.6, 0]}><circleGeometry args={[0.024, 14]} /><meshBasicMaterial color="#ff9fb2" transparent opacity={0.55} depthWrite={false} /></mesh>)}
        {/* 눈: 동그랗고 초롱초롱 (얼굴 표면에 쏙 박히게 납작하게) */}
        {[-0.07, 0.07].map((x) => (
          <group key={x} position={[x, 0.012, 0.158]}>
            {pose === "sleep"
              ? <mesh position={[0, 0, 0.012]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.022, 0.006, 4, 10, Math.PI]} /><meshStandardMaterial color="#2a1f1a" /></mesh>
              : <>
                {/* 초록 눈 + 세로 동공 + 반짝이 (사용자가 고른 눈) — 납작하게 얼굴에 박힘 */}
                <mesh scale={[1, 1.1, 0.3]}><sphereGeometry args={[0.04, 18, 14]} /><meshStandardMaterial color={look.eye} roughness={0.25} /></mesh>
                <mesh position={[0, 0, 0.004]} scale={[0.36, 1.0, 0.3]}><sphereGeometry args={[0.032, 12, 10]} /><meshStandardMaterial color="#141010" /></mesh>
                <mesh position={[0.014, 0.017, 0.0135]}><circleGeometry args={[0.01, 12]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[-0.008, -0.016, 0.0135]}><circleGeometry args={[0.0045, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
              </>}
          </group>
        ))}
      </group>
    </group>
  );
}

function Cat({ id, name, me, onTap }: { id: number; name: string; me: () => { x: number; z: number }; onTap: (id: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const st = useRef({ x: id ? 2.8 : -2.8, z: id ? 5.8 : 5.4, y: 0, ry: 0, slot: -1, plan: null as Plan | null, arrived: false });
  const [view, setView] = useState({ pose: "walk", say: "" as string, sayAt: 0 });
  const tRef = useRef(0);
  const look = LOOKS[id];

  useFrame((_, dt) => {
    const s = st.current;
    const now = Date.now();
    tRef.current += dt;
    const slot = Math.floor((now + id * 5300) / SLOT);
    if (slot !== s.slot) { s.slot = slot; s.plan = plan(id, slot); s.arrived = false; }
    const p = s.plan!;
    let tx = p.x, tz = p.z;
    if (p.act === "visit") { // 나에게 다가와서 옆에 앉음
      const m = me(); const dx = s.x - m.x, dz = s.z - m.z, d = Math.hypot(dx, dz) || 1;
      tx = m.x + (dx / d) * 0.8; tz = m.z + (dz / d) * 0.8;
    }
    const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
    const high = p.y > 0.5;
    // 높은 곳: 바로 앞까지 걸어간 뒤 폴짝 (지붕은 내려올 때도 폴짝)
    if (!high && s.y > 0.05 && s.plan) s.y = Math.max(0, s.y - dt * 3);
    let pose = "walk";
    if (d > 0.08) {
      const step = Math.min(d, SPEED * dt * (s.y > 0.5 ? 0.6 : 1));
      s.x += (dx / d) * step; s.z += (dz / d) * step; s.ry = Math.atan2(dx, dz);
      if (high && d < 1.2) s.y = Math.min(p.y, s.y + dt * 4);
      if (!high && p.y > 0 && d < 0.6) s.y = Math.min(p.y, s.y + dt * 3);
    } else {
      s.y = s.y + (p.y - s.y) * Math.min(1, dt * 6);
      pose = p.act === "roll" ? "roll" : p.act === "sleep" ? "sleep" : p.act === "wander" ? "sit" : "sit";
      if (!s.arrived) {
        s.arrived = true;
        if (p.say) setView((v) => ({ ...v, say: p.say!, sayAt: now }));
        if (p.act === "visit" || p.act === "snack") { const m = me(); if (p.act === "visit") s.ry = Math.atan2(m.x - s.x, m.z - s.z); }
      }
    }
    if (g.current) { g.current.position.set(s.x, s.y, s.z); g.current.rotation.y = s.ry; }
    if (roll.current) roll.current.rotation.z = pose === "roll" ? Math.PI * 0.75 + Math.sin(tRef.current * 2.2) * 0.9 : pose === "sleep" ? 0.15 : 0;
    if (pose !== view.pose) setView((v) => ({ ...v, pose }));
  });

  const sayOn = view.say && Date.now() - view.sayAt < 4000;
  return (
    <group ref={g}
      onClick={(e) => { if (e.delta < 6) { e.stopPropagation(); onTap(id); setView((v) => ({ ...v, say: "애옹~ 💕", sayAt: Date.now() })); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      <group ref={roll}><CatBody look={look} pose={view.pose} t={tRef.current} /></group>
      {/* 누르기 쉽게 투명 영역 */}
      <mesh position={[0, 0.3, 0.05]}><boxGeometry args={[0.7, 0.7, 0.9]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <Html pointerEvents="none" position={[0, 0.95, 0]} center distanceFactor={9} zIndexRange={[5, 0]}>
        <div className="cat-tag"><span className="cat-heart">💖</span>{name}</div>
      </Html>
      {sayOn && (
        <Html pointerEvents="none" position={[0, 1.3, 0]} center distanceFactor={9} zIndexRange={[7, 0]}>
          <div className="say-bubble cat-say" key={view.sayAt}><IconText text={view.say} /></div>
        </Html>
      )}
    </group>
  );
}

// 🏠 고양이 집 (밤·캔디네)
function CatHouse() {
  return (
    <group position={[CAT_HOUSE.x, 0, CAT_HOUSE.z]} rotation={[0, Math.atan2(-CAT_HOUSE.x, -CAT_HOUSE.z), 0]}>
      <mesh position={[0, 0.4, 0]}><boxGeometry args={[1.3, 0.8, 1.0]} /><meshStandardMaterial color="#f3c98b" /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.36, 1.0, 0]} rotation={[0, 0, s * -0.7]}><boxGeometry args={[0.95, 0.07, 1.15]} /><meshStandardMaterial color="#d9534f" /></mesh>
      ))}
      <mesh position={[0, 1.22, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.12, 0.12, 1.15]} /><meshStandardMaterial color="#f4f7fb" /></mesh>
      <mesh position={[0, 0.32, 0.505]}><circleGeometry args={[0.26, 20]} /><meshStandardMaterial color="#3b2a20" /></mesh>
      <mesh position={[0, 0.06, 0.15]}><cylinderGeometry args={[0.45, 0.45, 0.06, 20]} /><meshStandardMaterial color="#f2a6b0" /></mesh>
      {/* 생선 뼈 장식 + 발자국 */}
      <mesh position={[0.42, 0.62, 0.51]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.22, 0.03, 0.01]} /><meshStandardMaterial color="#ffffff" /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0.36 + i * 0.06, 0.62, 0.515]}><boxGeometry args={[0.012, 0.09, 0.01]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
      <mesh position={[0, 0.66, 0.51]} rotation={[0, 0, 0]}><sphereGeometry args={[0.035, 8, 6]} /><meshStandardMaterial color="#ffd84d" emissive="#ffb300" emissiveIntensity={1.2} /></mesh>
      <pointLight position={[0, 0.8, 0.9]} color="#ffcf70" intensity={1.5} distance={3} />
      <Html pointerEvents="none" position={[0, 1.6, 0]} center distanceFactor={11} zIndexRange={[4, 0]}>
        <div className="spot-tag cat">🐾 밤·캔디네 집</div>
      </Html>
    </group>
  );
}

// 귀여운 '애옹' 소리 (누를 때만, 작게)
let actx: AudioContext | null = null;
export function playMeow() {
  try {
    actx = actx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(900, t + 0.12); o.frequency.linearRampToValueAtTime(520, t + 0.45);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.55);
  } catch { /* 무시 */ }
}

export default function Cats({ me }: { me: () => { x: number; z: number } }) {
  const names = useMemo(() => ["밤", "캔디"], []);
  return (
    <>
      <CatHouse />
      {names.map((n, i) => <Cat key={n} id={i} name={n} me={me} onTap={() => playMeow()} />)}
    </>
  );
}


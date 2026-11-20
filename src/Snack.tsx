import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Modal } from "./RoomView";

// 먹거리 노점 3곳: 분식집 / 붕어빵 / 코코아. 메뉴를 고르면 머리 위 음식 + 소리 말풍선 3번, 모두에게 보임, 무료.
// (참고 사이트의 간식 가판대 + 소리 말풍선 방식을 벤치마킹, 메뉴·문구는 직접 작성)
type Item = { id: string; emoji: string; name: string; sounds: string[] };
export type Stall = { id: string; title: string; icon: string; spot: { x: number; z: number }; stripe: string; body: string; tag: string; items: Item[] };

export const STALLS: Stall[] = [
  {
    id: "bunsik", title: "분식집", icon: "🍢", spot: { x: 8.5, z: -11 }, stripe: "#e0322d", body: "#f3e2c6", tag: "#e07a1f",
    items: [
      { id: "tteok", emoji: "🌶️", name: "떡볶이", sounds: ["쫀득쫀득~", "앗 매워! 🔥", "그래도 맛있어 😋"] },
      { id: "mandu", emoji: "🥟", name: "만두", sounds: ["호호 뜨거워~", "냠냠 😋", "육즙 팡!"] },
      { id: "eomuk", emoji: "🍢", name: "어묵", sounds: ["호로록~", "국물이 끝내줘 ♨️", "후루룩 😌"] },
      { id: "sundae", emoji: "🌭", name: "순대", sounds: ["쫄깃쫄깃~", "소금 콕콕 🧂", "냠냠 😋"] },
      { id: "twigim", emoji: "🍤", name: "튀김모둠", sounds: ["바삭바삭!", "떡볶이 국물에 콕 🌶️", "와삭 😆"] },
      { id: "bungeo", emoji: "🐟", name: "붕어빵", sounds: ["따끈따끈~", "팥이 가득 😍", "꼬리부터 냠"] },
    ],
  },
  {
    id: "bungeo", title: "붕어빵 노점", icon: "🐟", spot: { x: 10.5, z: 1.5 }, stripe: "#2f6fd6", body: "#fff4dc", tag: "#2f6fd6",
    items: [
      { id: "cream", emoji: "🐟", name: "슈크림붕어빵", sounds: ["말랑~ 슈크림이 쭉!", "달콤해 😍", "하나 더 먹을래"] },
      { id: "pizza", emoji: "🍕", name: "피자붕어빵", sounds: ["치즈가 쭈욱~ 🧀", "짭짤 고소해!", "이건 반칙이야 😋"] },
      { id: "redbean", emoji: "🫘", name: "팥많이붕어빵", sounds: ["팥이 꽉꽉!", "꼬리까지 팥이야 😆", "역시 원조가 최고"] },
      { id: "hoppang", emoji: "🥮", name: "호빵", sounds: ["호호~ 김이 모락모락", "폭신폭신 ☁️", "속이 따뜻해져 😌"] },
      { id: "milk", emoji: "🥛", name: "우유", sounds: ["꿀꺽꿀꺽", "붕어빵엔 역시 우유 🥛", "캬~ 😆"] },
    ],
  },
  {
    id: "cocoa", title: "코코아 노점", icon: "☕", spot: { x: -10.5, z: 1.5 }, stripe: "#7a4a2b", body: "#f6e7d6", tag: "#8b5a3c",
    items: [
      { id: "cocoa", emoji: "☕", name: "핫코코아", sounds: ["후~ 후~", "달달 따뜻해 😌", "손이 녹는다~"] },
      { id: "mallow", emoji: "🍫", name: "마시멜로 코코아", sounds: ["마시멜로 둥실둥실~", "쫀득 달콤 😍", "입가에 거품 묻었다 😆"] },
      { id: "yuja", emoji: "🍋", name: "유자차", sounds: ["상큼 따뜻~", "목이 편안해 🍋", "후르륵 😌"] },
      { id: "warmmilk", emoji: "🥛", name: "따뜻한 우유", sounds: ["포근포근~", "졸음이 솔솔 😪", "꿀꺽"] },
    ],
  },
];
// 예전 이름 호환
export const SNACKS = STALLS[0].items;
export const SNACK_SPOT = STALLS[0].spot;

// 간판: 가게 이름 + 파는 것 (캔버스에 글씨를 그려서 붙임)
function useSignTexture(stall: Stall) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 160;
    const g = c.getContext("2d")!;
    g.fillStyle = stall.tag; g.beginPath(); g.roundRect(6, 6, 500, 148, 26); g.fill();
    g.lineWidth = 8; g.strokeStyle = "#ffd84d"; g.stroke();
    g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 66px sans-serif"; g.fillText(`${stall.icon} ${stall.title}`, 256, 62);
    g.font = "bold 30px sans-serif"; g.fillStyle = "#fff6d6";
    const names = stall.items.map((i) => i.name.replace("붕어빵", "")).join(" · ");
    g.fillText(names.length > 26 ? names.slice(0, 25) + "…" : names, 256, 122);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [stall]);
}

// 지붕 위 큰 모형: 붕어빵 / 어묵·떡꼬치 / 코코아 머그
function RoofModel({ id }: { id: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    g.current.position.y = 3.35 + Math.sin(t * 1.6) * 0.08;
    g.current.rotation.z = Math.sin(t * 1.1) * 0.08;
  });
  return (
    <group ref={g} position={[0, 3.35, 0.3]}>
      {id === "bungeo" && <>
        <mesh scale={[1.3, 0.75, 0.38]}><sphereGeometry args={[0.5, 20, 14]} /><meshStandardMaterial color="#d9963f" roughness={0.6} /></mesh>
        <mesh position={[-0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.35]}><coneGeometry args={[0.35, 0.45, 4]} /><meshStandardMaterial color="#c8822f" /></mesh>
        <mesh position={[0.05, 0.38, 0]} rotation={[0, 0, -0.3]} scale={[1, 1, 0.3]}><coneGeometry args={[0.16, 0.25, 4]} /><meshStandardMaterial color="#c8822f" /></mesh>
        <mesh position={[0.42, 0.1, 0.17]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
        <mesh position={[0.44, 0.12, 0.22]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[0.55, -0.12, 0.13]} rotation={[0, 0, 0.3]}><torusGeometry args={[0.07, 0.015, 6, 12, Math.PI]} /><meshStandardMaterial color="#7a4a1c" /></mesh>
        {/* 비늘 무늬 */}
        {[-0.3, -0.05, 0.2].map((x) => [-0.12, 0.12].map((y) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.18]}><torusGeometry args={[0.08, 0.015, 6, 12, Math.PI]} /><meshStandardMaterial color="#b06f25" /></mesh>
        )))}
      </>}
      {id === "bunsik" && <>
        {/* 어묵 꼬치 */}
        <group rotation={[0, 0, 0.25]} position={[-0.3, 0, 0]}>
          <mesh><cylinderGeometry args={[0.03, 0.03, 1.4, 6]} /><meshStandardMaterial color="#d9b48f" /></mesh>
          {[0.35, 0.1, -0.15, -0.4].map((y, i) => (
            <mesh key={y} position={[i % 2 ? 0.1 : -0.1, y, 0]} rotation={[0, 0, i % 2 ? -0.45 : 0.45]}><boxGeometry args={[0.55, 0.07, 0.4]} /><meshStandardMaterial color="#e8b56a" /></mesh>
          ))}
        </group>
        {/* 떡꼬치 */}
        <group rotation={[0, 0, -0.25]} position={[0.35, -0.05, 0]}>
          <mesh><cylinderGeometry args={[0.03, 0.03, 1.4, 6]} /><meshStandardMaterial color="#d9b48f" /></mesh>
          {[0.4, 0.15, -0.1, -0.35].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.32, 12]} /><meshStandardMaterial color="#d8341f" roughness={0.3} /></mesh>
          ))}
        </group>
      </>}
      {id === "cocoa" && <>
        <mesh><cylinderGeometry args={[0.38, 0.33, 0.62, 20]} /><meshStandardMaterial color="#c8102e" /></mesh>
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.385, 0.37, 0.12, 20]} /><meshStandardMaterial color="#ffffff" /></mesh>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.34, 0.34, 0.03, 20]} /><meshStandardMaterial color="#5a3320" /></mesh>
        <mesh position={[0.43, 0, 0]}><torusGeometry args={[0.15, 0.05, 8, 16]} /><meshStandardMaterial color="#c8102e" /></mesh>
        {[[-0.12, 0.05], [0.1, -0.08], [0.05, 0.14]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]} rotation={[0.3, i, 0]}><boxGeometry args={[0.12, 0.1, 0.12]} /><meshStandardMaterial color="#fff4fa" /></mesh>
        ))}
      </>}
    </group>
  );
}

// 처마 끝 반짝이 전구 (번갈아 깜빡)
function Marquee() {
  const g = useRef<THREE.Group>(null);
  const colors = ["#ffd84d", "#ff5a5a", "#7fe0ff", "#7dff9a"];
  useFrame(({ clock }) => {
    const on = Math.floor(clock.elapsedTime * 2.5) % 2;
    g.current?.children.forEach((c, i) => { ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = (i % 2) === on ? 2.2 : 0.4; });
  });
  return (
    <group ref={g}>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[-1.3 + i * (2.6 / 11), 1.9, 0.9]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshStandardMaterial color={colors[i % 4]} emissive={colors[i % 4]} emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  );
}

export function SnackStand({ stall, onOpen }: { stall: Stall; onOpen?: () => void }) {
  const sign = useSignTexture(stall);
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    steam.current?.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1;
      c.position.y = 1.3 + t * 0.9;
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - t);
    });
  });
  const { spot } = stall;
  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, Math.atan2(-spot.x, -spot.z), 0]}
      onClick={(e) => { if (onOpen && e.delta < 6) { e.stopPropagation(); onOpen(); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[2.6, 1.1, 1.2]} /><meshStandardMaterial color={stall.body} /></mesh>
      <mesh position={[0, 1.12, 0.1]}><boxGeometry args={[2.7, 0.06, 1.4]} /><meshStandardMaterial color="#8b5a3c" /></mesh>
      {/* 판 (분식: 떡볶이 / 붕어빵: 틀 / 코코아: 냄비) */}
      <mesh position={[-0.6, 1.2, 0.2]}>
        {stall.id === "cocoa" ? <cylinderGeometry args={[0.3, 0.3, 0.3, 14]} /> : <boxGeometry args={[0.9, 0.1, 0.6]} />}
        <meshStandardMaterial color={stall.id === "bunsik" ? "#c8102e" : stall.id === "bungeo" ? "#3a3a40" : "#6b3e26"} />
      </mesh>
      {stall.id === "bungeo" && [0.25, 0.55, 0.85].map((x) => (
        <mesh key={x} position={[x, 1.2, 0.2]} rotation={[0, 0, Math.PI / 2]} scale={[0.6, 1.4, 0.5]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#d9963f" /></mesh>
      ))}
      {stall.id === "bunsik" && [0.35, 0.55, 0.75].map((x) => <mesh key={x} position={[x, 1.38, 0.2]}><cylinderGeometry args={[0.012, 0.012, 0.5, 4]} /><meshStandardMaterial color="#d9b48f" /></mesh>)}
      {stall.id === "cocoa" && [0.3, 0.6, 0.9].map((x) => <mesh key={x} position={[x, 1.24, 0.25]}><cylinderGeometry args={[0.08, 0.07, 0.16, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
      {[-1.25, 1.25].map((x) => <mesh key={x} position={[x, 1.6, 0.5]}><cylinderGeometry args={[0.04, 0.04, 1.0, 6]} /><meshStandardMaterial color="#5a3a2e" /></mesh>)}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-1.25 + 0.5 * i + 0.25, 2.15, 0.25]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.5, 0.05, 1.3]} /><meshStandardMaterial color={i % 2 ? "#ffffff" : stall.stripe} />
        </mesh>
      ))}
      <group ref={steam}>
        {[0, 1, 2].map((i) => <mesh key={i} position={[-0.6 + i * 0.15, 1.3, 0.2]}><sphereGeometry args={[0.12, 8, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} /></mesh>)}
      </group>
      <pointLight position={[0, 1.8, 1]} color="#ffcf70" intensity={3} distance={5} />
      {/* ✨ 꾸미기: 간판 · 처마 전구 · 리스 · 작은 트리 · 지붕 모형 */}
      <mesh position={[0, 2.62, 0.22]}><boxGeometry args={[2.5, 0.82, 0.08]} /><meshStandardMaterial color="#5a3a2e" /></mesh>
      <mesh position={[0, 2.62, 0.27]}><planeGeometry args={[2.4, 0.75]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      <Marquee />
      <group position={[-0.85, 0.62, 0.61]}>
        <mesh><torusGeometry args={[0.2, 0.07, 8, 20]} /><meshStandardMaterial color="#2e7d4f" /></mesh>
        {[0, 1.6, 3.2, 4.8].map((a) => <mesh key={a} position={[Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.06]}><sphereGeometry args={[0.035, 6, 6]} /><meshStandardMaterial color="#e23b3b" /></mesh>)}
        <mesh position={[0, -0.2, 0.07]} scale={[1.6, 0.8, 0.5]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color="#d62f2f" /></mesh>
      </group>
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 0, 0.35]}>
          <mesh position={[0, 0.45, 0]}><coneGeometry args={[0.32, 0.8, 10]} /><meshStandardMaterial color="#2e7d4f" /></mesh>
          <mesh position={[0, 0.9, 0]}><octahedronGeometry args={[0.08]} /><meshStandardMaterial color="#ffd84d" emissive="#ffb300" emissiveIntensity={1.2} /></mesh>
          {[0.25, 0.5].map((y, i) => <mesh key={y} position={[(i ? -1 : 1) * 0.15, y, 0.18]}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color={i ? "#7fe0ff" : "#ff5a5a"} emissive={i ? "#7fe0ff" : "#ff5a5a"} emissiveIntensity={1} /></mesh>)}
        </group>
      ))}
      <RoofModel id={stall.id} />
      <Html pointerEvents="none" position={[0, 4.15, 0]} center distanceFactor={11} zIndexRange={[4, 0]}>
        <div className="spot-tag" style={{ background: stall.tag }}>{stall.icon} {stall.title}</div>
      </Html>
    </group>
  );
}

export function SnackMenu({ stall, onPick, onClose, onTakeout }: { stall: Stall; onPick: (s: Item) => void; onClose: () => void; onTakeout?: (s: Item) => void }) {
  const [takeout, setTakeout] = useState(false);
  return (
    <Modal onClose={onClose}>
      <h2>{stall.icon} 눈마을 {stall.title}</h2>
      <div className="chips center take-mode">
        <button className={!takeout ? "chip on" : "chip"} onClick={() => setTakeout(false)}>😋 여기서 먹기</button>
        <button className={takeout ? "chip on" : "chip"} onClick={() => setTakeout(true)}>🏠 내 방에 사 가기</button>
      </div>
      <p className="hint">{takeout ? (onTakeout ? "고른 음식이 내 방 테이블에 놓여요 (최대 6개)" : "내 방이 있어야 사 갈 수 있어요. ☰ 메뉴에서 내 방을 만들거나 찾아 주세요") : "먹고 싶은 걸 골라 보세요. 모두 무료예요!"}</p>
      <div className="snack-grid">
        {stall.items.map((s) => (
          <button key={s.id} className="act-btn" disabled={takeout && !onTakeout} onClick={() => (takeout ? onTakeout?.(s) : onPick(s))}><span>{s.emoji}</span>{s.name}</button>
        ))}
      </div>
      <button className="btn ghost wide" onClick={onClose}>닫기</button>
    </Modal>
  );
}

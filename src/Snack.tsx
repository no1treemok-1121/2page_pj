import { useRef } from "react";
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

export function SnackStand({ stall, onOpen }: { stall: Stall; onOpen?: () => void }) {
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
      <Html pointerEvents="none" position={[0, 2.75, 0]} center distanceFactor={11} zIndexRange={[4, 0]}>
        <div className="spot-tag" style={{ background: stall.tag }}>{stall.icon} {stall.title}</div>
      </Html>
    </group>
  );
}

export function SnackMenu({ stall, onPick, onClose }: { stall: Stall; onPick: (s: Item) => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2>{stall.icon} 눈마을 {stall.title}</h2>
      <p className="hint">먹고 싶은 걸 골라 보세요. 모두 무료예요!</p>
      <div className="snack-grid">
        {stall.items.map((s) => (
          <button key={s.id} className="act-btn" onClick={() => onPick(s)}><span>{s.emoji}</span>{s.name}</button>
        ))}
      </div>
      <button className="btn ghost wide" onClick={onClose}>닫기</button>
    </Modal>
  );
}

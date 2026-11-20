import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Modal } from "./RoomView";

// 분식집: 메뉴를 고르면 내 캐릭터가 먹으면서 소리 말풍선(호로록·냠냠·바삭)이 떠요. 모두에게 보임. 무료.
// (참고 사이트의 간식 가판대 + 소리 말풍선 방식을 벤치마킹, 메뉴·문구는 직접 작성)
export const SNACK_SPOT = { x: 8.5, z: -11 }; // 언덕 왼쪽 뒤 (기본 화면 안)
export const SNACKS = [
  { id: "tteok", emoji: "🌶️", name: "떡볶이", sounds: ["쫀득쫀득~", "앗 매워! 🔥", "그래도 맛있어 😋"] },
  { id: "mandu", emoji: "🥟", name: "만두", sounds: ["호호 뜨거워~", "냠냠 😋", "육즙 팡!"] },
  { id: "eomuk", emoji: "🍢", name: "어묵", sounds: ["호로록~", "국물이 끝내줘 ♨️", "후루룩 😌"] },
  { id: "sundae", emoji: "🌭", name: "순대", sounds: ["쫄깃쫄깃~", "소금 콕콕 🧂", "냠냠 😋"] },
  { id: "twigim", emoji: "🍤", name: "튀김모둠", sounds: ["바삭바삭!", "떡볶이 국물에 콕 🌶️", "와삭 😆"] },
  { id: "bungeo", emoji: "🐟", name: "붕어빵", sounds: ["따끈따끈~", "팥이 가득 😍", "꼬리부터 냠"] },
];

export function SnackStand({ onOpen }: { onOpen?: () => void }) {
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    steam.current?.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1;
      c.position.y = 1.3 + t * 0.9;
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - t);
    });
  });
  return (
    <group position={[SNACK_SPOT.x, 0, SNACK_SPOT.z]} rotation={[0, Math.atan2(-SNACK_SPOT.x, -SNACK_SPOT.z), 0]}
      onClick={(e) => { if (onOpen && e.delta < 6) { e.stopPropagation(); onOpen(); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      {/* 가게 몸통·계산대 */}
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[2.6, 1.1, 1.2]} /><meshStandardMaterial color="#f3e2c6" /></mesh>
      <mesh position={[0, 1.12, 0.1]}><boxGeometry args={[2.7, 0.06, 1.4]} /><meshStandardMaterial color="#8b5a3c" /></mesh>
      {/* 떡볶이 판 (빨간 소스) */}
      <mesh position={[-0.6, 1.2, 0.2]}><boxGeometry args={[0.9, 0.1, 0.6]} /><meshStandardMaterial color="#c8102e" emissive="#7a0a12" emissiveIntensity={0.3} /></mesh>
      {/* 어묵 꼬치 */}
      {[0.35, 0.55, 0.75].map((x) => <mesh key={x} position={[x, 1.38, 0.2]}><cylinderGeometry args={[0.012, 0.012, 0.5, 4]} /><meshStandardMaterial color="#d9b48f" /></mesh>)}
      {/* 기둥 + 빨강·하양 줄무늬 차양 */}
      {[-1.25, 1.25].map((x) => <mesh key={x} position={[x, 1.6, 0.5]}><cylinderGeometry args={[0.04, 0.04, 1.0, 6]} /><meshStandardMaterial color="#5a3a2e" /></mesh>)}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-1.25 + 0.5 * i + 0.25, 2.15, 0.25]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.5, 0.05, 1.3]} /><meshStandardMaterial color={i % 2 ? "#ffffff" : "#e0322d"} />
        </mesh>
      ))}
      {/* 김 모락모락 */}
      <group ref={steam}>
        {[0, 1, 2].map((i) => <mesh key={i} position={[-0.6 + i * 0.15, 1.3, 0.2]}><sphereGeometry args={[0.12, 8, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} /></mesh>)}
      </group>
      <pointLight position={[0, 1.8, 1]} color="#ffcf70" intensity={3} distance={5} />
      <Html pointerEvents="none" position={[0, 2.75, 0]} center distanceFactor={11} zIndexRange={[4, 0]}>
        <div className="spot-tag snack">🍢 분식집</div>
      </Html>
    </group>
  );
}

export function SnackMenu({ onPick, onClose }: { onPick: (s: typeof SNACKS[number]) => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2>🍢 눈마을 분식집</h2>
      <p className="hint">먹고 싶은 걸 골라 보세요. 모두 무료예요!</p>
      <div className="snack-grid">
        {SNACKS.map((s) => (
          <button key={s.id} className="act-btn" onClick={() => onPick(s)}><span>{s.emoji}</span>{s.name}</button>
        ))}
      </div>
      <button className="btn ghost wide" onClick={onClose}>닫기</button>
    </Modal>
  );
}

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { BENCHES, FIRES, POND } from "./benches";

// 연못(낚시) + 모닥불 2개 + 통나무 의자. 누르면 낚시 / 모닥불 옆에 앉아 몸 녹이기
const tap = (fn?: () => void) => ({
  onClick: (e: { delta: number; stopPropagation: () => void }) => { if (fn && e.delta < 6) { e.stopPropagation(); fn(); } },
  onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); document.body.style.cursor = "pointer"; },
  onPointerOut: () => { document.body.style.cursor = "auto"; },
});

function Campfire({ x, z, onClick }: { x: number; z: number; onClick?: () => void }) {
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + x;
    if (light.current) light.current.intensity = 5 + Math.sin(t * 9) * 1.2 + Math.sin(t * 15) * 0.8;
    flames.current?.children.forEach((c, i) => {
      c.scale.y = 1 + Math.sin(t * (7 + i * 2) + i) * 0.25;
      c.rotation.y = t * (1 + i * 0.3);
    });
  });
  return (
    <group position={[x, 0, z]} {...tap(onClick)}>
      {/* 돌 둘레 */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.45, 0.07, Math.sin(a) * 0.45]}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#7d7f86" roughness={1} /></mesh>;
      })}
      {/* 장작 */}
      {[0, 1.1, 2.2].map((r) => <mesh key={r} position={[0, 0.1, 0]} rotation={[0, r, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.7, 6]} /><meshStandardMaterial color="#5b3b28" /></mesh>)}
      {/* 불꽃 */}
      <group ref={flames} position={[0, 0.15, 0]}>
        <mesh position={[0, 0.25, 0]}><coneGeometry args={[0.24, 0.6, 7]} /><meshStandardMaterial color="#ff7a1a" emissive="#ff5a00" emissiveIntensity={2} transparent opacity={0.9} /></mesh>
        <mesh position={[0.05, 0.2, 0.03]}><coneGeometry args={[0.14, 0.45, 6]} /><meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={2.5} /></mesh>
      </group>
      <pointLight ref={light} position={[0, 0.7, 0]} color="#ff9a4a" distance={6} />
    </group>
  );
}

function LogSeat({ x, z, ry, onClick }: { x: number; z: number; ry: number; onClick?: () => void }) {
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]} {...tap(onClick)}>
      <mesh position={[0, 0.17, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.17, 0.17, 0.9, 10]} /><meshStandardMaterial color="#7a4e2d" roughness={0.9} />
      </mesh>
      {[-0.45, 0.45].map((s) => (
        <mesh key={s} position={[s, 0.17, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 10]} /><meshStandardMaterial color="#d8b07a" />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.85, 0.02, 0.2]} /><meshStandardMaterial color="#f4f7fb" /></mesh>
    </group>
  );
}

export default function PondArea({ onFish, onWarm, onSeat }: { onFish?: () => void; onWarm?: (fireIndex: number) => void; onSeat?: (seatIndex: number) => void }) {
  const water = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (water.current) water.current.emissiveIntensity = 0.18 + Math.sin(clock.elapsedTime * 1.3) * 0.06; });
  return (
    <group>
      {/* 연못: 살짝 얼음 낀 어두운 물 + 눈 둑 */}
      <group position={[POND.x, 0, POND.z]} {...tap(onFish)}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[1, 0.8, 1]}>
          <circleGeometry args={[POND.r, 40]} />
          <meshStandardMaterial ref={water} color="#1f4f7a" emissive="#2d6fa8" emissiveIntensity={0.18} roughness={0.05} metalness={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} scale={[1, 0.8, 1]}>
          <torusGeometry args={[POND.r + 0.1, 0.2, 8, 40]} /><meshStandardMaterial color="#f4f7fb" roughness={1} />
        </mesh>
        {/* 연잎 대신 작은 얼음 조각 */}
        {[[0.9, 0.4], [-1.1, -0.5], [0.2, -0.9]].map(([a, b], i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, i]} position={[a, 0.05, b]}><circleGeometry args={[0.25, 6]} /><meshStandardMaterial color="#e6f4ff" /></mesh>
        ))}
        <Html pointerEvents="none" position={[0, 0.8, 0]} center distanceFactor={11} zIndexRange={[4, 0]}>
          <div className="spot-tag pond">🎣 연못 낚시</div>
        </Html>
      </group>
      {FIRES.map((f, i) => <Campfire key={i} x={f.x} z={f.z} onClick={onWarm && (() => onWarm(i))} />)}
      {BENCHES.map((s, i) => s.kind === "log" && <LogSeat key={i} x={s.x} z={s.z} ry={s.ry} onClick={onSeat && (() => onSeat(i))} />)}
    </group>
  );
}

// 낚시 결과 (재미로)
export const CATCHES = [
  { w: 30, text: "🐟 붕어를 낚았다!" },
  { w: 18, text: "🐠 반짝이는 금붕어다!" },
  { w: 12, text: "🦐 새우가 딸려 왔다" },
  { w: 10, text: "🐡 복어?! 다시 놓아주자" },
  { w: 12, text: "👢 장화가 걸렸다…" },
  { w: 13, text: "😅 아깝다, 놓쳤다!" },
  { w: 5, text: "🐋 전설의 월척!!" },
];
export function randomCatch() {
  let r = Math.random() * CATCHES.reduce((a, c) => a + c.w, 0);
  for (const c of CATCHES) { if ((r -= c.w) < 0) return c.text; }
  return CATCHES[0].text;
}

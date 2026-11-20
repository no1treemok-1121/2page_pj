import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// 🔔 종: 트리 앞 나무 기둥에 매달린 금빛 종. 누르면 흔들리며 딩동댕 (모두에게 보이고 들림)
export const BELL_SPOT = { x: 0, z: 3.3 };
const RING_MS = 2400;

// 작은 종소리 (Web Audio로 직접 만들어서 파일 없이, 소리는 작게)
let ctx: AudioContext | null = null;
export function playChime() {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    [1046.5, 1318.5, 1568].forEach((f, i) => { // 도·미·솔
      const o = ctx!.createOscillator(), g = ctx!.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, now + i * 0.28);
      g.gain.linearRampToValueAtTime(0.07, now + i * 0.28 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.28 + 1.4);
      o.connect(g).connect(ctx!.destination);
      o.start(now + i * 0.28); o.stop(now + i * 0.28 + 1.5);
    });
  } catch { /* 소리를 못 내는 환경이면 조용히 */ }
}

export default function Bell({ ringAt, onRing }: { ringAt: number; onRing?: () => void }) {
  const swing = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const age = Date.now() - ringAt;
    const k = age < RING_MS ? 1 - age / RING_MS : 0;
    if (swing.current) swing.current.rotation.z = Math.sin(age / 90) * 0.55 * k;
    if (glow.current) glow.current.emissiveIntensity = 0.35 + k * 1.6;
  });
  return (
    <group position={[BELL_SPOT.x, 0, BELL_SPOT.z]}
      onClick={(e) => { if (onRing && e.delta < 6) { e.stopPropagation(); onRing(); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      {/* 나무 기둥 두 개 + 가로대 + 눈 */}
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 0.85, 0]}><cylinderGeometry args={[0.06, 0.07, 1.7, 8]} /><meshStandardMaterial color="#6b4423" /></mesh>)}
      <mesh position={[0, 1.72, 0]}><boxGeometry args={[1.35, 0.1, 0.14]} /><meshStandardMaterial color="#6b4423" /></mesh>
      <mesh position={[0, 1.79, 0]}><boxGeometry args={[1.3, 0.04, 0.15]} /><meshStandardMaterial color="#f4f7fb" /></mesh>
      {/* 흔들리는 종 */}
      <group ref={swing} position={[0, 1.67, 0]}>
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.1, 0.28, 0.4, 20, 1, true]} />
          <meshStandardMaterial ref={glow} color="#f2c14e" emissive="#d99a00" emissiveIntensity={0.35} metalness={0.7} roughness={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.1, 0]}><sphereGeometry args={[0.11, 14, 10]} /><meshStandardMaterial color="#f2c14e" metalness={0.7} roughness={0.25} /></mesh>
        <mesh position={[0, -0.55, 0]}><sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color="#b8860b" /></mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.03, 6, 14]} /><meshStandardMaterial color="#d33a3a" /></mesh>
      </group>
      {/* 누르기 쉽게 넓은 투명 영역 */}
      <mesh position={[0, 1.1, 0]}><boxGeometry args={[1.4, 1.6, 0.8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <Html pointerEvents="none" position={[0, 2.15, 0]} center distanceFactor={9} zIndexRange={[4, 0]}>
        <div className="spot-tag bell">🔔 종 울리기</div>
      </Html>
    </group>
  );
}

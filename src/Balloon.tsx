import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 🎈 풍선: 별·하트·달 모양, 색은 랜덤, 가끔 무지개빛으로 반짝이는 레어 (사용자 요청)
export type Balloon = { shape: "star" | "heart" | "moon"; color: string; rare: boolean; t: number };
export const BALLOON_COLORS = ["#ff5a8a", "#ffd84d", "#7fd0ff", "#b07aff", "#7dff9a", "#ff9f43", "#ff7eb6", "#5fd4c4"];
export const BALLOON_MS = 60000; // 1분 동안 머리 위
const FLY_MS = 4000; // 그다음 하늘로 날아감

function shapeOf(kind: Balloon["shape"]) {
  const s = new THREE.Shape();
  if (kind === "heart") {
    s.moveTo(0, -0.26);
    s.bezierCurveTo(-0.05, -0.2, -0.3, -0.05, -0.28, 0.1);
    s.bezierCurveTo(-0.26, 0.26, -0.06, 0.28, 0, 0.14);
    s.bezierCurveTo(0.06, 0.28, 0.26, 0.26, 0.28, 0.1);
    s.bezierCurveTo(0.3, -0.05, 0.05, -0.2, 0, -0.26);
  } else if (kind === "star") {
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.13 : 0.3;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
  } else {
    // 초승달: 큰 원 바깥쪽 호 + 안쪽 원 호
    const pts: [number, number][] = [];
    for (let k = 0; k <= 24; k++) { const a = 0.95 + (k / 24) * (Math.PI * 2 - 1.9); pts.push([Math.cos(a) * 0.27, Math.sin(a) * 0.27]); }
    for (let k = 0; k <= 24; k++) { const a = Math.PI * 2 - 1.2 - (k / 24) * (Math.PI * 2 - 2.4); pts.push([0.13 + Math.cos(a) * 0.21, Math.sin(a) * 0.21]); }
    s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, y]) => s.lineTo(x, y)); s.closePath();
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 5, curveSegments: 16 });
  g.center();
  return g;
}

export default function BalloonFloat({ b }: { b: Balloon }) {
  const g = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const geo = useMemo(() => shapeOf(b.shape), [b.shape]);
  const sparkle = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const o = g.current; if (!o) return;
    const age = Date.now() - b.t, t = clock.elapsedTime;
    if (age > BALLOON_MS + FLY_MS) { o.visible = false; return; }
    o.visible = true;
    const fly = Math.max(0, age - BALLOON_MS) / 1000;
    o.position.set(Math.sin(t * 1.3) * 0.08 + fly * 0.4, 2.35 + Math.sin(t * 2) * 0.06 + fly * fly * 1.6, Math.cos(t * 1.1) * 0.05);
    o.rotation.set(0, Math.sin(t * 0.8) * 0.5, Math.sin(t * 1.5) * 0.1);
    if (mat.current && b.rare) {
      const c = new THREE.Color().setHSL((t * 0.25) % 1, 0.85, 0.62);
      mat.current.color.copy(c); mat.current.emissive.copy(c);
    }
    if (sparkle.current) sparkle.current.rotation.z = t * 2;
  });
  return (
    <group ref={g} position={[0, 2.35, 0]}>
      <group position={[0, 0.55, 0]}>
        <mesh geometry={geo}>
          <meshStandardMaterial ref={mat} color={b.color} emissive={b.rare ? b.color : "#000000"} emissiveIntensity={b.rare ? 0.6 : 0} roughness={0.2} metalness={b.rare ? 0.3 : 0.05} />
        </mesh>
        {/* 반짝이 하이라이트 */}
        <mesh position={[-0.08, 0.08, 0.1]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.8} /></mesh>
        {b.rare && <group ref={sparkle}>{[0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0]}><octahedronGeometry args={[0.04]} /><meshBasicMaterial color="#ffffff" /></mesh>; })}</group>}
      </group>
      {/* 줄 */}
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.005, 0.005, 0.55, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </group>
  );
}

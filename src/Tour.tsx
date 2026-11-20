import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SledMesh } from "./Village";
import { RideKind, TOUR_STATION } from "./sled";

// 🐕 개썰매 / 🦌 사슴썰매: 마을을 크게 한 바퀴 (사용자 요청)
// 개썰매 = 산타 모자 쓴 골든 리트리버 + 시베리안 허스키, 사슴썰매 = 산타 모자 쓴 숫사슴

function SantaHat({ y, z, s = 1 }: { y: number; z: number; s?: number }) {
  return (
    <group position={[0, y, z]} scale={s} rotation={[-0.35, 0, 0]}>
      <mesh position={[0, 0.12, 0]}><coneGeometry args={[0.12, 0.26, 12]} /><meshStandardMaterial color="#d62f2f" /></mesh>
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.11, 0.035, 6, 14]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.26, 0]}><sphereGeometry args={[0.045, 8, 8]} /><meshStandardMaterial color="#ffffff" /></mesh>
    </group>
  );
}

// 다리 4개가 번갈아 움직이며 달림
function Legs({ color, w, l, h, run }: { color: string; w: number; l: number; h: number; run: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    g.current?.children.forEach((c, i) => { c.rotation.x = run ? Math.sin(clock.elapsedTime * 14 + (i % 2 ? 0 : Math.PI) + (i > 1 ? 1.2 : 0)) * 0.6 : 0; });
  });
  return (
    <group ref={g}>
      {[[-w, l], [w, l], [-w, -l], [w, -l]].map(([x, z], i) => (
        <group key={i} position={[x, h, z]}>
          <mesh position={[0, -h / 2, 0]}><cylinderGeometry args={[0.035, 0.03, h, 6]} /><meshStandardMaterial color={color} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Dog({ x, husky, run }: { x: number; husky?: boolean; run: boolean }) {
  const body = husky ? "#6f7885" : "#d9a441";
  const light = husky ? "#f4f4f4" : "#efc77a";
  return (
    <group position={[x, 0, 0]}>
      <Legs color={body} w={0.09} l={0.17} h={0.22} run={run} />
      <mesh position={[0, 0.3, 0]} scale={[0.75, 0.7, 1.3]}><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color={body} /></mesh>
      <mesh position={[0, 0.25, 0.02]} scale={[0.6, 0.5, 1.1]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color={light} /></mesh>
      {/* 머리 */}
      <mesh position={[0, 0.48, 0.25]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color={body} /></mesh>
      {husky && <mesh position={[0, 0.45, 0.31]} scale={[0.8, 0.7, 0.6]}><sphereGeometry args={[0.11, 10, 8]} /><meshStandardMaterial color={light} /></mesh>}
      <mesh position={[0, 0.44, 0.37]} scale={[0.7, 0.6, 1]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color={light} /></mesh>
      <mesh position={[0, 0.46, 0.43]}><sphereGeometry args={[0.025, 8, 6]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
      {[-0.05, 0.05].map((ex) => <mesh key={ex} position={[ex, 0.52, 0.36]}><sphereGeometry args={[0.018, 6, 6]} /><meshStandardMaterial color="#1b1b1b" /></mesh>)}
      {/* 귀: 리트리버는 늘어진 귀, 허스키는 쫑긋 */}
      {[-1, 1].map((s) => husky
        ? <mesh key={s} position={[s * 0.08, 0.6, 0.22]} rotation={[0, 0, -s * 0.2]}><coneGeometry args={[0.045, 0.12, 4]} /><meshStandardMaterial color={body} /></mesh>
        : <mesh key={s} position={[s * 0.12, 0.45, 0.22]} scale={[0.4, 1, 0.7]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color="#c28a2e" /></mesh>)}
      {/* 꼬리 */}
      <mesh position={[0, 0.4, -0.25]} rotation={[husky ? -0.4 : -0.9, 0, 0]}><cylinderGeometry args={[0.03, 0.05, 0.22, 6]} /><meshStandardMaterial color={husky ? light : body} /></mesh>
      <SantaHat y={0.6} z={0.24} s={0.8} />
    </group>
  );
}

function Stag({ run }: { run: boolean }) {
  const brown = "#9a6234";
  return (
    <group>
      <Legs color="#6e4322" w={0.11} l={0.22} h={0.42} run={run} />
      <mesh position={[0, 0.55, 0]} scale={[0.75, 0.7, 1.35]}><sphereGeometry args={[0.24, 12, 10]} /><meshStandardMaterial color={brown} /></mesh>
      <mesh position={[0, 0.7, 0.28]} rotation={[0.6, 0, 0]}><cylinderGeometry args={[0.07, 0.09, 0.3, 8]} /><meshStandardMaterial color={brown} /></mesh>
      <mesh position={[0, 0.88, 0.38]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color={brown} /></mesh>
      <mesh position={[0, 0.84, 0.5]} scale={[0.8, 0.7, 1]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#c99a6b" /></mesh>
      <mesh position={[0, 0.85, 0.57]}><sphereGeometry args={[0.035, 8, 6]} /><meshStandardMaterial color="#e23b3b" emissive="#ff2a2a" emissiveIntensity={0.8} /></mesh>
      {[-0.05, 0.05].map((ex) => <mesh key={ex} position={[ex, 0.93, 0.49]}><sphereGeometry args={[0.018, 6, 6]} /><meshStandardMaterial color="#1b1b1b" /></mesh>)}
      {/* 숫사슴 뿔 */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.08, 0.98, 0.34]} rotation={[0, 0, -s * 0.35]}>
          <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[0.018, 0.025, 0.28, 5]} /><meshStandardMaterial color="#e8d3a8" /></mesh>
          <mesh position={[s * 0.06, 0.2, 0.03]} rotation={[0, 0, -s * 0.9]}><cylinderGeometry args={[0.014, 0.018, 0.14, 5]} /><meshStandardMaterial color="#e8d3a8" /></mesh>
          <mesh position={[-s * 0.03, 0.24, -0.02]} rotation={[0, 0, s * 0.6]}><cylinderGeometry args={[0.014, 0.018, 0.12, 5]} /><meshStandardMaterial color="#e8d3a8" /></mesh>
        </group>
      ))}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.13, 0.94, 0.32]} rotation={[0, 0, -s * 1.1]} scale={[0.5, 1, 0.3]}><sphereGeometry args={[0.07, 8, 6]} /><meshStandardMaterial color={brown} /></mesh>)}
      <mesh position={[0, 0.6, -0.32]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <SantaHat y={1.0} z={0.36} s={0.9} />
      {/* 목 방울 */}
      <mesh position={[0, 0.6, 0.36]}><sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial color="#f2c14e" metalness={0.7} roughness={0.3} /></mesh>
    </group>
  );
}

// 끌고 가는 동물 + 썰매 (타는 사람 기준: 앞쪽 = +z)
export function TourTeam({ kind, run = true }: { kind: RideKind; run?: boolean }) {
  const team = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (team.current) team.current.position.y = run ? Math.abs(Math.sin(clock.elapsedTime * 7)) * 0.05 : 0; });
  const front = kind === "deer" ? 1.35 : 1.05;
  return (
    <group>
      <SledMesh />
      {/* 끈 */}
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x * 0.8, 0.22, 0.52 + (front - 0.75) / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, front - 0.35, 4]} /><meshStandardMaterial color="#5a3a2e" />
        </mesh>
      ))}
      <group ref={team} position={[0, 0, front]}>
        {kind === "deer" ? <Stag run={run} /> : <><Dog x={-0.22} run={run} /><Dog x={0.22} husky run={run} /></>}
      </group>
    </group>
  );
}

// 썰매 정류장: 개썰매·사슴썰매가 서 있고, 누르면 탐
export function TourStation({ onRide }: { onRide?: (kind: "dog" | "deer") => void }) {
  const tap = (kind: "dog" | "deer") => ({
    onClick: (e: { delta: number; stopPropagation: () => void }) => { if (onRide && e.delta < 6) { e.stopPropagation(); onRide(kind); } },
    onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); document.body.style.cursor = "pointer"; },
    onPointerOut: () => { document.body.style.cursor = "auto"; },
  });
  return (
    <group position={[TOUR_STATION.x, 0, TOUR_STATION.z]} rotation={[0, TOUR_STATION.ry, 0]}>
      {([["dog", -0.75], ["deer", 0.75]] as const).map(([k, x]) => (
        <group key={k} position={[x, 0, 0]} {...tap(k)}>
          <TourTeam kind={k} run={false} />
          <mesh position={[0, 0.5, 0.6]}><boxGeometry args={[1.0, 1.1, 2.4]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
          <Html pointerEvents="none" position={[0, 1.55, 0.6]} center distanceFactor={10} zIndexRange={[4, 0]}>
            <div className="spot-tag tour">{k === "dog" ? "🐕 개썰매" : "🦌 사슴썰매"}</div>
          </Html>
        </group>
      ))}
    </group>
  );
}

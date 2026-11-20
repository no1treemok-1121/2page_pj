import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

// 매번 같은 마을 배치가 나오도록 고정된 난수
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const WALL_COLORS = ["#c96f53", "#d9b48f", "#8c5a44", "#a3b6c9", "#e0cfa8"];

function House({ position, rotationY, color, scale = 1 }: {
  position: [number, number, number];
  rotationY: number;
  color: string;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* 벽 */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.6, 1.2, 1.3]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* 지붕 + 눈 */}
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.35, 0.8, 4]} />
        <meshStandardMaterial color="#5a3a2e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.68, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.2, 0.6, 4]} />
        <meshStandardMaterial color="#f4f7fb" roughness={1} />
      </mesh>
      {/* 굴뚝 */}
      <mesh position={[0.45, 1.75, -0.25]}>
        <boxGeometry args={[0.22, 0.5, 0.22]} />
        <meshStandardMaterial color="#6d4c41" />
      </mesh>
      {/* 따뜻한 창문 (트리 쪽, 앞면) */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.7, 0.66]}>
          <planeGeometry args={[0.36, 0.36]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.4} />
        </mesh>
      ))}
      {/* 문 */}
      <mesh position={[0, 0.3, 0.66]}>
        <planeGeometry args={[0.32, 0.6]} />
        <meshStandardMaterial color="#4a2f25" />
      </mesh>
    </group>
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.8, 8]} />
        <meshStandardMaterial color="#2b2f3a" />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color="#fff1c4" emissive="#ffcf70" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 1.85, 0]} color="#ffcf70" intensity={3} distance={5} />
    </group>
  );
}

function SmallPine({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 6]} />
        <meshStandardMaterial color="#5b3b28" />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.6, 1.3, 8]} />
        <meshStandardMaterial color="#26563a" />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <coneGeometry args={[0.35, 0.6, 8]} />
        <meshStandardMaterial color="#eef3f8" />
      </mesh>
    </group>
  );
}

// 트리에 감긴 반짝이 전구
export function TreeLights({ count = 46 }) {
  const group = useRef<THREE.Group>(null);
  const bulbs = useMemo(() => {
    const colors = ["#ffdf80", "#ff8a80", "#80d8ff", "#ffffff"];
    return Array.from({ length: count }, (_, i) => {
      const t = i / count; // 0(아래) → 1(위)
      const y = 0.9 + t * 3.6;
      const radius = 2.05 * (1 - t * 0.82) * (0.92 + 0.08 * Math.sin(t * 40));
      const angle = t * Math.PI * 9;
      return {
        position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number],
        color: colors[i % colors.length],
        phase: i * 0.7,
      };
    });
  }, [count]);

  useFrame(({ clock }) => {
    group.current?.children.forEach((child, i) => {
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.6 + (Math.sin(clock.elapsedTime * 2.2 + bulbs[i].phase) + 1) * 0.9;
    });
  });

  return (
    <group ref={group} raycast={() => null}>
      {bulbs.map((b, i) => (
        <mesh key={i} position={b.position} raycast={() => null}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function Village() {
  const layout = useMemo(() => {
    const rand = seeded(7);
    // 트리를 둘러싼 집들 (카메라 정면 쪽은 비워 두어 트리가 잘 보이게)
    const houses = [-115, -75, -35, 5, 45, 85, 125].map((deg, i) => {
      const a = THREE.MathUtils.degToRad(deg - 90);
      const r = 8 + rand() * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return {
        position: [x, 0, z] as [number, number, number],
        rotationY: Math.atan2(-x, -z), // 창문이 트리를 바라보게
        color: WALL_COLORS[i % WALL_COLORS.length],
        scale: 0.9 + rand() * 0.35,
      };
    });
    const lamps = [-130, -40, 50, 140].map((deg) => {
      const a = THREE.MathUtils.degToRad(deg - 90);
      return [Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2] as [number, number, number];
    });
    const pines = Array.from({ length: 28 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 12 + rand() * 7;
      return {
        position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        scale: 1 + rand() * 1.4,
      };
    });
    const mounds = Array.from({ length: 10 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 4 + rand() * 12;
      return {
        position: [Math.cos(a) * r, -0.15, Math.sin(a) * r] as [number, number, number],
        scale: [0.8 + rand() * 1.5, 0.35, 0.8 + rand() * 1.5] as [number, number, number],
      };
    });
    return { houses, lamps, pines, mounds };
  }, []);

  return (
    <group>
      <Stars radius={60} depth={30} count={1500} factor={3} saturation={0} fade speed={0.6} />
      {/* 달 */}
      <mesh position={[-14, 14, -26]}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color="#fff6dc" fog={false} />
      </mesh>
      <directionalLight position={[-14, 14, -26]} intensity={0.35} color="#cfdcff" />

      {/* 눈 덮인 바닥과 언덕 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#e8eef8" roughness={1} />
      </mesh>
      {layout.mounds.map((m, i) => (
        <mesh key={i} position={m.position} scale={m.scale}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#eef3fa" roughness={1} />
        </mesh>
      ))}

      {layout.houses.map((h, i) => (
        <House key={i} {...h} />
      ))}
      {layout.lamps.map((p, i) => (
        <Lamp key={i} position={p} />
      ))}
      {layout.pines.map((p, i) => (
        <SmallPine key={i} {...p} />
      ))}
    </group>
  );
}

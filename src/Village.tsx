import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { currentEvent } from "./events";

const WHITE = new THREE.Color("#ffffff");
import { BENCHES } from "./benches";
import { HILL, RINK, SLED_PARK } from "./sled";
import { SnackStand } from "./Snack";
import PondArea from "./Pond";
import { Html } from "@react-three/drei";

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

// 가로등: 빨강·하양 줄무늬 캔디케인 + 고리에 매달린 네모 랜턴 (동그란 소원 장식과 헷갈리지 않게)
function Lamp({ position }: { position: [number, number, number] }) {
  const SEG = 9;
  const H = 0.2;
  return (
    <group position={position}>
      {Array.from({ length: SEG }, (_, i) => (
        <mesh key={i} position={[0, H / 2 + i * H, 0]}>
          <cylinderGeometry args={[0.07, 0.07, H, 12]} />
          <meshStandardMaterial color={i % 2 ? "#ffffff" : "#d62f3a"} roughness={0.4} />
        </mesh>
      ))}
      {/* 지팡이 고리 */}
      <group position={[0.2, SEG * H, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.2, 0.07, 10, 20, Math.PI]} />
          <meshStandardMaterial color="#d62f3a" roughness={0.4} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 3]}>
          <torusGeometry args={[0.2, 0.072, 10, 6, Math.PI / 6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>
      {/* 매달린 랜턴 */}
      <group position={[0.4, SEG * H - 0.28, 0]}>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.18, 4]} />
          <meshStandardMaterial color="#2b2f3a" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.18, 0.22, 0.18]} />
          <meshStandardMaterial color="#ffe9b0" emissive="#ffb347" emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[0, 0.13, 0]}>
          <coneGeometry args={[0.15, 0.1, 4]} />
          <meshStandardMaterial color="#2b2f3a" />
        </mesh>
        <pointLight color="#ffcf70" intensity={3} distance={5} />
      </group>
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
// 카메라와 트리 사이를 가리면 반투명해지는 묶음 (언덕·집)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
function FadeWhenBlocking({ center, radius, children }: { center: [number, number, number]; radius: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const mats = useRef<THREE.Material[]>([]);
  const op = useRef(1);
  useFrame(({ camera }, dt) => {
    if (!g.current) return;
    if (mats.current.length === 0) {
      g.current.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m && !(m as THREE.MeshBasicMaterial).transparent) { m.transparent = true; mats.current.push(m); }
      });
    }
    // 카메라 → 트리 중심 선분에서 이 물체 중심까지 거리
    _a.copy(camera.position); _b.set(0, 1.8, 0); _c.set(...center);
    _d.copy(_b).sub(_a);
    const len2 = _d.lengthSq();
    const tt = Math.max(0, Math.min(1, _c.clone().sub(_a).dot(_d) / len2));
    const dist = _a.clone().addScaledVector(_d, tt).distanceTo(_c);
    const target = dist < radius || camera.position.distanceTo(_c) < radius * 1.1 ? 0.22 : 1;
    op.current += (target - op.current) * Math.min(1, dt * 6);
    for (const m of mats.current) { m.opacity = op.current; m.depthWrite = op.current > 0.9; }
  });
  return <group ref={g}>{children}</group>;
}

// 썰매 (마을에 세워 둔 것 / 타고 내려올 때 공용)
export function SledMesh() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.55, 0.06, 1.0]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {[-0.24, 0.24].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.05, 0]}>
            <boxGeometry args={[0.04, 0.04, 1.05]} />
            <meshStandardMaterial color="#d9b44a" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[x, 0.13, 0.52]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <torusGeometry args={[0.08, 0.02, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#d9b44a" metalness={0.6} roughness={0.3} />
          </mesh>
          {[-0.3, 0.3].map((z) => (
            <mesh key={z} position={[x, 0.1, z]}>
              <boxGeometry args={[0.04, 0.1, 0.04]} />
              <meshStandardMaterial color="#5a3a2e" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function SledHill({ onSled }: { onSled?: () => void }) {
  const click = (e: { delta: number; stopPropagation: () => void }) => { if (onSled && e.delta < 6) { e.stopPropagation(); onSled(); } };
  const hover = {
    onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); document.body.style.cursor = "pointer"; },
    onPointerOut: () => { document.body.style.cursor = "auto"; },
  };
  return (
    <group>
      <FadeWhenBlocking center={[HILL.x, HILL.h / 2, HILL.z]} radius={HILL.r}>
        <mesh position={[HILL.x, -0.2, HILL.z]} scale={[HILL.r, HILL.h + 0.2, HILL.r]} onClick={click} {...hover}>
          <sphereGeometry args={[1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f2f6fc" roughness={1} />
        </mesh>
      </FadeWhenBlocking>
      <group position={[SLED_PARK.x, 0, SLED_PARK.z]} rotation={[0, -0.6, 0]} onClick={click} {...hover}>
        <SledMesh />
        {/* 누르기 쉽게 썰매 주변을 넓게 감싼 투명 영역 */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.6, 1.2, 1.8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <Html pointerEvents="none" position={[0, 0.75, 0]} center distanceFactor={9} zIndexRange={[4, 0]}>
          <div className="spot-tag">🛷 썰매 타기</div>
        </Html>
      </group>
    </group>
  );
}

// 얼음 빙판: 누르면 썰매를 타고 빙판 위를 씽씽 돎
function IceRink({ onIce }: { onIce?: () => void }) {
  const shine = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (shine.current) shine.current.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 0.8) * 0.05; });
  return (
    <group position={[RINK.x, 0, RINK.z]}
      onClick={(e) => { if (onIce && e.delta < 6) { e.stopPropagation(); onIce(); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[RINK.r, 48]} />
        <meshStandardMaterial ref={shine} color="#cfe9ff" emissive="#9fd3ff" emissiveIntensity={0.12} roughness={0.08} metalness={0.25} />
      </mesh>
      {/* 빙판 둘레에 쌓인 눈 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[RINK.r + 0.15, 0.18, 8, 48]} />
        <meshStandardMaterial color="#f4f7fb" roughness={1} />
      </mesh>
      <Html pointerEvents="none" position={[0, 0.9, -RINK.r * 0.2]} center distanceFactor={11} zIndexRange={[4, 0]}>
        <div className="spot-tag ice">⛸️ 빙판 썰매</div>
      </Html>
    </group>
  );
}

// 눈 쌓인 나무 벤치 (누르면 앉기)
function Bench({ x, z, ry, onClick }: { x: number; z: number; ry: number; onClick?: () => void }) {
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}
      onClick={(e) => { if (onClick && e.delta < 6) { e.stopPropagation(); onClick(); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[1.45, 0.03, 0.45]} />
        <meshStandardMaterial color="#f4f7fb" />
      </mesh>
      <mesh position={[0, 0.72, -0.24]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[1.5, 0.36, 0.06]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
      {[-0.65, 0.65].map((lx) => [-0.18, 0.18].map((lz) => (
        <mesh key={`${lx}${lz}`} position={[lx, 0.2, lz]}>
          <boxGeometry args={[0.07, 0.4, 0.07]} />
          <meshStandardMaterial color="#3b2a20" />
        </mesh>
      )))}
    </group>
  );
}

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

  const base = useMemo(() => bulbs.map((b) => new THREE.Color(b.color)), [bulbs]);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const party = currentEvent() === "sparkle";
    group.current?.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (party) {
        // 전구 하나하나가 제각각 반짝: 은은한 금빛 바탕 + 가끔 별처럼 짧게 번쩍 (+ 아주 약한 물결)
        const sp = 1.3 + (i * 7919 % 13) / 6; // 전구마다 다른 빠르기
        const twinkle = Math.pow(Math.max(0, Math.sin(t * sp + bulbs[i].phase * 3)), 14); // 짧고 날카로운 반짝
        const wave = (Math.sin(t * 2 - i * 0.3) + 1) / 2;
        m.emissiveIntensity = 1.1 + wave * 0.6 + twinkle * 6;
        tmp.set(i % 4 === 0 ? "#fff8ea" : "#ffd27a").lerp(WHITE, twinkle * 0.8);
        m.emissive.copy(tmp); m.color.copy(tmp);
        mesh.scale.setScalar(1 + twinkle * 0.9);
      } else {
        m.emissiveIntensity = 0.6 + (Math.sin(t * 2.2 + bulbs[i].phase) + 1) * 0.9;
        m.emissive.copy(base[i]); m.color.copy(base[i]);
        mesh.scale.setScalar(1);
      }
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

export default function Village({ onGround, onBench, onSled, onIce, onSnack, onFish, onWarm }: { onGround?: (x: number, z: number) => void; onBench?: (i: number) => void; onSled?: () => void; onIce?: () => void; onSnack?: () => void; onFish?: () => void; onWarm?: (i: number) => void }) {
  const layout = useMemo(() => {
    const rand = seeded(7);
    // 트리를 둘러싼 집들 (카메라 정면 쪽은 비워 두어 트리가 잘 보이게)
    const houses = [-115, -75, -35, 5, 45, 85, 125].map((deg, i) => {
      const a = THREE.MathUtils.degToRad(deg - 90);
      const r = 15 + rand() * 2.5; // 마을이 넓어져 집을 바깥으로
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return {
        position: [x, 0, z] as [number, number, number],
        rotationY: Math.atan2(-x, -z), // 창문이 트리를 바라보게
        color: WALL_COLORS[i % WALL_COLORS.length],
        scale: 0.9 + rand() * 0.35,
      };
    });
    // 가로등은 옆·뒤쪽에만 (카메라 앞에서 트리를 가리지 않게)
    const lamps = [-110, -20, 20, 110].map((deg) => { // 빙판과 겹치지 않게
      const a = THREE.MathUtils.degToRad(deg - 90);
      return [Math.cos(a) * 7.5, 0, Math.sin(a) * 7.5] as [number, number, number];
    });
    const pines = Array.from({ length: 28 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 20 + rand() * 9;
      return {
        position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        scale: 1 + rand() * 1.4,
      };
    });
    const mounds = Array.from({ length: 10 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 9 + rand() * 18;
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
      <mesh rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { if (onGround && e.delta < 6) { e.stopPropagation(); onGround(e.point.x, e.point.z); } }}>
        <circleGeometry args={[42, 72]} />
        <meshStandardMaterial color="#e8eef8" roughness={1} />
      </mesh>
      {layout.mounds.map((m, i) => (
        <mesh key={i} position={m.position} scale={m.scale}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#eef3fa" roughness={1} />
        </mesh>
      ))}

      {layout.houses.map((h, i) => (
        <FadeWhenBlocking key={i} center={[h.position[0], 1, h.position[2]]} radius={1.6 * h.scale}>
          <House {...h} />
        </FadeWhenBlocking>
      ))}
      {BENCHES.map((b, i) => b.kind === "bench" && <Bench key={i} {...b} onClick={onBench && (() => onBench(i))} />)}
      <PondArea onFish={onFish} onSeat={onBench} onWarm={onWarm} />
      <SledHill onSled={onSled} />
      <IceRink onIce={onIce} />
      <SnackStand onOpen={onSnack} />
      {layout.lamps.map((p, i) => (
        <Lamp key={i} position={p} />
      ))}
      {layout.pines.map((p, i) => (
        <SmallPine key={i} {...p} />
      ))}
    </group>
  );
}

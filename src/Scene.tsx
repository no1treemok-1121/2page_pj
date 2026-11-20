import { useEffect, useMemo, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Wish } from "./wishes";
import Village, { TreeLights } from "./Village";
import Fireworks from "./Fireworks";
import { currentEvent } from "./events";

// 드래그(화면 회전)와 클릭을 구분: 포인터가 거의 안 움직였을 때만 클릭으로 처리
const isClick = (e: ThreeEvent<MouseEvent>) => e.delta < 6;

function useHoverCursor() {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
    },
    onPointerOut: () => setHovered(false),
  };
}

function Ornament({ wish, onClick, mine }: { wish: Wish; onClick: (w: Wish) => void; mine?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.Mesh>(null);
  const hover = useHoverCursor();
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const m = ref.current;
    if (!m) return;
    if (mine) {
      // 내 소원: 크게 두근두근 + 강하게 반짝 + 빛 번짐
      m.scale.setScalar(1 + Math.abs(Math.sin(t * 3)) * 0.35);
      if (mat.current) mat.current.emissiveIntensity = 1.2 + (Math.sin(t * 7) + 1) * 1.6;
      if (glow.current) {
        glow.current.scale.setScalar(1.6 + Math.sin(t * 3) * 0.5);
        (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + (Math.sin(t * 7) + 1) * 0.15;
      }
    } else {
      m.scale.setScalar(1 + Math.sin(t * 2 + phase) * 0.08);
    }
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isClick(e)) onClick(wish);
  };
  return (
    <group position={wish.position}>
      <mesh ref={ref} {...hover} onClick={click}>
        <sphereGeometry args={[mine ? 0.19 : 0.14, 16, 16]} />
        <meshStandardMaterial ref={mat} color={mine ? "#fff4c2" : wish.color} emissive={mine ? "#ffd36b" : wish.color}
          emissiveIntensity={mine ? 2 : 0.6} roughness={0.3} />
      </mesh>
      {mine && (
        <>
          <mesh ref={glow} raycast={() => null}>
            <sphereGeometry args={[0.19, 16, 16]} />
            <meshBasicMaterial color="#ffe08a" transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <pointLight color="#ffd36b" intensity={3} distance={2.2} />
          <Html pointerEvents="none" position={[0, 0.42, 0]} center distanceFactor={8} zIndexRange={[4, 0]}>
            <div className="my-wish-tag">✨ 내 소원</div>
          </Html>
        </>
      )}
    </group>
  );
}

// 꼭대기 별: 반짝임 이벤트 때 크게 빛나며 빙글빙글
// 반짝임 이벤트 때: 무지개 조명 3개가 트리 주위를 돌고, 반짝이 가루가 나선으로 솟아오름
const GLITTER = 70; // 사용자 요청: 트리를 감싸는 빛은 소량만
function TreeParty() {
  const group = useRef<THREE.Group>(null);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const pts = useRef<THREE.Points>(null);
  const seeds = useMemo(() => Array.from({ length: GLITTER }, () => ({ a: Math.random() * Math.PI * 2, h: Math.random(), s: 0.6 + Math.random() * 0.8 })), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(GLITTER * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(GLITTER * 3), 3));
    return g;
  }, []);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const on = currentEvent() === "sparkle";
    if (group.current) group.current.visible = on;
    if (!on) return;
    const t = clock.elapsedTime;
    lights.current.forEach((l, i) => {
      if (!l) return;
      const a = t * 1.6 + (i * Math.PI * 2) / 3;
      l.position.set(Math.cos(a) * 3, 1.5 + i * 1.2 + Math.sin(t * 2 + i) * 0.5, Math.sin(a) * 3);
      l.color.set(i === 1 ? "#fff2d0" : "#ffc861"); // 따뜻한 금빛 조명
    });
    const p = geo.getAttribute("position") as THREE.BufferAttribute;
    const col = geo.getAttribute("color") as THREE.BufferAttribute;
    seeds.forEach((sd, i) => {
      const h = (sd.h + t * 0.12 * sd.s) % 1; // 0(아래) → 1(위) 로 계속 올라감
      const y = 0.4 + h * 5.2;
      const r = 2.4 * (1 - h * 0.8) + 0.25;
      const a = sd.a + t * 1.5 * sd.s + h * 8;
      p.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
      c.setHSL(0.11, 0.9, 0.62 + Math.sin(t * 5 + i) * 0.18); // 금가루 (밝기만 반짝반짝)
      col.setXYZ(i, c.r, c.g, c.b);
    });
    p.needsUpdate = true; col.needsUpdate = true;
    if (pts.current) (pts.current.material as THREE.PointsMaterial).size = 0.09 + Math.abs(Math.sin(t * 3)) * 0.04;
  });
  return (
    <group ref={group} visible={false}>
      {[0].map((i) => <pointLight key={i} ref={(l) => { lights.current[i] = l; }} intensity={6} distance={5} />)}
      <points ref={pts} geometry={geo} raycast={() => null}>
        <pointsMaterial vertexColors size={0.15} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

function TreeStar() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, dt) => {
    const party = currentEvent() === "sparkle";
    const t = clock.elapsedTime;
    if (mesh.current) {
      mesh.current.rotation.y += dt * (party ? 4 : 0.4);
      mesh.current.scale.setScalar(party ? 1.4 + Math.sin(t * 8) * 0.25 : 1);
    }
    if (mat.current) mat.current.emissiveIntensity = party ? 4 + Math.sin(t * 10) * 2 : 1.5;
    if (light.current) light.current.intensity = party ? 20 + Math.sin(t * 10) * 8 : 8;
  });
  return (
    <>
      <mesh ref={mesh} position={[0, 5.1, 0]}>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial ref={mat} color="#ffd36b" emissive="#ffb300" emissiveIntensity={1.5} />
      </mesh>
      <pointLight ref={light} position={[0, 5.1, 0]} color="#ffd36b" intensity={8} distance={8} />
    </>
  );
}

function Tree({ onClick }: { onClick: () => void }) {
  const hover = useHoverCursor();
  return (
    <group
      {...hover}
      onClick={(e) => {
        e.stopPropagation();
        if (isClick(e)) onClick();
      }}
    >
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 1, 12]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 1.6 + i * 1.1, 0]}>
          <coneGeometry args={[2 - i * 0.55, 1.8, 24]} />
          <meshStandardMaterial color="#2f7a4b" />
        </mesh>
      ))}
      <TreeStar />
      <TreeParty />
    </group>
  );
}

// 동그랗고 가장자리가 부드러운 눈송이 그림 (네모 점 대신)
function useFlakeTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.85)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

// 자연스러운 눈: 송이마다 떨어지는 속도·크기가 다르고, 좌우로 살랑살랑 흔들리며 바람에 살짝 날림
function SnowLayer({ count, size, speed }: { count: number; size: number; speed: number }) {
  const ref = useRef<THREE.Points>(null);
  const tex = useFlakeTexture();
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4); // 기준 x, 기준 z, 흔들림 위상, 속도 배율
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = (Math.random() - 0.5) * 50;
      seeds[i * 4 + 1] = (Math.random() - 0.5) * 50;
      seeds[i * 4 + 2] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 3] = 0.6 + Math.random() * 0.8;
      positions[i * 3] = seeds[i * 4];
      positions[i * 3 + 1] = Math.random() * 16;
      positions[i * 3 + 2] = seeds[i * 4 + 1];
    }
    return { positions, seeds };
  }, [count]);

  useFrame(({ clock }, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const t = clock.elapsedTime;
    const wind = Math.sin(t * 0.15) * 0.35; // 천천히 바뀌는 약한 바람
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const ph = seeds[i * 4 + 2], sp = seeds[i * 4 + 3];
      let y = pos.getY(i) - delta * speed * sp;
      if (y < 0) {
        y = 16;
        seeds[i * 4] = (Math.random() - 0.5) * 50;
        seeds[i * 4 + 1] = (Math.random() - 0.5) * 50;
      }
      const sway = Math.sin(t * (0.8 + sp * 0.6) + ph) * 0.35;
      const drift = (16 - y) * wind * 0.12;
      pos.setXYZ(i, seeds[i * 4] + sway + drift, y, seeds[i * 4 + 1] + Math.cos(t * 0.7 + ph) * 0.25);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} color="#ffffff" size={size} sizeAttenuation transparent opacity={0.95} depthWrite={false} alphaTest={0.01} />
    </points>
  );
}

function Snow() {
  return (
    <>
      <SnowLayer count={900} size={0.12} speed={0.7} />
      <SnowLayer count={350} size={0.22} speed={1.0} />
    </>
  );
}

type SceneProps = {
  wishes: Wish[];
  onTreeClick: () => void;
  onWishClick: (w: Wish) => void;
  onGround?: (x: number, z: number) => void;
  onBench?: (i: number) => void;
  onSled?: () => void;
  onIce?: () => void;
  mineIds?: Set<string>;
};

export default function Scene({ wishes, onTreeClick, onWishClick, onGround, onBench, onSled, onIce, mineIds }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.35} color="#9fb4ff" />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <Village onGround={onGround} onBench={onBench} onSled={onSled} onIce={onIce} />
      <Tree onClick={onTreeClick} />
      <TreeLights />
      {wishes.map((w) => (
        <Ornament key={w.id} wish={w} onClick={onWishClick} mine={mineIds?.has(w.id) || w.id.startsWith("pending-")} />
      ))}
      <Snow />
      <Fireworks />
    </>
  );
}

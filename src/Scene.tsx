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
          <Html position={[0, 0.42, 0]} center distanceFactor={8} zIndexRange={[4, 0]}>
            <div className="my-wish-tag">✨ 내 소원</div>
          </Html>
        </>
      )}
    </group>
  );
}

// 꼭대기 별: 반짝임 이벤트 때 크게 빛나며 빙글빙글
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
    </group>
  );
}

function Snow({ count = 1500 }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 15;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = pos.getY(i) - delta * 0.8;
      if (y < 0) y = 15;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.08} transparent opacity={0.9} />
    </points>
  );
}

type SceneProps = {
  wishes: Wish[];
  onTreeClick: () => void;
  onWishClick: (w: Wish) => void;
  onGround?: (x: number, z: number) => void;
  mineIds?: Set<string>;
};

export default function Scene({ wishes, onTreeClick, onWishClick, onGround, mineIds }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.35} color="#9fb4ff" />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <Village onGround={onGround} />
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

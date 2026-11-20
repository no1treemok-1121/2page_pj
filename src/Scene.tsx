import { useEffect, useMemo, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Wish } from "./wishes";
import Village, { TreeLights } from "./Village";

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

function Ornament({ wish, onClick }: { wish: Wish; onClick: (w: Wish) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const hover = useHoverCursor();
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const s = 1 + Math.sin(clock.elapsedTime * 2 + phase) * 0.08;
    m.scale.setScalar(s);
  });
  return (
    <mesh
      ref={ref}
      position={wish.position}
      {...hover}
      onClick={(e) => {
        e.stopPropagation();
        if (isClick(e)) onClick(wish);
      }}
    >
      <sphereGeometry args={[0.14, 16, 16]} />
      <meshStandardMaterial color={wish.color} emissive={wish.color} emissiveIntensity={0.6} roughness={0.3} />
    </mesh>
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
      <mesh position={[0, 5.1, 0]}>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0, 5.1, 0]} color="#ffd36b" intensity={8} distance={8} />
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
};

export default function Scene({ wishes, onTreeClick, onWishClick }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.35} color="#9fb4ff" />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <Village />
      <Tree onClick={onTreeClick} />
      <TreeLights />
      {wishes.map((w) => (
        <Ornament key={w.id} wish={w} onClick={onWishClick} />
      ))}
      <Snow />
    </>
  );
}

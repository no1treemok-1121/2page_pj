import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Tree() {
  return (
    <group>
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

export default function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} color="#9fb4ff" />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[20, 48]} />
        <meshStandardMaterial color="#e8eef8" />
      </mesh>
      <Tree />
      <Snow />
    </>
  );
}

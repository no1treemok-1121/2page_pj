import { useEffect, useRef, useState } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Character3D from "./Character3D";
import { Avatar } from "./avatar";

// 아늑한 방: 바닥·벽·창문(밖에 눈)·난로·작은 트리·편지함
// 안 읽은 편지가 있으면 편지함 위에서 둥둥 떠서 깜박이는 화살표
function Arrow() {
  const g = useRef<THREE.Group>(null);
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current) { g.current.position.y = 1.95 + Math.sin(t * 4) * 0.12; g.current.rotation.y = t * 1.5; }
    if (m.current) m.current.emissiveIntensity = 0.6 + (Math.sin(t * 6) + 1) * 1.2;
  });
  return (
    <group ref={g} position={[0, 1.95, 0]} raycast={() => null}>
      <mesh rotation={[Math.PI, 0, 0]} raycast={() => null}>
        <coneGeometry args={[0.18, 0.32, 4]} />
        <meshStandardMaterial ref={m} color="#ffd36b" emissive="#ffb300" />
      </mesh>
      <mesh position={[0, 0.26, 0]} raycast={() => null}>
        <boxGeometry args={[0.1, 0.25, 0.1]} />
        <meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={1} />
      </mesh>
      <pointLight color="#ffd36b" intensity={2} distance={2.5} />
    </group>
  );
}

function Mailbox({ onClick, count, alert }: { onClick: () => void; count: number; alert?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => { document.body.style.cursor = "auto"; };
  }, [hovered]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = count > 0 ? Math.sin(clock.elapsedTime * 3) * 0.04 : 0;
  });
  return (
    <group
      position={[1.3, 0, 0.6]}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 6) onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
        <meshStandardMaterial color="#3b2a20" />
      </mesh>
      <group ref={ref}>
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.6, 0.4, 0.4]} />
          <meshStandardMaterial color={hovered ? "#e85d5d" : "#c94343"} />
        </mesh>
        <mesh position={[0, 1.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.6, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={hovered ? "#e85d5d" : "#c94343"} />
        </mesh>
        {count > 0 && (
          <mesh position={[0, 1.08, 0.21]}>
            <planeGeometry args={[0.36, 0.22]} />
            <meshStandardMaterial color="#fff6e0" emissive="#ffe3a3" emissiveIntensity={0.6} />
          </mesh>
        )}
      </group>
      {alert && <Arrow />}
    </group>
  );
}

function Fireplace() {
  const fire = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (fire.current) fire.current.intensity = 6 + Math.sin(clock.elapsedTime * 8) * 1.2 + Math.sin(clock.elapsedTime * 13) * 0.8;
  });
  return (
    <group position={[-1.6, 0, -2.3]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.6, 1.4, 0.5]} />
        <meshStandardMaterial color="#8a6e5a" />
      </mesh>
      <mesh position={[0, 0.45, 0.26]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshStandardMaterial color="#ff8a3d" emissive="#ff6a00" emissiveIntensity={1.6} />
      </mesh>
      <pointLight ref={fire} position={[0, 0.6, 0.8]} color="#ff9a4a" distance={7} />
    </group>
  );
}

export default function RoomScene({ letterCount, onMailbox, avatar, alert }: { letterCount: number; onMailbox: () => void; avatar: Avatar; alert?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.45} color="#ffe6c7" />
      <directionalLight position={[3, 5, 4]} intensity={0.4} />
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#9c6b4a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.3]}>
        <circleGeometry args={[1.4, 32]} />
        <meshStandardMaterial color="#b8405e" />
      </mesh>
      {/* 벽 */}
      <mesh position={[0, 1.75, -2.6]}>
        <boxGeometry args={[6, 3.5, 0.2]} />
        <meshStandardMaterial color="#efe0c9" />
      </mesh>
      <mesh position={[-3, 1.75, 0]}>
        <boxGeometry args={[0.2, 3.5, 6]} />
        <meshStandardMaterial color="#e6d3b8" />
      </mesh>
      {/* 창문 (밖은 눈 내리는 밤) */}
      <group position={[1.2, 2, -2.48]}>
        <mesh>
          <planeGeometry args={[1.5, 1.1]} />
          <meshBasicMaterial color="#1a2b55" />
        </mesh>
        {[[-0.4, 0.2], [0.3, -0.25], [0.5, 0.3], [-0.2, -0.3], [0.05, 0.05]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.01]}>
            <circleGeometry args={[0.03, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.05, 1.1, 0.02]} />
          <meshStandardMaterial color="#6b4a35" />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[1.5, 0.05, 0.02]} />
          <meshStandardMaterial color="#6b4a35" />
        </mesh>
      </group>
      <Fireplace />
      {/* 작은 트리 */}
      <group position={[-2.1, 0, -0.6]}>
        <mesh position={[0, 0.7, 0]}>
          <coneGeometry args={[0.5, 1.2, 12]} />
          <meshStandardMaterial color="#2f7a4b" />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <octahedronGeometry args={[0.1]} />
          <meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={1.5} />
        </mesh>
      </group>
      <Mailbox onClick={onMailbox} count={letterCount} alert={alert} />
      <Character3D avatar={avatar} position={[-0.2, 0, 0.5]} />
    </>
  );
}

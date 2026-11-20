import { DEFAULT_DECOR, Decor, foodById } from "./decor";
import { IconText } from "./FoodIcon";
import { Html } from "@react-three/drei";
import React, { useEffect, useRef, useState } from "react";
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

// 🎨 꾸미기 소품
function Garland({ kind }: { kind: "warm" | "rainbow" }) {
  const g = useRef<THREE.Group>(null);
  const colors = kind === "warm" ? ["#ffd36b", "#ffe9a8"] : ["#ff5a5a", "#ffd84d", "#7dff9a", "#7fe0ff", "#ff9ff3"];
  useFrame(({ clock }) => {
    const on = Math.floor(clock.elapsedTime * 2) % 2;
    g.current?.children.forEach((c, i) => { ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = kind === "warm" ? 1.4 + Math.sin(clock.elapsedTime * 2 + i) * 0.4 : (i % 2 === on ? 2 : 0.5); });
  });
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 20; i++) { const x = -2.8 + i * 0.28; pts.push([x, 3.15 - Math.abs(Math.sin((i / 20) * Math.PI * 3)) * 0.25, -2.45]); }
  for (let i = 1; i <= 14; i++) { const z = -2.45 + i * 0.36; pts.push([-2.85, 3.15 - Math.abs(Math.sin((i / 14) * Math.PI * 2)) * 0.25, z]); }
  return (
    <group ref={g}>
      {pts.map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.045, 8, 6]} /><meshStandardMaterial color={colors[i % colors.length]} emissive={colors[i % colors.length]} emissiveIntensity={1} /></mesh>
      ))}
    </group>
  );
}

function Table({ food, candle }: { food: string[]; candle: boolean }) {
  return (
    <group position={[0.85, 0, -1.45]}>
      <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.6, 0.6, 0.06, 24]} /><meshStandardMaterial color="#7a4e2d" /></mesh>
      <mesh position={[0, 0.66, 0]}><cylinderGeometry args={[0.55, 0.55, 0.01, 24]} /><meshStandardMaterial color="#f4ece0" /></mesh>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.06, 0.08, 0.6, 8]} /><meshStandardMaterial color="#6b4423" /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.3, 0.3, 0.04, 16]} /><meshStandardMaterial color="#6b4423" /></mesh>
      {candle && <>
        <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.05, 0.05, 0.22, 10]} /><meshStandardMaterial color="#fff6e0" /></mesh>
        <mesh position={[0, 0.93, 0]}><coneGeometry args={[0.03, 0.09, 8]} /><meshStandardMaterial color="#ffb347" emissive="#ff9a2a" emissiveIntensity={2.5} /></mesh>
        <pointLight position={[0, 1.1, 0]} color="#ffb347" intensity={1.5} distance={3} />
      </>}
      {food.map((id, i) => {
        const f = foodById(id); if (!f) return null;
        const a = (i / Math.max(food.length, 1)) * Math.PI * 2 + 0.4;
        return (
          <group key={i} position={[Math.cos(a) * 0.36, 0.67, Math.sin(a) * 0.36]}>
            <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.13, 0.11, 0.02, 14]} /><meshStandardMaterial color="#ffffff" /></mesh>
            <Html pointerEvents="none" position={[0, 0.16, 0]} center distanceFactor={4.5} zIndexRange={[3, 0]}><div className="food-emoji"><IconText text={f.emoji} /></div></Html>
          </group>
        );
      })}
    </group>
  );
}

function Gifts() {
  return (
    <group position={[-1.6, 0, -0.1]}>
      {[[0, 0, "#d62f2f", 0.32], [0.38, 0.15, "#3d6fb6", 0.24], [-0.15, 0.35, "#f2c14e", 0.2]].map(([x, z, c, s], i) => (
        <group key={i} position={[x as number, (s as number) / 2, z as number]} rotation={[0, i * 0.5, 0]}>
          <mesh><boxGeometry args={[s as number, s as number, s as number]} /><meshStandardMaterial color={c as string} /></mesh>
          <mesh><boxGeometry args={[(s as number) + 0.01, (s as number) + 0.01, 0.05]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh><boxGeometry args={[0.05, (s as number) + 0.01, (s as number) + 0.01]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </group>
      ))}
    </group>
  );
}

function Stockings() {
  return (
    <group position={[-1.6, 1.05, -2.02]}>
      {[[-0.35, "#d62f2f"], [0.05, "#2f7a4b"], [0.45, "#3d6fb6"]].map(([x, c]) => (
        <group key={x as number} position={[x as number, 0, 0]}>
          <mesh position={[0, -0.12, 0]}><boxGeometry args={[0.13, 0.26, 0.06]} /><meshStandardMaterial color={c as string} /></mesh>
          <mesh position={[0.05, -0.27, 0]}><boxGeometry args={[0.2, 0.1, 0.06]} /><meshStandardMaterial color={c as string} /></mesh>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.15, 0.06, 0.07]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </group>
      ))}
    </group>
  );
}

function SnowmanDoll() {
  return (
    <group position={[-0.5, 0, -2.05]} scale={0.8}>
      <mesh position={[0, 0.22, 0]}><sphereGeometry args={[0.24, 16, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.56, 0]}><sphereGeometry args={[0.17, 16, 12]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.58, 0.16]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.03, 0.12, 8]} /><meshStandardMaterial color="#ff8a3d" /></mesh>
      {[-0.06, 0.06].map((x) => <mesh key={x} position={[x, 0.63, 0.15]}><sphereGeometry args={[0.02, 6, 6]} /><meshStandardMaterial color="#1b1b1b" /></mesh>)}
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.04, 8, 16]} /><meshStandardMaterial color="#d62f2f" /></mesh>
      <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.1, 0.12, 0.16, 12]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
    </group>
  );
}

// 카메라가 벽 바깥쪽에 있으면 그 벽(과 벽에 붙은 것)을 숨김
function Wall({ nx, nz, at, children }: { nx: number; nz: number; at: [number, number]; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (g.current) g.current.visible = (camera.position.x - at[0]) * nx + (camera.position.z - at[1]) * nz < 0;
  });
  return <group ref={g}>{children}</group>;
}

// 창문 (밖은 눈 내리는 밤)
function Window({ x, z, ry }: { x: number; z: number; ry: number }) {
  return (
    <group position={[x, 2, z]} rotation={[0, ry, 0]}>
      <mesh><planeGeometry args={[1.5, 1.1]} /><meshBasicMaterial color="#1a2b55" /></mesh>
      {[[-0.4, 0.2], [0.3, -0.25], [0.5, 0.3], [-0.2, -0.3], [0.05, 0.05]].map(([a, b], i) => (
        <mesh key={i} position={[a, b, 0.01]}><circleGeometry args={[0.03, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      ))}
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.05, 1.1, 0.02]} /><meshStandardMaterial color="#6b4a35" /></mesh>
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[1.5, 0.05, 0.02]} /><meshStandardMaterial color="#6b4a35" /></mesh>
      {/* 커튼 */}
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.85, -0.05, 0.04]}><boxGeometry args={[0.25, 1.3, 0.04]} /><meshStandardMaterial color="#f6d6dc" /></mesh>)}
      <mesh position={[0, 0.7, 0.04]}><boxGeometry args={[2.0, 0.05, 0.05]} /><meshStandardMaterial color="#c9a27a" /></mesh>
    </group>
  );
}

// 작은 액자 (하트·별·고양이·눈송이 그림)
function Frame({ x, y, z, ry, color, kind }: { x: number; y: number; z: number; ry: number; color: string; kind: "heart" | "star" | "cat" | "snow" }) {
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh><boxGeometry args={[0.5, 0.42, 0.04]} /><meshStandardMaterial color="#8a5a3c" /></mesh>
      <mesh position={[0, 0, 0.022]}><planeGeometry args={[0.4, 0.32]} /><meshStandardMaterial color="#fff8ec" /></mesh>
      <group position={[0, 0, 0.03]}>
        {kind === "heart" && [-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.04, 0.02, 0]}><circleGeometry args={[0.055, 16]} /><meshBasicMaterial color={color} /></mesh>)}
        {kind === "heart" && <mesh position={[0, -0.035, 0]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.1, 0.1]} /><meshBasicMaterial color={color} /></mesh>}
        {kind === "star" && <mesh rotation={[0, 0, Math.PI / 2]}><circleGeometry args={[0.09, 5]} /><meshBasicMaterial color={color} /></mesh>}
        {kind === "snow" && [0, 1, 2].map((k) => <mesh key={k} rotation={[0, 0, (k * Math.PI) / 3]}><planeGeometry args={[0.22, 0.025]} /><meshBasicMaterial color={color} /></mesh>)}
        {kind === "cat" && <>
          <mesh><circleGeometry args={[0.085, 18]} /><meshBasicMaterial color="#fbf8f2" /></mesh>
          <mesh position={[-0.045, 0.04, 0.001]}><circleGeometry args={[0.04, 12]} /><meshBasicMaterial color="#d27a32" /></mesh>
          {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.055, 0.085, 0]} rotation={[0, 0, sd * -0.3]}><circleGeometry args={[0.035, 3]} /><meshBasicMaterial color={sd < 0 ? "#d27a32" : "#231d1d"} /></mesh>)}
          {[-1, 1].map((sd) => <mesh key={`e${sd}`} position={[sd * 0.03, 0, 0.002]}><circleGeometry args={[0.012, 10]} /><meshBasicMaterial color="#5a8a3a" /></mesh>)}
        </>}
      </group>
    </group>
  );
}

export default function RoomScene({ letterCount, onMailbox, avatar, alert, decor = DEFAULT_DECOR }: { letterCount: number; onMailbox: () => void; avatar: Avatar; alert?: boolean; decor?: Decor }) {
  const side = new THREE.Color(decor.wall).multiplyScalar(0.93).getStyle();
  return (
    <>
      <ambientLight intensity={0.45} color="#ffe6c7" />
      <directionalLight position={[3, 5, 4]} intensity={0.4} />
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color={decor.floor} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.3]}>
        <circleGeometry args={[1.4, 32]} />
        <meshStandardMaterial color={decor.rug} />
      </mesh>
      {/* 벽 4개: 카메라와 사이에 있는 벽은 숨겨서 360도 어디서든 방 안이 보임 (인형집처럼) */}
      <Wall nx={0} nz={-1} at={[0, -2.6]}>
        <mesh position={[0, 1.75, -2.6]}><boxGeometry args={[6, 3.5, 0.2]} /><meshStandardMaterial color={decor.wall} /></mesh>
        <Window x={1.2} z={-2.48} ry={0} />
        <Frame x={-0.3} y={2.4} z={-2.48} ry={0} color="#f2c14e" kind="heart" />
          </Wall>
      <Wall nx={-1} nz={0} at={[-3, 0]}>
        <mesh position={[-3, 1.75, 0]}><boxGeometry args={[0.2, 3.5, 6]} /><meshStandardMaterial color={side} /></mesh>
        <Frame x={-2.88} y={2.2} z={1.4} ry={Math.PI / 2} color="#8a5cc2" kind="star" />
      </Wall>
      <Wall nx={1} nz={0} at={[3, 0]}>
        <mesh position={[3, 1.75, 0]}><boxGeometry args={[0.2, 3.5, 6]} /><meshStandardMaterial color={side} /></mesh>
        <Window x={2.88} z={0.4} ry={-Math.PI / 2} />
        <Frame x={2.88} y={2.3} z={-1.6} ry={-Math.PI / 2} color="#e07a9a" kind="cat" />
        {/* 작은 선반 + 화분 */}
        <mesh position={[2.75, 1.3, -1.6]}><boxGeometry args={[0.3, 0.05, 0.8]} /><meshStandardMaterial color="#8a5a3c" /></mesh>
        <mesh position={[2.75, 1.42, -1.8]}><cylinderGeometry args={[0.08, 0.06, 0.18, 12]} /><meshStandardMaterial color="#d9774a" /></mesh>
        <mesh position={[2.75, 1.58, -1.8]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#4f9a5e" /></mesh>
        <mesh position={[2.75, 1.4, -1.4]}><boxGeometry args={[0.18, 0.16, 0.12]} /><meshStandardMaterial color="#f6d6dc" /></mesh>
      </Wall>
      <Wall nx={0} nz={1} at={[0, 3]}>
        <mesh position={[0, 1.75, 3]}><boxGeometry args={[6, 3.5, 0.2]} /><meshStandardMaterial color={side} /></mesh>
        {/* 문 + 리스 */}
        <mesh position={[-1.4, 1.05, 2.89]}><boxGeometry args={[1.0, 2.1, 0.05]} /><meshStandardMaterial color="#8a5a3c" /></mesh>
        <mesh position={[-1.05, 1.0, 2.86]}><sphereGeometry args={[0.05, 10, 8]} /><meshStandardMaterial color="#f2c14e" metalness={0.6} /></mesh>
        <mesh position={[-1.4, 1.7, 2.85]}><torusGeometry args={[0.22, 0.06, 8, 20]} /><meshStandardMaterial color="#2e7d4f" /></mesh>
        <mesh position={[-1.4, 1.5, 2.84]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color="#d62f2f" /></mesh>
        <Frame x={1.2} y={2.1} z={2.89} ry={Math.PI} color="#3d6fb6" kind="snow" />
      </Wall>
      <Fireplace />
      {decor.lights !== "none" && <Garland kind={decor.lights} />}
      {decor.table && <Table food={decor.food} candle={decor.candle} />}
      {!decor.table && decor.candle && <Table food={[]} candle />}
      {decor.gift && <Gifts />}
      {decor.stocking && <Stockings />}
      {decor.snowman && <SnowmanDoll />}
      {/* 작은 트리 */}
      {decor.tree && <group position={[-2.1, 0, -0.6]}>
        <mesh position={[0, 0.7, 0]}>
          <coneGeometry args={[0.5, 1.2, 12]} />
          <meshStandardMaterial color="#2f7a4b" />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <octahedronGeometry args={[0.1]} />
          <meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={1.5} />
        </mesh>
        {[[0.25, 0.5, "#ff5a5a"], [-0.2, 0.7, "#7fe0ff"], [0.1, 0.95, "#ffd84d"], [-0.28, 0.4, "#ffd84d"]].map(([x, y, c], i) => (
          <mesh key={i} position={[x as number, y as number, 0.25 - (y as number) * 0.12]}><sphereGeometry args={[0.05, 8, 6]} /><meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={0.6} /></mesh>
        ))}
      </group>}
      <Mailbox onClick={onMailbox} count={letterCount} alert={alert} />
      <Character3D avatar={avatar} position={[-0.2, 0, 0.5]} />
    </>
  );
}

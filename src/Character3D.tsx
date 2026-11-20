import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ANIMALS, Avatar } from "./avatar";

// 간단한 도형으로 만든 3D 캐릭터 (방에 서 있음, 살짝 숨쉬듯 움직임)
export default function Character3D({ avatar, position = [0, 0, 0], walking }: { avatar: Avatar; position?: [number, number, number]; walking?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.y = position[1] + Math.abs(Math.sin(t * 2)) * 0.05;
    if (walking === undefined) g.rotation.y = Math.sin(t * 0.6) * 0.35 + 0.4; // 방에서는 두리번, 마을에서는 걷는 방향을 바라봄
    else g.position.y = position[1] + (walking ? Math.abs(Math.sin(t * 9)) * 0.12 : Math.abs(Math.sin(t * 2)) * 0.04);
  });
  const ears = ANIMALS.find((x) => x.id === avatar.animal)?.ears ?? "round";
  const c = avatar.color;
  const isPenguin = avatar.animal === "penguin";
  const dark = new THREE.Color(c).multiplyScalar(0.8).getStyle();
  return (
    <group ref={ref} position={position}>
      {/* 몸 */}
      <mesh position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.28, 0.3, 8, 16]} />
        <meshStandardMaterial color={isPenguin ? "#2b2f3a" : c} />
      </mesh>
      <mesh position={[0, 0.45, 0.2]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      {/* 머리 */}
      <group position={[0, 1.02, 0]}>
        <mesh>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshStandardMaterial color={isPenguin ? "#2b2f3a" : c} />
        </mesh>
        {isPenguin && (
          <mesh position={[0, -0.03, 0.12]} scale={[1, 0.9, 0.8]}>
            <sphereGeometry args={[0.24, 16, 16]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
        )}
        {[-0.11, 0.11].map((x) => (
          <mesh key={x} position={[x, 0.04, 0.29]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#1b1b22" />
          </mesh>
        ))}
        <mesh position={[0, -0.06, 0.31]}>
          {isPenguin ? <coneGeometry args={[0.05, 0.12, 8]} /> : <sphereGeometry args={[0.035, 8, 8]} />}
          <meshStandardMaterial color={isPenguin ? "#ffb347" : "#3a2a24"} />
        </mesh>
        {/* 귀 */}
        {[-1, 1].map((s) => (
          <group key={s}>
            {ears === "pointy" && (
              <mesh position={[s * 0.2, 0.3, 0]} rotation={[0, 0, -s * 0.3]}>
                <coneGeometry args={[0.1, 0.22, 4]} />
                <meshStandardMaterial color={dark} />
              </mesh>
            )}
            {ears === "long" && (
              <mesh position={[s * 0.12, 0.42, 0]} rotation={[0, 0, -s * 0.15]} scale={[1, 2.6, 0.7]}>
                <sphereGeometry args={[0.08, 12, 12]} />
                <meshStandardMaterial color={dark} />
              </mesh>
            )}
            {ears === "round" && (
              <mesh position={[s * 0.22, 0.24, 0]}>
                <sphereGeometry args={[0.1, 12, 12]} />
                <meshStandardMaterial color={dark} />
              </mesh>
            )}
            {ears === "floppy" && (
              <mesh position={[s * 0.3, 0.02, 0]} rotation={[0, 0, s * 0.3]} scale={[0.7, 1.6, 0.6]}>
                <sphereGeometry args={[0.1, 12, 12]} />
                <meshStandardMaterial color={dark} />
              </mesh>
            )}
          </group>
        ))}
        {/* 장식 */}
        {avatar.acc === "santa" && (
          <group position={[0, 0.3, 0]} rotation={[0, 0, -0.25]}>
            <mesh position={[0, 0.15, 0]}>
              <coneGeometry args={[0.24, 0.42, 16]} />
              <meshStandardMaterial color="#d33a3a" />
            </mesh>
            <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.23, 0.05, 8, 24]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        )}
        {avatar.acc === "crown" && (
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.16, 0.14, 0.14, 8, 1, true]} />
            <meshStandardMaterial color="#ffd36b" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        )}
        {avatar.acc === "ribbon" && [-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09 + 0.12, 0.3, 0.05]} rotation={[0, 0, s * 0.6]} scale={[1.4, 0.8, 0.6]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#ff6f91" />
          </mesh>
        ))}
      </group>
      {avatar.acc === "scarf" && (
        <mesh position={[0, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.24, 0.07, 10, 24]} />
          <meshStandardMaterial color="#d33a3a" />
        </mesh>
      )}
    </group>
  );
}

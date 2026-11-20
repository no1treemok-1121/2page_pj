import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ALL_ANIMALS, Avatar } from "./avatar";

// 간단한 도형으로 만든 3D 캐릭터 (방에 서 있음, 살짝 숨쉬듯 움직임)
export type CharStyle = "now" | "chibi" | "pastel" | "mochi";
export const CHAR_STYLE: CharStyle = "now"; // 사용자가 고른 스타일로 바꾸면 모든 캐릭터에 적용

export default function Character3D({ avatar, position = [0, 0, 0], walking, look = CHAR_STYLE }: { avatar: Avatar; position?: [number, number, number]; walking?: boolean; look?: CharStyle }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.y = position[1] + Math.abs(Math.sin(t * 2)) * 0.05;
    if (walking === undefined) g.rotation.y = Math.sin(t * 0.6) * 0.35 + 0.4; // 방에서는 두리번, 마을에서는 걷는 방향을 바라봄
    else g.position.y = position[1] + (walking ? Math.abs(Math.sin(t * 9)) * 0.12 : Math.abs(Math.sin(t * 2)) * 0.04);
  });
  const ears = ALL_ANIMALS.find((x) => x.id === avatar.animal)?.ears ?? "round";
  const isDeer = avatar.animal === "deer";
  const c = avatar.color;
  const isPenguin = avatar.animal === "penguin";
  const dark = new THREE.Color(c).multiplyScalar(0.8).getStyle();
  const cute = look !== "now";
  const pastel = (col: string) => look === "pastel" ? new THREE.Color(col).lerp(new THREE.Color("#ffffff"), 0.28).getStyle() : col;
  const skin = (col: string) => look === "pastel" ? <meshToonMaterial color={pastel(col)} />
    : look === "mochi" ? <meshPhysicalMaterial color={col} roughness={0.25} clearcoat={1} clearcoatRoughness={0.2} sheen={0.5} />
      : <meshStandardMaterial color={col} />;
  const headScale = look === "chibi" || look === "pastel" ? 1.28 : look === "mochi" ? 1.18 : 1;
  const headY = look === "now" ? 1.02 : look === "mochi" ? 0.9 : 0.98;
  return (
    <group ref={ref} position={position}>
      {/* 몸 */}
      <mesh position={[0, 0.45, 0]}>
        {look === "now" ? <capsuleGeometry args={[0.28, 0.3, 8, 16]} /> : look === "mochi" ? <sphereGeometry args={[0.36, 24, 18]} /> : <capsuleGeometry args={[0.27, 0.12, 8, 16]} />}
        {skin(isPenguin ? "#2b2f3a" : c)}
      </mesh>
      <mesh position={[0, 0.45, 0.2]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      {/* 다람쥐 꼬리: 크고 복슬복슬하게 위로 말림 (NPC) */}
      {avatar.animal === "squirrel" && [0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.35 + i * 0.22, -0.32 - Math.sin(i * 0.9) * 0.18]} scale={[0.9, 1.1, 0.9]}>
          <sphereGeometry args={[0.2 - i * 0.015, 12, 12]} />
          <meshStandardMaterial color={dark} roughness={1} />
        </mesh>
      ))}
      {/* 사슴 뿔 (NPC) */}
      {isDeer && [-1, 1].map((s) => (
        <group key={s} position={[s * 0.14, 1.32, 0]} rotation={[0, 0, -s * 0.35]}>
          <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.025, 0.03, 0.34, 6]} /><meshStandardMaterial color="#8a5a35" /></mesh>
          <mesh position={[s * 0.08, 0.22, 0]} rotation={[0, 0, -s * 0.9]}><cylinderGeometry args={[0.02, 0.025, 0.18, 6]} /><meshStandardMaterial color="#8a5a35" /></mesh>
          <mesh position={[-s * 0.05, 0.3, 0]} rotation={[0, 0, s * 0.7]}><cylinderGeometry args={[0.02, 0.025, 0.14, 6]} /><meshStandardMaterial color="#8a5a35" /></mesh>
        </group>
      ))}
      {/* 너구리: 줄무늬 꼬리 (NPC) */}
      {avatar.animal === "raccoon" && [0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.3 + i * 0.06, -0.32 - i * 0.1]} rotation={[0.9, 0, 0]}>
          <cylinderGeometry args={[0.1 - i * 0.012, 0.11 - i * 0.012, 0.12, 10]} />
          <meshStandardMaterial color={i % 2 ? "#2b2b30" : "#9a9aa2"} />
        </mesh>
      ))}
      {/* 햄스터 볼 (NPC) */}
      {avatar.animal === "hamster" && [-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.22, 0.95, 0.15]}><sphereGeometry args={[0.13, 12, 12]} /><meshStandardMaterial color="#fff1dc" /></mesh>
      ))}
      {/* 토끼 꼬리: 하얗고 동글동글 */}
      {avatar.animal === "rabbit" && (
        <group position={[0, 0.3, -0.29]}>
          <mesh>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          {[[-0.05, 0.05, -0.03], [0.06, 0.03, -0.02], [0, -0.06, -0.03]].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <sphereGeometry args={[0.065, 10, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={1} />
            </mesh>
          ))}
        </group>
      )}
      {cute && [-1, 1].map((sd) => (
        <group key={`a${sd}`}>
          <mesh position={[sd * 0.27, 0.42, 0.06]} scale={[0.8, 1, 0.8]}><sphereGeometry args={[0.09, 12, 10]} />{skin(isPenguin ? "#2b2f3a" : c)}</mesh>
          <mesh position={[sd * 0.13, 0.06, 0.08]} scale={[1, 0.6, 1.3]}><sphereGeometry args={[0.1, 12, 10]} />{skin(dark)}</mesh>
        </group>
      ))}
      {look === "pastel" && (
        <group position={[0, 0.42, 0.29]}>
          {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.03, 0.02, 0]}><circleGeometry args={[0.04, 16]} /><meshBasicMaterial color="#ff8fb0" /></mesh>)}
          <mesh position={[0, -0.02, 0]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.057, 0.057]} /><meshBasicMaterial color="#ff8fb0" /></mesh>
        </group>
      )}
      {/* 머리 */}
      <group position={[0, headY, 0]} scale={headScale}>
        <mesh scale={look === "mochi" ? [1.08, 0.92, 1] : 1}>
          <sphereGeometry args={[0.32, 28, 24]} />
          {skin(isPenguin ? "#2b2f3a" : c)}
        </mesh>
        {isPenguin && (
          <mesh position={[0, -0.03, 0.15]} scale={[0.95, 0.9, 0.8]}>
            <sphereGeometry args={[0.24, 16, 16]} />
            <meshStandardMaterial color="#fffaf0" />
          </mesh>
        )}
        {avatar.animal === "raccoon" && (
          <mesh position={[0, 0.04, 0.2]} scale={[1.25, 0.45, 0.6]}><sphereGeometry args={[0.2, 14, 10]} /><meshStandardMaterial color="#2b2b30" /></mesh>
        )}
        {/* 눈 (펭귄은 하얀 얼굴 위에 오도록 앞으로) + 반짝이는 눈동자 */}
        {[-0.11, 0.11].map((x) => (
          <group key={x} position={[x, 0.04, isPenguin ? 0.315 : 0.29]} scale={isPenguin ? [1, 1, 0.6] : 1}>
            <mesh scale={cute ? [1, 1.15, 0.6] : 1}>
              <sphereGeometry args={[look === "chibi" || look === "pastel" ? 0.062 : 0.045, 14, 12]} />
              <meshStandardMaterial color="#1b1b22" roughness={0.2} />
            </mesh>
            <mesh position={cute ? [0.018, 0.024, 0.04] : [0.015, 0.018, 0.035]}>
              <sphereGeometry args={[cute ? 0.019 : 0.014, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {cute && <mesh position={[-0.016, -0.02, 0.038]}><sphereGeometry args={[0.009, 6, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>}
            {look === "pastel" && <mesh position={[0.02, -0.018, 0.04]} rotation={[0, 0, 0.6]}><octahedronGeometry args={[0.012]} /><meshBasicMaterial color="#fff6a8" /></mesh>}
          </group>
        ))}
        <mesh position={[0, -0.06, isPenguin ? 0.345 : 0.31]}>
          {isPenguin ? <coneGeometry args={[0.05, 0.12, 8]} /> : <sphereGeometry args={[0.035, 8, 8]} />}
          <meshStandardMaterial color={isPenguin ? "#ffb347" : isDeer ? "#e0322d" : "#3a2a24"} emissive={isDeer ? "#ff2a1a" : "#000000"} emissiveIntensity={isDeer ? 0.8 : 0} />
        </mesh>
        {cute && [-1, 1].map((sd) => (
          <mesh key={`b${sd}`} position={[sd * 0.19, -0.07, 0.26]} rotation={[0, sd * 0.6, 0]}><circleGeometry args={[0.055, 16]} /><meshBasicMaterial color="#ff9fb2" transparent opacity={0.6} depthWrite={false} /></mesh>
        ))}
        {cute && !isPenguin && [-1, 1].map((sd) => (
          <mesh key={`m${sd}`} position={[sd * 0.022, -0.11, 0.3]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.022, 0.006, 6, 12, Math.PI]} /><meshBasicMaterial color="#3a2a24" /></mesh>
        ))}
        {/* 귀 */}
        {[-1, 1].map((s) => (
          <group key={s}>
            {ears === "pointy" && (
              <mesh position={[s * 0.2, 0.3, 0]} rotation={[0, 0, -s * 0.3]}>
                <coneGeometry args={[0.1, 0.22, 4]} />
                {skin(dark)}
              </mesh>
            )}
            {ears === "long" && (
              <mesh position={[s * 0.12, 0.42, 0]} rotation={[0, 0, -s * 0.15]} scale={[1, 2.6, 0.7]}>
                <sphereGeometry args={[0.08, 12, 12]} />
                {skin(dark)}
              </mesh>
            )}
            {ears === "round" && (
              <mesh position={[s * 0.22, 0.24, 0]}>
                <sphereGeometry args={[0.1, 12, 12]} />
                {skin(dark)}
              </mesh>
            )}
            {ears === "floppy" && (
              <mesh position={[s * 0.3, 0.02, 0]} rotation={[0, 0, s * 0.3]} scale={[0.7, 1.6, 0.6]}>
                <sphereGeometry args={[0.1, 12, 12]} />
                {skin(dark)}
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
      {/* 새 장식: 귀마개·털모자·안경·루돌프 머리띠 */}
      <group position={[0, 1.02, 0]}>
        {avatar.acc === "earmuff" && <>
          <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.33, 0.025, 6, 20, Math.PI]} /><meshStandardMaterial color="#c9a7eb" /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.32, 0.02, 0]}><sphereGeometry args={[0.11, 12, 12]} /><meshStandardMaterial color="#f4a7b9" roughness={1} /></mesh>)}
        </>}
        {avatar.acc === "beanie" && <>
          <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#3b6fd6" roughness={1} /></mesh>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.31, 0.05, 8, 24]} /><meshStandardMaterial color="#f4f7fb" /></mesh>
          <mesh position={[0, 0.55, 0]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial color="#f4f7fb" /></mesh>
        </>}
        {avatar.acc === "glasses" && <>
          {[-0.11, 0.11].map((x) => <mesh key={x} position={[x, 0.04, 0.33]}><torusGeometry args={[0.07, 0.013, 6, 16]} /><meshStandardMaterial color="#2b2b30" /></mesh>)}
          <mesh position={[0, 0.04, 0.33]}><boxGeometry args={[0.08, 0.012, 0.012]} /><meshStandardMaterial color="#2b2b30" /></mesh>
        </>}
        {avatar.acc === "wizard" && <>
          <mesh position={[0, 0.5, 0]} rotation={[0, 0, -0.15]}><coneGeometry args={[0.24, 0.6, 16]} /><meshStandardMaterial color="#5b3fa8" /></mesh>
          <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.3, 0.06, 8, 24]} /><meshStandardMaterial color="#5b3fa8" /></mesh>
          <mesh position={[0.06, 0.45, 0.16]}><octahedronGeometry args={[0.05]} /><meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={1} /></mesh>
        </>}
        {avatar.acc === "shades" && <>
          {[-0.11, 0.11].map((x) => <mesh key={x} position={[x, 0.04, 0.32]} scale={[1, 0.75, 0.3]}><sphereGeometry args={[0.085, 12, 10]} /><meshStandardMaterial color="#14141a" metalness={0.6} roughness={0.2} /></mesh>)}
          <mesh position={[0, 0.06, 0.33]}><boxGeometry args={[0.08, 0.015, 0.015]} /><meshStandardMaterial color="#14141a" /></mesh>
        </>}
        {avatar.acc === "flower" && Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * 0.27, 0.22, Math.sin(a) * 0.27]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color={["#ffd36b", "#ff9ff3", "#ffffff"][i % 3]} /></mesh>;
        })}
        {avatar.acc === "starpin" && (
          <mesh position={[0.2, 0.22, 0.12]} rotation={[0, 0, 0.3]}><octahedronGeometry args={[0.09]} /><meshStandardMaterial color="#ffd36b" emissive="#ffb300" emissiveIntensity={0.9} /></mesh>
        )}
        {avatar.acc === "rudolph" && [-1, 1].map((s) => (
          <group key={s} position={[s * 0.16, 0.3, 0]} rotation={[0, 0, -s * 0.35]}>
            <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.022, 0.028, 0.26, 6]} /><meshStandardMaterial color="#8a5a35" /></mesh>
            <mesh position={[s * 0.06, 0.18, 0]} rotation={[0, 0, -s * 0.9]}><cylinderGeometry args={[0.018, 0.022, 0.14, 6]} /><meshStandardMaterial color="#8a5a35" /></mesh>
          </group>
        ))}
      </group>
      {avatar.acc === "cape" && (
        <mesh position={[0, 0.5, -0.24]} rotation={[0.12, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.4, 0.62, 16, 1, true, Math.PI * 0.6, Math.PI * 0.8]} />
          <meshStandardMaterial color="#c8102e" side={THREE.DoubleSide} />
        </mesh>
      )}
      {avatar.acc === "scarf" && (
        <mesh position={[0, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.24, 0.07, 10, 24]} />
          <meshStandardMaterial color="#d33a3a" />
        </mesh>
      )}
    </group>
  );
}

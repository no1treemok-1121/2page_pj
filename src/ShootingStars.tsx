import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { currentEvent } from "./events";

// 별똥별: 이벤트 시간 동안 하늘을 대각선으로 가로지르는 빛줄기 (꼬리가 점점 옅어짐)
const N = 4;
export default function ShootingStars() {
  const group = useRef<THREE.Group>(null);
  const stars = useRef(Array.from({ length: N }, (_, i) => ({ t: -i * 0.9, from: new THREE.Vector3(), dir: new THREE.Vector3() })));
  const reset = (s: { t: number; from: THREE.Vector3; dir: THREE.Vector3 }) => {
    const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 10;
    s.from.set(Math.cos(a) * r, 11 + Math.random() * 5, Math.sin(a) * r - 4);
    s.dir.set(-Math.cos(a) * 0.6 + (Math.random() - 0.5), -0.35 - Math.random() * 0.2, -Math.sin(a) * 0.6).normalize();
    s.t = 0;
  };
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const on = currentEvent() === "shooting";
    g.visible = on;
    if (!on) return;
    g.children.forEach((child, i) => {
      const s = stars.current[i];
      s.t += dt;
      if (s.t < 0) { child.visible = false; return; }
      if (s.t > 1.3 || s.from.lengthSq() === 0) reset(s);
      const p = s.from.clone().addScaledVector(s.dir, s.t * 18);
      child.visible = true;
      child.position.copy(p);
      child.lookAt(p.clone().add(s.dir));
      const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, 1 - s.t / 1.3);
    });
  });
  return (
    <group ref={group} visible={false}>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} raycast={() => null}>
          {/* 앞(머리)이 굵고 뒤(꼬리)로 가늘어지는 빛줄기 */}
          <cylinderGeometry args={[0.0, 0.07, 3.2, 6, 1]} />
          <meshBasicMaterial color="#fff6d6" transparent opacity={1} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

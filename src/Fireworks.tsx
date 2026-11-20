import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { currentEvent } from "./events";

// 불꽃놀이: 이벤트 시간 동안 트리 뒤 하늘에서 폭죽이 연달아 터짐
const COLORS = ["#ff5a5f", "#ffd36b", "#7fe0ff", "#b5ff8a", "#ff9ff3", "#ffffff", "#ffa94d"];
const PARTICLES = 130;
const LIFE = 1.8;
const MAX_BURSTS = 8;

type Burst = { points: THREE.Points; vel: Float32Array; age: number };

export default function Fireworks() {
  const group = useRef<THREE.Group>(null);
  const bursts = useRef<Burst[]>([]);
  const nextAt = useRef(0);
  const geoTemplate = useMemo(() => new Float32Array(PARTICLES * 3), []);

  const spawn = () => {
    const g = group.current;
    if (!g) return;
    const pos = new Float32Array(geoTemplate);
    const vel = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      // 공 모양으로 퍼지는 방향
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const sp = 3.8 + Math.random() * 1.4;
      vel[i * 3] = r * Math.cos(th) * sp; vel[i * 3 + 1] = u * sp; vel[i * 3 + 2] = r * Math.sin(th) * sp;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: COLORS[Math.floor(Math.random() * COLORS.length)], size: 0.38, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    const points = new THREE.Points(geo, mat);
    points.position.set((Math.random() - 0.5) * 18, 5.5 + Math.random() * 3, -9 - Math.random() * 4);
    points.raycast = () => null;
    g.add(points);
    bursts.current.push({ points, vel, age: 0 });
    if (bursts.current.length > MAX_BURSTS) remove(bursts.current.shift()!);
  };

  const remove = (b: Burst) => {
    group.current?.remove(b.points);
    b.points.geometry.dispose();
    (b.points.material as THREE.Material).dispose();
  };

  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime;
    if (currentEvent() === "fireworks" && now >= nextAt.current) {
      spawn();
      if (Math.random() < 0.35) spawn(); // 가끔 두 발 동시에
      nextAt.current = now + 0.45 + Math.random() * 0.5;
    }
    for (const b of [...bursts.current]) {
      b.age += dt;
      const attr = b.points.geometry.getAttribute("position") as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      const drag = Math.max(0, 1 - dt * 1.6);
      for (let i = 0; i < PARTICLES; i++) {
        b.vel[i * 3] *= drag; b.vel[i * 3 + 1] = b.vel[i * 3 + 1] * drag - 2.2 * dt; b.vel[i * 3 + 2] *= drag;
        a[i * 3] += b.vel[i * 3] * dt; a[i * 3 + 1] += b.vel[i * 3 + 1] * dt; a[i * 3 + 2] += b.vel[i * 3 + 2] * dt;
      }
      attr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - b.age / LIFE);
      if (b.age > LIFE) { remove(b); bursts.current = bursts.current.filter((x) => x !== b); }
    }
  });

  return <group ref={group} />;
}

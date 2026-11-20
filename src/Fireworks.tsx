import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FIREWORKS, currentEvent, cycleSec } from "./events";

// 불꽃놀이: 이벤트 시간 동안 트리 뒤 하늘에서 폭죽이 연달아 터짐
// 공 모양 / 동그라미(고리) 모양 / 두 색 겹치기, 터질 때 하늘이 번쩍, 마지막 6초는 피날레
const COLORS = ["#ff5a5f", "#ffd36b", "#7fe0ff", "#b5ff8a", "#ff9ff3", "#ffffff", "#ffa94d", "#a78bfa"];
const PARTICLES = 140;
const LIFE = 2.0;
const MAX_BURSTS = 18;

type Burst = { points: THREE.Points; vel: Float32Array; age: number };
const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export default function Fireworks() {
  const group = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);
  const bursts = useRef<Burst[]>([]);
  const nextAt = useRef(0);
  const zero = useMemo(() => new Float32Array(PARTICLES * 3), []);

  const remove = (b: Burst) => {
    group.current?.remove(b.points);
    b.points.geometry.dispose();
    (b.points.material as THREE.Material).dispose();
  };

  const burst = (at: THREE.Vector3, color: string, kind: "sphere" | "ring", speed: number, size: number) => {
    const g = group.current;
    if (!g) return;
    const vel = new Float32Array(PARTICLES * 3);
    // 고리 모양은 살짝 기울어진 평면 위로 퍼짐
    const tilt = new THREE.Euler(Math.random() * 1.2 - 0.6, Math.random() * Math.PI, Math.random() * 0.6 - 0.3);
    const v = new THREE.Vector3();
    for (let i = 0; i < PARTICLES; i++) {
      if (kind === "ring") {
        const th = (i / PARTICLES) * Math.PI * 2;
        v.set(Math.cos(th), 0, Math.sin(th)).applyEuler(tilt).multiplyScalar(speed * (0.95 + Math.random() * 0.1));
      } else {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
        v.set(r * Math.cos(th), u, r * Math.sin(th)).multiplyScalar(speed * (0.75 + Math.random() * 0.35));
      }
      vel[i * 3] = v.x; vel[i * 3 + 1] = v.y; vel[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(zero), 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const points = new THREE.Points(geo, mat);
    points.position.copy(at);
    points.raycast = () => null;
    g.add(points);
    bursts.current.push({ points, vel, age: 0 });
    while (bursts.current.length > MAX_BURSTS) remove(bursts.current.shift()!);
    // 하늘이 번쩍
    if (flash.current) {
      flash.current.position.copy(at);
      flash.current.color.set(color);
      flash.current.intensity = 30; // 빛에 예민한 사람을 위해 번쩍임을 절반으로
    }
  };

  const spawn = () => {
    // 마을 둘레 360도 어디서든 터짐 (어느 방향에서 봐도 보이게)
    const ang = Math.random() * Math.PI * 2, rad = 20 + Math.random() * 6; // 넓어진 마을 바깥 하늘
    const at = new THREE.Vector3(Math.cos(ang) * rad, 5.5 + Math.random() * 4, Math.sin(ang) * rad);
    const r = Math.random();
    if (r < 0.45) {
      // 두 색 겹치기: 큰 공 + 안쪽 작은 공
      burst(at, pick(), "sphere", 4.8, 0.4);
      burst(at, pick(), "sphere", 2.4, 0.3);
    } else {
      burst(at, pick(), "sphere", 4.2, 0.42);
    }
  };

  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime;
    if (currentEvent() === "fireworks" && now >= nextAt.current) {
      const finale = cycleSec() > FIREWORKS.start + FIREWORKS.length - 6;
      const n = finale ? 2 + Math.floor(Math.random() * 2) : Math.random() < 0.4 ? 2 : 1;
      for (let i = 0; i < n; i++) spawn();
      nextAt.current = now + (finale ? 0.18 + Math.random() * 0.15 : 0.3 + Math.random() * 0.35);
    }
    if (flash.current) flash.current.intensity = Math.max(0, flash.current.intensity - dt * 80);
    for (const b of [...bursts.current]) {
      b.age += dt;
      const attr = b.points.geometry.getAttribute("position") as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      const drag = Math.max(0, 1 - dt * 1.5);
      for (let i = 0; i < PARTICLES; i++) {
        b.vel[i * 3] *= drag; b.vel[i * 3 + 1] = b.vel[i * 3 + 1] * drag - 2.0 * dt; b.vel[i * 3 + 2] *= drag;
        a[i * 3] += b.vel[i * 3] * dt; a[i * 3 + 1] += b.vel[i * 3 + 1] * dt; a[i * 3 + 2] += b.vel[i * 3 + 2] * dt;
      }
      attr.needsUpdate = true;
      const m = b.points.material as THREE.PointsMaterial;
      // 끝 무렵 반짝반짝 깜빡이며 사라짐
      const fade = Math.max(0, 1 - b.age / LIFE);
      m.opacity = b.age > LIFE * 0.55 ? fade * (0.5 + 0.5 * Math.sin(b.age * 40)) : fade;
      if (b.age > LIFE) { remove(b); bursts.current = bursts.current.filter((x) => x !== b); }
    }
  });

  return (
    <group ref={group}>
      <pointLight ref={flash} intensity={0} distance={40} decay={1} />
    </group>
  );
}

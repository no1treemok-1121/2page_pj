import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { supabase } from "./supabase";
import { rpc } from "./rooms";

// 눈사람: 광장에 만들면 24시간 동안 모두에게 보임 (supabase/snowmen.sql)
export type Snowman = { id: string; x: number; z: number; ry: number; name: string; scarf: string; created_at: string };
const SCARVES = ["#d33a3a", "#2f7a4b", "#3b6fd6", "#f2a33a", "#c9a7eb"];

export function useSnowmen() {
  const [list, setList] = useState<Snowman[]>([]);
  const load = useCallback(async () => {
    if (!supabase) return;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await supabase.from("snowmen").select("*").gt("created_at", since).order("created_at", { ascending: false }).limit(40);
    if (data) setList(data as Snowman[]);
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const build = async (x: number, z: number, ry: number, name: string) => {
    if (!supabase) throw new Error("서버 연결 정보가 없어요");
    const scarf = SCARVES[Math.floor(Math.random() * SCARVES.length)];
    const { data, error } = await supabase.from("snowmen")
      .insert({ x: Math.round(Math.max(-14.9, Math.min(14.9, x)) * 100) / 100, z: Math.round(Math.max(-14.9, Math.min(14.9, z)) * 100) / 100, ry, name: name.slice(0, 12) || "익명", scarf })
      .select().single();
    if (error) throw new Error("눈사람을 만들지 못했어요. 잠시 뒤 다시 해 주세요.");
    setList((prev) => [data as Snowman, ...prev].slice(0, 40));
    return data as Snowman;
  };
  // 부수기: 0.9초 동안 와장창 흩어진 뒤 사라짐 (내가 부쉈으면 서버에서도 지움)
  const [smashed, setSmashed] = useState<Record<string, number>>({});
  const smash = (id: string, mine: boolean) => {
    setSmashed((p) => ({ ...p, [id]: Date.now() }));
    setTimeout(() => setList((p) => p.filter((s) => s.id !== id)), 950);
    if (mine) rpc<void>("smash_snowman", { p_id: id }).catch(() => undefined);
  };
  return { list, load, build, smash, smashed };
}

function SnowmanMesh({ s, onClick, smashedAt }: { s: Snowman; onClick?: (s: Snowman) => void; smashedAt?: number }) {
  const g = useRef<THREE.Group>(null);
  const parts = useRef<(THREE.Object3D | null)[]>([]);
  const born = useRef(Date.parse(s.created_at));
  const dirs = useRef([0, 1, 2].map((i) => new THREE.Vector3(Math.cos(i * 2.1) * 1.6, 1.5 + i * 0.6, Math.sin(i * 2.1) * 1.6)));
  useFrame(() => {
    if (smashedAt) {
      // 와장창: 몸통 세 덩이가 사방으로 튀며 작아짐
      const t = Math.min(1, (Date.now() - smashedAt) / 900);
      parts.current.forEach((p, i) => {
        if (!p) return;
        const d = dirs.current[i];
        p.position.set(d.x * t, p.userData.y0 + d.y * t - 4 * t * t, d.z * t);
        p.scale.setScalar(Math.max(0.01, 1 - t));
      });
      return;
    }
    // 막 만든 눈사람은 아래에서부터 쑥 자라남
    const age = (Date.now() - born.current) / 1000;
    if (g.current) g.current.scale.setScalar(age < 1.2 ? Math.max(0.05, Math.min(1, age / 1.2)) : 1);
  });
  return (
    <group ref={g} position={[s.x, 0, s.z]} rotation={[0, s.ry, 0]}
      onClick={(e) => { if (onClick && e.delta < 6) { e.stopPropagation(); onClick(s); } }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}>
      {[[0.38, 0.42], [0.92, 0.3], [1.32, 0.22]].map(([y, r], i) => (
        <mesh key={i} ref={(m) => { parts.current[i] = m; if (m) m.userData.y0 = y; }} position={[0, y, 0]}>
          <sphereGeometry args={[r, 20, 16]} /><meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      ))}
      {smashedAt ? null : <>
      {/* 눈·단추 (석탄) */}
      {[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 1.38, 0.2]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#1b1b22" /></mesh>)}
      {[0.98, 0.86, 0.74].map((y) => <mesh key={y} position={[0, y, 0.29]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#1b1b22" /></mesh>)}
      {/* 당근 코 */}
      <mesh position={[0, 1.31, 0.3]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.04, 0.2, 10]} /><meshStandardMaterial color="#f28c28" /></mesh>
      {/* 목도리 */}
      <mesh position={[0, 1.13, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.05, 8, 20]} /><meshStandardMaterial color={s.scarf} /></mesh>
      {/* 나뭇가지 팔 */}
      {[-1, 1].map((d) => (
        <mesh key={d} position={[d * 0.42, 1.0, 0]} rotation={[0, 0, d * -0.9]}>
          <cylinderGeometry args={[0.015, 0.02, 0.45, 6]} /><meshStandardMaterial color="#5b3b28" />
        </mesh>
      ))}
      </>}
    </group>
  );
}

export function Snowmen({ list, onClick, smashed = {} }: { list: Snowman[]; onClick?: (s: Snowman) => void; smashed?: Record<string, number> }) {
  return <>{list.map((s) => <SnowmanMesh key={s.id} s={s} onClick={onClick} smashedAt={smashed[s.id]} />)}</>;
}

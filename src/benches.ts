// 앉을 수 있는 자리: 광장 벤치 4개 + 연못가 모닥불 옆 통나무 의자 4개
// 벤치: 휴대폰 세로 화면에서도 보이도록 트리 가까이, 화면(카메라) 쪽을 바라봄
// 통나무: 모닥불을 바라봄 → 앉으면 "몸 녹이기"
export const POND = { x: -4.6, z: -10.5, r: 2.8 };
export const FIRES = [
  { x: -0.9, z: -9.2 }, // 연못 오른쪽 모닥불
  { x: -8.6, z: -8.3 }, // 연못 왼쪽 모닥불
];

type Seat = { x: number; z: number; ry: number; kind: "bench" | "log" };
const benches: Seat[] = [
  { x: -2.3, z: 3.6 }, // 트리 앞 왼쪽
  { x: 2.3, z: 3.6 }, // 트리 앞 오른쪽
  { x: -4.2, z: -1.2 }, // 트리 옆 왼쪽
  { x: 4.2, z: -1.2 }, // 트리 옆 오른쪽
].map((b) => ({ ...b, ry: 0, kind: "bench" as const }));
// 모닥불마다 통나무 2개 (불의 앞쪽 양옆), 불을 바라봄
const logs: Seat[] = FIRES.flatMap((f) => [-0.6, 0.6].map((a) => {
  const ang = Math.PI / 2 + a; // 불의 화면 쪽(+z)에서 양옆으로
  const x = f.x + Math.cos(ang) * 1.25, z = f.z + Math.sin(ang) * 1.25;
  return { x, z, ry: Math.atan2(f.x - x, f.z - z), kind: "log" as const };
}));
export const BENCHES: Seat[] = [...benches, ...logs];
export const SIT_Y = 0.32; // 앉았을 때 몸이 벤치 위로 올라가는 높이
export const LOG_Y = 0.12; // 통나무는 낮음

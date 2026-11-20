// 썰매 놀이 두 가지 (마을이 넓어져서 광장 바깥쪽에 배치)
// 1) 언덕 썰매: 오른쪽 뒤 언덕 꼭대기에서 광장까지 미끄러져 내려옴
// 2) 빙판 썰매: 왼쪽 얼음 빙판 위를 씽씽 돌다가 가장자리에서 멈춤
export type RideKind = "hill" | "hill2" | "ice" | "dog" | "deer";
export const isTour = (k: RideKind) => k === "dog" || k === "deer";
export const RIDE_KINDS: RideKind[] = ["hill", "hill2", "ice", "dog", "deer"];

// 언덕 2개 (사용자 요청으로 하나 더): 오른쪽 뒤 / 왼쪽 뒤. park = 세워 둔 썰매, end = 미끄러져 도착하는 곳
export const HILLS = [
  { x: 11.6, z: -8.6, r: 3.6, h: 2.8, park: { x: 8.9, z: -6.1 }, parkRy: -0.6, end: { x: 6.6, z: -4.2 }, color: "#c0392b" },
  { x: -11.8, z: -3.6, r: 3.3, h: 2.5, park: { x: -9.5, z: -1.2 }, parkRy: 0.9, end: { x: -6.6, z: 1.6 }, color: "#3d6fb6" },
];
export const HILL = HILLS[0];
export const SLED_SPOT = HILLS[0].end;
export const SLED_PARK = HILLS[0].park;
export const hillOf = (k: RideKind) => (k === "hill2" ? HILLS[1] : HILLS[0]);
// 썰매 색: 타는 사람마다 달라짐 (seed로 정해서 모두에게 같은 색)
export const SLED_COLORS = ["#c0392b", "#3d6fb6", "#2f7a4b", "#f2c14e", "#e07a9a", "#8a5cc2", "#ff8a3d"];
export const sledColor = (seed: number) => SLED_COLORS[Math.floor(seed * SLED_COLORS.length) % SLED_COLORS.length];
export const SLED_MS = 5000; // 사용자 요청: 오래 타게

export const RINK = { x: -7.2, z: -4.8, r: 3.2 }; // 얼음 빙판 (기본 화면 안에 보이게)
export const ICE_MS = 9000; // 사용자 요청: 오래 타게
const ICE_END = { x: RINK.x + RINK.r + 0.6, z: RINK.z + 0.4 }; // 빙판 오른쪽 가장자리 (광장 쪽)

// s: 0(꼭대기) → 1(도착). 위치·높이·바라보는 방향
export function sledAt(s: number, hill = HILLS[0]) {
  const SLED_SPOT = hill.end;
  const d = Math.hypot(hill.end.x - hill.x, hill.end.z - hill.z);
  const START = { x: hill.x + ((hill.end.x - hill.x) / d) * 0.5, z: hill.z + ((hill.end.z - hill.z) / d) * 0.5, y: hill.h - 0.05 };
  const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2; // 천천히 출발 → 빨라짐 → 천천히 멈춤
  const x = START.x + (SLED_SPOT.x - START.x) * e + Math.sin(e * Math.PI) * 1.1;
  const z = START.z + (SLED_SPOT.z - START.z) * e;
  const y = START.y * Math.pow(Math.max(0, 1 - e * 1.25), 1.6);
  const ry = Math.atan2(SLED_SPOT.x - START.x + Math.cos(e * Math.PI) * 3.4, SLED_SPOT.z - START.z);
  return { x, y, z, ry };
}

// 빙판: 8자처럼 출렁이며 한 바퀴 반 돌고, 마지막엔 가장자리로 빠져나옴
// seed(0~1): 타는 사람마다 출발 위치·방향·출렁임이 달라서 여러 명이 동시에 타도 겹치지 않음
export function iceAt(s: number, seed = 0) {
  const loop = Math.min(1, s / 0.88);
  const dirSign = seed < 0.5 ? 1 : -1;
  const a = dirSign * loop * Math.PI * 5 + Math.PI + seed * Math.PI * 2;
  const r = RINK.r * (0.5 + 0.25 * Math.sin(loop * Math.PI * (3 + seed * 3) + seed * 6));
  let x = RINK.x + Math.cos(a) * r;
  let z = RINK.z + Math.sin(a) * r;
  if (s > 0.88) { const k = (s - 0.88) / 0.12; x += (ICE_END.x - x) * k; z += (ICE_END.z - z) * k; }
  const ry = Math.atan2(-Math.sin(a) * dirSign, Math.cos(a) * dirSign); // 도는 방향을 바라봄
  return { x, y: 0.03, z, ry };
}

// 3) 개썰매·사슴썰매: 마을을 크게 한 바퀴 (앞쪽은 넓게, 뒤쪽 모닥불·연못은 피해서)
export const TOUR_MS = 36000;
const TOUR_A0 = Math.PI * 0.75; // 정류장 자리 (왼쪽 앞)
function ellipse(a: number) {
  const s = Math.sin(a);
  return { x: Math.cos(a) * 7.6, z: s * (s > 0 ? 7.6 : 6.2) }; // 오른쪽 노점 골목을 피해서 조금 안쪽으로
}
const st = ellipse(TOUR_A0);
// 정류장: 길 바로 옆에 썰매 두 대를 세워 둠 (길 방향을 바라봄)
export const TOUR_STATION = { x: st.x * 0.86, z: st.z * 0.86, ry: Math.atan2(-Math.sin(TOUR_A0) * 7.6, Math.cos(TOUR_A0) * 7.6) };
function tourPoint(s: number) {
  const e = s < 0.04 ? s * s / 0.08 : s > 0.96 ? 1 - (1 - s) * (1 - s) / 0.08 : s - 0.02; // 살살 출발·도착
  return ellipse(TOUR_A0 + e * Math.PI * 2 * (1 / 0.96 * 0.96));
}
export function tourAt(s: number) {
  const p = tourPoint(s), q = tourPoint(Math.min(1, s + 0.003)), b = tourPoint(Math.max(0, s - 0.003));
  return { x: p.x, y: 0.03, z: p.z, ry: Math.atan2(q.x - b.x, q.z - b.z) };
}
const TOUR_END = { x: st.x * 0.8, z: st.z * 0.8 };

export const rideMs = (k: RideKind) => (isTour(k) ? TOUR_MS : k === "ice" ? ICE_MS : SLED_MS);
export const rideAt = (k: RideKind, s: number, seed = 0) => (isTour(k) ? tourAt(s) : k === "ice" ? iceAt(s, seed) : sledAt(s, hillOf(k)));
export const rideEnd = (k: RideKind) => (isTour(k) ? TOUR_END : k === "ice" ? ICE_END : hillOf(k).end);
export const rideSay = (k: RideKind) => (k === "dog" ? "🐕 개썰매 출발~ 멍멍!" : k === "deer" ? "🦌 사슴썰매 출발~ 딸랑딸랑" : k === "ice" ? "⛸️ 씽씽~!" : "🛷 슝~!");

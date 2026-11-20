// 썰매 놀이 두 가지 (마을이 넓어져서 광장 바깥쪽에 배치)
// 1) 언덕 썰매: 오른쪽 뒤 언덕 꼭대기에서 광장까지 미끄러져 내려옴
// 2) 빙판 썰매: 왼쪽 얼음 빙판 위를 씽씽 돌다가 가장자리에서 멈춤
export type RideKind = "hill" | "ice";

export const HILL = { x: 11, z: -7, r: 3.6, h: 2.8 };
export const SLED_SPOT = { x: 6.5, z: 0.5 }; // 언덕 썰매 도착 지점 (광장)
export const SLED_PARK = { x: 9.3, z: -3.1 }; // 언덕 발치에 세워 둔 썰매 (벤치·가로등과 안 겹치게)
const START = { x: HILL.x - 0.5, z: HILL.z + 0.3, y: HILL.h - 0.05 };
export const SLED_MS = 2800;

export const RINK = { x: -7.2, z: -4.8, r: 3.2 }; // 얼음 빙판 (기본 화면 안에 보이게)
export const ICE_MS = 5200;
const ICE_END = { x: RINK.x + RINK.r + 0.6, z: RINK.z + 0.4 }; // 빙판 오른쪽 가장자리 (광장 쪽)

// s: 0(꼭대기) → 1(도착). 위치·높이·바라보는 방향
export function sledAt(s: number) {
  const e = s < 0.5 ? 2 * s * s : 1 - Math.pow(-2 * s + 2, 2) / 2; // 천천히 출발 → 빨라짐 → 천천히 멈춤
  const x = START.x + (SLED_SPOT.x - START.x) * e + Math.sin(e * Math.PI) * 1.1;
  const z = START.z + (SLED_SPOT.z - START.z) * e;
  const y = START.y * Math.pow(Math.max(0, 1 - e * 1.25), 1.6);
  const ry = Math.atan2(SLED_SPOT.x - START.x + Math.cos(e * Math.PI) * 3.4, SLED_SPOT.z - START.z);
  return { x, y, z, ry };
}

// 빙판: 8자처럼 출렁이며 한 바퀴 반 돌고, 마지막엔 가장자리로 빠져나옴
export function iceAt(s: number) {
  const loop = Math.min(1, s / 0.85);
  const a = loop * Math.PI * 3 + Math.PI; // 왼쪽에서 출발
  const r = RINK.r * (0.55 + 0.2 * Math.sin(loop * Math.PI * 4));
  let x = RINK.x + Math.cos(a) * r;
  let z = RINK.z + Math.sin(a) * r;
  if (s > 0.85) { const k = (s - 0.85) / 0.15; x += (ICE_END.x - x) * k; z += (ICE_END.z - z) * k; }
  const ry = Math.atan2(-Math.sin(a), Math.cos(a)); // 도는 방향을 바라봄
  return { x, y: 0.03, z, ry };
}

export const rideMs = (k: RideKind) => (k === "ice" ? ICE_MS : SLED_MS);
export const rideAt = (k: RideKind, s: number) => (k === "ice" ? iceAt(s) : sledAt(s));
export const rideEnd = (k: RideKind) => (k === "ice" ? ICE_END : SLED_SPOT);
export const rideSay = (k: RideKind) => (k === "ice" ? "⛸️ 씽씽~!" : "🛷 슝~!");
